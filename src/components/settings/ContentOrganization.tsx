
import { Settings } from '@/lib/types';
import { toast } from '@/components/ui/use-toast';
import { organizeNotes } from '@/utils/noteOrganizer';
import { useNotes } from '@/hooks/useNotes';
import { useFolders } from '@/hooks/useFolders';
import { Checkbox } from '@/components/ui/checkbox';

interface ContentOrganizationProps {
  settings: Settings;
  onUpdateSettings: (field: keyof Settings, value: any) => void;
}

const ContentOrganization = ({ settings, onUpdateSettings }: ContentOrganizationProps) => {
  const { notes, indexedFiles, updateNote } = useNotes();
  const { folders } = useFolders();
  
  const handleAutoOrganizeToggle = () => {
    const newValue = !settings.autoOrganizeNotes;
    onUpdateSettings('autoOrganizeNotes', newValue);
  };
  
  const handleSimilarityThresholdChange = (value: number) => {
    onUpdateSettings('similarityThreshold', Math.max(0, Math.min(1, value)));
  };
  
  const triggerAutoOrganize = async () => {
    if (!settings.autoOrganizeNotes) {
      toast({
        title: "Auto-organize is disabled",
        description: "Enable auto-organize in settings first",
        variant: "destructive"
      });
      return;
    }
    
    toast({
      title: "Organizing content",
      description: "This may take a moment...",
    });
    
    try {
      const result = await organizeNotes(
        notes,
        indexedFiles,
        folders,
        (noteId, folderId) => updateNote(noteId, { folderId }),
        settings.embeddingModelName,
        settings.similarityThreshold,
        settings.autoOrganizeNotes
      );
      
      toast({
        title: "Organization complete",
        description: `${result.appliedCount} notes were organized into folders. ${result.suggestions.length} organization suggestions were generated.`,
      });
    } catch (error) {
      toast({
        title: "Organization failed",
        description: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    }
  };
  
  return (
    <div className="space-y-4">
      <h3 className="text-md font-medium">Content Organization</h3>
      
      <div className="glass p-4 rounded-lg space-y-4">
        <div>
          <label className="flex items-center space-x-2">
            <Checkbox 
              checked={settings.autoOrganizeNotes}
              onCheckedChange={handleAutoOrganizeToggle}
            />
            <span>Auto-organize notes using embedding model</span>
          </label>
          <p className="text-xs text-muted-foreground mt-1 ml-6">
            Automatically suggest folder organization based on note content
          </p>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="similarityThreshold">
            Similarity Threshold: {settings.similarityThreshold.toFixed(2)}
          </label>
          <input
            id="similarityThreshold"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={settings.similarityThreshold}
            onChange={(e) => handleSimilarityThresholdChange(parseFloat(e.target.value))}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Higher values require content to be more similar for organization suggestions and graph connections.
          </p>
        </div>
        
        <div className="pt-2">
          <button
            onClick={triggerAutoOrganize}
            disabled={!settings.autoOrganizeNotes}
            className={`w-full py-2 rounded-md ${
              settings.autoOrganizeNotes
                ? 'bg-primary/10 text-primary hover:bg-primary/20'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
            }`}
          >
            Analyze and Organize Content
          </button>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            This will analyze all notes and indexed files, providing organization suggestions and applying them to notes.
            <br />
            <span className="font-medium">Note:</span> Indexed files will not be automatically moved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ContentOrganization;
