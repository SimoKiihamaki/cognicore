
import { useState, useCallback, useMemo } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { Note } from '@/lib/types';
import { suggestOrganization } from '@/utils/noteOrganizer';
import { useFolders } from './useFolders';

export function useNotes() {
  const [notes, setNotes] = useLocalStorage<Note[]>('cognicore-notes', []);
  const { folderTree } = useFolders();
  
  const addNote = useCallback((title: string, content: string, folderId: string) => {
    const newNote: Note = {
      id: `note-${Date.now()}`,
      title,
      content,
      folderId,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    setNotes(prev => [...prev, newNote]);
    return newNote.id;
  }, [setNotes]);
  
  const updateNote = useCallback((noteId: string, updates: Partial<Note>) => {
    setNotes(prev => 
      prev.map(note => 
        note.id === noteId 
          ? { 
              ...note, 
              ...updates,
              updatedAt: new Date() 
            } 
          : note
      )
    );
  }, [setNotes]);
  
  const deleteNote = useCallback((noteId: string) => {
    setNotes(prev => prev.filter(note => note.id !== noteId));
  }, [setNotes]);
  
  const getNotesByFolder = useCallback((folderId: string) => {
    return notes.filter(note => note.folderId === folderId);
  }, [notes]);
  
  const getAllNotesCount = useCallback(() => {
    return notes.length;
  }, [notes]);
  
  const getNote = useCallback((noteId: string) => {
    return notes.find(note => note.id === noteId) || null;
  }, [notes]);
  
  const moveNoteToFolder = useCallback((noteId: string, targetFolderId: string) => {
    updateNote(noteId, { folderId: targetFolderId });
  }, [updateNote]);
  
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
  
  const getOrganizationSuggestions = useCallback(async (
    embeddingModelName: string = 'default',
    similarityThreshold: number = 0.3
  ) => {
    return await suggestOrganization(notes, folderTree, embeddingModelName, similarityThreshold);
  }, [notes, folderTree]);
  
  // Get recently modified notes
  const recentNotes = useMemo(() => {
    return [...notes]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5);
  }, [notes]);
  
  return {
    notes,
    addNote,
    updateNote,
    deleteNote,
    getNotesByFolder,
    getAllNotesCount,
    getNote,
    moveNoteToFolder,
    searchNotes,
    getOrganizationSuggestions,
    recentNotes
  };
}
