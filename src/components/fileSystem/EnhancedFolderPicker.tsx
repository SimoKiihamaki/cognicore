import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Folder, FolderSearch, AlertTriangle, Check, HelpCircle, Info } from 'lucide-react';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';
import { requestFolderAccess, isFolderAccessSupported } from '@/utils/directFolderAccess';
import { 
  fixDirectoryPermissions, 
  getDirectoryHandleInfo, 
  isFileSystemAccessSupported 
} from '@/utils/permissions/folderPermissionHelper';
import databaseService from '@/services/database/databaseService';
import { STORE_NAMES } from '@/services/database/databaseService';

interface FolderDiagnosticInfo {
  status: 'unknown' | 'error' | 'success' | 'warning';
  message: string;
  details?: string;
  canRetry?: boolean;
}

const EnhancedFolderPicker: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [diagnosticInfo, setDiagnosticInfo] = useState<FolderDiagnosticInfo | null>(null);
  const [selectedHandle, setSelectedHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [browserSupported, setBrowserSupported] = useState<boolean>(true);
  const [monitoredFolders, setMonitoredFolders] = useState<any[]>([]);
  
  // Check for browser support and load monitored folders on mount
  useEffect(() => {
    const checkSupport = () => {
      const isSupported = isFileSystemAccessSupported();
      setBrowserSupported(isSupported);
      
      if (!isSupported) {
        setDiagnosticInfo({
          status: 'warning',
          message: 'Browser not fully supported',
          details: 'Your browser may not fully support the File System Access API needed for folder monitoring. For best results, use Chrome, Edge, or other Chromium-based browsers.',
          canRetry: false
        });
      }
    };
    
    const loadMonitoredFolders = async () => {
      try {
        const folders = await databaseService.getAll(STORE_NAMES.FOLDERS);
        setMonitoredFolders(folders || []);
      } catch (err) {
        console.error('Failed to load monitored folders:', err);
      }
    };
    
    checkSupport();
    loadMonitoredFolders();
  }, []);
  
  const handleSelectFolder = async () => {
    try {
      setIsLoading(true);
      setDiagnosticInfo(null);
      
      // Check browser support first
      if (!browserSupported) {
        setDiagnosticInfo({
          status: 'error',
          message: 'Browser not supported',
          details: 'Your browser does not support the File System Access API needed for folder monitoring. Please try using Chrome, Edge, or other Chromium-based browsers.',
          canRetry: false
        });
        return;
      }
      
      // Request folder access
      toast.info('Please select a folder to monitor', {
        duration: 5000,
        description: 'You will need to grant permission to access this folder.'
      });
      
      const result = await requestFolderAccess();
      
      if (!result) {
        setDiagnosticInfo({
          status: 'error',
          message: 'Failed to select folder or access was denied',
          details: 'Make sure you select a folder and grant permission when prompted.',
          canRetry: true
        });
        return;
      }
      
      // We have a result, now reload monitored folders
      try {
        const folders = await databaseService.getAll(STORE_NAMES.FOLDERS);
        setMonitoredFolders(folders || []);
        
        // Show success message
        setDiagnosticInfo({
          status: 'success',
          message: `Folder "${result.name}" added successfully`,
          details: `The folder has been added to your monitored folders.`,
          canRetry: false
        });
        
        toast.success(`Folder "${result.name}" has been added for monitoring`);
        
        // Close the dialog after a delay
        setTimeout(() => {
          setIsOpen(false);
        }, 2000);
      } catch (err) {
        console.error('Failed to reload monitored folders:', err);
      }
    } catch (error) {
      console.error('Error selecting folder:', error);
      
      let errorMessage = 'An unknown error occurred';
      let detailedError = 'Please try again or select a different folder.';
      
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // More specific error messages for common cases
        if (errorMessage.includes('user activation')) {
          detailedError = 'Folder selection requires user interaction. Please try clicking the button again.';
        } else if (errorMessage.includes('denied') || errorMessage.includes('permission')) {
          detailedError = 'Make sure you grant permission when prompted. Some folders may be restricted by your operating system.';
        } else if (errorMessage.includes('aborted')) {
          detailedError = 'Folder selection was cancelled. Please try again.';
        } else if (errorMessage.includes('Not supported')) {
          detailedError = 'Your browser doesn\'t fully support this feature. Try using Chrome, Edge, or other Chromium-based browsers.';
        }
      }
      
      setDiagnosticInfo({
        status: 'error',
        message: `Error selecting folder: ${errorMessage}`,
        details: detailedError,
        canRetry: true
      });
      
      toast.error(`Failed to select folder: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleRemoveFolder = async (folderId: string) => {
    try {
      await databaseService.delete(STORE_NAMES.FOLDERS, folderId);
      setMonitoredFolders(prevFolders => prevFolders.filter(folder => folder.id !== folderId));
      toast.success('Folder removed from monitoring');
    } catch (error) {
      console.error('Error removing folder:', error);
      toast.error('Failed to remove folder');
    }
  };
  
  return (
    <>
      <Button 
        variant="outline" 
        onClick={() => setIsOpen(true)}
        className="gap-2"
      >
        <Folder className="h-4 w-4" />
        Add Folder
      </Button>
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Folder for Monitoring</DialogTitle>
            <DialogDescription>
              Select a folder on your computer to monitor for changes. The app will automatically
              index files in this folder.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col space-y-4 py-4">
            {diagnosticInfo && (
              <Alert variant={
                diagnosticInfo.status === 'error' ? 'destructive' : 
                diagnosticInfo.status === 'warning' ? 'warning' : 
                'default'
              }>
                <div className="flex items-center gap-2">
                  {diagnosticInfo.status === 'error' ? (
                    <AlertTriangle className="h-4 w-4" />
                  ) : diagnosticInfo.status === 'warning' ? (
                    <Info className="h-4 w-4" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  <AlertTitle>{diagnosticInfo.message}</AlertTitle>
                </div>
                {diagnosticInfo.details && (
                  <AlertDescription className="mt-2">
                    {diagnosticInfo.details}
                  </AlertDescription>
                )}
              </Alert>
            )}
            
            {/* Currently monitored folders */}
            {monitoredFolders.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Currently Monitored Folders:</h3>
                <div className="space-y-2 max-h-32 overflow-y-auto p-2 border rounded-md">
                  {monitoredFolders.map(folder => (
                    <div key={folder.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Folder className="h-3 w-3" />
                        <span>{folder.name}</span>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 px-2"
                        onClick={() => handleRemoveFolder(folder.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex items-center justify-center">
              <Button 
                onClick={handleSelectFolder}
                disabled={isLoading || !browserSupported}
                className="gap-2"
              >
                <FolderSearch className="h-4 w-4" />
                {isLoading ? 'Selecting...' : 'Select Folder'}
              </Button>
            </div>
            
            <div className="text-sm text-muted-foreground mt-2">
              <div className="flex items-center gap-1 mb-1">
                <HelpCircle className="h-4 w-4" />
                <span className="font-medium">Having trouble?</span>
              </div>
              <ul className="list-disc pl-5 space-y-1">
                <li>Make sure you grant permission when prompted</li>
                <li>Some folders may be restricted by your operating system</li>
                <li>Try selecting a subfolder if the main folder doesn't work</li>
                <li>Folder access works best in Chrome, Edge, or other Chromium-based browsers</li>
                <li>Try selecting a folder with fewer files if you encounter performance issues</li>
              </ul>
            </div>
          </div>
          
          <DialogFooter className="sm:justify-between">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="hidden sm:inline-flex"
                    onClick={() => window.open('https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API', '_blank')}
                  >
                    Learn More
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Learn about the File System Access API</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EnhancedFolderPicker;