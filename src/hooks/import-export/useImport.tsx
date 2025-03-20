
import { useState } from 'react';
import { ImportOptions, ImportResult } from './types';
import { 
  importFromFile, 
  validateImportPackage, 
  mergeImportedData 
} from '@/services/import-export/importService';
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
   * Import data from files
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
      // Start simulating progress
      const progressInterval = setInterval(() => {
        setImportProgress(prev => {
          const newProgress = prev + Math.random() * 10;
          return newProgress > 90 ? 90 : newProgress;
        });
      }, 300);

      // Import and validate the file
      const importedData = await importFromFile(file);
      
      if (!validateImportPackage(importedData)) {
        throw new Error("Invalid import file format");
      }
      
      // Simulate the import process (in a real app, this would be replaced with actual import logic)
      // For demo purposes, we're just using sample data
      const sampleExistingData = {
        notes: [],
        indexedFiles: [],
        folders: []
      };
      
      // Merge the imported data with existing data based on options
      const mergedData = mergeImportedData(
        importedData,
        sampleExistingData.notes,
        sampleExistingData.indexedFiles,
        sampleExistingData.folders,
        options
      );
      
      // Clear progress interval
      clearInterval(progressInterval);
      setImportProgress(100);
      
      // Prepare import results
      const result: ImportResult = {
        success: true,
        importedItems: {
          notes: options.importNotes ? importedData.data.notes.length : 0,
          folders: options.importFolders ? importedData.data.folders.length : 0,
          files: options.importFiles ? (importedData.data.indexedFiles?.length || 0) : 0,
          settings: options.importSettings && !!importedData.data.settings
        },
        conflicts: mergedData.conflicts,
        errors: [],
        warnings: mergedData.conflicts.noteConflicts.length > 0 ||
                 mergedData.conflicts.fileConflicts.length > 0 ||
                 mergedData.conflicts.folderConflicts.length > 0 
                 ? ["Some items had conflicts. " + 
                    (options.overwriteExisting ? "They were overwritten as specified." : "They were skipped as specified.")] 
                 : []
      };
      
      setImportResults(result);
      
      // Show success or warning toast based on result
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
