/**
 * Component for selecting a directory
 * Handles both File System Access API and fallback methods
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useFileSystem } from '@/hooks/useFileSystem';
import { useToast } from '@/hooks/use-toast';

interface DirectoryPickerProps {
  onDirectorySelected?: (result: {
    success: boolean;
    handle?: FileSystemDirectoryHandle;
    files?: File[];
    error?: string;
  }) => void;
  className?: string;
}

export const DirectoryPicker: React.FC<DirectoryPickerProps> = ({
  onDirectorySelected,
  className
}) => {
  const {
    isFileSystemSupported,
    isFallbackSupported,
    directoryHandle,
    isLoading,
    error,
    requestDirectoryAccess
  } = useFileSystem();
  
  const { toast } = useToast();
  const [showWarning, setShowWarning] = useState<boolean>(!isFileSystemSupported && !isFallbackSupported);

  const handleSelectDirectory = async () => {
    try {
      const result = await requestDirectoryAccess();
      
      if (result.success) {
        toast({
          title: "Directory Selected",
          description: result.handle 
            ? `Selected directory access granted.` 
            : `${result.files?.length || 0} files selected.`
        });
      } else {
        toast({
          title: "Selection Failed",
          description: result.error || "Failed to select directory",
          variant: "destructive"
        });
      }
      
      if (onDirectorySelected) {
        onDirectorySelected(result);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
      
      if (onDirectorySelected) {
        onDirectorySelected({
          success: false,
          error: errorMessage
        });
      }
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Select Folder</CardTitle>
        <CardDescription>
          Choose a folder containing your notes and files
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {showWarning && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Browser Compatibility Issue</AlertTitle>
            <AlertDescription>
              Your browser doesn't support folder selection. Please use a modern browser like Chrome, Edge, or Safari.
            </AlertDescription>
          </Alert>
        )}
        
        {!isFileSystemSupported && isFallbackSupported && (
          <Alert variant="warning" className="mb-4">
            <AlertTitle>Limited Support</AlertTitle>
            <AlertDescription>
              Your browser has limited support for folder selection. You'll need to select files manually.
            </AlertDescription>
          </Alert>
        )}
        
        {directoryHandle && (
          <div className="mb-4 p-3 bg-secondary rounded">
            <p className="font-medium">Currently Selected:</p>
            <p className="text-sm opacity-90">{directoryHandle.name}</p>
          </div>
        )}
        
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
      
      <CardFooter>
        <Button
          onClick={handleSelectDirectory}
          disabled={isLoading || (!isFileSystemSupported && !isFallbackSupported)}
        >
          {isLoading ? 'Selecting...' : isFileSystemSupported ? 'Select Folder' : 'Select Files'}
        </Button>
      </CardFooter>
    </Card>
  );
};
