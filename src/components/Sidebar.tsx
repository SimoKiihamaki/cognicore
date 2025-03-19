
import { useState } from 'react';
import { ChevronLeft, MessageCircle, Network, FileText, Settings, Plus, FolderPlus, ChevronDown, ChevronRight } from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeSection: string;
  onSectionChange: (section: string) => void;
}

interface FolderItem {
  id: string;
  name: string;
  parentId: string | null;
  isExpanded: boolean;
  children: FolderItem[];
}

const Sidebar = ({ isOpen, onClose, activeSection, onSectionChange }: SidebarProps) => {
  const [notesExpanded, setNotesExpanded] = useState(true);
  const [folders, setFolders] = useState<FolderItem[]>([
    {
      id: 'root',
      name: 'Notes',
      parentId: null,
      isExpanded: true,
      children: []
    }
  ]);
  
  const handleSectionClick = (section: string) => {
    onSectionChange(section);
    // On mobile, close the sidebar after selection
    if (window.innerWidth < 768) {
      onClose();
    }
  };

  const toggleFolder = (folderId: string) => {
    const updateFolderExpansion = (items: FolderItem[]): FolderItem[] => {
      return items.map(folder => {
        if (folder.id === folderId) {
          return { ...folder, isExpanded: !folder.isExpanded };
        }
        
        if (folder.children.length > 0) {
          return {
            ...folder,
            children: updateFolderExpansion(folder.children)
          };
        }
        
        return folder;
      });
    };
    
    setFolders(updateFolderExpansion(folders));
  };

  const addSubFolder = (parentId: string) => {
    const newFolderId = `folder-${Date.now()}`;
    const newFolderName = `New Folder`;
    
    const addFolder = (items: FolderItem[]): FolderItem[] => {
      return items.map(folder => {
        if (folder.id === parentId) {
          return {
            ...folder,
            isExpanded: true,
            children: [
              ...folder.children,
              {
                id: newFolderId,
                name: newFolderName,
                parentId: parentId,
                isExpanded: false,
                children: []
              }
            ]
          };
        }
        
        if (folder.children.length > 0) {
          return {
            ...folder,
            children: addFolder(folder.children)
          };
        }
        
        return folder;
      });
    };
    
    setFolders(addFolder(folders));
  };

  const renderFolders = (folderItems: FolderItem[], level = 0) => {
    return folderItems.map(folder => (
      <div key={folder.id} className="mt-1">
        <div 
          className={`flex items-center justify-between ${level > 0 ? `ml-${level * 3}` : ''} px-3 py-1.5 rounded-lg transition-colors hover:bg-sidebar-accent/50 text-sidebar-foreground`}
        >
          <div className="flex items-center flex-1">
            <button
              onClick={() => toggleFolder(folder.id)}
              className="mr-1.5 w-5 h-5 flex items-center justify-center"
            >
              {folder.children.length > 0 ? (
                folder.isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )
              ) : null}
            </button>
            <FileText className="w-4 h-4 mr-1.5" />
            <span className="text-sm truncate">{folder.name}</span>
          </div>
          
          <button
            onClick={() => addSubFolder(folder.id)}
            className="p-1 rounded-md hover:bg-sidebar-accent button-hover-effect"
            title="Add subfolder"
          >
            <FolderPlus className="w-3.5 h-3.5" />
          </button>
        </div>
        
        {folder.isExpanded && folder.children.length > 0 && (
          <div className="ml-3 border-l border-sidebar-border pl-2">
            {renderFolders(folder.children, level + 1)}
          </div>
        )}
      </div>
    ));
  };

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
                  onClick={() => handleSectionClick('chat')}
                  className={`w-full flex items-center px-3 py-2 rounded-lg transition-colors ${
                    activeSection === 'chat' 
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground' 
                      : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                  }`}
                >
                  <MessageCircle className="w-5 h-5 mr-3" />
                  <span>Chat</span>
                </button>
              </li>
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
                    0
                  </span>
                </button>
              </li>
              {notesExpanded && (
                <li className="ml-9 mt-1">
                  {renderFolders(folders)}
                  
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
    </>
  );
};

export default Sidebar;
