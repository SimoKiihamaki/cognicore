
import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { LucideFileJson } from 'lucide-react';

interface ExportJsonTabProps {
  exportOptions: {
    includeNotes: boolean;
    includeFolders: boolean;
    includeFiles: boolean;
    includeSettings: boolean;
    includeEmbeddings: boolean;
    exportDescription: string;
  };
  notesCount: number;
  foldersCount: number;
  onCheckboxChange: (option: string, checked: boolean) => void;
  onTextChange: (option: string, value: string) => void;
}

const ExportJsonTab: React.FC<ExportJsonTabProps> = ({
  exportOptions,
  notesCount,
  foldersCount,
  onCheckboxChange,
  onTextChange
}) => {
  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center space-x-3 rounded-md border p-4">
        <LucideFileJson className="h-8 w-8 text-blue-500" />
        <div>
          <h3 className="text-sm font-medium">JSON Export</h3>
          <p className="text-xs text-muted-foreground">
            Export all data in JSON format for complete backups or transfers between devices.
          </p>
        </div>
      </div>
      
      <div className="space-y-4">
        <h3 className="text-sm font-medium">Export Options</h3>
        
        <div className="space-y-3 rounded-md border p-4">
          <div className="flex items-start space-x-2">
            <Checkbox
              id="includeNotes"
              checked={exportOptions.includeNotes}
              onCheckedChange={(checked) => 
                onCheckboxChange('includeNotes', checked as boolean)
              }
            />
            <div className="space-y-1 leading-none">
              <Label htmlFor="includeNotes">Include Notes</Label>
              <p className="text-xs text-muted-foreground">
                Export all notes and their content ({notesCount} notes)
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-2">
            <Checkbox
              id="includeFolders"
              checked={exportOptions.includeFolders}
              onCheckedChange={(checked) => 
                onCheckboxChange('includeFolders', checked as boolean)
              }
            />
            <div className="space-y-1 leading-none">
              <Label htmlFor="includeFolders">Include Folders</Label>
              <p className="text-xs text-muted-foreground">
                Export folder structure and organization ({foldersCount} folders)
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-2">
            <Checkbox
              id="includeFiles"
              checked={exportOptions.includeFiles}
              onCheckedChange={(checked) => 
                onCheckboxChange('includeFiles', checked as boolean)
              }
            />
            <div className="space-y-1 leading-none">
              <Label htmlFor="includeFiles">Include Indexed Files</Label>
              <p className="text-xs text-muted-foreground">
                Export indexed file references and content
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-2">
            <Checkbox
              id="includeSettings"
              checked={exportOptions.includeSettings}
              onCheckedChange={(checked) => 
                onCheckboxChange('includeSettings', checked as boolean)
              }
            />
            <div className="space-y-1 leading-none">
              <Label htmlFor="includeSettings">Include Settings</Label>
              <p className="text-xs text-muted-foreground">
                Export application settings (LM Studio, appearance, etc.)
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-2">
            <Checkbox
              id="includeEmbeddings"
              checked={exportOptions.includeEmbeddings}
              onCheckedChange={(checked) => 
                onCheckboxChange('includeEmbeddings', checked as boolean)
              }
            />
            <div className="space-y-1 leading-none">
              <Label htmlFor="includeEmbeddings">Include Embeddings</Label>
              <p className="text-xs text-muted-foreground">
                Export vector embeddings (increases file size significantly)
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
    </div>
  );
};

export default ExportJsonTab;
