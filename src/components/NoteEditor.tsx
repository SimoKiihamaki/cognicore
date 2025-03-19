
import { useState, useEffect, useRef } from 'react';
import { useNotes } from '@/hooks/useNotes';
import { useFolders, FolderWithChildren } from '@/hooks/useFolders';
import { Save, MoreVertical, Trash, FolderOpen } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import MarkdownToolbar from './markdown/MarkdownToolbar';
import MarkdownPreview from './markdown/MarkdownPreview';
import { insertMarkdown, insertLineMarkdown, handleMarkdownShortcuts } from '@/utils/markdownUtils';

const NoteEditor = () => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [savedStatus, setSavedStatus] = useState('unsaved');
  const [selectedFolderId, setSelectedFolderId] = useState('root');
  const [currentNoteId, setCurrentNoteId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isFolderSelectorOpen, setIsFolderSelectorOpen] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  
  const contentRef = useRef<HTMLTextAreaElement>(null);
  
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
  
  const handleMarkdownAction = (action: string, options?: any) => {
    if (!contentRef.current || isPreviewMode) return;
    
    const textarea = contentRef.current;
    
    switch (action) {
      case 'bold':
        insertMarkdown(textarea, '**', '**', 'bold text');
        break;
      case 'italic':
        insertMarkdown(textarea, '*', '*', 'italic text');
        break;
      case 'strikethrough':
        insertMarkdown(textarea, '~~', '~~', 'strikethrough text');
        break;
      case 'heading1':
        insertLineMarkdown(textarea, '# ', 'Heading 1');
        break;
      case 'heading2':
        insertLineMarkdown(textarea, '## ', 'Heading 2');
        break;
      case 'heading3':
        insertLineMarkdown(textarea, '### ', 'Heading 3');
        break;
      case 'bulletList':
        insertLineMarkdown(textarea, '- ', 'List item');
        break;
      case 'orderedList':
        insertLineMarkdown(textarea, '1. ', 'List item');
        break;
      case 'code':
        if (textarea.value.substring(textarea.selectionStart, textarea.selectionEnd).includes('\n')) {
          insertMarkdown(textarea, '```\n', '\n```', 'code block');
        } else {
          insertMarkdown(textarea, '`', '`', 'inline code');
        }
        break;
      case 'quote':
        insertLineMarkdown(textarea, '> ', 'Blockquote');
        break;
      case 'link':
        insertMarkdown(textarea, '[', '](https://example.com)', 'link text');
        break;
      case 'image':
        insertMarkdown(textarea, '![', '](https://example.com/image.jpg)', 'alt text');
        break;
      default:
        break;
    }
    
    // Update content state after modification
    if (textarea) {
      setContent(textarea.value);
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (contentRef.current) {
      if (handleMarkdownShortcuts(e, contentRef.current)) {
        // Update content state after shortcut
        setContent(contentRef.current.value);
      }
    }
    
    // Save on Ctrl+S or Command+S
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      handleSave();
    }
  };
  
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
  
  const togglePreviewMode = () => {
    setIsPreviewMode(!isPreviewMode);
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
  
  const renderFolderOption = (folder: FolderWithChildren, level = 0) => (
    <div key={folder.id}>
      <button
        className={`w-full text-left px-4 py-2 text-sm hover:bg-accent
          ${folder.id === selectedFolderId ? 'bg-accent font-medium' : ''}
          ${level > 0 ? `ml-${level * 2}` : ''}`}
        onClick={() => {
          setSelectedFolderId(folder.id);
          setIsFolderSelectorOpen(false);
        }}
      >
        <span className="ml-2">{folder.name}</span>
      </button>
      {folder.children.map(child => renderFolderOption(child, level + 1))}
    </div>
  );
  
  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium">Note Editor</h2>
          <p className="text-sm text-muted-foreground">
            {currentNoteId ? 'Edit your note.' : 'Create a new note.'}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsFolderSelectorOpen(true)}
            className="px-3 py-1.5 rounded-lg flex items-center gap-1.5 bg-primary/10 text-primary hover:bg-primary/20 button-hover-effect focus-ring"
          >
            <FolderOpen className="w-4 h-4" />
            <span>{folderPath[folderPath.length - 1] || 'Notes'}</span>
          </button>
          
          <button
            onClick={handleSave}
            disabled={savedStatus === 'saving' || (!title && !content)}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 focus-ring ${
              savedStatus === 'saving' || (!title && !content)
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
              <DropdownMenuItem onClick={createNewNote}>
                New Note
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => setIsDeleteDialogOpen(true)}
                className="text-destructive"
                disabled={!currentNoteId}
              >
                Delete Note
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {folderPath.length > 0 && (
        <div className="px-4 py-2 border-b border-border">
          <div className="flex items-center text-sm text-muted-foreground">
            <span>Location: </span>
            {folderPath.map((folderName, index) => (
              <div key={index} className="flex items-center">
                {index > 0 && <span className="mx-1">/</span>}
                <span className="hover:text-foreground">
                  {folderName}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="flex-1 flex flex-col p-4 gap-4 overflow-y-auto scrollbar-thin">
        {/* Title Input */}
        <div className="glass rounded-lg">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Note title"
            className="border-none glass bg-transparent focus-visible:ring-0 text-lg font-medium"
          />
        </div>
        
        {/* Markdown Toolbar */}
        <MarkdownToolbar
          onActionClick={handleMarkdownAction}
          isPreviewMode={isPreviewMode}
          togglePreview={togglePreviewMode}
          className="sticky top-0 z-10"
        />
        
        {/* Editor / Preview Area */}
        <div className="flex-1 glass rounded-lg overflow-hidden flex flex-col">
          {isPreviewMode ? (
            <div className="p-4 overflow-y-auto h-full scrollbar-thin">
              <MarkdownPreview content={content} />
            </div>
          ) : (
            <Textarea
              ref={contentRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Start writing in Markdown..."
              className="w-full h-full bg-transparent border-none p-4 resize-none focus-visible:ring-0 focus:outline-none scrollbar-thin font-mono"
            />
          )}
        </div>
      </div>
      
      <div className="p-4 border-t border-border flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          <span>Markdown supported • </span>
          <span>Press <kbd className="px-1.5 py-0.5 bg-secondary rounded text-xs">Ctrl+S</kbd> to save</span>
        </div>
        
        <button 
          onClick={() => setIsDeleteDialogOpen(true)}
          className="flex items-center gap-1.5 text-destructive/70 hover:text-destructive button-hover-effect px-3 py-1.5 rounded-lg focus-ring"
          disabled={!currentNoteId}
        >
          <Trash className="w-4 h-4" />
          <span>Delete Note</span>
        </button>
      </div>
      
      {/* Delete Note Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Note</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>Are you sure you want to delete this note? This action cannot be undone.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteNote}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Folder Selector Dialog */}
      <Dialog open={isFolderSelectorOpen} onOpenChange={setIsFolderSelectorOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Folder</DialogTitle>
          </DialogHeader>
          <div className="py-2 max-h-[300px] overflow-y-auto">
            {folderTree.map(folder => renderFolderOption(folder))}
          </div>
          <DialogFooter>
            <Button onClick={() => setIsFolderSelectorOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NoteEditor;
