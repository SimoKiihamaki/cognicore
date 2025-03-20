
import React from 'react';
import { Database } from 'lucide-react';

interface ExportSummaryProps {
  exportOptions: {
    includeNotes: boolean;
    includeFolders: boolean;
    includeSettings: boolean;
    includeEmbeddings: boolean;
  };
  notesCount: number;
  foldersCount: number;
}

const ExportSummary: React.FC<ExportSummaryProps> = ({
  exportOptions,
  notesCount,
  foldersCount
}) => {
  return (
    <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground mt-4">
      <div className="flex items-center">
        <Database className="h-3 w-3 mr-1" />
        <span>
          Ready to export{' '}
          {exportOptions.includeNotes && `${notesCount} notes`}
          {exportOptions.includeNotes && exportOptions.includeFolders && ', '}
          {exportOptions.includeFolders && `${foldersCount} folders`}
          {(exportOptions.includeNotes || exportOptions.includeFolders) && exportOptions.includeSettings && ', '}
          {exportOptions.includeSettings && 'settings'}
          {exportOptions.includeEmbeddings && ' (including embeddings)'}
        </span>
      </div>
    </div>
  );
};

export default ExportSummary;
