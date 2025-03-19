
import { useState, useEffect } from 'react';
import { ChevronLeft, Network, FileText, Settings, Plus, FolderPlus, Server, ServerCog } from 'lucide-react';
import { useFolders } from '@/hooks/useFolders';
import { useNotes } from '@/hooks/useNotes';
import FolderTree from './FolderTree';
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
  const [notesExpanded, setNotesExpanded] = useState(true);
  const [serversExpanded, setServersExpanded] = useState(true);
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
    // On mobile, close the sidebar after selection
    if (window.innerWidth < 768) {
      onClose();
    }
  };

  const handleFolderClick = (folderId: string) => {
    setActiveFolder(folderId);
    // You might want to trigger some action here like loading notes for this folder
    // For now, we'll just navigate to the editor section
    onSectionChange('editor');
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
            <span className="text-lg font-semibold text-sidebar-foreground">CogniCore</span>
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
                  <Network className="w-5 h-5 mr-3" />
                  <span>Graph</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => setNotesExpanded(!notesExpanded)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
                >
                  <div className="flex items-center">
                    <FileText className="w-5 h-5 mr-3" />
                    <span>Notes</span>
                  </div>
                  <span className="text-xs bg-sidebar-accent px-2 py-0.5 rounded-full">
                    {getAllNotesCount()}
                  </span>
                </button>
              </li>
              {notesExpanded && (
                <li className="ml-9 mt-1">
                  <FolderTree 
                    folders={folderTree}
                    onFolderClick={handleFolderClick}
                    onToggleExpand={toggleFolderExpanded}
                    onAddSubfolder={handleAddSubfolder}
                    onRenameFolder={handleRenameFolder}
                    onDeleteFolder={handleDeleteFolder}
                    activeFolder={activeFolder}
                    notesInFolder={notesInFolder}
                  />
                  
                  <button 
                    onClick={() => handleSectionClick('editor')}
                    className="flex items-center py-1.5 mt-2 text-sm text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    New Note
                  </button>
                </li>
              )}
              <li>
                <button
                  onClick={() => setServersExpanded(!serversExpanded)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
                >
                  <div className="flex items-center">
                    <Server className="w-5 h-5 mr-3" />
                    <span>MCP Servers</span>
                  </div>
                </button>
              </li>
              {serversExpanded && (
                <li className="ml-9 mt-1">
                  <button 
                    onClick={() => handleSectionClick('server-config')}
                    className={`flex items-center py-1.5 text-sm w-full ${
                      activeSection === 'server-config' 
                        ? 'text-sidebar-accent-foreground font-medium' 
                        : 'text-sidebar-foreground/70 hover:text-sidebar-foreground'
                    } transition-colors`}
                  >
                    <ServerCog className="w-4 h-4 mr-2" />
                    Configure Servers
                  </button>
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
                  <Settings className="w-5 h-5 mr-3" />
                  <span>Settings</span>
                </button>
              </li>
            </ul>
          </nav>
          
          <div className="p-4 border-t border-sidebar-border">
            <div className="glass rounded-lg p-3">
              <p className="text-xs text-sidebar-foreground/70">
                Running locally. Privacy-focused design.
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
