
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { ImportResult } from '@/hooks/import-export/types';

interface ImportProgressProps {
  isImporting: boolean;
  importProgress: number;
  importResults: ImportResult | null;
}

const ImportProgress = ({ isImporting, importProgress, importResults }: ImportProgressProps) => {
  if (!isImporting && !importResults) {
    return null;
  }
  
  return (
    <div className="space-y-2 mt-4">
      {isImporting && (
        <>
          <div className="flex justify-between text-sm">
            <span>Importing...</span>
            <span>{importProgress}%</span>
          </div>
          <Progress value={importProgress} className="h-2" />
        </>
      )}
      
      {importResults && (
        <Alert variant={importResults.success ? "default" : "destructive"}>
          {importResults.success ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertTitle>
            {importResults.success ? "Import Complete" : "Import Failed"}
          </AlertTitle>
          <AlertDescription>
            {importResults.success ? (
              <div className="text-sm">
                <p>Successfully imported:</p>
                <ul className="list-disc list-inside text-xs mt-1">
                  <li>{importResults.importedItems.notes} notes</li>
                  <li>{importResults.importedItems.folders} folders</li>
                  <li>{importResults.importedItems.files} indexed files</li>
                  {importResults.importedItems.settings && (
                    <li>Application settings</li>
                  )}
                </ul>
                {importResults.warnings.length > 0 && (
                  <div className="mt-2">
                    <p className="text-amber-500 font-medium text-xs">Warnings:</p>
                    <ul className="list-disc list-inside text-xs mt-1">
                      {importResults.warnings.map((warning, idx) => (
                        <li key={idx}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm">
                <p>{importResults.errors[0] || "An unknown error occurred during import."}</p>
                {importResults.errors.length > 1 && (
                  <p className="text-xs mt-1">
                    (and {importResults.errors.length - 1} more errors)
                  </p>
                )}
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default ImportProgress;
