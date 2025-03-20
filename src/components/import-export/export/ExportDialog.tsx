
import { useState, useCallback } from 'react';
import { useImportExport } from '@/hooks/import-export/useImportExport';
import { useNotes } from '@/hooks/useNotes';
import { useFolders } from '@/hooks/useFolders';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from '@/components/ui/use-toast';
import { ExportJsonTab } from './';
import { ExportMarkdownTab } from './';
import { ExportCsvTab } from './';
import { ExportSummary } from './';
import { ExportFooter } from './';

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
  
  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value);
    
    // Update file format based on selected tab
    let format: 'json' | 'markdown' | 'csv' = 'json';
    
    if (value === 'json-export') format = 'json';
    else if (value === 'markdown-export') format = 'markdown';
    else if (value === 'csv-export') format = 'csv';
    
    setExportOptions(prev => ({
      ...prev,
      fileFormat: format
    }));
  }, []);
  
  const hasSelection = exportOptions.includeNotes || 
                      exportOptions.includeFolders || 
                      exportOptions.includeFiles || 
                      exportOptions.includeSettings;
  
  const startExport = useCallback(async () => {
    if (!hasSelection) {
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
    onOpenChange,
    hasSelection
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
        
        <Tabs defaultValue="json-export" value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="json-export">JSON</TabsTrigger>
            <TabsTrigger value="markdown-export">Markdown</TabsTrigger>
            <TabsTrigger value="csv-export">CSV</TabsTrigger>
          </TabsList>
          
          <TabsContent value="json-export">
            <ExportJsonTab 
              exportOptions={exportOptions}
              notesCount={notes.length}
              foldersCount={folderTree.length}
              onCheckboxChange={handleCheckboxChange}
              onTextChange={handleTextChange}
            />
          </TabsContent>
          
          <TabsContent value="markdown-export">
            <ExportMarkdownTab 
              exportOptions={exportOptions}
              onCheckboxChange={handleCheckboxChange}
              onTextChange={handleTextChange}
            />
          </TabsContent>
          
          <TabsContent value="csv-export">
            <ExportCsvTab 
              exportOptions={exportOptions}
              onTextChange={handleTextChange}
            />
          </TabsContent>
        </Tabs>
        
        <ExportSummary 
          exportOptions={exportOptions}
          notesCount={notes.length}
          foldersCount={folderTree.length}
        />
        
        <ExportFooter 
          isExporting={isExporting}
          hasSelection={hasSelection}
          onCancel={() => onOpenChange(false)}
          onExport={startExport}
        />
      </DialogContent>
    </Dialog>
  );
};

export default ExportDialog;
