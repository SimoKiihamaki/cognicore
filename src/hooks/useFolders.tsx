
import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { v4 as uuidv4 } from 'uuid';

// Define the Folder type
export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  expanded?: boolean;
  children: Folder[];
}

interface FoldersContextType {
  folderTree: Folder[];
  addFolder: (name: string, parentId: string | null) => void;
  deleteFolder: (id: string) => void;
  renameFolder: (id: string, newName: string) => void;
  toggleFolderExpanded: (id: string) => void;
}

const FoldersContext = createContext<FoldersContextType | undefined>(undefined);

// Default folders
const defaultFolders: Folder[] = [
  {
    id: 'root',
    name: 'My Notes',
    parentId: null,
    expanded: true,
    children: [
      {
        id: 'work',
        name: 'Work',
        parentId: 'root',
        expanded: false,
        children: [],
      },
      {
        id: 'personal',
        name: 'Personal',
        parentId: 'root',
        expanded: false,
        children: [],
      }
    ],
  },
];

export const FoldersProvider = ({ children }: { children: ReactNode }) => {
  const [storedFolders, setStoredFolders] = useLocalStorage<Folder[]>('folders', defaultFolders);
  const [folderTree, setFolderTree] = useState<Folder[]>(storedFolders);

  useEffect(() => {
    setStoredFolders(folderTree);
  }, [folderTree, setStoredFolders]);

  const addFolder = (name: string, parentId: string | null) => {
    const newFolder: Folder = {
      id: uuidv4(),
      name,
      parentId,
      expanded: false,
      children: [],
    };

    const updatedTree = [...folderTree];
    
    if (!parentId) {
      updatedTree.push(newFolder);
    } else {
      // Find and update the parent folder
      const updateFolderChildren = (folders: Folder[]): Folder[] => {
        return folders.map(folder => {
          if (folder.id === parentId) {
            return {
              ...folder,
              children: [...folder.children, newFolder],
            };
          }
          
          if (folder.children.length > 0) {
            return {
              ...folder,
              children: updateFolderChildren(folder.children),
            };
          }
          
          return folder;
        });
      };
      
      setFolderTree(updateFolderChildren(updatedTree));
      return;
    }
    
    setFolderTree(updatedTree);
  };

  const deleteFolder = (id: string) => {
    // Remove folder from tree
    const removeFolder = (folders: Folder[]): Folder[] => {
      return folders.filter(folder => {
        if (folder.id === id) return false;
        
        if (folder.children.length > 0) {
          folder.children = removeFolder(folder.children);
        }
        
        return true;
      });
    };
    
    setFolderTree(removeFolder(folderTree));
  };

  const renameFolder = (id: string, newName: string) => {
    // Find and rename the folder
    const renameFolderInTree = (folders: Folder[]): Folder[] => {
      return folders.map(folder => {
        if (folder.id === id) {
          return { ...folder, name: newName };
        }
        
        if (folder.children.length > 0) {
          return {
            ...folder,
            children: renameFolderInTree(folder.children),
          };
        }
        
        return folder;
      });
    };
    
    setFolderTree(renameFolderInTree(folderTree));
  };

  const toggleFolderExpanded = (id: string) => {
    // Find and toggle the expanded state of the folder
    const toggleExpanded = (folders: Folder[]): Folder[] => {
      return folders.map(folder => {
        if (folder.id === id) {
          return { ...folder, expanded: !folder.expanded };
        }
        
        if (folder.children.length > 0) {
          return {
            ...folder,
            children: toggleExpanded(folder.children),
          };
        }
        
        return folder;
      });
    };
    
    setFolderTree(toggleExpanded(folderTree));
  };

  return (
    <FoldersContext.Provider
      value={{
        folderTree,
        addFolder,
        deleteFolder,
        renameFolder,
        toggleFolderExpanded,
      }}
    >
      {children}
    </FoldersContext.Provider>
  );
};

export const useFolders = () => {
  const context = useContext(FoldersContext);
  if (context === undefined) {
    throw new Error('useFolders must be used within a FoldersProvider');
  }
  return context;
};
