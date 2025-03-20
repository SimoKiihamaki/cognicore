import { useState, useCallback } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileDown, Save, Database, Download, Files, FileText, LucideFileJson } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { exportData, downloadExport } from '@/services/importExportService';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ExportDialog = ({ open, onOpenChange }: ExportDialogProps) => {
  const { toast } = useToast();
  const { notes } = useNotes();
  const { folderTree } = useFolders();
  const { exportItems, isExporting } = useImportExport();
  
  const [activeTab, setActiveTab] = useState<string>('json-export');
  const [exportOptions, setExportOptions] = useState({
    includeNotes: true,
    includeFolders: true,
    includeFiles: true,
    includeSettings: false,
    includeEmbeddings: false,
    exportDescription: '',
    splitFiles: false,
    fileFormat: 'json' as 'json' | 'markdown' | 'csv'
  });
  
  const handleCheckboxChange = useCallback((option: string, checked: boolean) => {
    setExportOptions(prev => ({
      ...prev,
      [option]: checked,
    }));
  }, []);
  
  const handleTextChange = useCallback((option: string, value: string) => {
    setExportOptions(prev => ({
      ...prev,
      [option]: value,
    }));
  }, []);
  
  const handleRadioChange = useCallback((value: string) => {
    setExportOptions(prev => ({
      ...prev,
      fileFormat: value as 'json' | 'markdown' | 'csv',
    }));
  }, []);
  
  const startExport = useCallback(async () => {
    if (!exportOptions.includeNotes && !exportOptions.includeFolders && 
        !exportOptions.includeFiles && !exportOptions.includeSettings) {
      toast({
        title: "Export Error",
        description: "Please select at least one data type to export.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const result = await exportItems({
        includeNotes: exportOptions.includeNotes,
        includeFolders: exportOptions.includeFolders,
        includeFiles: exportOptions.includeFiles,
        includeSettings: exportOptions.includeSettings,
        includeEmbeddings: exportOptions.includeEmbeddings,
        description: exportOptions.exportDescription || undefined,
        format: exportOptions.fileFormat,
        splitFiles: exportOptions.splitFiles
      });
      
      if (result) {
        toast({
          title: "Export Successful",
          description: `Your data has been exported successfully.`,
        });
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred during export.",
        variant: "destructive",
      });
    }
  }, [
    exportOptions, 
    exportItems,
    toast, 
    onOpenChange
  ]);
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Export Data</DialogTitle>
          <DialogDescription>
            Export your notes, folders, and settings for backup or sharing
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="json-export" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="json-export">JSON</TabsTrigger>
            <TabsTrigger value="markdown-export">Markdown</TabsTrigger>
            <TabsTrigger value="csv-export">CSV</TabsTrigger>
          </TabsList>
          
          <TabsContent value="json-export" className="space-y-4 mt-4">
            <div className="flex items-center space-x-3 rounded-md border p-4">
              <LucideFileJson className="h-8 w-8 text-blue-500" />
              <div>
                <h3 className="text-sm font-medium">JSON Export</h3>
                <p className="text-xs text-muted-foreground">
                  Export all data in JSON format for complete backups or transfers between devices.
                </p>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Export Options</h3>
              
              <div className="space-y-3 rounded-md border p-4">
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="includeNotes"
                    checked={exportOptions.includeNotes}
                    onCheckedChange={(checked) => 
                      handleCheckboxChange('includeNotes', checked as boolean)
                    }
                  />
                  <div className="space-y-1 leading-none">
                    <Label htmlFor="includeNotes">Include Notes</Label>
                    <p className="text-xs text-muted-foreground">
                      Export all notes and their content ({notes.length} notes)
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="includeFolders"
                    checked={exportOptions.includeFolders}
                    onCheckedChange={(checked) => 
                      handleCheckboxChange('includeFolders', checked as boolean)
                    }
                  />
                  <div className="space-y-1 leading-none">
                    <Label htmlFor="includeFolders">Include Folders</Label>
                    <p className="text-xs text-muted-foreground">
                      Export folder structure and organization ({folderTree.length} folders)
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="includeFiles"
                    checked={exportOptions.includeFiles}
                    onCheckedChange={(checked) => 
                      handleCheckboxChange('includeFiles', checked as boolean)
                    }
                  />
                  <div className="space-y-1 leading-none">
                    <Label htmlFor="includeFiles">Include Indexed Files</Label>
                    <p className="text-xs text-muted-foreground">
                      Export indexed file references and content
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="includeSettings"
                    checked={exportOptions.includeSettings}
                    onCheckedChange={(checked) => 
                      handleCheckboxChange('includeSettings', checked as boolean)
                    }
                  />
                  <div className="space-y-1 leading-none">
                    <Label htmlFor="includeSettings">Include Settings</Label>
                    <p className="text-xs text-muted-foreground">
                      Export application settings (LM Studio, appearance, etc.)
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="includeEmbeddings"
                    checked={exportOptions.includeEmbeddings}
                    onCheckedChange={(checked) => 
                      handleCheckboxChange('includeEmbeddings', checked as boolean)
                    }
                  />
                  <div className="space-y-1 leading-none">
                    <Label htmlFor="includeEmbeddings">Include Embeddings</Label>
                    <p className="text-xs text-muted-foreground">
                      Export vector embeddings (increases file size significantly)
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="exportDescription">Export Description (Optional)</Label>
                <Textarea
                  id="exportDescription"
                  placeholder="Add a description for this export..."
                  value={exportOptions.exportDescription}
                  onChange={(e) => handleTextChange('exportDescription', e.target.value)}
                  className="h-20"
                />
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="markdown-export" className="space-y-4 mt-4">
            <div className="flex items-center space-x-3 rounded-md border p-4">
              <FileText className="h-8 w-8 text-green-500" />
              <div>
                <h3 className="text-sm font-medium">Markdown Export</h3>
                <p className="text-xs text-muted-foreground">
                  Export notes as Markdown files for compatibility with other note-taking apps.
                </p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="markdown-format">Export Format</Label>
                <div className="flex flex-col space-y-2 rounded-md border p-4">
                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="splitFiles"
                      checked={exportOptions.splitFiles}
                      onCheckedChange={(checked) => 
                        handleCheckboxChange('splitFiles', checked as boolean)
                      }
                    />
                    <div className="space-y-1 leading-none">
                      <Label htmlFor="splitFiles">Export as Separate Files</Label>
                      <p className="text-xs text-muted-foreground">
                        Create individual .md files for each note (zipped)
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-2 pt-2">
                    <Checkbox
                      id="includeMetadata"
                      checked={true}
                      disabled={true}
                    />
                    <div className="space-y-1 leading-none">
                      <Label htmlFor="includeMetadata">Include Metadata</Label>
                      <p className="text-xs text-muted-foreground">
                        Add YAML frontmatter with creation date, tags, etc.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="exportDescription">Export Description (Optional)</Label>
                <Textarea
                  id="exportDescription"
                  placeholder="Add a description for this export..."
                  value={exportOptions.exportDescription}
                  onChange={(e) => handleTextChange('exportDescription', e.target.value)}
                  className="h-20"
                />
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="csv-export" className="space-y-4 mt-4">
            <div className="flex items-center space-x-3 rounded-md border p-4">
              <Files className="h-8 w-8 text-yellow-500" />
              <div>
                <h3 className="text-sm font-medium">CSV Export</h3>
                <p className="text-xs text-muted-foreground">
                  Export note metadata in CSV format for analysis or use in spreadsheets.
                </p>
              </div>
            </div>
            
            <div className="space-y-3 rounded-md border p-4">
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="includeContent"
                  checked={true}
                  disabled={true}
                />
                <div className="space-y-1 leading-none">
                  <Label htmlFor="includeContent">Include Note Content</Label>
                  <p className="text-xs text-muted-foreground">
                    Include full note content in the CSV export
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="includeMetadata"
                  checked={true}
                  disabled={true}
                />
                <div className="space-y-1 leading-none">
                  <Label htmlFor="includeMetadata">Include Metadata</Label>
                  <p className="text-xs text-muted-foreground">
                    Include creation date, update date, folder ID, etc.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="exportDescription">Export Description (Optional)</Label>
              <Textarea
                id="exportDescription"
                placeholder="Add a description for this export..."
                value={exportOptions.exportDescription}
                onChange={(e) => handleTextChange('exportDescription', e.target.value)}
                className="h-20"
              />
            </div>
          </TabsContent>
        </Tabs>
        
        <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground mt-4">
          <div className="flex items-center">
            <Database className="h-3 w-3 mr-1" />
            <span>
              Ready to export{' '}
              {exportOptions.includeNotes && `${notes.length} notes`}
              {exportOptions.includeNotes && exportOptions.includeFolders && ', '}
              {exportOptions.includeFolders && `${folderTree.length} folders`}
              {(exportOptions.includeNotes || exportOptions.includeFolders) && exportOptions.includeSettings && ', '}
              {exportOptions.includeSettings && 'settings'}
              {exportOptions.includeEmbeddings && ' (including embeddings)'}
            </span>
          </div>
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isExporting}
          >
            Cancel
          </Button>
          <Button
            onClick={startExport}
            disabled={
              isExporting || 
              (!exportOptions.includeNotes && 
               !exportOptions.includeFolders && 
               !exportOptions.includeFiles && 
               !exportOptions.includeSettings)
            }
          >
            {isExporting ? (
              <>
                <div className="animate-spin h-4 w-4 mr-2 border-2 border-current border-t-transparent rounded-full" />
                Exporting...
              </>
            ) : (
              <>
                <FileDown className="h-4 w-4 mr-2" />
                Export
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ExportDialog;
