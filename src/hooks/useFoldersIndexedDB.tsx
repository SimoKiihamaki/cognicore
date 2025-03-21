/**
 * Custom hook for managing folders using IndexedDB
 */

import { useState, useCallback, useMemo } from 'react';
import { useIndexedDB } from './useIndexedDB';
import { Folder } from '@/lib/types';
import { STORE_NAMES, STORE_INDEXES } from '@/services/database/databaseService';

interface FolderNode extends Folder {
  children: FolderNode[];
}

export function useFoldersIndexedDB() {
  const {
    data: folders,
    loading,
    error,
    addItem: addFolderToDb,
    updateItem: updateFolderInDb,
    deleteItem: deleteFolderFromDb,
    getItemById: getFolderById,
    queryByIndex: queryFoldersByIndex,
    refresh: refreshFolders
  } = useIndexedDB(STORE_NAMES.FOLDERS);

  // Add a new folder
  const addFolder = useCallback(async (name: string, parentId: string | null = null) => {
    const newFolder: Folder = {
      id: `folder-${Date.now()}`,
      name,
      parentId
    };
    
    return await addFolderToDb(newFolder);
  }, [addFolderToDb]);
  
  // Update an existing folder
  const updateFolder = useCallback(async (folderId: string, updates: Partial<Folder>) => {
    return await updateFolderInDb(folderId, updates);
  }, [updateFolderInDb]);
  
  // Delete a folder
  const deleteFolder = useCallback(async (folderId: string) => {
    return await deleteFolderFromDb(folderId);
  }, [deleteFolderFromDb]);
  
  // Get folder by ID
  const getFolder = useCallback(async (folderId: string) => {
    return await getFolderById(folderId);
  }, [getFolderById]);
  
  // Get child folders
  const getChildFolders = useCallback(async (parentId: string | null) => {
    return await queryFoldersByIndex(STORE_INDEXES[STORE_NAMES.FOLDERS].BY_PARENT_ID, parentId);
  }, [queryFoldersByIndex]);
  
  // Build folder tree
  const folderTree = useMemo(() => {
    const buildTree = (parentId: string | null): FolderNode[] => {
      return folders
        .filter(folder => folder.parentId === parentId)
        .map(folder => ({
          ...folder,
          children: buildTree(folder.id)
        }));
    };
    
    return buildTree(null);
  }, [folders]);
  
  // Get all root folders
  const rootFolders = useMemo(() => {
    return folders.filter(folder => folder.parentId === null);
  }, [folders]);
  
  // Get folder path (breadcrumb trail)
  const getFolderPath = useCallback((folderId: string | null): Folder[] => {
    if (!folderId) return [];
    
    const path: Folder[] = [];
    let currentId: string | null = folderId;
    
    while (currentId) {
      const folder = folders.find(f => f.id === currentId);
      if (!folder) break;
      
      path.unshift(folder);
      currentId = folder.parentId;
    }
    
    return path;
  }, [folders]);
  
  return {
    folders,
    folderTree,
    rootFolders,
    loading,
    error,
    addFolder,
    updateFolder,
    deleteFolder,
    getFolder,
    getChildFolders,
    getFolderPath,
    refreshFolders
  };
}
