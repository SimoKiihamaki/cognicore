import { FC } from 'react';
import { 
  FilePlus, Save, Folder, Trash2, 
  Check, Loader2, Brain 
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EditorHeaderProps {
  title: string;
  currentNoteId: string | null;
  savedStatus: 'unsaved' | 'saving' | 'saved';
  folderName: string;
  processingEmbeddings?: boolean;
  onSave: () => void;
  onNewNote: () => void;
  onOpenFolderSelector: () => void;
  onOpenDeleteDialog: () => void;
}

const EditorHeader: FC<EditorHeaderProps> = ({
  title,
  currentNoteId,
  savedStatus,
  folderName,
  processingEmbeddings = false,
  onSave,
  onNewNote,
  onOpenFolderSelector,
  onOpenDeleteDialog
}) => {
  return (
    <div className="p-4 border-b border-border flex items-center justify-between gap-2">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-medium truncate">
            {title || "New Note"}
          </h2>
          
          {savedStatus === 'saving' && (
            <div className="flex items-center text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
              <span className="text-xs">Saving...</span>
            </div>
          )}
          
          {savedStatus === 'saved' && (
            <div className="flex items-center text-green-500">
              <Check className="h-3 w-3 mr-1" />
              <span className="text-xs">Saved</span>
            </div>
          )}
          
          {processingEmbeddings && (
            <div className="flex items-center text-blue-500">
              <Brain className="h-3 w-3 animate-pulse mr-1" />
              <span className="text-xs">Processing embeddings</span>
            </div>
          )}
        </div>
        <div className="text-sm text-muted-foreground flex items-center">
          <Folder className="h-3 w-3 inline mr-1" />
          <span>{folderName}</span>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={onOpenFolderSelector}
          title="Change folder"
        >
          <Folder className="h-4 w-4" />
        </Button>

        <Button
          variant="outline"
          size="icon"
          onClick={onNewNote}
          title="New note"
        >
          <FilePlus className="h-4 w-4" />
        </Button>

        <Button
          variant={savedStatus === 'unsaved' ? "default" : "outline"}
          size="sm"
          className="min-w-20"
          onClick={onSave}
          disabled={savedStatus === 'saving'}
        >
          {savedStatus === 'saving' ? (
            <>
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              Saving
            </>
          ) : (
            <>
              <Save className="mr-1 h-4 w-4" />
              Save
            </>
          )}
        </Button>

        {currentNoteId && (
          <Button
            variant="outline"
            size="icon"
            onClick={onOpenDeleteDialog}
            title="Delete note"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default EditorHeader;
