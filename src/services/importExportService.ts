/**
 * Import/Export Service
 * Handles the import and export of notes, embeddings, and app settings
 */

import { Note, IndexedFile, Folder } from '@/lib/types';

// Define the structure for export/import packages
export interface ExportPackage {
  version: string;
  timestamp: number;
  data: {
    notes?: Note[];
    indexedFiles?: IndexedFile[];
    folders?: Folder[];
    settings?: Record<string, any>;
  };
  metadata: {
    noteCount: number;
    fileCount: number;
    folderCount: number;
    hasSettings: boolean;
    description?: string;
    creator?: string;
    appVersion?: string;
  };
}

/**
 * Validates an import package to ensure it has the correct structure
 * @param data The data to validate
 * @returns True if the data is valid, false otherwise
 */
export function validateImportPackage(data: any): boolean {
  // Check if the data has the correct structure
  if (!data || typeof data !== 'object') {
    return false;
  }

  // Check required top-level properties
  if (!('version' in data) || !('timestamp' in data) || !('data' in data) || !('metadata' in data)) {
    return false;
  }

  // Check that data is an object
  if (typeof data.data !== 'object' || data.data === null) {
    return false;
  }

  // Check metadata structure
  const metadata = data.metadata;
  if (typeof metadata !== 'object' || metadata === null) {
    return false;
  }

  // Check for required metadata fields
  if (!('noteCount' in metadata) || !('fileCount' in metadata) || 
      !('folderCount' in metadata) || !('hasSettings' in metadata)) {
    return false;
  }

  // All checks passed
  return true;
}

/**
 * Exports notes, files, folders, and optionally settings to a JSON file
 * 
 * @param notes Array of notes to export
 * @param indexedFiles Array of indexed files to export
 * @param folders Array of folders to export
 * @param settings Optional settings to export
 * @param metadata Additional metadata for the export
 * @returns A downloadable blob URL for the export file
 */
export function exportData(
  notes: Note[] = [], 
  indexedFiles: IndexedFile[] = [], 
  folders: Folder[] = [],
  settings: Record<string, any> = {},
  metadata: Partial<ExportPackage['metadata']> = {}
): string {
  // Create the export package
  const exportPackage: ExportPackage = {
    version: '1.0',
    timestamp: Date.now(),
    data: {
      notes: notes.length > 0 ? notes : undefined,
      indexedFiles: indexedFiles.length > 0 ? indexedFiles : undefined,
      folders: folders.length > 0 ? folders : undefined,
      settings: Object.keys(settings).length > 0 ? settings : undefined
    },
    metadata: {
      noteCount: notes.length,
      fileCount: indexedFiles.length,
      folderCount: folders.length,
      hasSettings: Object.keys(settings).length > 0,
      appVersion: '1.0.0', // This should be fetched from app constants
      ...metadata
    }
  };

  // Convert to JSON
  const jsonData = JSON.stringify(exportPackage, null, 2);
  
  // Create a blob and return the URL
  const blob = new Blob([jsonData], { type: 'application/json' });
  return URL.createObjectURL(blob);
}

/**
 * Triggers download of export data
 * 
 * @param blobUrl URL created by exportData function
 * @param filename Name for the downloaded file
 */
export function downloadExport(blobUrl: string, filename: string = 'cognicore-export.json'): void {
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(blobUrl); // Clean up the URL
}

/**
 * Imports data from a file
 * 
 * @param file The file to import
 * @returns A promise that resolves to the imported data
 */
export async function importFromFile(file: File): Promise<ExportPackage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        
        if (!validateImportPackage(data)) {
          reject(new Error('Invalid import file format. The file does not contain valid CogniCore data.'));
          return;
        }
        
        resolve(data as ExportPackage);
      } catch (error) {
        reject(new Error('Failed to parse import file. The file may be corrupted.'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read import file.'));
    };
    
    reader.readAsText(file);
  });
}

/**
 * Merges imported data with existing data
 * 
 * @param importedData The imported data package
 * @param existingNotes Existing notes
 * @param existingFiles Existing indexed files
 * @param existingFolders Existing folders
 * @param options Options for how to handle conflicts
 * @returns The merged data
 */
export function mergeImportedData(
  importedData: ExportPackage,
  existingNotes: Note[],
  existingFiles: IndexedFile[],
  existingFolders: Folder[],
  options: {
    overwriteExisting: boolean;
    importNotes: boolean;
    importFiles: boolean;
    importFolders: boolean;
    importSettings: boolean;
  }
): {
  notes: Note[];
  indexedFiles: IndexedFile[];
  folders: Folder[];
  settings?: Record<string, any>;
  conflicts: {
    noteConflicts: string[];
    fileConflicts: string[];
    folderConflicts: string[];
  };
} {
  // Track conflicts for reporting
  const conflicts = {
    noteConflicts: [] as string[],
    fileConflicts: [] as string[],
    folderConflicts: [] as string[]
  };
  
  // Handle folders first since notes depend on folders
  let mergedFolders = [...existingFolders];
  if (options.importFolders && importedData.data.folders) {
    const existingFolderIds = new Set(existingFolders.map(f => f.id));
    
    for (const folder of importedData.data.folders) {
      if (existingFolderIds.has(folder.id)) {
        conflicts.folderConflicts.push(folder.id);
        
        if (options.overwriteExisting) {
          // Replace the existing folder
          const index = mergedFolders.findIndex(f => f.id === folder.id);
          if (index !== -1) {
            mergedFolders[index] = folder;
          }
        }
      } else {
        // New folder, add it
        mergedFolders.push(folder);
      }
    }
  }
  
  // Handle notes
  let mergedNotes = [...existingNotes];
  if (options.importNotes && importedData.data.notes) {
    const existingNoteIds = new Set(existingNotes.map(n => n.id));
    
    for (const note of importedData.data.notes) {
      if (existingNoteIds.has(note.id)) {
        conflicts.noteConflicts.push(note.id);
        
        if (options.overwriteExisting) {
          // Replace the existing note
          const index = mergedNotes.findIndex(n => n.id === note.id);
          if (index !== -1) {
            mergedNotes[index] = note;
          }
        }
      } else {
        // New note, add it
        mergedNotes.push(note);
      }
    }
  }
  
  // Handle indexed files
  let mergedFiles = [...existingFiles];
  if (options.importFiles && importedData.data.indexedFiles) {
    const existingFileIds = new Set(existingFiles.map(f => f.id));
    
    for (const file of importedData.data.indexedFiles) {
      if (existingFileIds.has(file.id)) {
        conflicts.fileConflicts.push(file.id);
        
        if (options.overwriteExisting) {
          // Replace the existing file
          const index = mergedFiles.findIndex(f => f.id === file.id);
          if (index !== -1) {
            mergedFiles[index] = file;
          }
        }
      } else {
        // New file, add it
        mergedFiles.push(file);
      }
    }
  }
  
  // Return the merged data
  return {
    notes: mergedNotes,
    indexedFiles: mergedFiles,
    folders: mergedFolders,
    settings: options.importSettings ? importedData.data.settings : undefined,
    conflicts
  };
}
