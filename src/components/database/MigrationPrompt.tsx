/**
 * Enhanced Migration Prompt Component
 * Provides a user-friendly interface for migrating data from localStorage to IndexedDB
 * with better progress reporting, error handling, and user guidance
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import migrationService from '@/services/database/migrationService';
import { Database, Loader, RefreshCw } from 'lucide-react';

interface MigrationPromptProps {
  onMigrationComplete: () => void;
}

export const MigrationPrompt: React.FC<MigrationPromptProps> = ({ 
  onMigrationComplete 
}) => {
  const [open, setOpen] = useState(false);
  const [migrationNeeded, setMigrationNeeded] = useState(false);
  const [migrationInProgress, setMigrationInProgress] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('Checking for data to migrate...');
  const [migrationDetails, setMigrationDetails] = useState<any>({
    notes: 0,
    folders: 0,
    files: 0,
    chatHistories: 0,
    settings: 0
  });
  const [migrationError, setMigrationError] = useState<string | null>(null);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  useEffect(() => {
    const checkMigration = async () => {
      try {
        // Skip if migration already completed
        if (migrationService.isMigrationCompleted()) {
          console.log('Migration already completed, continuing to app');
          onMigrationComplete();
          return;
        }
        
        // Check if migration is needed
        const needsMigration = await migrationService.isMigrationNeeded();
        setMigrationNeeded(needsMigration);
        
        if (needsMigration) {
          console.log('Migration needed, showing prompt');
          setOpen(true);
          setStatusMessage('We need to upgrade your data storage to improve performance.');
        } else {
          // No migration needed, continue with the app
          console.log('No migration needed, continuing to app');
          onMigrationComplete();
        }
      } catch (error) {
        console.error('Error checking migration status:', error);
        
        // If we encounter an error checking migration, still continue to the app
        // but show a toast with the error
        toast.error('Error checking data migration status');
        onMigrationComplete();
      }
    };
    
    checkMigration();
  }, [onMigrationComplete]);

  const handleMigrate = async () => {
    setMigrationInProgress(true);
    setStatusMessage('Starting data upgrade...');
    setMigrationError(null);
    
    try {
      await migrationService.migrateAllData(progressInfo => {
        // Calculate percentage
        const percentage = progressInfo.totalItems > 0
          ? Math.round((progressInfo.processedItems / progressInfo.totalItems) * 100)
          : 0;
        
        setProgress(percentage);
        
        if (progressInfo.details) {
          setMigrationDetails(progressInfo.details);
        }
        
        if (progressInfo.status === 'in-progress') {
          setStatusMessage(`Upgrading your data: ${progressInfo.processedItems}/${progressInfo.totalItems} items`);
        } else if (progressInfo.status === 'completed') {
          setStatusMessage('Data upgrade completed successfully!');
        } else if (progressInfo.status === 'failed') {
          setStatusMessage('Data upgrade failed');
          setMigrationError(progressInfo.error || 'Unknown error');
        }
      });
      
      // Clean up localStorage after successful migration
      migrationService.cleanupAfterMigration();
      
      toast.success('Your data has been upgraded successfully');
      
      // Close dialog after a short delay
      setTimeout(() => {
        setOpen(false);
        onMigrationComplete();
      }, 1500);
    } catch (error) {
      console.error('Migration failed:', error);
      
      setStatusMessage('Data upgrade failed');
      setMigrationError(error instanceof Error ? error.message : String(error));
      setMigrationInProgress(false);
      
      toast.error('There was an error upgrading your data', {
        description: 'You can try again or skip for now'
      });
    }
  };

  const handleSkip = () => {
    toast.info('Data upgrade skipped', {
      description: 'You can upgrade later from the settings menu'
    });
    
    setOpen(false);
    onMigrationComplete();
  };

  const handleRetry = () => {
    // Reset migration states
    setMigrationError(null);
    setProgress(0);
    setStatusMessage('Retrying data upgrade...');
    
    // Trigger migration again
    handleMigrate();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Data Storage Upgrade</DialogTitle>
          <DialogDescription>
            {!migrationError && statusMessage}
            {migrationError && (
              <Alert variant="destructive" className="mt-4">
                <AlertTitle>Error Upgrading Data</AlertTitle>
                <AlertDescription>
                  {migrationError}
                </AlertDescription>
              </Alert>
            )}
          </DialogDescription>
        </DialogHeader>
        
        {/* Only show during normal migration flow */}
        {!migrationError && !migrationInProgress && (
          <div className="py-4 space-y-4">
            <p>
              CogniCore needs to upgrade your data storage method for better performance and reliability.
              This process will:
            </p>
            
            <ul className="list-disc pl-6 space-y-2">
              <li>Move your data to a more robust storage system</li>
              <li>Improve application performance</li>
              <li>Enable handling larger amounts of data</li>
              <li>Your data will remain entirely on your device</li>
            </ul>
            
            <p className="text-sm text-muted-foreground">
              This process usually takes just a few seconds and won't affect your data.
            </p>
          </div>
        )}
        
        {/* Show progress during migration */}
        {migrationInProgress && (
          <div className="py-4 space-y-4">
            <Progress value={progress} className="w-full" />
            <p className="text-center text-sm text-muted-foreground">
              {progress}% complete
            </p>
            
            <Accordion type="single" collapsible>
              <AccordionItem value="details">
                <AccordionTrigger className="text-sm">
                  Show Migration Details
                </AccordionTrigger>
                <AccordionContent>
                  <div className="text-sm space-y-1">
                    <p>Notes: {migrationDetails.notes || 0}</p>
                    <p>Folders: {migrationDetails.folders || 0}</p>
                    <p>Files: {migrationDetails.files || 0}</p>
                    <p>Chat Histories: {migrationDetails.chatHistories || 0}</p>
                    <p>Settings: {migrationDetails.settings || 0}</p>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        )}
        
        <DialogFooter className="sm:justify-between">
          {/* Show skip/migrate during normal flow */}
          {!migrationInProgress && !migrationError && (
            <>
              <Button
                variant="outline"
                onClick={handleSkip}
              >
                Skip for Now
              </Button>
              
              <Button
                onClick={handleMigrate}
              >
                <Database className="mr-2 h-4 w-4" />
                Upgrade Storage
              </Button>
            </>
          )}
          
          {/* Show retry/skip after error */}
          {migrationError && (
            <>
              <Button
                variant="outline"
                onClick={handleSkip}
              >
                Skip for Now
              </Button>
              
              <Button
                onClick={handleRetry}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
            </>
          )}
          
          {/* Disabled button during migration */}
          {migrationInProgress && !migrationError && (
            <Button disabled className="w-full">
              <Loader className="mr-2 h-4 w-4 animate-spin" />
              Upgrading Data...
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MigrationPrompt;
