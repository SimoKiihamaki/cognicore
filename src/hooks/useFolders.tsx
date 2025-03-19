
import { useState, useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { Folder } from '@/lib/types';

export interface FolderWithChildren extends Folder {
  isExpanded: boolean;
  children: FolderWithChildren[];
}

export function useFolders() {
  const [folders, setFolders] = useLocalStorage<Folder[]>('cognicore-folders', [
    {
      id: 'root',
      name: 'Notes',
      parentId: null,
    }
  ]);
  
  const [expandedFolders, setExpandedFolders] = useLocalStorage<string[]>('cognicore-expanded-folders', ['root']);
  
  const getFolderTree = useCallback((): FolderWithChildren[] => {
    const buildTree = (parentId: string | null): FolderWithChildren[] => {
      return folders
        .filter(folder => folder.parentId === parentId)
        .map(folder => ({
          ...folder,
          isExpanded: expandedFolders.includes(folder.id),
          children: buildTree(folder.id)
        }));
    };
    
    return buildTree(null);
  }, [folders, expandedFolders]);
  
  const addFolder = useCallback((name: string, parentId: string | null = null) => {
    const newFolder: Folder = {
      id: `folder-${Date.now()}`,
      name,
      parentId
    };
    
    setFolders(prev => [...prev, newFolder]);
    return newFolder.id;
  }, [setFolders]);
  
  const renameFolder = useCallback((folderId: string, newName: string) => {
    setFolders(prev => 
      prev.map(folder => 
        folder.id === folderId 
          ? { ...folder, name: newName } 
          : folder
      )
    );
  }, [setFolders]);
  
  const deleteFolder = useCallback((folderId: string) => {
    // First, get all child folder IDs recursively
    const getAllChildIds = (id: string): string[] => {
      const directChildren = folders.filter(f => f.parentId === id);
      const allChildren = [...directChildren];
      
      directChildren.forEach(child => {
        const grandChildren = getAllChildIds(child.id);
        allChildren.push(...grandChildren.map(childFolder => childFolder.id));
      });
      
      return allChildren.map(childFolder => childFolder.id);
    };
    
    const childIds = getAllChildIds(folderId);
    const idsToRemove = [folderId, ...childIds];
    
    setFolders(prev => prev.filter(folder => !idsToRemove.includes(folder.id)));
    setExpandedFolders(prev => prev.filter(id => !idsToRemove.includes(id)));
  }, [folders, setFolders, setExpandedFolders]);
  
  const moveFolder = useCallback((folderId: string, newParentId: string | null) => {
    // Prevent moving a folder to its own descendant
    if (newParentId !== null) {
      let currentParent = newParentId;
      while (currentParent) {
        const parent = folders.find(f => f.id === currentParent);
        if (!parent) break;
        if (parent.id === folderId) return false; // Would create a cycle
        currentParent = parent.parentId;
      }
    }
    
    setFolders(prev => 
      prev.map(folder => 
        folder.id === folderId 
          ? { ...folder, parentId: newParentId } 
          : folder
      )
    );
    return true;
  }, [folders, setFolders]);
  
  const toggleFolderExpanded = useCallback((folderId: string) => {
    setExpandedFolders(prev => {
      if (prev.includes(folderId)) {
        return prev.filter(id => id !== folderId);
      } else {
        return [...prev, folderId];
      }
    });
  }, [setExpandedFolders]);
  
  return {
    folders,
    folderTree: getFolderTree(),
    addFolder,
    renameFolder,
    deleteFolder,
    moveFolder,
    toggleFolderExpanded,
    expandedFolders
  };
}
