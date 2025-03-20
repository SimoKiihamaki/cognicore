
/**
 * Import and Export Service
 * Handles exporting and importing data for CogniCore
 */

import { Note, Folder, IndexedFile } from '@/lib/types';
import JSZip from 'jszip';

// Type definitions for exported data
export interface ExportPackage {
  type: 'cognicore-export';
  version: string;
  timestamp: string;
  creator?: string;
  description?: string;
  data: {
    notes?: Note[];
    folders?: Folder[];
    indexedFiles?: IndexedFile[];
    settings?: Record<string, any>;
  };
  metadata?: Record<string, any>;
}

export interface ImportOptions {
  importNotes: boolean;
  importFolders: boolean;
  importFiles: boolean;
  importSettings: boolean;
  overwriteExisting: boolean;
}

export interface MergeResult {
  notes: Note[];
  folders: Folder[];
  indexedFiles: IndexedFile[];
  settings: Record<string, any> | null;
  conflicts: {
    noteConflicts: string[];
    folderConflicts: string[];
    fileConflicts: string[];
  };
}

/**
 * Export data to a JSON file
 */
export function exportData(
  notes: Note[],
  files: IndexedFile[],
  folders: Folder[],
  settings: Record<string, any> = {},
  metadata: Record<string, any> = {}
): string {
  // Create the export package
  const exportPackage: ExportPackage = {
    type: 'cognicore-export',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    data: {
      notes: notes,
      folders: folders,
      indexedFiles: files,
      settings: settings
    },
    metadata: metadata
  };
  
  // Convert to JSON and create a blob
  const json = JSON.stringify(exportPackage, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  
  // Return the blob URL
  return URL.createObjectURL(blob);
}

/**
 * Download the exported file
 */
export function downloadExport(blobUrl: string, filename: string): void {
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  
  // Clean up
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  }, 100);
}

/**
 * Import data from a file
 */
export async function importFromFile(file: File): Promise<ExportPackage> {
  if (file.name.endsWith('.json')) {
    // Handle JSON import
    const text = await file.text();
    try {
      const data = JSON.parse(text);
      
      // Validate that it's a CogniCore export
      if (data.type !== 'cognicore-export') {
        throw new Error('Not a valid CogniCore export file');
      }
      
      return data as ExportPackage;
    } catch (error) {
      throw new Error(`Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  } else if (file.name.endsWith('.zip')) {
    // Handle ZIP import
    try {
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(file);
      
      // Look for the main export file
      const exportFile = zipContent.file('export.json');
      if (!exportFile) {
        throw new Error('No export.json found in the ZIP file');
      }
      
      const exportJson = await exportFile.async('string');
      const data = JSON.parse(exportJson);
      
      // Validate that it's a CogniCore export
      if (data.type !== 'cognicore-export') {
        throw new Error('Not a valid CogniCore export file');
      }
      
      return data as ExportPackage;
    } catch (error) {
      throw new Error(`Failed to extract ZIP: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  } else {
    throw new Error('Unsupported file format. Please use .json or .zip files.');
  }
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
): MergeResult {
  const result: MergeResult = {
    notes: [...existingNotes],
    folders: [...existingFolders],
    indexedFiles: [...existingFiles],
    settings: null,
    conflicts: {
      noteConflicts: [],
      folderConflicts: [],
      fileConflicts: []
    }
  };
  
  // Merge folders
  if (options.importFolders && importedData.data.folders) {
    for (const folder of importedData.data.folders) {
      const existingFolder = result.folders.find(f => f.id === folder.id);
      
      if (existingFolder) {
        result.conflicts.folderConflicts.push(folder.id);
        
        if (options.overwriteExisting) {
          // Replace existing folder
          const index = result.folders.findIndex(f => f.id === folder.id);
          result.folders[index] = { ...folder };
        }
      } else {
        // Add new folder
        result.folders.push({ ...folder });
      }
    }
  }
  
  // Merge notes
  if (options.importNotes && importedData.data.notes) {
    for (const note of importedData.data.notes) {
      const existingNote = result.notes.find(n => n.id === note.id);
      
      if (existingNote) {
        result.conflicts.noteConflicts.push(note.id);
        
        if (options.overwriteExisting) {
          // Replace existing note
          const index = result.notes.findIndex(n => n.id === note.id);
          result.notes[index] = { ...note };
        }
      } else {
        // Add new note
        result.notes.push({ ...note });
      }
    }
  }
  
  // Merge files
  if (options.importFiles && importedData.data.indexedFiles) {
    for (const file of importedData.data.indexedFiles) {
      const existingFile = result.indexedFiles.find(f => f.id === file.id);
      
      if (existingFile) {
        result.conflicts.fileConflicts.push(file.id);
        
        if (options.overwriteExisting) {
          // Replace existing file
          const index = result.indexedFiles.findIndex(f => f.id === file.id);
          result.indexedFiles[index] = { ...file };
        }
      } else {
        // Add new file
        result.indexedFiles.push({ ...file });
      }
    }
  }
  
  // Merge settings
  if (options.importSettings && importedData.data.settings) {
    result.settings = { ...importedData.data.settings };
  }
  
  return result;
}
