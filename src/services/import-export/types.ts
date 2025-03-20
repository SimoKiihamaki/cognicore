
import { Note, Folder, IndexedFile } from '@/lib/types';

/**
 * Export data structure
 */
export interface ExportPackage {
  version: string;
  timestamp: string;
  metadata: {
    noteCount: number;
    folderCount: number;
    fileCount: number;
    hasSettings: boolean;
    description?: string;
  };
  data: {
    notes: Note[];
    folders: Folder[];
    indexedFiles: IndexedFile[];
    settings?: Record<string, any>;
  };
}

/**
 * Import options
 */
export interface ImportOptions {
  importNotes: boolean;
  importFolders: boolean;
  importFiles: boolean;
  importSettings: boolean;
  overwriteExisting: boolean;
}

/**
 * Import results
 */
export interface MergeResults {
  notes: Note[];
  indexedFiles: IndexedFile[];
  folders: Folder[];
  settings: Record<string, any>;
  conflicts: {
    noteConflicts: string[];
    fileConflicts: string[];
    folderConflicts: string[];
  };
}
