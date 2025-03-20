
import { useState } from 'react';
import { ImportOptions, ImportResult } from './types';
import { importData, validateImportFile } from '@/services/importExportService';
import { useToast } from '@/components/ui/use-toast';

/**
 * Hook for managing import operations for CogniCore data
 */
export function useImport() {
  const { toast } = useToast();
  const [importProgress, setImportProgress] = useState(0);
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState<ImportResult | null>(null);

  /**
   * Import data from a file
   */
  const importItems = async (file: File, options: ImportOptions) => {
    if (!file) {
      toast({
        title: "Import Error",
        description: "No file selected for import",
        variant: "destructive"
      });
      return null;
    }

    setIsImporting(true);
    setImportProgress(0);
    setImportResults(null);

    try {
      // Validate the file first
      const validationResult = await validateImportFile(file, options);
      
      if (!validationResult.valid) {
        throw new Error(validationResult.error || "Invalid import file");
      }

      // Start the actual import with progress tracking
      const updateProgress = (progress: number) => {
        setImportProgress(Math.round(progress));
      };

      // Pass all required arguments to importData
      const result = await importData(file, options, updateProgress);
      
      setImportResults(result);
      
      // Show success or warning toast based on result
      if (result.success) {
        if (result.warnings.length > 0) {
          toast({
            title: "Import Completed with Warnings",
            description: `Import completed with ${result.warnings.length} warnings.`,
            variant: "default"
          });
        } else {
          toast({
            title: "Import Successful",
            description: `Successfully imported data with ${result.importedItems.notes} notes, ${result.importedItems.folders} folders, and ${result.importedItems.files} files.`,
          });
        }
      } else {
        toast({
          title: "Import Failed",
          description: result.errors[0] || "Failed to import data",
          variant: "destructive"
        });
      }
      
      return result;
    } catch (error) {
      console.error("Import error:", error);
      
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during import";
      
      toast({
        title: "Import Failed",
        description: errorMessage,
        variant: "destructive"
      });
      
      setImportResults({
        success: false,
        importedItems: { notes: 0, folders: 0, files: 0, settings: false },
        conflicts: { noteConflicts: [], fileConflicts: [], folderConflicts: [] },
        errors: [errorMessage],
        warnings: []
      });
      
      return null;
    } finally {
      setIsImporting(false);
      setImportProgress(100); // Ensure progress shows complete
    }
  };

  return {
    importItems,
    isImporting,
    importProgress,
    importResults
  };
}
