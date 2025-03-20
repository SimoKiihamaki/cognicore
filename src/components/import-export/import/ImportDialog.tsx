
import { useState, useCallback } from 'react';
import { useImportExport, ImportResult } from '@/hooks/import-export/useImportExport';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileUp } from 'lucide-react';
import { importFromFile, validateImportPackage } from '@/services/importExportService';

import { ImportFileUpload } from './';
import { ImportFileInfo } from './';
import { ImportOptions } from './';
import { ImportProgress } from './';

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ImportDialog = ({ open, onOpenChange }: ImportDialogProps) => {
  const { toast } = useToast();
  const { importItems, isImporting, importProgress, importResults } = useImportExport();
  
  const [activeTab, setActiveTab] = useState<string>('file-import');
  const [files, setFiles] = useState<File[]>([]);
  const [importOptions, setImportOptions] = useState({
    importNotes: true,
    importFolders: true,
    importFiles: true,
    importSettings: false,
    overwriteExisting: false,
  });
  const [dragActive, setDragActive] = useState(false);
  const [importFileValidation, setImportFileValidation] = useState<{
    isValidating: boolean;
    isValid: boolean | null;
    error: string | null;
    packageInfo: {
      noteCount: number;
      folderCount: number;
      fileCount: number;
      hasSettings: boolean;
      timestamp: string;
      description?: string;
    } | null;
  }>({
    isValidating: false,
    isValid: null,
    error: null,
    packageInfo: null,
  });
  
  // Handle import options change
  const handleOptionChange = useCallback((option: string, value: boolean) => {
    setImportOptions(prev => ({
      ...prev,
      [option]: value,
    }));
  }, []);
  
  // Validate a file
  const validateFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.json')) return;
    
    setImportFileValidation(prev => ({
      ...prev,
      isValidating: true,
      isValid: null,
      error: null,
      packageInfo: null,
    }));
    
    try {
      const data = await importFromFile(file);
      
      if (validateImportPackage(data)) {
        setImportFileValidation({
          isValidating: false,
          isValid: true,
          error: null,
          packageInfo: {
            noteCount: data.metadata.noteCount,
            folderCount: data.metadata.folderCount,
            fileCount: data.metadata.fileCount,
            hasSettings: data.metadata.hasSettings,
            timestamp: new Date(data.timestamp).toLocaleString(),
            description: data.metadata.description,
          }
        });
      } else {
        setImportFileValidation({
          isValidating: false,
          isValid: false,
          error: 'The file does not contain valid CogniCore data.',
          packageInfo: null,
        });
      }
    } catch (error) {
      setImportFileValidation({
        isValidating: false,
        isValid: false,
        error: error instanceof Error ? error.message : 'Failed to validate import file.',
        packageInfo: null,
      });
    }
  }, []);
  
  // Handle file selection
  const handleFileChange = useCallback(async (selectedFiles: File[]) => {
    setFiles(selectedFiles);
    
    // Validate the first file if it's a JSON file
    if (selectedFiles.length > 0 && selectedFiles[0].name.endsWith('.json')) {
      await validateFile(selectedFiles[0]);
    } else {
      // Reset validation for non-JSON files
      setImportFileValidation({
        isValidating: false,
        isValid: null,
        error: null,
        packageInfo: null,
      });
    }
  }, [validateFile]);
  
  // Handle drag events
  const handleDrag = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);
  
  // Handle drop event
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      setFiles(droppedFiles);
      
      // Validate the first file if it's a JSON file
      if (droppedFiles[0].name.endsWith('.json')) {
        validateFile(droppedFiles[0]);
      }
    }
  }, [validateFile]);
  
  // Start import process
  const startImport = useCallback(async () => {
    if (files.length === 0) {
      toast({
        title: "No Files Selected",
        description: "Please select at least one file to import.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await importItems(files, {
        importNotes: importOptions.importNotes,
        importFolders: importOptions.importFolders,
        importFiles: importOptions.importFiles,
        importSettings: importOptions.importSettings,
        overwriteExisting: importOptions.overwriteExisting
      });
      
      // Close dialog on successful import if there are no errors
      if (importResults && importResults.success && importResults.errors.length === 0) {
        setFiles([]);
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Import failed:', error);
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred during import.",
        variant: "destructive",
      });
    }
  }, [files, importItems, importOptions, importResults, onOpenChange, toast]);
  
  // Reset import state when dialog is closed
  const handleDialogChange = useCallback((open: boolean) => {
    if (!open) {
      // Reset state when closing dialog
      setFiles([]);
      setImportFileValidation({
        isValidating: false,
        isValid: null,
        error: null,
        packageInfo: null,
      });
      setImportOptions({
        importNotes: true,
        importFolders: true,
        importFiles: true,
        importSettings: false,
        overwriteExisting: false,
      });
    }
    onOpenChange(open);
  }, [onOpenChange]);
  
  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Import Data</DialogTitle>
          <DialogDescription>
            Import notes, folders, and settings from exported files
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="file-import" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-1 w-full">
            <TabsTrigger value="file-import">File Import</TabsTrigger>
          </TabsList>
          
          <TabsContent value="file-import" className="space-y-4 mt-4">
            {/* File Drop Area */}
            <ImportFileUpload
              onFileChange={handleFileChange}
              dragActive={dragActive}
              setDragActive={setDragActive}
              handleDrag={handleDrag}
              handleDrop={handleDrop}
            />
            
            {/* File Info */}
            <ImportFileInfo
              files={files}
              importFileValidation={importFileValidation}
            />
            
            {/* Import Options */}
            <ImportOptions
              importOptions={importOptions}
              handleOptionChange={handleOptionChange}
            />
            
            {/* Import Progress */}
            <ImportProgress
              isImporting={isImporting}
              importProgress={importProgress}
              importResults={importResults}
            />
          </TabsContent>
        </Tabs>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isImporting}
          >
            Cancel
          </Button>
          <Button
            onClick={startImport}
            disabled={
              isImporting || 
              files.length === 0 || 
              (importFileValidation.isValid === false)
            }
          >
            {isImporting ? (
              <>
                <div className="animate-spin h-4 w-4 mr-2 border-2 border-current border-t-transparent rounded-full" />
                Importing...
              </>
            ) : (
              <>
                <FileUp className="h-4 w-4 mr-2" />
                Import
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImportDialog;
