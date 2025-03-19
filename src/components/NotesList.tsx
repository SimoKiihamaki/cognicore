
import { useState } from 'react';
import { useNotes } from '@/hooks/useNotes';
import { FileText, Calendar, Star, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface NotesListProps {
  folderId: string;
  onNoteSelect: (noteId: string) => void;
  selectedNoteId?: string | null;
}

const NotesList = ({ folderId, onNoteSelect, selectedNoteId }: NotesListProps) => {
  const { notes } = useNotes();
  const [sortBy, setSortBy] = useState<'updated' | 'created' | 'title'>('updated');
  
  // Filter notes by folder
  const folderNotes = notes.filter(note => note.folderId === folderId);
  
  // Sort notes based on sortBy value
  const sortedNotes = [...folderNotes].sort((a, b) => {
    if (sortBy === 'title') {
      return a.title.localeCompare(b.title);
    } else if (sortBy === 'created') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    } else {
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    }
  });
  
  if (sortedNotes.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-4 text-muted-foreground">
        <FileText className="w-12 h-12 mb-4 opacity-20" />
        <p className="text-center">No notes in this folder.</p>
      </div>
    );
  }
  
  return (
    <div className="h-full flex flex-col p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium">Notes</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSortBy('updated')}
            className={`px-2 py-1 rounded-md text-xs flex items-center gap-1 ${
              sortBy === 'updated' ? 'bg-primary/20 text-primary' : 'hover:bg-muted'
            }`}
          >
            <Clock className="w-3 h-3" />
            Updated
          </button>
          <button
            onClick={() => setSortBy('created')}
            className={`px-2 py-1 rounded-md text-xs flex items-center gap-1 ${
              sortBy === 'created' ? 'bg-primary/20 text-primary' : 'hover:bg-muted'
            }`}
          >
            <Calendar className="w-3 h-3" />
            Created
          </button>
          <button
            onClick={() => setSortBy('title')}
            className={`px-2 py-1 rounded-md text-xs flex items-center gap-1 ${
              sortBy === 'title' ? 'bg-primary/20 text-primary' : 'hover:bg-muted'
            }`}
          >
            <Star className="w-3 h-3" />
            Title
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="grid grid-cols-1 gap-3">
          {sortedNotes.map(note => (
            <button
              key={note.id}
              className={`glass text-left p-3 rounded-lg transition-colors hover:bg-accent/30 ${
                selectedNoteId === note.id ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => onNoteSelect(note.id)}
            >
              <h3 className="font-medium truncate">{note.title || 'Untitled'}</h3>
              <p className="text-sm text-muted-foreground truncate mt-1">
                {note.content.substring(0, 100) || 'No content'}
              </p>
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {format(new Date(note.updatedAt), 'MMM d, yyyy')}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NotesList;
