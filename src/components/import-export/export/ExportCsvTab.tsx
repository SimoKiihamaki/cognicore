
import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Files } from 'lucide-react';

interface ExportCsvTabProps {
  exportOptions: {
    exportDescription: string;
  };
  onTextChange: (option: string, value: string) => void;
}

const ExportCsvTab: React.FC<ExportCsvTabProps> = ({
  exportOptions,
  onTextChange
}) => {
  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center space-x-3 rounded-md border p-4">
        <Files className="h-8 w-8 text-yellow-500" />
        <div>
          <h3 className="text-sm font-medium">CSV Export</h3>
          <p className="text-xs text-muted-foreground">
            Export note metadata in CSV format for analysis or use in spreadsheets.
          </p>
        </div>
      </div>
      
      <div className="space-y-3 rounded-md border p-4">
        <div className="flex items-start space-x-2">
          <Checkbox
            id="includeContent"
            checked={true}
            disabled={true}
          />
          <div className="space-y-1 leading-none">
            <Label htmlFor="includeContent">Include Note Content</Label>
            <p className="text-xs text-muted-foreground">
              Include full note content in the CSV export
            </p>
          </div>
        </div>
        
        <div className="flex items-start space-x-2">
          <Checkbox
            id="includeMetadata"
            checked={true}
            disabled={true}
          />
          <div className="space-y-1 leading-none">
            <Label htmlFor="includeMetadata">Include Metadata</Label>
            <p className="text-xs text-muted-foreground">
              Include creation date, update date, folder ID, etc.
            </p>
          </div>
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="exportDescription">Export Description (Optional)</Label>
        <Textarea
          id="exportDescription"
          placeholder="Add a description for this export..."
          value={exportOptions.exportDescription}
          onChange={(e) => onTextChange('exportDescription', e.target.value)}
          className="h-20"
        />
      </div>
    </div>
  );
};

export default ExportCsvTab;
