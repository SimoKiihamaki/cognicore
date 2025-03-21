import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FolderPlus, Loader } from 'lucide-react';
import { useFileMonitor } from '@/hooks/useFileMonitor';
import { toast } from 'sonner';
import { useNotifications } from '@/providers/NotificationsProvider';

// Add type declarations for the File System Access API
declare global {
  interface Window {
    showDirectoryPicker(options?: {
      id?: string;
      mode?: 'read' | 'readwrite';
      startIn?: 'desktop' | 'documents' | 'downloads' | 'music' | 'pictures' | 'videos';
    }): Promise<FileSystemDirectoryHandle>;
  }
  
  interface FileSystemDirectoryHandle {
    requestPermission(descriptor: { mode: 'read' | 'readwrite' }): Promise<'granted' | 'denied'>;
  }
}

/**
 * Button component for importing folders
 */
const ImportFolderButton = () => {
  const [isImporting, setIsImporting] = useState(false);
  const { addFolder } = useFileMonitor();
  const { addNotification } = useNotifications();
  
  const handleImportFolder = async () => {
    setIsImporting(true);
    
    try {
      // Request directory access using the File System Access API
      const directoryHandle = await window.showDirectoryPicker({
        id: 'cognicore-import-folder',
        mode: 'readwrite', // Request readwrite permission explicitly
        startIn: 'documents'
      });
      
      // Explicitly verify permissions after selection
      try {
        const permissionState = await directoryHandle.requestPermission({ mode: 'readwrite' });
        
        if (permissionState !== 'granted') {
          toast.error('Permission to access the folder was denied. Please grant permission to import this folder.');
          setIsImporting(false);
          return;
        }
        
        // Try to access at least one file to verify permissions work
        try {
          let hasContents = false;
          for await (const [name, handle] of directoryHandle.entries()) {
            hasContents = true;
            break;
          }
          
          if (!hasContents) {
            toast.warning('Selected folder appears to be empty');
          }
        } catch (e) {
          console.error('Error accessing directory contents:', e);
          toast.error('Permission to access the folder contents was denied. Please grant full access.');
          setIsImporting(false);
          return;
        }
      } catch (permError) {
        console.error('Permission error:', permError);
        toast.error('Error accessing folder: ' + (permError.message || 'Unknown error'));
        setIsImporting(false);
        return;
      }
      
      // Get folder path and add to monitoring
      const path = directoryHandle.name;
      await addFolder(directoryHandle, path);
      
      // Show a success notification
      toast.success(`Successfully imported folder "${path}"`);
      
      // Add to notification center
      addNotification({
        title: 'Folder Imported',
        message: `Folder "${path}" has been imported successfully.`,
        type: 'success',
        actionRoute: '/settings'
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        // User canceled folder selection
        toast.info('Folder import canceled');
      } else {
        console.error('Error importing folder:', error);
        toast.error('Failed to import folder: ' + (error instanceof Error ? error.message : 'Unknown error'));
      }
    } finally {
      setIsImporting(false);
    }
  };
  
  return (
    <Button
      onClick={handleImportFolder}
      disabled={isImporting}
      variant="secondary"
      className="gap-2"
    >
      {isImporting ? (
        <Loader className="h-4 w-4 animate-spin" />
      ) : (
        <FolderPlus className="h-4 w-4" />
      )}
      Import Folder
    </Button>
  );
};

export default ImportFolderButton;