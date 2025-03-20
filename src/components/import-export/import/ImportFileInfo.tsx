
import { FileQuestion, FilePlus, CheckCircle2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ImportFileInfoProps {
  files: File[];
  importFileValidation: {
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
  };
}

const ImportFileInfo = ({ files, importFileValidation }: ImportFileInfoProps) => {
  if (files.length === 0) {
    return (
      <div className="text-center text-muted-foreground p-4">
        <FileQuestion className="h-12 w-12 mx-auto mb-2 text-muted-foreground/50" />
        <p>No files selected</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium">Selected Files</h3>
      <div className="border rounded-md p-2 max-h-[150px] overflow-y-auto">
        {files.map((file, index) => (
          <div key={index} className="flex items-center justify-between py-1 px-2 odd:bg-muted/30 rounded">
            <div className="flex items-center">
              <FilePlus className="h-4 w-4 mr-2 text-muted-foreground" />
              <span className="text-sm">{file.name}</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {(file.size / 1024).toFixed(1)} KB
            </span>
          </div>
        ))}
      </div>
      
      {importFileValidation.isValidating && (
        <div className="flex justify-center items-center space-x-2">
          <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
          <span className="text-sm">Validating file...</span>
        </div>
      )}
      
      {importFileValidation.isValid && importFileValidation.packageInfo && (
        <Alert variant="default" className="bg-primary/5 border-primary/20">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          <AlertTitle>Valid CogniCore Export</AlertTitle>
          <AlertDescription className="text-xs space-y-1">
            <p>This file contains:</p>
            <ul className="list-disc list-inside">
              <li>{importFileValidation.packageInfo.noteCount} notes</li>
              <li>{importFileValidation.packageInfo.folderCount} folders</li>
              <li>{importFileValidation.packageInfo.fileCount} indexed files</li>
              {importFileValidation.packageInfo.hasSettings && (
                <li>Application settings</li>
              )}
            </ul>
            <p>Exported on: {importFileValidation.packageInfo.timestamp}</p>
            {importFileValidation.packageInfo.description && (
              <p>Description: {importFileValidation.packageInfo.description}</p>
            )}
          </AlertDescription>
        </Alert>
      )}
      
      {importFileValidation.isValid === false && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Invalid Import File</AlertTitle>
          <AlertDescription>
            {importFileValidation.error || "The selected file does not contain valid CogniCore data."}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default ImportFileInfo;
