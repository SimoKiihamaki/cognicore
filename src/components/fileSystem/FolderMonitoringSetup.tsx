/**
 * Component for setting up folder monitoring
 */
import { useState } from 'react';
import { useFileMonitor } from '@/hooks/useFileMonitor';
import { requestFolderAccess } from '@/utils/directFolderAccess';
import EnhancedFolderPicker from './EnhancedFolderPicker';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Folder, 
  FolderInput, 
  FolderMinus,
  FolderPlus, 
  Clock, 
  AlertCircle 
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

/**
 * Component for setting up folder monitoring
 */
const FolderMonitoringSetup = () => {
  const { 
    monitoredFolders, 
    isMonitoring, 
    isLoading, 
    addFolder, 
    removeFolder
  } = useFileMonitor();
  
  const [folderToRemove, setFolderToRemove] = useState<string | null>(null);
  
  // Handle folder selection with direct implementation
  const handleSelectFolder = async () => {
    try {
      // Show a helpful message
      toast.info('Please select a folder to monitor', {
        duration: 3000,
      });
      
      // Use our direct implementation instead of the hook
      const result = await requestFolderAccess();
      
      if (result) {
        toast.success(`Folder "${result.path}" has been added for monitoring`);
        
        // Refresh folders without reloading the page
        await loadMonitoredItems();
      } else {
        toast.error('Failed to add folder. Please try again.');
      }
    } catch (error) {
      // User canceled folder selection or there was an error
      if (error instanceof Error) {
        console.error('Error selecting folder:', error);
        toast.error(`Failed to select folder: ${error.message}`);
      } else if (error instanceof DOMException && error.name === 'AbortError') {
        // User canceled the selection
        toast.info('Folder selection canceled');
      } else {
        toast.error('Failed to select folder');
      }
    }
  };
  
  // Handle folder removal confirmation
  const handleRemoveConfirm = async (folderId: string) => {
    await removeFolder(folderId);
    setFolderToRemove(null);
  };
  
  // Request folder removal confirmation
  const requestRemoveFolder = (folderId: string) => {
    if (isMonitoring) {
      toast.warning('Please stop monitoring before removing folders');
      return;
    }
    
    setFolderToRemove(folderId);
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <FolderInput className="h-5 w-5" />
          Monitored Folders
        </CardTitle>
        <CardDescription>
          Select folders to monitor for automatic file indexing
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Folder List */}
        {monitoredFolders.length > 0 ? (
          <ScrollArea className="h-[200px] rounded-md border">
            <div className="p-4 space-y-3">
              {monitoredFolders.map(folder => (
                <div 
                  key={folder.id} 
                  className={`flex items-center justify-between p-2 rounded-md ${
                    folder.isActive 
                      ? 'bg-primary/10 border border-primary/20' 
                      : 'bg-muted/40 border border-muted'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Folder className={`h-4 w-4 ${folder.isActive ? 'text-primary' : ''}`} />
                    <div>
                      <div className="font-medium text-sm">{folder.path}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Status: {folder.isActive ? 'Monitoring' : 'Paused'}
                      </div>
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={isMonitoring || isLoading}
                    onClick={() => requestRemoveFolder(folder.id)}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  >
                    <FolderMinus className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="flex flex-col items-center justify-center p-6 text-center border rounded-md bg-muted/20">
            <FolderPlus className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground mb-1">No folders are being monitored</p>
            <p className="text-xs text-muted-foreground">
              Click the button below to select a folder to monitor
            </p>
          </div>
        )}
        
        {/* Add Folder Button */}
        <div className="flex justify-center">
          {isMonitoring || isLoading ? (
            <Button
              disabled
              className="gap-2"
            >
              <FolderPlus className="h-4 w-4" />
              Add Folder
            </Button>
          ) : (
            <EnhancedFolderPicker />
          )}
        </div>
        
        {/* Warning when monitoring is active */}
        {isMonitoring && (
          <div className="flex gap-2 items-center text-sm p-3 rounded-md bg-amber-500/10 text-amber-600">
            <AlertCircle className="h-4 w-4" />
            <p>Stop monitoring before adding or removing folders</p>
          </div>
        )}
      </CardContent>
      
      {/* Confirmation Dialog */}
      <AlertDialog 
        open={folderToRemove !== null} 
        onOpenChange={(open) => !open && setFolderToRemove(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Folder</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this folder from monitoring?
              Any indexed files from this location will be marked as deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => folderToRemove && handleRemoveConfirm(folderToRemove)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default FolderMonitoringSetup;
