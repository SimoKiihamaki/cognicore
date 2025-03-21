/**
 * Custom hook for managing notes using IndexedDB
 */

import { useState, useCallback, useMemo } from 'react';
import { useIndexedDB } from './useIndexedDB';
import { Note, IndexedFile } from '@/lib/types';
import { suggestOrganization, findSimilarContent } from '@/utils/noteOrganizer';
import { useFoldersIndexedDB } from './useFoldersIndexedDB';
import { STORE_NAMES, STORE_INDEXES } from '@/services/database/databaseService';

export function useNotesIndexedDB() {
  const { 
    data: notes, 
    loading: notesLoading, 
    error: notesError,
    addItem: addNoteToDb,
    updateItem: updateNoteInDb,
    deleteItem: deleteNoteFromDb,
    getItemById: getNoteById,
    queryByIndex: queryNotesByIndex,
    refresh: refreshNotes
  } = useIndexedDB(STORE_NAMES.NOTES);

  const {
    data: indexedFiles,
    loading: filesLoading,
    error: filesError,
    addItem: addFileToDb,
    updateItem: updateFileInDb,
    deleteItem: deleteFileFromDb,
    getItemById: getFileById,
    refresh: refreshFiles
  } = useIndexedDB(STORE_NAMES.FILES);

  const { folderTree, loading: foldersLoading } = useFoldersIndexedDB();
  
  const loading = notesLoading || filesLoading || foldersLoading;
  const error = notesError || filesError;
  
  // Add a new note
  const addNote = useCallback(async (title: string, content: string, folderId: string) => {
    const newNote: Note = {
      id: `note-${Date.now()}`,
      title,
      content,
      folderId,
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: []
    };
    
    return await addNoteToDb(newNote);
  }, [addNoteToDb]);
  
  // Update an existing note
  const updateNote = useCallback(async (noteId: string, updates: Partial<Note>) => {
    // Ensure updatedAt is always set
    const updatedFields = {
      ...updates,
      updatedAt: new Date()
    };
    
    return await updateNoteInDb(noteId, updatedFields);
  }, [updateNoteInDb]);
  
  // Delete a note
  const deleteNote = useCallback(async (noteId: string) => {
    return await deleteNoteFromDb(noteId);
  }, [deleteNoteFromDb]);
  
  // Get notes by folder
  const getNotesByFolder = useCallback(async (folderId: string) => {
    return await queryNotesByIndex(STORE_INDEXES[STORE_NAMES.NOTES].BY_FOLDER_ID, folderId);
  }, [queryNotesByIndex]);
  
  // Get note count
  const getAllNotesCount = useCallback(() => {
    return notes.length;
  }, [notes]);
  
  // Get note by ID
  const getNote = useCallback(async (noteId: string) => {
    return await getNoteById(noteId);
  }, [getNoteById]);
  
  // Move note to folder
  const moveNoteToFolder = useCallback(async (noteId: string, targetFolderId: string) => {
    return await updateNoteInDb(noteId, { folderId: targetFolderId });
  }, [updateNoteInDb]);
  
  // Search notes (basic text search)
  const searchNotes = useCallback((query: string) => {
    const searchTerms = query.toLowerCase().trim().split(/\s+/);
    
    return notes.filter(note => {
      const titleLower = note.title.toLowerCase();
      const contentLower = note.content.toLowerCase();
      
      // Check if all search terms are present in either title or content
      return searchTerms.every(term => 
        titleLower.includes(term) || contentLower.includes(term)
      );
    });
  }, [notes]);
  
  // Get organization suggestions
  const getOrganizationSuggestions = useCallback(async (
    embeddingModelName: string = 'default',
    similarityThreshold: number = 0.3
  ) => {
    return await suggestOrganization(
      [...notes, ...indexedFiles],
      folderTree,
      embeddingModelName,
      similarityThreshold
    );
  }, [notes, indexedFiles, folderTree]);
  
  // Find similar items
  const findSimilarItems = useCallback((
    itemId: string,
    similarityThreshold: number = 0.3
  ) => {
    return findSimilarContent(itemId, [...notes, ...indexedFiles], similarityThreshold);
  }, [notes, indexedFiles]);
  
  // Get recent notes
  const recentNotes = useMemo(() => {
    return [...notes]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5);
  }, [notes]);
  
  return {
    notes,
    indexedFiles,
    loading,
    error,
    addNote,
    updateNote,
    deleteNote,
    getNotesByFolder,
    getAllNotesCount,
    getNote,
    moveNoteToFolder,
    searchNotes,
    getOrganizationSuggestions,
    findSimilarItems,
    recentNotes,
    refreshNotes,
    refreshFiles
  };
}
