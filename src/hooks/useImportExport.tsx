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
  ExportPackage
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
    exportData: {
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
      // Collect data to export
      const notesToExport = exportData.includeNotes ? notes : [];
      
      // If we don't want to include embeddings, create a deep copy without embeddings
      const processedNotes = exportData.includeEmbeddings 
        ? notesToExport 
        : notesToExport.map(note => {
            const { embeddings, ...noteWithoutEmbeddings } = note;
            return noteWithoutEmbeddings as Note;
          });
      
      const foldersToExport = exportData.includeFolders ? folderTree : [];
      const filesToExport = exportData.includeFiles ? indexedFiles : [];
      
      // Get settings from localStorage
      const settingsToExport = exportData.includeSettings
        ? {
            lmStudio: JSON.parse(localStorage.getItem('lm-studio-config') || '{}'),
            appearance: JSON.parse(localStorage.getItem('appearance-settings') || '{}'),
            folders: JSON.parse(localStorage.getItem('cognicore-monitored-folders') || '[]')
          }
        : {};
      
      // Create additional metadata
      const metadata = {
        description: exportData.description,
        creator: 'CogniCore User',
        appVersion: '1.0.0' // This should be fetched from an app constants file
      };
      
      // Generate export file based on format
      const exportFormat = exportData.format;
      let blobUrl;
      let filename = `cognicore-export-${new Date().toISOString().replace(/[:.]/g, '-')}`;
      
      if (exportFormat === 'json') {
        // Use the import/export service to create a JSON export
        blobUrl = exportData(processedNotes, filesToExport, foldersToExport, settingsToExport, metadata);
        filename += '.json';
      } else if (exportFormat === 'markdown') {
        // For markdown export, a different approach would be needed
        // This is a simplified version for now
        
        if (exportData.splitFiles) {
          // This would generate a zip file with individual markdown files
          // For simplicity, we're just using JSON for now
          blobUrl = exportData(processedNotes, [], [], {}, metadata);
          filename += '-markdown.zip';
        } else {
          // Single markdown file with all notes
          const markdownContent = notesToExport.map(note => 
            `# ${note.title}\n\n${note.content}\n\n---\n\n`
          ).join('\n');
          
          const blob = new Blob([markdownContent], { type: 'text/markdown' });
          blobUrl = URL.createObjectURL(blob);
          filename += '.md';
        }
      } else if (exportFormat === 'csv') {
        // Create CSV representation of notes
        // This is a simplified version
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
      
      // Trigger download
      downloadExport(blobUrl, filename);
      
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
      // Handle FileList or array of Files
      const fileArray = Array.from(files);
      
      if (fileArray.length === 0) {
        throw new Error('No files selected for import');
      }
      
      // We'll focus on the first file for now
      const file = fileArray[0];
      setImportProgress(10);
      
      // Import and parse the file
      const importedData = await importFromFile(file);
      setImportProgress(40);
      
      // Merge imported data with existing data
      const mergeResult = mergeImportedData(
        importedData,
        notes,
        indexedFiles,
        folderTree as Folder[],
        {
          importNotes: options.importNotes,
          importFolders: options.importFolders,
          importFiles: options.importFiles,
          importSettings: options.importSettings,
          overwriteExisting: options.overwriteExisting
        }
      );
      
      setImportProgress(70);
      
      // Apply the merged data
      
      // Update folders first (notes may reference folders)
      if (options.importFolders && importedData.data.folders) {
        for (const folder of mergeResult.folders) {
          const existingFolder = folderTree.find(f => f.id === folder.id);
          
          if (existingFolder) {
            // Update existing folder
            // updateFolder(folder.id, folder); // This function does not exist
          } else {
            // Add new folder
            addFolder(folder);
          }
        }
      }
      
      // Update notes
      if (options.importNotes && importedData.data.notes) {
        for (const note of mergeResult.notes) {
          const existingNote = notes.find(n => n.id === note.id);
          
          if (existingNote) {
            // Update existing note
            updateNote(note.id, note);
          } else {
            // Add new note
            addNote(note);
          }
        }
      }
      
      // Update indexed files
      if (options.importFiles && importedData.data.indexedFiles) {
        setIndexedFiles(mergeResult.indexedFiles);
      }
      
      // Update settings if needed
      if (options.importSettings && importedData.data.settings && mergeResult.settings) {
        // Save each settings group to localStorage
        Object.entries(mergeResult.settings).forEach(([key, value]) => {
          if (value) {
            localStorage.setItem(`cognicore-${key}`, JSON.stringify(value));
          }
        });
      }
      
      setImportProgress(100);
      
      // Create result object
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
      
      // Add warnings for conflicts
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
  const quickExportAll = useCallback(async (includeEmbeddings: boolean = false) => {
    return exportItems({
      includeNotes: true,
      includeFolders: true,
      includeFiles: true,
      includeSettings: true,
      includeEmbeddings,
      format: 'json'
    });
  }, [exportItems]);
  
  /**
   * Export notes as Markdown
   */
  const exportNotesAsMarkdown = useCallback(async (splitFiles: boolean = false) => {
    return exportItems({
      includeNotes: true,
      includeFolders: false,
      includeFiles: false,
      includeSettings: false,
      includeEmbeddings: false,
      format: 'markdown',
      splitFiles
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
