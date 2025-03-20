
import { Note, Folder, IndexedFile } from '@/lib/types';
import JSZip from 'jszip';

// Export Package type definition
export interface ExportPackage {
  metadata: {
    exportDate: string;
    version: string;
    description?: string;
    creator?: string;
    appVersion?: string;
    noteCount?: number;
    folderCount?: number;
    fileCount?: number;
    hasSettings?: boolean;
  };
  data: {
    notes: Note[];
    indexedFiles: IndexedFile[];
    folders: Folder[];
    settings: any;
  };
}

/**
 * Generate an export file and return its URL
 */
export function exportData(
  notes: Note[], 
  files: IndexedFile[], 
  folders: Folder[], 
  settings: any, 
  metadata: any = {}
): string {
  // Create a package object
  const exportPackage: ExportPackage = {
    metadata: {
      ...metadata,
      exportDate: new Date().toISOString(),
      version: '1.0.0',
      noteCount: notes.length,
      folderCount: folders.length,
      fileCount: files.length,
      hasSettings: !!settings && Object.keys(settings).length > 0
    },
    data: {
      notes,
      indexedFiles: files,
      folders,
      settings
    }
  };
  
  // Convert to JSON
  const json = JSON.stringify(exportPackage, null, 2);
  
  // Create a blob and URL
  const blob = new Blob([json], { type: 'application/json' });
  return URL.createObjectURL(blob);
}

/**
 * Trigger download of an export file
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
export async function importFromFile(file: File, options?: any): Promise<ExportPackage> {
  try {
    // Check file extension
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    
    if (fileExt === 'json') {
      // Parse JSON file
      const text = await file.text();
      const data = JSON.parse(text);
      return validateImportPackage(data) ? data : Promise.reject('Invalid import format');
    } else if (fileExt === 'zip') {
      // Unzip and parse archive
      const zip = new JSZip();
      const contents = await zip.loadAsync(file);
      
      // Look for manifest.json or main export file
      let mainFile = contents.file('manifest.json') || contents.file('export.json');
      
      if (!mainFile) {
        // Look for any JSON file
        const jsonFiles = Object.keys(contents.files).filter(name => name.endsWith('.json'));
        if (jsonFiles.length > 0) {
          mainFile = contents.file(jsonFiles[0]);
        }
      }
      
      if (mainFile) {
        const text = await mainFile.async('string');
        const data = JSON.parse(text);
        return validateImportPackage(data) ? data : Promise.reject('Invalid import format');
      }
      
      return Promise.reject('No valid export data found in ZIP file');
    } else {
      return Promise.reject(`Unsupported file format: ${fileExt}`);
    }
  } catch (error) {
    console.error('Import error:', error);
    return Promise.reject(error instanceof Error ? error.message : 'Failed to import file');
  }
}

/**
 * Validate that the imported data has the expected format
 */
export function validateImportPackage(data: any): boolean {
  // Basic validation that this is a CogniCore export
  return (
    data &&
    typeof data === 'object' &&
    data.metadata &&
    data.data &&
    Array.isArray(data.data.notes)
  );
}

/**
 * Merge imported data with existing data
 */
export function mergeImportedData(
  importedData: ExportPackage,
  existingNotes: Note[],
  existingFiles: IndexedFile[],
  existingFolders: Folder[],
  options: {
    importNotes: boolean;
    importFolders: boolean;
    importFiles: boolean;
    importSettings: boolean;
    overwriteExisting: boolean;
  }
) {
  const result = {
    notes: [...existingNotes],
    indexedFiles: [...existingFiles],
    folders: [...existingFolders],
    settings: null as any,
    conflicts: {
      noteConflicts: [] as string[],
      fileConflicts: [] as string[],
      folderConflicts: [] as string[]
    }
  };
  
  // Process folders first (notes may reference folders)
  if (options.importFolders && importedData.data.folders) {
    for (const importedFolder of importedData.data.folders) {
      const existingFolder = result.folders.find(f => f.id === importedFolder.id);
      
      if (existingFolder) {
        // This is a conflict
        result.conflicts.folderConflicts.push(importedFolder.id);
        
        if (options.overwriteExisting) {
          // Overwrite the existing folder
          const index = result.folders.findIndex(f => f.id === importedFolder.id);
          result.folders[index] = importedFolder;
        }
      } else {
        // Add new folder
        result.folders.push(importedFolder);
      }
    }
  }
  
  // Process notes
  if (options.importNotes && importedData.data.notes) {
    for (const importedNote of importedData.data.notes) {
      const existingNote = result.notes.find(n => n.id === importedNote.id);
      
      if (existingNote) {
        // This is a conflict
        result.conflicts.noteConflicts.push(importedNote.id);
        
        if (options.overwriteExisting) {
          // Overwrite the existing note
          const index = result.notes.findIndex(n => n.id === importedNote.id);
          result.notes[index] = importedNote;
        }
      } else {
        // Add new note
        result.notes.push(importedNote);
      }
    }
  }
  
  // Process indexed files
  if (options.importFiles && importedData.data.indexedFiles) {
    for (const importedFile of importedData.data.indexedFiles) {
      const existingFile = result.indexedFiles.find(f => f.id === importedFile.id);
      
      if (existingFile) {
        // This is a conflict
        result.conflicts.fileConflicts.push(importedFile.id);
        
        if (options.overwriteExisting) {
          // Overwrite the existing file
          const index = result.indexedFiles.findIndex(f => f.id === importedFile.id);
          result.indexedFiles[index] = importedFile;
        }
      } else {
        // Add new file
        result.indexedFiles.push(importedFile);
      }
    }
  }
  
  // Process settings
  if (options.importSettings && importedData.data.settings) {
    result.settings = importedData.data.settings;
  }
  
  return result;
}
