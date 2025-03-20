
import { Note, Folder, IndexedFile } from '@/lib/types';
import { ExportPackage, ImportOptions, MergeResults } from './types';

/**
 * Import data from file
 */
export async function importFromFile(file: File): Promise<ExportPackage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        if (!event.target?.result) {
          reject(new Error('Failed to read file'));
          return;
        }
        
        const data = JSON.parse(event.target.result as string);
        resolve(data);
      } catch (error) {
        reject(new Error('Invalid JSON format'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Error reading file'));
    };
    
    reader.readAsText(file);
  });
}

/**
 * Validate import package
 */
export function validateImportPackage(data: any): data is ExportPackage {
  if (!data) return false;
  
  // Check for required fields
  if (!data.version || !data.data) return false;
  
  // Check for data structure
  if (!data.data.notes || !Array.isArray(data.data.notes)) return false;
  if (!data.data.folders || !Array.isArray(data.data.folders)) return false;
  
  return true;
}

/**
 * Merge imported data with existing data
 */
export function mergeImportedData(
  importedData: ExportPackage,
  existingNotes: Note[],
  existingFiles: IndexedFile[],
  existingFolders: Folder[],
  options: ImportOptions
): MergeResults {
  const results: MergeResults = {
    notes: [...existingNotes],
    indexedFiles: [...existingFiles],
    folders: [...existingFolders],
    settings: importedData.data.settings || {},
    conflicts: {
      noteConflicts: [] as string[],
      fileConflicts: [] as string[],
      folderConflicts: [] as string[]
    }
  };
  
  // Import folders
  if (options.importFolders && importedData.data.folders) {
    for (const folder of importedData.data.folders) {
      const existingIndex = results.folders.findIndex(f => f.id === folder.id);
      
      if (existingIndex !== -1) {
        results.conflicts.folderConflicts.push(folder.id);
        
        if (options.overwriteExisting) {
          results.folders[existingIndex] = folder;
        }
      } else {
        results.folders.push(folder);
      }
    }
  }
  
  // Import notes
  if (options.importNotes && importedData.data.notes) {
    for (const note of importedData.data.notes) {
      const existingIndex = results.notes.findIndex(n => n.id === note.id);
      
      if (existingIndex !== -1) {
        results.conflicts.noteConflicts.push(note.id);
        
        if (options.overwriteExisting) {
          results.notes[existingIndex] = note;
        }
      } else {
        results.notes.push(note);
      }
    }
  }
  
  // Import indexed files
  if (options.importFiles && importedData.data.indexedFiles) {
    for (const file of importedData.data.indexedFiles) {
      const existingIndex = results.indexedFiles.findIndex(f => f.id === file.id);
      
      if (existingIndex !== -1) {
        results.conflicts.fileConflicts.push(file.id);
        
        if (options.overwriteExisting) {
          results.indexedFiles[existingIndex] = file;
        }
      } else {
        results.indexedFiles.push(file);
      }
    }
  }
  
  return results;
}
