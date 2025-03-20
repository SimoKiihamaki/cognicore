
import { useState, useEffect, useCallback } from 'react';
import { useNotes } from '@/hooks/useNotes';
import { useFolders } from '@/hooks/useFolders';
import { useEmbeddings } from '@/hooks/useEmbeddings';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

// Import refactored components
import EditorHeader from './note-editor/EditorHeader';
import FolderPath from './note-editor/FolderPath';
import EditorContent from './note-editor/EditorContent';
import EditorFooter from './note-editor/EditorFooter';
import DeleteNoteDialog from './note-editor/DeleteNoteDialog';
import FolderSelector from './note-editor/FolderSelector';

const NoteEditor = () => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [savedStatus, setSavedStatus] = useState<'unsaved' | 'saving' | 'saved'>('unsaved');
  const [selectedFolderId, setSelectedFolderId] = useState('root');
  const [currentNoteId, setCurrentNoteId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isFolderSelectorOpen, setIsFolderSelectorOpen] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [processingEmbeddings, setProcessingEmbeddings] = useState(false);
  const [saveTimer, setSaveTimer] = useState<NodeJS.Timeout | null>(null);
  
  const { 
    notes, 
    addNote, 
    updateNote, 
    deleteNote,
    getNote,
    findSimilarItems
  } = useNotes();
  
  const { 
    folderTree, 
    folders 
  } = useFolders();

  const {
    generateNoteEmbeddings
  } = useEmbeddings();
  
  // Find similar notes to the current content
  const similarNotes = useCallback(() => {
    if (!currentNoteId || !content.trim()) return [];
    
    return findSimilarItems(currentNoteId, 0.3, 5);
  }, [currentNoteId, content, findSimilarItems]);
  
  // Create a new note
  const createNewNote = () => {
    if (currentNoteId) {
      // If we're editing a note, save it first
      handleSave();
    }
    
    setTitle('');
    setContent('');
    setCurrentNoteId(null);
    setSavedStatus('unsaved');
    setIsPreviewMode(false);
  };
  
  // Load an existing note
  const loadNote = (noteId: string) => {
    const note = getNote(noteId);
    if (note) {
      setTitle(note.title);
      setContent(note.content);
      setSelectedFolderId(note.folderId);
      setCurrentNoteId(note.id);
      setSavedStatus('saved');
      setIsPreviewMode(false);
    }
  };

  // Auto-save timer
  useEffect(() => {
    // Clear any existing timer when content changes
    if (saveTimer) {
      clearTimeout(saveTimer);
    }
    
    // Only set auto-save if we have content and either a title or existing note
    if ((title.trim() || currentNoteId) && content.trim()) {
      // Set a new timer to save after 2 seconds of inactivity
      const timer = setTimeout(() => {
        handleSave();
      }, 2000);
      
      setSaveTimer(timer);
    }
    
    // Cleanup timer on unmount
    return () => {
      if (saveTimer) {
        clearTimeout(saveTimer);
      }
    };
  }, [title, content]);
  
  const handleSave = async () => {
    // Require at least a title
    if (!title.trim()) {
      toast.error('Please add a title to save your note.');
      return;
    }
    
    setSavedStatus('saving');
    
    try {
      if (currentNoteId) {
        // Update existing note
        updateNote(currentNoteId, {
          title,
          content,
          folderId: selectedFolderId
        });
      } else {
        // Create new note
        const newNoteId = addNote(title, content, selectedFolderId);
        setCurrentNoteId(newNoteId);
      }
      
      setSavedStatus('saved');
      toast.success('Note saved successfully');
      
      // Now generate embeddings in the background
      if (currentNoteId || currentNoteId !== null) {
        setProcessingEmbeddings(true);
        try {
          const noteId = currentNoteId || getNote(title)?.id;
          if (noteId) {
            const note = getNote(noteId);
            if (note) {
              await generateNoteEmbeddings(note);
            }
          }
        } catch (error) {
          console.error('Failed to generate embeddings:', error);
        } finally {
          setProcessingEmbeddings(false);
        }
      }
    } catch (error) {
      console.error('Failed to save note:', error);
      toast.error('Failed to save note. Please try again.');
      setSavedStatus('unsaved');
    }
    
    // Reset to unsaved after 5 seconds
    setTimeout(() => {
      if (savedStatus === 'saved') {
        setSavedStatus('unsaved');
      }
    }, 5000);
  };
  
  const handleDeleteNote = () => {
    if (currentNoteId) {
      deleteNote(currentNoteId);
      setIsDeleteDialogOpen(false);
      
      // Reset the editor
      createNewNote();
      
      toast.success('Note deleted successfully');
    }
  };
  
  // Get the flat path of a folder by its ID
  const getFolderPathById = (folderId: string): string[] => {
    const result: string[] = [];
    
    const findPath = (id: string): boolean => {
      const folder = folders.find(f => f.id === id);
      if (!folder) return false;
      
      result.unshift(folder.name);
      
      if (folder.parentId) {
        return findPath(folder.parentId);
      }
      
      return true;
    };
    
    findPath(folderId);
    return result;
  };
  
  const folderPath = getFolderPathById(selectedFolderId);
  const currentFolderName = folderPath[folderPath.length - 1] || 'Notes';

  // Key handler for the entire component
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Save on Ctrl+S or Command+S
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    
    document.addEventListener('keydown', handleGlobalKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [title, content, selectedFolderId, currentNoteId]);
  
  return (
    <div className="h-full flex flex-col">
      <EditorHeader
        title={title}
        currentNoteId={currentNoteId}
        savedStatus={savedStatus}
        folderName={currentFolderName}
        onSave={handleSave}
        onNewNote={createNewNote}
        onOpenFolderSelector={() => setIsFolderSelectorOpen(true)}
        onOpenDeleteDialog={() => setIsDeleteDialogOpen(true)}
        processingEmbeddings={processingEmbeddings}
      />
      
      <FolderPath folderPath={folderPath} />
      
      <EditorContent
        title={title}
        content={content}
        isPreviewMode={isPreviewMode}
        onTitleChange={setTitle}
        onContentChange={setContent}
        togglePreviewMode={() => setIsPreviewMode(!isPreviewMode)}
      />
      
      <EditorFooter
        hasCurrentNote={currentNoteId !== null}
        onDeleteClick={() => setIsDeleteDialogOpen(true)}
      />
      
      {currentNoteId && (
        <div className="border-t border-border p-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Similar Notes</h3>
            {processingEmbeddings && (
              <div className="flex items-center text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                Processing...
              </div>
            )}
          </div>
          <div className="mt-2">
            {similarNotes().length > 0 ? (
              <div className="grid grid-cols-1 gap-2">
                {similarNotes().map(note => (
                  <Button
                    key={note.id}
                    variant="outline"
                    size="sm"
                    className="justify-start text-xs h-auto py-1.5 font-normal"
                    onClick={() => loadNote(note.id)}
                  >
                    <div className="truncate">
                      {note.title}
                      <span className="ml-2 text-muted-foreground">
                        ({Math.round(note.similarity * 100)}% similar)
                      </span>
                    </div>
                  </Button>
                ))}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">
                No similar notes found.
              </div>
            )}
          </div>
        </div>
      )}
      
      <DeleteNoteDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onDelete={handleDeleteNote}
      />
      
      <FolderSelector
        isOpen={isFolderSelectorOpen}
        onOpenChange={setIsFolderSelectorOpen}
        folderTree={folderTree}
        selectedFolderId={selectedFolderId}
        onSelect={setSelectedFolderId}
      />
    </div>
  );
};

export default NoteEditor;
