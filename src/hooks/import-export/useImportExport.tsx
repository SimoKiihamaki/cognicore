
import { useImport } from './useImport';
import { useExport } from './useExport';
import { ImportOptions, ImportResult, ExportOptions } from './types';

/**
 * Combined hook for managing import and export operations for CogniCore data
 */
export function useImportExport() {
  const { 
    importItems, 
    isImporting, 
    importProgress, 
    importResults 
  } = useImport();
  
  const { 
    exportItems, 
    quickExportAll, 
    exportNotesAsMarkdown, 
    isExporting 
  } = useExport();

  return {
    // Import functionality
    importItems,
    isImporting,
    importProgress,
    importResults,
    
    // Export functionality
    exportItems,
    quickExportAll,
    exportNotesAsMarkdown,
    isExporting
  };
}

// Re-export types for external use
export type { ImportOptions, ImportResult, ExportOptions };
