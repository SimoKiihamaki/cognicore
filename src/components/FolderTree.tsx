import React, { useState, useEffect } from 'react';
import { Folder } from '@/hooks/useFolders';
import { ChevronDown, ChevronRight, FileText, Folder as FolderIcon, FolderPlus, Edit2, Trash, MoreHorizontal } from 'lucide-react';
import { useNotes } from '@/hooks/useNotes';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Note } from '@/lib/types';

interface FolderTreeProps {
  folders: Folder[];
  onFolderClick: (folderId: string) => void;
  onToggleExpand: (folderId: string) => void;
  onAddSubfolder: (parentId: string) => void;
  onRenameFolder: (folderId: string) => void;
  onDeleteFolder: (folderId: string) => void;
  activeFolder: string | null;
  notesInFolder: Record<string, number>;
  level?: number;
}

const FolderTree = ({
  folders,
  onFolderClick,
  onToggleExpand,
  onAddSubfolder,
  onRenameFolder,
  onDeleteFolder,
  activeFolder,
  notesInFolder,
  level = 0
}: FolderTreeProps) => {
  const { notes, getNotesByFolder } = useNotes();
  // State to store folder's notes
  const [folderNotes, setFolderNotes] = useState<Record<string, Note[]>>({});
  const [loadingNotes, setLoadingNotes] = useState<Record<string, boolean>>({});
  
  // Load notes for expanded folders
  useEffect(() => {
    const loadNotesForFolders = async () => {
      for (const folder of folders) {
        if (folder.expanded && !folderNotes[folder.id]) {
          try {
            // Mark as loading
            setLoadingNotes(prev => ({ ...prev, [folder.id]: true }));
            
            // Try to get notes from the folder
            let notesResult;
            try {
              // The getNotesByFolder function might be async or sync depending on implementation
              notesResult = await Promise.resolve(getNotesByFolder(folder.id));
            } catch (error) {
              console.error(`Error loading notes for folder ${folder.id}:`, error);
              notesResult = [];
            }
            
            // Store the result
            setFolderNotes(prev => ({ 
              ...prev, 
              [folder.id]: Array.isArray(notesResult) ? notesResult : [] 
            }));
          } finally {
            // Mark as not loading
            setLoadingNotes(prev => ({ ...prev, [folder.id]: false }));
          }
        }
      }
    };
    
    loadNotesForFolders();
  }, [folders, getNotesByFolder]);
  
  // When a folder is expanded, trigger note loading
  const handleToggleExpand = (folderId: string) => {
    onToggleExpand(folderId);
    
    // After expanding, trigger loading notes if not already loaded
    const folder = folders.find(f => f.id === folderId);
    if (folder && !folder.expanded && !folderNotes[folderId]) {
      // We'll load the notes when the useEffect triggers
    }
  };
  
  // Use to safely render notes for a folder
  const renderNotesForFolder = (folderId: string) => {
    const notes = folderNotes[folderId] || [];
    
    if (loadingNotes[folderId]) {
      return (
        <div className="ml-6 px-3 py-2 text-xs text-muted-foreground">
          Loading notes...
        </div>
      );
    }
    
    if (notes.length === 0) {
      return (
        <div className="ml-6 px-3 py-2 text-xs text-muted-foreground">
          No notes in this folder
        </div>
      );
    }
    
    return notes.map(note => (
      <div 
        key={note.id}
        className={`folder-tree-note ml-6 px-3 py-1.5 rounded-lg transition-colors hover:bg-sidebar-accent/50 ${
          activeFolder === note.id ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground'
        }`}
        onClick={(e) => {
          e.stopPropagation();
          onFolderClick(note.id);
        }}
      >
        <div className="flex items-center">
          <FileText className="w-4 h-4 mr-1.5" />
          <span className="text-sm truncate">{note.title || 'Untitled'}</span>
        </div>
      </div>
    ));
  };
  
  return (
    <>
      {folders.map((folder) => (
        <div key={folder.id} className="mt-1">
          <div 
            className={`flex items-center justify-between ${level > 0 ? 'ml-6' : ''} px-3 py-1.5 rounded-lg transition-colors 
              ${activeFolder === folder.id ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'hover:bg-sidebar-accent/50 text-sidebar-foreground'}`}
          >
            <div 
              className="flex items-center flex-1 cursor-pointer"
              onClick={() => onFolderClick(folder.id)}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleExpand(folder.id);
                }}
                className="mr-1.5 w-5 h-5 flex items-center justify-center"
              >
                {folder.children.length > 0 ? (
                  folder.expanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )
                ) : null}
              </button>
              <FolderIcon className="w-4 h-4 mr-1.5 folder-icon" />
              <span className="text-sm truncate">{folder.name}</span>
              
              {notesInFolder[folder.id] > 0 && (
                <span className="ml-2 text-xs bg-sidebar-accent/70 px-1.5 py-0.5 rounded-full">
                  {notesInFolder[folder.id]}
                </span>
              )}
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="p-1 rounded-md hover:bg-sidebar-accent button-hover-effect"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => onAddSubfolder(folder.id)}>
                  <FolderPlus className="w-4 h-4 mr-2" />
                  Add Subfolder
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onRenameFolder(folder.id)}>
                  <Edit2 className="w-4 h-4 mr-2" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => onDeleteFolder(folder.id)}
                  className="text-destructive"
                >
                  <Trash className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          {folder.expanded && (
            <>
              {/* Show notes in this folder */}
              <div className="my-2 notes-container">
                {renderNotesForFolder(folder.id)}
              </div>
              
              {/* Show subfolders */}
              {folder.children.length > 0 && (
                <div className="ml-3 border-l border-sidebar-border pl-2 folder-content">
                  <FolderTree
                    folders={folder.children}
                    onFolderClick={onFolderClick}
                    onToggleExpand={onToggleExpand}
                    onAddSubfolder={onAddSubfolder}
                    onRenameFolder={onRenameFolder}
                    onDeleteFolder={onDeleteFolder}
                    activeFolder={activeFolder}
                    notesInFolder={notesInFolder}
                    level={level + 1}
                  />
                </div>
              )}
            </>
          )}
        </div>
      ))}
    </>
  );
};

export default FolderTree;