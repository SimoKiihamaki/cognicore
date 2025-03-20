import { useState, useCallback, useRef } from 'react';
import { useImportExport } from '@/hooks/useImportExport';
import { useNotes } from '@/hooks/useNotes';
import { useFolders } from '@/hooks/useFolders';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import {
  AlertCircle,
  CheckCircle2,
  FileQuestion,
  FilePlus,
  FileUp,
  FileWarning,
  Upload,
} from 'lucide-react';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from '@/components/ui/use-toast';
import { 
  importFromFile, 
  validateImportPackage 
} from '@/services/importExportService';

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ImportDialog = ({ open, onOpenChange }: ImportDialogProps) => {
  const { toast } = useToast();
  const { notes } = useNotes();
  const { folderTree } = useFolders();
  const { importItems, isImporting, importProgress, importResults } = useImportExport();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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
  
  // Handle file input change
  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const selectedFiles = Array.from(event.target.files);
      setFiles(selectedFiles);
      
      // Validate the first file if it's a JSON file
      if (selectedFiles[0].name.endsWith('.json')) {
        setImportFileValidation(prev => ({
          ...prev,
          isValidating: true,
          isValid: null,
          error: null,
          packageInfo: null,
        }));
        
        try {
          const data = await importFromFile(selectedFiles[0]);
          
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
      } else {
        // Reset validation for non-JSON files
        setImportFileValidation({
          isValidating: false,
          isValid: null,
          error: null,
          packageInfo: null,
        });
      }
    }
  }, []);
  
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
      setFiles(Array.from(e.dataTransfer.files));
      
      // Validate the first file if it's a JSON file
      if (e.dataTransfer.files[0].name.endsWith('.json')) {
        // Similar validation logic as handleFileChange
        // This is a simplified version for brevity
        validateDroppedFile(e.dataTransfer.files[0]);
      }
    }
  }, []);
  
  // Validate a dropped file
  const validateDroppedFile = async (file: File) => {
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
  };
  
  // Trigger file input click
  const triggerFileSelect = useCallback(() => {
    fileInputRef.current?.click();
  }, []);
  
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
  const handleDialogChange = (open: boolean) => {
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
  };
  
  // Render file information
  const renderFileInfo = () => {
    if (files.length === 0) {
      return (
        <div className="text-center text-muted-foreground p-4">
          <FileQuestion className="h-12 w-12 mx-auto mb-2 text-muted-foreground/50" />
          <p>No files selected</p>
        </div>
      );
    }
    
    return (
      <div className="space-y-4">
        <h3 className="text-sm font-medium">Selected Files</h3>
        <div className="border rounded-md p-2 max-h-[150px] overflow-y-auto">
          {files.map((file, index) => (
            <div key={index} className="flex items-center justify-between py-1 px-2 odd:bg-muted/30 rounded">
              <div className="flex items-center">
                <FilePlus className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="text-sm">{file.name}</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {(file.size / 1024).toFixed(1)} KB
              </span>
            </div>
          ))}
        </div>
        
        {importFileValidation.isValidating && (
          <div className="flex justify-center items-center space-x-2">
            <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
            <span className="text-sm">Validating file...</span>
          </div>
        )}
        
        {importFileValidation.isValid && importFileValidation.packageInfo && (
          <Alert variant="default" className="bg-primary/5 border-primary/20">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <AlertTitle>Valid CogniCore Export</AlertTitle>
            <AlertDescription className="text-xs space-y-1">
              <p>This file contains:</p>
              <ul className="list-disc list-inside">
                <li>{importFileValidation.packageInfo.noteCount} notes</li>
                <li>{importFileValidation.packageInfo.folderCount} folders</li>
                <li>{importFileValidation.packageInfo.fileCount} indexed files</li>
                {importFileValidation.packageInfo.hasSettings && (
                  <li>Application settings</li>
                )}
              </ul>
              <p>Exported on: {importFileValidation.packageInfo.timestamp}</p>
              {importFileValidation.packageInfo.description && (
                <p>Description: {importFileValidation.packageInfo.description}</p>
              )}
            </AlertDescription>
          </Alert>
        )}
        
        {importFileValidation.isValid === false && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Invalid Import File</AlertTitle>
            <AlertDescription>
              {importFileValidation.error || "The selected file does not contain valid CogniCore data."}
            </AlertDescription>
          </Alert>
        )}
      </div>
    );
  };
  
  // Render import progress
  const renderImportProgress = () => {
    if (!isImporting && !importResults) {
      return null;
    }
    
    return (
      <div className="space-y-2 mt-4">
        {isImporting && (
          <>
            <div className="flex justify-between text-sm">
              <span>Importing...</span>
              <span>{importProgress}%</span>
            </div>
            <Progress value={importProgress} className="h-2" />
          </>
        )}
        
        {importResults && (
          <Alert variant={importResults.success ? "default" : "destructive"}>
            {importResults.success ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertTitle>
              {importResults.success ? "Import Complete" : "Import Failed"}
            </AlertTitle>
            <AlertDescription>
              {importResults.success ? (
                <div className="text-sm">
                  <p>Successfully imported:</p>
                  <ul className="list-disc list-inside text-xs mt-1">
                    <li>{importResults.importedItems.notes} notes</li>
                    <li>{importResults.importedItems.folders} folders</li>
                    <li>{importResults.importedItems.files} indexed files</li>
                    {importResults.importedItems.settings && (
                      <li>Application settings</li>
                    )}
                  </ul>
                  {importResults.warnings.length > 0 && (
                    <div className="mt-2">
                      <p className="text-amber-500 font-medium text-xs">Warnings:</p>
                      <ul className="list-disc list-inside text-xs mt-1">
                        {importResults.warnings.map((warning, idx) => (
                          <li key={idx}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm">
                  <p>{importResults.errors[0] || "An unknown error occurred during import."}</p>
                  {importResults.errors.length > 1 && (
                    <p className="text-xs mt-1">
                      (and {importResults.errors.length - 1} more errors)
                    </p>
                  )}
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}
      </div>
    );
  };
  
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
            <div 
              className={`border-2 border-dashed rounded-md p-6 text-center transition-colors ${
                dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/20'
              }`}
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
            >
              <FileUp className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm font-medium">
                Drag & drop files here or
              </p>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={triggerFileSelect}
                className="mt-2"
              >
                <Upload className="h-4 w-4 mr-2" />
                Browse Files
              </Button>
              <Input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileChange}
                multiple
                accept=".json,.md,.csv,.zip"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Supports: JSON, Markdown, CSV, or ZIP
              </p>
            </div>
            
            {/* File Info */}
            {renderFileInfo()}
            
            {/* Import Options */}
            <div className="space-y-2 mt-4">
              <h3 className="text-sm font-medium">Import Options</h3>
              
              <div className="space-y-4 rounded-md border p-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="importNotes" className="flex flex-col">
                    <span>Import Notes</span>
                    <span className="font-normal text-xs text-muted-foreground">
                      Import notes from the export file
                    </span>
                  </Label>
                  <Switch
                    id="importNotes"
                    checked={importOptions.importNotes}
                    onCheckedChange={(checked) => handleOptionChange('importNotes', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="importFolders" className="flex flex-col">
                    <span>Import Folders</span>
                    <span className="font-normal text-xs text-muted-foreground">
                      Import folder structure from the export file
                    </span>
                  </Label>
                  <Switch
                    id="importFolders"
                    checked={importOptions.importFolders}
                    onCheckedChange={(checked) => handleOptionChange('importFolders', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="importFiles" className="flex flex-col">
                    <span>Import Indexed Files</span>
                    <span className="font-normal text-xs text-muted-foreground">
                      Import indexed file references from the export file
                    </span>
                  </Label>
                  <Switch
                    id="importFiles"
                    checked={importOptions.importFiles}
                    onCheckedChange={(checked) => handleOptionChange('importFiles', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="importSettings" className="flex flex-col">
                    <span>Import Settings</span>
                    <span className="font-normal text-xs text-muted-foreground">
                      Import application settings (LM Studio, appearance, etc.)
                    </span>
                  </Label>
                  <Switch
                    id="importSettings"
                    checked={importOptions.importSettings}
                    onCheckedChange={(checked) => handleOptionChange('importSettings', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="overwriteExisting" className="flex flex-col">
                    <span>Overwrite Existing</span>
                    <span className="font-normal text-xs text-muted-foreground">
                      Replace existing items with the same ID
                    </span>
                  </Label>
                  <Switch
                    id="overwriteExisting"
                    checked={importOptions.overwriteExisting}
                    onCheckedChange={(checked) => handleOptionChange('overwriteExisting', checked)}
                  />
                </div>
              </div>
            </div>
            
            {/* Import Progress */}
            {renderImportProgress()}
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
