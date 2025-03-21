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

// Adding this alias type for components that expect FolderWithChildren
export type FolderWithChildren = Folder;

// Type for folder path result
export interface FolderPathResult {
  id: string;
  name: string;
  path: string;
  parentFolders: Folder[];
}

interface FoldersContextType {
  folderTree: Folder[];
  folders: Folder[]; // Add this property for backward compatibility
  addFolder: (name: string, parentId: string | null) => void;
  deleteFolder: (id: string) => void;
  renameFolder: (id: string, newName: string) => void;
  toggleFolderExpanded: (id: string) => void;
  getFolderPath: (folderId: string | null) => FolderPathResult;
}

const FoldersContext = createContext<FoldersContextType | undefined>(undefined);

// Default folders
const defaultFolders: Folder[] = [
  {
    id: 'folder-root',
    name: 'My Notes',
    parentId: null,
    expanded: true,
    children: [
      {
        id: 'work',
        name: 'Work',
        parentId: 'folder-root',
        expanded: true,
        children: [],
      },
      {
        id: 'personal',
        name: 'Personal',
        parentId: 'folder-root',
        expanded: true,
        children: [],
      }
    ],
  },
];

// Helper function to flatten folder tree into an array
const flattenFolders = (folderTree: Folder[]): Folder[] => {
  let result: Folder[] = [];
  
  for (const folder of folderTree) {
    result.push(folder);
    if (folder.children.length > 0) {
      result = result.concat(flattenFolders(folder.children));
    }
  }
  
  return result;
};

export const FoldersProvider = ({ children }: { children: ReactNode }) => {
  const [storedFolders, setStoredFolders] = useLocalStorage<Folder[]>('folders', defaultFolders);
  const [folderTree, setFolderTree] = useState<Folder[]>(storedFolders);
  
  // Create a flattened list of folders for backward compatibility
  const folders = flattenFolders(folderTree);

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

  // Get folder path for a given folder ID
  const getFolderPath = (folderId: string | null): FolderPathResult => {
    // Default return for null folder ID
    if (!folderId) {
      return {
        id: '',
        name: 'No Folder',
        path: '',
        parentFolders: []
      };
    }
    
    // Find the folder by ID in the flattened list
    const folder = folders.find(f => f.id === folderId);
    
    if (!folder) {
      return {
        id: folderId,
        name: 'Unknown Folder',
        path: '',
        parentFolders: []
      };
    }
    
    // Build the parent folders array
    const parentFolders: Folder[] = [];
    let currentFolder = folder;
    
    while (currentFolder.parentId) {
      const parent = folders.find(f => f.id === currentFolder.parentId);
      if (parent) {
        parentFolders.unshift(parent);
        currentFolder = parent;
      } else {
        break;
      }
    }
    
    // Build the path string
    const pathParts = [...parentFolders.map(f => f.name), folder.name];
    const path = pathParts.join(' / ');
    
    return {
      id: folder.id,
      name: folder.name,
      path,
      parentFolders
    };
  };

  return (
    <FoldersContext.Provider
      value={{
        folderTree,
        folders, // Expose the flattened folders list
        addFolder,
        deleteFolder,
        renameFolder,
        toggleFolderExpanded,
        getFolderPath,
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
