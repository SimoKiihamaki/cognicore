
import React from 'react';
import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';

interface ExportFooterProps {
  isExporting: boolean;
  hasSelection: boolean;
  onCancel: () => void;
  onExport: () => void;
}

const ExportFooter: React.FC<ExportFooterProps> = ({
  isExporting,
  hasSelection,
  onCancel,
  onExport
}) => {
  return (
    <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
      <Button
        variant="outline"
        onClick={onCancel}
        disabled={isExporting}
      >
        Cancel
      </Button>
      <Button
        onClick={onExport}
        disabled={isExporting || !hasSelection}
      >
        {isExporting ? (
          <>
            <div className="animate-spin h-4 w-4 mr-2 border-2 border-current border-t-transparent rounded-full" />
            Exporting...
          </>
        ) : (
          <>
            <FileDown className="h-4 w-4 mr-2" />
            Export
          </>
        )}
      </Button>
    </div>
  );
};

export default ExportFooter;
