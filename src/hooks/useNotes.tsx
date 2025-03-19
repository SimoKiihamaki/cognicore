
import { useState, useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { Note } from '@/lib/types';

export function useNotes() {
  const [notes, setNotes] = useLocalStorage<Note[]>('cognicore-notes', []);
  
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
  
  return {
    notes,
    addNote,
    updateNote,
    deleteNote,
    getNotesByFolder,
    getAllNotesCount,
    getNote
  };
}
