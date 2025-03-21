import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, MessageSquare } from 'lucide-react';
import { useFolders } from '@/hooks/useFolders';
import { useNotes } from '@/hooks/useNotes';
import FolderTree from './FolderTree';
import { Icons } from '@/components/ui/icons';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const Sidebar = ({ isOpen, onClose, activeSection, onSectionChange }: SidebarProps) => {
  const navigate = useNavigate();
  const [notesExpanded, setNotesExpanded] = useState(true);
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [isAddFolderDialogOpen, setIsAddFolderDialogOpen] = useState(false);
  const [isRenameFolderDialogOpen, setIsRenameFolderDialogOpen] = useState(false);
  const [isDeleteFolderDialogOpen, setIsDeleteFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [targetFolderId, setTargetFolderId] = useState<string | null>(null);
  
  const { 
    folderTree, 
    addFolder, 
    renameFolder, 
    deleteFolder, 
    toggleFolderExpanded 
  } = useFolders();
  
  const { 
    notes, 
    getNotesByFolder, 
    getAllNotesCount 
  } = useNotes();
  
  const handleSectionClick = (section: string) => {
    onSectionChange(section);
    
    // Navigate to the appropriate route based on section
    switch (section) {
      case 'graph':
        navigate('/graph');
        break;
      case 'chat':
        navigate('/chat');
        break;
      case 'vision-chat':
        navigate('/vision-chat');
        break;
      case 'settings':
        navigate('/settings');
        break;
      default:
        navigate('/editor');
    }
    
    // On mobile, close the sidebar after selection
    if (window.innerWidth < 768) {
      onClose();
    }
  };

  const handleFolderClick = (folderId: string) => {
    // Check if this is a note ID
    if (folderId.startsWith('note-')) {
      // Navigate to the note editor
      navigate(`/editor/${folderId}`);
    } else {
      // Handle folder click
      setActiveFolder(folderId);
      // Navigate to editor with folder filter
      navigate(`/editor?folder=${folderId}`);
    }
  };
  
  const handleAddSubfolder = (parentId: string) => {
    setTargetFolderId(parentId);
    setNewFolderName('');
    setIsAddFolderDialogOpen(true);
  };
  
  const handleRenameFolder = (folderId: string) => {
    setTargetFolderId(folderId);
    // Find the current folder name
    const findFolderName = (folders: typeof folderTree, id: string): string => {
      for (const folder of folders) {
        if (folder.id === id) return folder.name;
        if (folder.children.length > 0) {
          const name = findFolderName(folder.children, id);
          if (name) return name;
        }
      }
      return '';
    };
    
    setNewFolderName(findFolderName(folderTree, folderId));
    setIsRenameFolderDialogOpen(true);
  };
  
  const handleDeleteFolder = (folderId: string) => {
    setTargetFolderId(folderId);
    setIsDeleteFolderDialogOpen(true);
  };
  
  const confirmAddFolder = () => {
    if (targetFolderId && newFolderName.trim()) {
      addFolder(newFolderName.trim(), targetFolderId);
      setIsAddFolderDialogOpen(false);
    }
  };
  
  const confirmRenameFolder = () => {
    if (targetFolderId && newFolderName.trim()) {
      renameFolder(targetFolderId, newFolderName.trim());
      setIsRenameFolderDialogOpen(false);
    }
  };
  
  const confirmDeleteFolder = () => {
    if (targetFolderId) {
      deleteFolder(targetFolderId);
      setIsDeleteFolderDialogOpen(false);
    }
  };
  
  // Force refresh of note counts when sidebar mounts or notes change
  useEffect(() => {
    // This is just to ensure the component re-renders when notes change
    console.log(`Notes count updated: ${notes.length} notes total`);
  }, [notes]);
  
  // Calculate notes count per folder
  const notesInFolder: Record<string, number> = {};
  
  const countNotesInFolder = (folderId: string): number => {
    const directNotes = notes.filter(note => note.folderId === folderId).length;
    
    // Count notes in subfolders too
    const subfolders = folderTree.flatMap(f => f.children)
      .filter(folder => folder.parentId === folderId);
    
    const subfoldersNotes = subfolders.reduce(
      (sum, folder) => sum + countNotesInFolder(folder.id), 
      0
    );
    
    return directNotes + subfoldersNotes;
  };
  
  folderTree.forEach(folder => {
    notesInFolder[folder.id] = countNotesInFolder(folder.id);
  });
  
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 w-64 z-50 md:z-auto bg-sidebar border-r border-sidebar-border transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="h-full flex flex-col">
          <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
            <div className="flex items-center">
              <Icons.logo className="w-6 h-6 mr-2 text-primary" />
              <span className="text-lg font-semibold text-sidebar-foreground">CogniCore</span>
            </div>
            <button 
              onClick={onClose}
              className="p-1 rounded-lg button-hover-effect md:hidden"
              aria-label="Close sidebar"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>
          
          <nav className="flex-1 px-3 py-4 overflow-y-auto scrollbar-thin">
            <ul className="space-y-1">
              <li>
                <button
                  onClick={() => handleSectionClick('graph')}
                  className={`w-full flex items-center px-3 py-2 rounded-lg transition-colors ${
                    activeSection === 'graph' 
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground' 
                      : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                  }`}
                >
                  <Icons.networkHexagon className="w-5 h-5 mr-3" />
                  <span>Knowledge Graph</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleSectionClick('chat')}
                  className={`w-full flex items-center px-3 py-2 rounded-lg transition-colors ${
                    activeSection === 'chat' 
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground' 
                      : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                  }`}
                >
                  <MessageSquare className="w-5 h-5 mr-3" />
                  <span>Chat</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleSectionClick('vision-chat')}
                  className={`w-full flex items-center px-3 py-2 rounded-lg transition-colors ${
                    activeSection === 'vision-chat' 
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground' 
                      : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                  }`}
                >
                  <Icons.image className="w-5 h-5 mr-3" />
                  <span>Vision Chat</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => setNotesExpanded(!notesExpanded)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
                >
                  <div className="flex items-center">
                    <Icons.fileText className="w-5 h-5 mr-3" />
                    <span>Notes</span>
                  </div>
                  <span className="text-xs bg-sidebar-accent px-2 py-0.5 rounded-full">
                    {getAllNotesCount()}
                  </span>
                </button>
              </li>
              {notesExpanded && (
                <li className="ml-6 mt-1">
                  {/* Notes actions */}
                  <div className="flex items-center justify-between px-3 py-2">
                    <button 
                      onClick={() => navigate('/editor')}
                      className="flex items-center text-sm text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors"
                    >
                      <Icons.plus className="w-4 h-4 mr-2" />
                      New Note
                    </button>
                  </div>
                  
                  {/* Key prop forces re-render when note structure changes */}
                  <FolderTree 
                    key={`folder-tree-${notes.length}`}
                    folders={folderTree}
                    onFolderClick={handleFolderClick}
                    onToggleExpand={toggleFolderExpanded}
                    onAddSubfolder={handleAddSubfolder}
                    onRenameFolder={handleRenameFolder}
                    onDeleteFolder={handleDeleteFolder}
                    activeFolder={activeFolder}
                    notesInFolder={notesInFolder}
                  />
                </li>
              )}
              <li>
                <button
                  onClick={() => handleSectionClick('settings')}
                  className={`w-full flex items-center px-3 py-2 rounded-lg transition-colors ${
                    activeSection === 'settings' 
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground' 
                      : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                  }`}
                >
                  <Icons.settings className="w-5 h-5 mr-3" />
                  <span>Settings</span>
                </button>
              </li>
            </ul>
          </nav>
          
          <div className="p-4 border-t border-sidebar-border">
            <div className="glass rounded-lg p-3">
              <p className="text-xs text-sidebar-foreground/70">
                Running locally. All data stays on your device.
              </p>
            </div>
          </div>
        </div>
      </aside>
      
      {/* Add Folder Dialog */}
      <Dialog open={isAddFolderDialogOpen} onOpenChange={setIsAddFolderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Folder</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Folder name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className="w-full"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddFolderDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmAddFolder}>
              Add Folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Rename Folder Dialog */}
      <Dialog open={isRenameFolderDialogOpen} onOpenChange={setIsRenameFolderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Folder</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Folder name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className="w-full"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRenameFolderDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmRenameFolder}>
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Folder Dialog */}
      <Dialog open={isDeleteFolderDialogOpen} onOpenChange={setIsDeleteFolderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Folder</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>Are you sure you want to delete this folder and all its contents? This action cannot be undone.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteFolderDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteFolder}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Sidebar;
