import { useState, useCallback } from 'react';
import { useNotes } from './useNotes';
import { useFolders } from './useFolders';
import { useToast } from '@/components/ui/use-toast';
import { useLocalStorage } from './useLocalStorage';
import { 
  exportData, 
  downloadExport, 
  importFromFile,
  mergeImportedData,
  validateImportPackage
} from '@/services/importExportService';
import { Note, Folder, IndexedFile } from '@/lib/types';

export interface ImportOptions {
  importNotes: boolean;
  importFolders: boolean;
  importFiles: boolean;
  importSettings: boolean;
  overwriteExisting: boolean;
}

export interface ImportResult {
  success: boolean;
  importedItems: {
    notes: number;
    folders: number;
    files: number;
    settings: boolean;
  };
  conflicts: {
    noteConflicts: string[];
    fileConflicts: string[];
    folderConflicts: string[];
  };
  errors: string[];
  warnings: string[];
}

/**
 * Hook for managing import and export operations for CogniCore data
 */
export function useImportExport() {
  const { notes, addNote, updateNote } = useNotes();
  const { folderTree, addFolder } = useFolders();
  const [indexedFiles, setIndexedFiles] = useLocalStorage<IndexedFile[]>('cognicore-indexed-files', []);
  const { toast } = useToast();
  
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<ImportResult | null>(null);
  
  /**
   * Export data as a downloadable file
   */
  const exportItems = useCallback(async (
    exportOptions: {
      includeNotes: boolean;
      includeFolders: boolean;
      includeFiles: boolean; 
      includeSettings: boolean;
      includeEmbeddings: boolean;
      description?: string;
      format: 'json' | 'markdown' | 'csv';
      splitFiles?: boolean;
    }
  ) => {
    setIsExporting(true);
    
    try {
      const notesToExport = exportOptions.includeNotes ? notes : [];
      
      const processedNotes = exportOptions.includeEmbeddings 
        ? notesToExport 
        : notesToExport.map(note => {
            const { embeddings, ...noteWithoutEmbeddings } = note;
            return noteWithoutEmbeddings as Note;
          });
      
      const foldersToExport = exportOptions.includeFolders ? folderTree : [];
      const filesToExport = exportOptions.includeFiles ? indexedFiles : [];
      
      const settingsToExport = exportOptions.includeSettings
        ? {
            lmStudio: JSON.parse(localStorage.getItem('lm-studio-config') || '{}'),
            appearance: JSON.parse(localStorage.getItem('appearance-settings') || '{}'),
            folders: JSON.parse(localStorage.getItem('cognicore-monitored-folders') || '[]')
          }
        : {};
      
      const metadata = {
        description: exportOptions.description,
        creator: 'CogniCore User',
        appVersion: '1.0.0'
      };
      
      const exportFormat = exportOptions.format;
      let blobUrl;
      let filename = `cognicore-export-${new Date().toISOString().replace(/[:.]/g, '-')}`;
      
      if (exportFormat === 'json') {
        blobUrl = exportData(processedNotes, filesToExport, foldersToExport, settingsToExport, metadata);
        filename += '.json';
      } else if (exportFormat === 'markdown') {
        if (exportOptions.splitFiles) {
          blobUrl = exportData(processedNotes, [], [], {}, metadata);
          filename += '-markdown.zip';
        } else {
          const markdownContent = notesToExport.map(note => 
            `# ${note.title}\n\n${note.content}\n\n---\n\n`
          ).join('\n');
          
          const blob = new Blob([markdownContent], { type: 'text/markdown' });
          blobUrl = URL.createObjectURL(blob);
          filename += '.md';
        }
      } else if (exportFormat === 'csv') {
        const headers = 'id,title,createdAt,updatedAt,folderId\n';
        const rows = notesToExport.map(note => 
          `"${note.id}","${note.title.replace(/"/g, '""')}","${note.createdAt}","${note.updatedAt}","${note.folderId}"`
        ).join('\n');
        
        const blob = new Blob([headers + rows], { type: 'text/csv' });
        blobUrl = URL.createObjectURL(blob);
        filename += '.csv';
      } else {
        throw new Error(`Unsupported export format: ${exportFormat}`);
      }
      
      if (blobUrl) {
        downloadExport(blobUrl, filename);
      }
      
      toast({
        title: "Export Successful",
        description: `Your data has been exported as ${exportFormat.toUpperCase()}.`,
      });
      
      return true;
    } catch (error) {
      console.error('Export error:', error);
      
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Failed to export data.",
        variant: "destructive"
      });
      
      return false;
    } finally {
      setIsExporting(false);
    }
  }, [notes, folderTree, indexedFiles, toast]);
  
  /**
   * Import data from a file
   */
  const importItems = useCallback(async (
    files: FileList | File[],
    options: ImportOptions
  ): Promise<ImportResult> => {
    setIsImporting(true);
    setImportProgress(0);
    
    try {
      const fileArray = Array.from(files);
      
      if (fileArray.length === 0) {
        throw new Error('No files selected for import');
      }
      
      const file = fileArray[0];
      setImportProgress(10);
      
      const importedData = await importFromFile(file);
      setImportProgress(40);
      
      const mergeResult = mergeImportedData(
        importedData,
        notes,
        indexedFiles,
        folderTree as Folder[],
        options
      );
      
      setImportProgress(70);
      
      if (options.importFolders && importedData.data.folders) {
        for (const folder of mergeResult.folders) {
          const existingFolder = folderTree.find(f => f.id === folder.id);
          
          if (!existingFolder) {
            addFolder(folder);
          }
        }
      }
      
      if (options.importNotes && importedData.data.notes) {
        for (const note of mergeResult.notes) {
          const existingNote = notes.find(n => n.id === note.id);
          
          if (existingNote) {
            updateNote(note.id, note);
          } else {
            addNote(note);
          }
        }
      }
      
      if (options.importFiles && importedData.data.indexedFiles) {
        setIndexedFiles(mergeResult.indexedFiles);
      }
      
      if (options.importSettings && importedData.data.settings && mergeResult.settings) {
        Object.entries(mergeResult.settings).forEach(([key, value]) => {
          if (value) {
            localStorage.setItem(`cognicore-${key}`, JSON.stringify(value));
          }
        });
      }
      
      setImportProgress(100);
      
      const result: ImportResult = {
        success: true,
        importedItems: {
          notes: options.importNotes && importedData.data.notes 
            ? importedData.data.notes.length 
            : 0,
          folders: options.importFolders && importedData.data.folders 
            ? importedData.data.folders.length 
            : 0,
          files: options.importFiles && importedData.data.indexedFiles 
            ? importedData.data.indexedFiles.length 
            : 0,
          settings: options.importSettings && importedData.data.settings !== undefined
        },
        conflicts: mergeResult.conflicts,
        errors: [],
        warnings: []
      };
      
      if (mergeResult.conflicts.noteConflicts.length > 0) {
        result.warnings.push(`${mergeResult.conflicts.noteConflicts.length} note conflicts were ${options.overwriteExisting ? 'overwritten' : 'skipped'}.`);
      }
      
      if (mergeResult.conflicts.folderConflicts.length > 0) {
        result.warnings.push(`${mergeResult.conflicts.folderConflicts.length} folder conflicts were ${options.overwriteExisting ? 'overwritten' : 'skipped'}.`);
      }
      
      if (mergeResult.conflicts.fileConflicts.length > 0) {
        result.warnings.push(`${mergeResult.conflicts.fileConflicts.length} file conflicts were ${options.overwriteExisting ? 'overwritten' : 'skipped'}.`);
      }
      
      setImportResults(result);
      
      return result;
    } catch (error) {
      console.error('Import error:', error);
      
      const errorResult: ImportResult = {
        success: false,
        importedItems: {
          notes: 0,
          folders: 0,
          files: 0,
          settings: false
        },
        conflicts: {
          noteConflicts: [],
          fileConflicts: [],
          folderConflicts: []
        },
        errors: [error instanceof Error ? error.message : String(error)],
        warnings: []
      };
      
      setImportResults(errorResult);
      
      return errorResult;
    } finally {
      setIsImporting(false);
    }
  }, [notes, folderTree, indexedFiles, addNote, updateNote, addFolder, setIndexedFiles]);
  
  /**
   * Quick export all data as JSON
   */
  const quickExportAll = useCallback(async (includeEmbeddings: boolean = false, description: string = 'Quick export of all data') => {
    return await exportItems({
      includeNotes: true,
      includeFolders: true,
      includeFiles: true,
      includeSettings: true,
      includeEmbeddings,
      format: 'json',
      description
    });
  }, [exportItems]);
  
  /**
   * Export notes as Markdown
   */
  const exportNotesAsMarkdown = useCallback(async (splitFiles: boolean = false, description: string = 'Notes exported as Markdown') => {
    return await exportItems({
      includeNotes: true,
      includeFolders: false,
      includeFiles: false,
      includeSettings: false,
      includeEmbeddings: false,
      format: 'markdown',
      splitFiles,
      description
    });
  }, [exportItems]);
  
  return {
    exportItems,
    importItems,
    quickExportAll,
    exportNotesAsMarkdown,
    isExporting,
    isImporting,
    importProgress,
    importResults
  };
}
