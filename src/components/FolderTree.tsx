
import { useState } from 'react';
import { FolderWithChildren } from '@/hooks/useFolders';
import { ChevronDown, ChevronRight, FileText, Folder, FolderPlus, Edit2, Trash, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface FolderTreeProps {
  folders: FolderWithChildren[];
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
  return (
    <>
      {folders.map((folder) => (
        <div key={folder.id} className="mt-1">
          <div 
            className={`flex items-center justify-between ${level > 0 ? `ml-${level * 3}` : ''} px-3 py-1.5 rounded-lg transition-colors 
              ${activeFolder === folder.id ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'hover:bg-sidebar-accent/50 text-sidebar-foreground'}`}
          >
            <div 
              className="flex items-center flex-1 cursor-pointer"
              onClick={() => onFolderClick(folder.id)}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleExpand(folder.id);
                }}
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
              <Folder className="w-4 h-4 mr-1.5" />
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
          
          {folder.isExpanded && folder.children.length > 0 && (
            <div className="ml-3 border-l border-sidebar-border pl-2">
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
        </div>
      ))}
    </>
  );
};

export default FolderTree;
