
// This file is kept for backward compatibility
// It simply re-exports the refactored functionality
import { 
  useImportExport,
  type ImportOptions,
  type ImportResult,
  type ExportOptions
} from './import-export/useImportExport';

export { useImportExport };
export type { ImportOptions, ImportResult, ExportOptions };
