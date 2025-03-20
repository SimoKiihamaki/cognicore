
export interface ImportFileValidation {
  isValidating: boolean;
  isValid: boolean | null;
  error: string | null;
  packageInfo: {
    noteCount: number;
    folderCount: number;
    fileCount: number;
    hasSettings: boolean;
    timestamp: string;
    description?: string;
  } | null;
}

export interface ImportDialogState {
  activeTab: string;
  files: File[];
  importOptions: {
    importNotes: boolean;
    importFolders: boolean;
    importFiles: boolean;
    importSettings: boolean;
    overwriteExisting: boolean;
  };
  dragActive: boolean;
  importFileValidation: ImportFileValidation;
}
