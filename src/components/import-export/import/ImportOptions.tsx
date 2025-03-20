
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

interface ImportOptionsProps {
  importOptions: {
    importNotes: boolean;
    importFolders: boolean;
    importFiles: boolean;
    importSettings: boolean;
    overwriteExisting: boolean;
  };
  handleOptionChange: (option: string, value: boolean) => void;
}

const ImportOptions = ({ importOptions, handleOptionChange }: ImportOptionsProps) => {
  return (
    <div className="space-y-2 mt-4">
      <h3 className="text-sm font-medium">Import Options</h3>
      
      <div className="space-y-4 rounded-md border p-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="importNotes" className="flex flex-col">
            <span>Import Notes</span>
            <span className="font-normal text-xs text-muted-foreground">
              Import notes from the export file
            </span>
          </Label>
          <Switch
            id="importNotes"
            checked={importOptions.importNotes}
            onCheckedChange={(checked) => handleOptionChange('importNotes', checked)}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <Label htmlFor="importFolders" className="flex flex-col">
            <span>Import Folders</span>
            <span className="font-normal text-xs text-muted-foreground">
              Import folder structure from the export file
            </span>
          </Label>
          <Switch
            id="importFolders"
            checked={importOptions.importFolders}
            onCheckedChange={(checked) => handleOptionChange('importFolders', checked)}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <Label htmlFor="importFiles" className="flex flex-col">
            <span>Import Indexed Files</span>
            <span className="font-normal text-xs text-muted-foreground">
              Import indexed file references from the export file
            </span>
          </Label>
          <Switch
            id="importFiles"
            checked={importOptions.importFiles}
            onCheckedChange={(checked) => handleOptionChange('importFiles', checked)}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <Label htmlFor="importSettings" className="flex flex-col">
            <span>Import Settings</span>
            <span className="font-normal text-xs text-muted-foreground">
              Import application settings (LM Studio, appearance, etc.)
            </span>
          </Label>
          <Switch
            id="importSettings"
            checked={importOptions.importSettings}
            onCheckedChange={(checked) => handleOptionChange('importSettings', checked)}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <Label htmlFor="overwriteExisting" className="flex flex-col">
            <span>Overwrite Existing</span>
            <span className="font-normal text-xs text-muted-foreground">
              Replace existing items with the same ID
            </span>
          </Label>
          <Switch
            id="overwriteExisting"
            checked={importOptions.overwriteExisting}
            onCheckedChange={(checked) => handleOptionChange('overwriteExisting', checked)}
          />
        </div>
      </div>
    </div>
  );
};

export default ImportOptions;
