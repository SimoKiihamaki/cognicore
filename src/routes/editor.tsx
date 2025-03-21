import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useToast } from '@/hooks/use-toast';
import NoteEditor from '@/components/NoteEditor';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useNotes } from '@/hooks/useNotes';
import { useFolders } from '@/hooks/useFolders';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { debounce } from '@/utils/debounce';
import { FolderPath } from '@/components/note-editor/FolderPath';

/**
 * Editor route component that provides note editing functionality
 * with folder organization and semantic connection visualization.
 */
const EditorRoute = () => {
  const { noteId } = useParams<{ noteId: string }>();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { notes, createNote, getNote } = useNotes();
  const { folderTree, getFolderPath } = useFolders();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredNotes, setFilteredNotes] = useState(notes);
  const [activeEditorTab, setActiveEditorTab] = useState('edit');
  const [selectedNote, setSelectedNote] = useState<any>(null);
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState('');

  // Update filtered notes when notes or search term changes
  useEffect(() => {
    if (searchTerm) {
      setFilteredNotes(
        notes.filter(note => 
          note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          note.content.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    } else {
      setFilteredNotes(notes);
    }
  }, [notes, searchTerm]);

  // Set selected note from noteId parameter
  useEffect(() => {
    const loadNote = async () => {
      if (noteId) {
        try {
          const note = await getNote(noteId);
          if (note) {
            setSelectedNote(note);
          } else {
            toast({
              title: 'Note not found',
              description: `Could not find note with ID ${noteId}`,
              variant: 'destructive',
            });
            navigate('/editor');
          }
        } catch (error) {
          console.error('Error loading note:', error);
          toast({
            title: 'Error loading note',
            description: 'There was a problem loading the selected note',
            variant: 'destructive',
          });
          navigate('/editor');
        }
      } else if (notes.length > 0 && !selectedNote) {
        // Select first note if no note is selected
        setSelectedNote(notes[0]);
      }
    };

    loadNote();
  }, [noteId, notes, getNote, toast, navigate, selectedNote]);

  // Debounced search function
  const debouncedSearch = debounce((term: string) => {
    setSearchTerm(term);
  }, 300);

  // Handle search input
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    debouncedSearch(e.target.value);
  };

  // Create new note
  const handleCreateNote = async () => {
    if (isCreatingNote) {
      if (!newNoteTitle.trim()) {
        toast({
          title: 'Title required',
          description: 'Please enter a title for your new note',
          variant: 'warning',
        });
        return;
      }

      try {
        const newNoteId = await createNote({
          title: newNoteTitle,
          content: '',
          folderId: null,
          tags: [],
        });

        if (newNoteId) {
          toast({
            title: 'Note created',
            description: `Created note "${newNoteTitle}"`,
          });
          setNewNoteTitle('');
          setIsCreatingNote(false);
          
          // Navigate to the new note
          navigate(`/editor/${newNoteId}`);
        }
      } catch (error) {
        toast({
          title: 'Error creating note',
          description: 'An error occurred while creating the note',
          variant: 'destructive',
        });
        console.error('Error creating note:', error);
      }
    } else {
      setIsCreatingNote(true);
    }
  };

  // Cancel new note creation
  const handleCancelCreate = () => {
    setIsCreatingNote(false);
    setNewNoteTitle('');
  };

  // Select a note
  const handleSelectNote = (note: any) => {
    setSelectedNote(note);
    navigate(`/editor/${note.id}`);
  };

  return (
    <>
      <Helmet>
        <title>
          {selectedNote ? `${selectedNote.title} | Editor` : 'Editor'} | CogniCore
        </title>
        <meta name="description" content="Edit and manage your notes" />
      </Helmet>

      <div className="container mx-auto p-4 h-full">
        <div className="h-full">

          {/* Editor - full width since notes list is now in the sidebar */}
          <div className="flex flex-col h-full border rounded-lg bg-card overflow-hidden w-full">
            {selectedNote ? (
              <>
                <div className="border-b p-2 bg-muted">
                  <FolderPath 
                    folderId={selectedNote.folderId} 
                    noteTitle={selectedNote.title} 
                  />
                  
                  <Tabs 
                    value={activeEditorTab} 
                    onValueChange={setActiveEditorTab}
                    className="mt-2"
                  >
                    <TabsList className="w-full grid grid-cols-3">
                      <TabsTrigger value="edit">Edit</TabsTrigger>
                      <TabsTrigger value="preview">Preview</TabsTrigger>
                      <TabsTrigger value="metadata">Metadata</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
                
                <div className="flex-1 overflow-hidden">
                  <NoteEditor 
                    noteId={selectedNote.id} 
                    viewMode={activeEditorTab}
                  />
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full">
                <Card className="w-96">
                  <CardContent className="p-6 text-center">
                    <h3 className="text-lg font-semibold mb-2">No note selected</h3>
                    <p className="text-muted-foreground mb-4">
                      Select a note from the sidebar or create a new one to get started.
                    </p>
                    <Button onClick={handleCreateNote}>
                      Create New Note
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default EditorRoute;
