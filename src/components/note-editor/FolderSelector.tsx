
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Folder } from '@/hooks/useFolders';

interface FolderSelectorProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  folderTree: Folder[];
  selectedFolderId: string;
  onSelect: (folderId: string) => void;
}

const FolderSelector = ({
  isOpen,
  onOpenChange,
  folderTree,
  selectedFolderId,
  onSelect,
}: FolderSelectorProps) => {
  const renderFolderOption = (folder: Folder, level = 0) => (
    <div key={folder.id}>
      <button
        className={`w-full text-left px-4 py-2 text-sm hover:bg-accent
          ${folder.id === selectedFolderId ? 'bg-accent font-medium' : ''}
          ${level > 0 ? `ml-${level * 2}` : ''}`}
        onClick={() => {
          onSelect(folder.id);
          onOpenChange(false);
        }}
      >
        <span className="ml-2">{folder.name}</span>
      </button>
      {folder.children.map(child => renderFolderOption(child, level + 1))}
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Select Folder</DialogTitle>
        </DialogHeader>
        <div className="py-2 max-h-[300px] overflow-y-auto">
          {folderTree.map(folder => renderFolderOption(folder))}
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FolderSelector;
