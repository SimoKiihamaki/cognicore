
import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FileText } from 'lucide-react';

interface ExportMarkdownTabProps {
  exportOptions: {
    splitFiles: boolean;
    exportDescription: string;
  };
  onCheckboxChange: (option: string, checked: boolean) => void;
  onTextChange: (option: string, value: string) => void;
}

const ExportMarkdownTab: React.FC<ExportMarkdownTabProps> = ({
  exportOptions,
  onCheckboxChange,
  onTextChange
}) => {
  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center space-x-3 rounded-md border p-4">
        <FileText className="h-8 w-8 text-green-500" />
        <div>
          <h3 className="text-sm font-medium">Markdown Export</h3>
          <p className="text-xs text-muted-foreground">
            Export notes as Markdown files for compatibility with other note-taking apps.
          </p>
        </div>
      </div>
      
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="markdown-format">Export Format</Label>
          <div className="flex flex-col space-y-2 rounded-md border p-4">
            <div className="flex items-start space-x-2">
              <Checkbox
                id="splitFiles"
                checked={exportOptions.splitFiles}
                onCheckedChange={(checked) => 
                  onCheckboxChange('splitFiles', checked as boolean)
                }
              />
              <div className="space-y-1 leading-none">
                <Label htmlFor="splitFiles">Export as Separate Files</Label>
                <p className="text-xs text-muted-foreground">
                  Create individual .md files for each note (zipped)
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-2 pt-2">
              <Checkbox
                id="includeMetadata"
                checked={true}
                disabled={true}
              />
              <div className="space-y-1 leading-none">
                <Label htmlFor="includeMetadata">Include Metadata</Label>
                <p className="text-xs text-muted-foreground">
                  Add YAML frontmatter with creation date, tags, etc.
                </p>
              </div>
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
    </div>
  );
};

export default ExportMarkdownTab;
