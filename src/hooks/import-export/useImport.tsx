
import { useState, useCallback } from 'react';
import { useNotes } from '../useNotes';
import { useFolders } from '../useFolders';
import { useLocalStorage } from '../useLocalStorage';
import { useToast } from '@/components/ui/use-toast';
import { 
  importFromFile,
  mergeImportedData,
  validateImportPackage
} from '@/services/importExportService';
import { ImportOptions, ImportResult } from './types';
import { Note, Folder, IndexedFile } from '@/lib/types';

/**
 * Hook for managing import operations for CogniCore data
 */
export function useImport() {
  const { notes, addNote, updateNote } = useNotes();
  const { folderTree, addFolder } = useFolders();
  const [indexedFiles, setIndexedFiles] = useLocalStorage<IndexedFile[]>('cognicore-indexed-files', []);
  const { toast } = useToast();
  
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<ImportResult | null>(null);
  
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

  return {
    importItems,
    isImporting,
    importProgress,
    importResults
  };
}
