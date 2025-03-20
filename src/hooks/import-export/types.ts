
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

export interface ExportOptions {
  includeNotes: boolean;
  includeFolders: boolean;
  includeFiles: boolean;
  includeSettings: boolean;
  includeEmbeddings: boolean;
  description?: string;
  format: 'json' | 'markdown' | 'csv';
  splitFiles?: boolean;
}
