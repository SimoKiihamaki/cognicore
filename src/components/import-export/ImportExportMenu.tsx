import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup
} from "@/components/ui/dropdown-menu";
import { 
  FileUp, 
  FileDown,
  FolderUp,
  Download,
  UploadCloud,
  Save,
  FileJson,
  FileArchive
} from 'lucide-react';
import { useNotifications } from '@/providers/NotificationsProvider';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import ImportFolderButton from './ImportFolderButton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import databaseService, { STORE_NAMES } from '@/services/database/databaseService';

export const ImportExportMenu = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'import' | 'export'>('import');
  const [isProcessing, setIsProcessing] = useState(false);
  const { addNotification } = useNotifications();
  
  const openDialog = (type: 'import' | 'export') => {
    setDialogType(type);
    setIsDialogOpen(true);
  };
  
  const handleExportData = async () => {
    setIsProcessing(true);
    
    try {
      // Get all data from database stores
      const notes = await databaseService.getAll(STORE_NAMES.NOTES);
      const folders = await databaseService.getAll(STORE_NAMES.FOLDERS);
      const settings = await databaseService.getAll(STORE_NAMES.CONFIG);
      
      // Create export object
      const exportData = {
        notes,
        folders,
        settings,
        metadata: {
          version: '1.0',
          exportDate: new Date().toISOString(),
          appVersion: '0.1.0' // Replace with actual app version when available
        }
      };
      
      // Convert to JSON string
      const jsonString = JSON.stringify(exportData, null, 2);
      
      // Create blob and download
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      // Create download link and click it
      const a = document.createElement('a');
      a.href = url;
      a.download = `cognicore-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      // Show success message
      toast.success('Data exported successfully');
      addNotification({
        title: 'Export Complete',
        message: 'Your data has been exported successfully',
        type: 'success'
      });
      
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Failed to export data: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleImportData = async (file: File) => {
    setIsProcessing(true);
    
    try {
      // Read the file
      const fileContent = await file.text();
      const importData = JSON.parse(fileContent);
      
      // Validate import data format
      if (!importData.notes || !importData.folders || !importData.metadata) {
        throw new Error('Invalid import file format');
      }
      
      // Display confirmation dialog (already open)
      // Continue with import...
      
      // Clear existing data (optional)
      // Skipping for safety, add confirmation for this in production
      
      // Import notes
      if (importData.notes.length > 0) {
        for (const note of importData.notes) {
          // Check if note already exists
          const existingNote = await databaseService.get(STORE_NAMES.NOTES, note.id);
          if (existingNote) {
            // Update existing note
            await databaseService.update(STORE_NAMES.NOTES, note.id, note);
          } else {
            // Add new note
            await databaseService.add(STORE_NAMES.NOTES, note);
          }
        }
      }
      
      // Import folders
      if (importData.folders.length > 0) {
        for (const folder of importData.folders) {
          // Check if folder already exists
          const existingFolder = await databaseService.get(STORE_NAMES.FOLDERS, folder.id);
          if (existingFolder) {
            // Update existing folder
            await databaseService.update(STORE_NAMES.FOLDERS, folder.id, folder);
          } else {
            // Add new folder
            await databaseService.add(STORE_NAMES.FOLDERS, folder);
          }
        }
      }
      
      // Import settings
      if (importData.settings.length > 0) {
        for (const setting of importData.settings) {
          // Check if setting already exists
          const existingSetting = await databaseService.get(STORE_NAMES.CONFIG, setting.key);
          if (existingSetting) {
            // Update existing setting
            await databaseService.update(STORE_NAMES.CONFIG, setting.key, setting);
          } else {
            // Add new setting
            await databaseService.add(STORE_NAMES.CONFIG, setting);
          }
        }
      }
      
      // Show success message
      toast.success('Data imported successfully');
      addNotification({
        title: 'Import Complete',
        message: `Imported ${importData.notes.length} notes and ${importData.folders.length} folders`,
        type: 'success'
      });
      
      // Close dialog
      setIsDialogOpen(false);
      
      // Reload the page to apply changes
      window.location.reload();
    } catch (error) {
      console.error('Error importing data:', error);
      toast.error('Failed to import data: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <FileUp className="h-5 w-5" />
            <span className="sr-only">Import/Export</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Import & Export</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          <DropdownMenuGroup>
            <DropdownMenuItem onSelect={() => openDialog('import')}>
              <UploadCloud className="mr-2 h-4 w-4" />
              Import Data
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => openDialog('export')}>
              <Download className="mr-2 h-4 w-4" />
              Export Data
            </DropdownMenuItem>
          </DropdownMenuGroup>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuLabel>File Management</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => {
            // Just close the menu, the button handles the actual import
            document.getElementById('import-folder-button')?.click();
          }}>
            <FolderUp className="mr-2 h-4 w-4" />
            Import Folder
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
      {/* Hidden button to be clicked programmatically */}
      <div className="hidden">
        <ImportFolderButton id="import-folder-button" />
      </div>
      
      {/* Import/Export Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogType === 'import' ? 'Import Data' : 'Export Data'}
            </DialogTitle>
            <DialogDescription>
              {dialogType === 'import'
                ? 'Import your notes, folders, and settings from a backup file.'
                : 'Export your notes, folders, and settings to a backup file.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {dialogType === 'import' ? (
              <div className="flex flex-col items-center">
                <div className="mb-4 text-center">
                  <FileJson className="h-12 w-12 mx-auto mb-2 text-primary" />
                  <p className="text-sm text-muted-foreground">
                    Select a CogniCore backup file (.json) to import
                  </p>
                </div>
                
                <input
                  type="file"
                  accept=".json"
                  id="import-file"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleImportData(file);
                    }
                  }}
                />
                
                <Button
                  onClick={() => document.getElementById('import-file')?.click()}
                  disabled={isProcessing}
                  className="w-full"
                >
                  {isProcessing ? (
                    <>
                      <FileUp className="h-4 w-4 mr-2 animate-bounce" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <FileUp className="h-4 w-4 mr-2" />
                      Select File
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="mb-4 text-center">
                  <FileArchive className="h-12 w-12 mx-auto mb-2 text-primary" />
                  <p className="text-sm text-muted-foreground">
                    Export all your notes, folders, and settings to a backup file
                  </p>
                </div>
                
                <Button
                  onClick={handleExportData}
                  disabled={isProcessing}
                  className="w-full"
                >
                  {isProcessing ? (
                    <>
                      <FileDown className="h-4 w-4 mr-2 animate-bounce" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <FileDown className="h-4 w-4 mr-2" />
                      Export Now
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ImportExportMenu;