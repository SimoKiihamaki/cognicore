
import { useState, useEffect } from 'react';
import { useNotes } from '@/hooks/useNotes';
import { useFolders } from '@/hooks/useFolders';
import { toast } from 'sonner';

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
  const [savedStatus, setSavedStatus] = useState('unsaved');
  const [selectedFolderId, setSelectedFolderId] = useState('root');
  const [currentNoteId, setCurrentNoteId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isFolderSelectorOpen, setIsFolderSelectorOpen] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  
  const { 
    notes, 
    addNote, 
    updateNote, 
    deleteNote,
    getNote 
  } = useNotes();
  
  const { 
    folderTree, 
    folders 
  } = useFolders();
  
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
  
  const handleSave = () => {
    // Require at least a title
    if (!title.trim()) {
      toast.error('Please add a title to save your note.');
      return;
    }
    
    setSavedStatus('saving');
    
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
    
    // Reset to unsaved after 5 seconds
    setTimeout(() => {
      setSavedStatus('unsaved');
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
        savedStatus={savedStatus as 'unsaved' | 'saving' | 'saved'}
        folderName={currentFolderName}
        onSave={handleSave}
        onNewNote={createNewNote}
        onOpenFolderSelector={() => setIsFolderSelectorOpen(true)}
        onOpenDeleteDialog={() => setIsDeleteDialogOpen(true)}
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
