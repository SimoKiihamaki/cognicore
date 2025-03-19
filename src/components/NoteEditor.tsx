
import { useState, useEffect } from 'react';
import { Save, MoreVertical, Trash, FolderOpen } from 'lucide-react';

const NoteEditor = () => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [savedStatus, setSavedStatus] = useState('unsaved');
  const [selectedFolder, setSelectedFolder] = useState('root');
  const [folderSelectOpen, setFolderSelectOpen] = useState(false);
  
  // This would normally come from a hook or context
  // For demo purposes, we're hard-coding a few folders
  const folders = [
    { id: 'root', name: 'Notes', parentId: null },
    { id: 'folder-1', name: 'Research', parentId: 'root' },
    { id: 'folder-2', name: 'Projects', parentId: 'root' },
    { id: 'folder-3', name: 'Personal', parentId: 'root' },
    { id: 'folder-4', name: 'AI Papers', parentId: 'folder-1' }
  ];
  
  const getFolderName = (folderId: string) => {
    const folder = folders.find(f => f.id === folderId);
    return folder ? folder.name : 'Notes';
  };
  
  const handleSave = () => {
    // In a real implementation, this would save to IndexedDB
    setSavedStatus('saving');
    
    setTimeout(() => {
      setSavedStatus('saved');
      
      // Reset to unsaved after 5 seconds
      setTimeout(() => {
        setSavedStatus('unsaved');
      }, 5000);
    }, 1000);
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
  
  // Get folders with their path
  const getFolderWithPath = (folderId: string) => {
    const result = [];
    let currentId = folderId;
    
    while (currentId) {
      const folder = folders.find(f => f.id === currentId);
      if (folder) {
        result.unshift(folder);
        currentId = folder.parentId || '';
      } else {
        currentId = '';
      }
    }
    
    return result;
  };
  
  const folderPath = getFolderWithPath(selectedFolder);
  
  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium">Note Editor</h2>
          <p className="text-sm text-muted-foreground">
            Create or edit your notes.
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setFolderSelectOpen(!folderSelectOpen)}
              className="px-3 py-1.5 rounded-lg flex items-center gap-1.5 bg-primary/10 text-primary hover:bg-primary/20 button-hover-effect focus-ring"
            >
              <FolderOpen className="w-4 h-4" />
              <span>{getFolderName(selectedFolder)}</span>
            </button>
            
            {folderSelectOpen && (
              <div className="absolute z-10 mt-1 right-0 w-56 rounded-md bg-popover shadow-lg border border-border">
                <div className="py-1">
                  {folders.map(folder => (
                    <button
                      key={folder.id}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-accent"
                      onClick={() => {
                        setSelectedFolder(folder.id);
                        setFolderSelectOpen(false);
                      }}
                    >
                      {folder.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          
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
          
          <button className="p-2 rounded-lg button-hover-effect focus-ring">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>
      
      {folderPath.length > 0 && (
        <div className="px-4 py-2 border-b border-border">
          <div className="flex items-center text-sm text-muted-foreground">
            <span>Location: </span>
            {folderPath.map((folder, index) => (
              <div key={folder.id} className="flex items-center">
                {index > 0 && <span className="mx-1">/</span>}
                <button 
                  className="hover:text-foreground"
                  onClick={() => setSelectedFolder(folder.id)}
                >
                  {folder.name}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="flex-1 flex flex-col p-4 gap-4 overflow-y-auto scrollbar-thin">
        <div className="glass rounded-lg p-3">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Note title"
            className="w-full bg-transparent border-none p-2 text-lg font-medium focus:outline-none"
          />
        </div>
        
        <div className="flex-1 glass rounded-lg p-3">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Start writing..."
            className="w-full h-full bg-transparent border-none p-2 resize-none focus:outline-none scrollbar-thin"
          />
        </div>
      </div>
      
      <div className="p-4 border-t border-border flex items-center justify-end">
        <button className="flex items-center gap-1.5 text-destructive/70 hover:text-destructive button-hover-effect px-3 py-1.5 rounded-lg focus-ring">
          <Trash className="w-4 h-4" />
          <span>Delete Note</span>
        </button>
      </div>
    </div>
  );
};

export default NoteEditor;
