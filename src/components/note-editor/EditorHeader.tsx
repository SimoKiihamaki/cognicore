
import { Save, MoreVertical, FolderOpen } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface EditorHeaderProps {
  title: string;
  currentNoteId: string | null;
  savedStatus: 'unsaved' | 'saving' | 'saved';
  folderName: string;
  onSave: () => void;
  onNewNote: () => void;
  onOpenFolderSelector: () => void;
  onOpenDeleteDialog: () => void;
}

const EditorHeader = ({
  title,
  currentNoteId,
  savedStatus,
  folderName,
  onSave,
  onNewNote,
  onOpenFolderSelector,
  onOpenDeleteDialog,
}: EditorHeaderProps) => {
  const getSaveButtonText = () => {
    switch (savedStatus) {
      case 'saving':
        return 'Saving...';
      case 'saved':
        return 'Saved';
      default:
        return 'Save';
    }
  };

  return (
    <div className="p-4 border-b border-border flex items-center justify-between">
      <div>
        <h2 className="text-lg font-medium">Note Editor</h2>
        <p className="text-sm text-muted-foreground">
          {currentNoteId ? 'Edit your note.' : 'Create a new note.'}
        </p>
      </div>
      
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenFolderSelector}
          className="px-3 py-1.5 rounded-lg flex items-center gap-1.5 bg-primary/10 text-primary hover:bg-primary/20 button-hover-effect focus-ring"
        >
          <FolderOpen className="w-4 h-4" />
          <span>{folderName || 'Notes'}</span>
        </button>
        
        <button
          onClick={onSave}
          disabled={savedStatus === 'saving' || (!title)}
          className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 focus-ring ${
            savedStatus === 'saving' || (!title)
              ? 'bg-muted text-muted-foreground cursor-not-allowed'
              : savedStatus === 'saved'
              ? 'bg-green-600/20 text-green-600 hover:bg-green-600/30'
              : 'bg-primary/10 text-primary hover:bg-primary/20 button-hover-effect'
          }`}
        >
          <Save className="w-4 h-4" />
          <span>{getSaveButtonText()}</span>
        </button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-2 rounded-lg button-hover-effect focus-ring">
              <MoreVertical className="w-5 h-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={onNewNote}>
              New Note
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={onOpenDeleteDialog}
              className="text-destructive"
              disabled={!currentNoteId}
            >
              Delete Note
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default EditorHeader;
