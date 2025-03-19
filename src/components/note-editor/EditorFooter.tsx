
import { Trash } from 'lucide-react';

interface EditorFooterProps {
  hasCurrentNote: boolean;
  onDeleteClick: () => void;
}

const EditorFooter = ({ hasCurrentNote, onDeleteClick }: EditorFooterProps) => {
  return (
    <div className="p-4 border-t border-border flex items-center justify-between">
      <div className="text-xs text-muted-foreground">
        <span>Markdown supported • </span>
        <span>Press <kbd className="px-1.5 py-0.5 bg-secondary rounded text-xs">Ctrl+S</kbd> to save</span>
      </div>
      
      <button 
        onClick={onDeleteClick}
        className="flex items-center gap-1.5 text-destructive/70 hover:text-destructive button-hover-effect px-3 py-1.5 rounded-lg focus-ring"
        disabled={!hasCurrentNote}
      >
        <Trash className="w-4 h-4" />
        <span>Delete Note</span>
      </button>
    </div>
  );
};

export default EditorFooter;
