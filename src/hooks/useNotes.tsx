import { useState, useCallback, useMemo, useEffect } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { Note, IndexedFile } from '@/lib/types';
import { suggestOrganization, findSimilarContent } from '@/utils/noteOrganizer';
import { useFolders } from './useFolders';
import { useFoldersIndexedDB } from './useFoldersIndexedDB';
import databaseService, { STORE_NAMES, STORE_INDEXES } from '@/services/database/databaseService';

/**
 * Enhanced useNotes hook that works with both localStorage and IndexedDB
 * Acts as a compatibility layer during migration
 */
export function useNotes() {
  // Initialize with localStorage (legacy storage)
  const [notesLocalStorage, setNotesLocalStorage] = useLocalStorage<Note[]>('cognicore-notes', [
    {
      id: 'note-1',
      title: 'Welcome to CogniCore',
      content: '# Welcome to CogniCore\n\nThis is your first note. You can edit it or create new ones.\n\nCogniCore is a privacy-focused knowledge management tool that runs entirely in your browser.',
      folderId: 'folder-root',
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: []
    },
    {
      id: 'note-2',
      title: 'Getting Started',
      content: '# Getting Started\n\n1. Create folders to organize your notes\n2. Connect to LM Studio for AI-powered features\n3. Add files to monitor for automatic indexing\n4. Use the graph view to see connections between your notes',
      folderId: 'folder-root',
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: []
    }
  ]);
  
  // State for IndexedDB data
  const [notes, setNotes] = useState<Note[]>([]);
  const [indexedFiles, setIndexedFiles] = useState<IndexedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preferIndexedDB, setPreferIndexedDB] = useState<boolean>(false);
  
  // Flag to determine if we've initialized from IndexedDB
  const [initializedFromDB, setInitializedFromDB] = useState(false);
  
  // Get folder data from the appropriate source
  const { folderTree: folderTreeLocal } = useFolders();
  const { folderTree: folderTreeIndexedDB, loading: foldersLoading } = useFoldersIndexedDB();
  
  // Use the appropriate folder tree based on storage preference
  const folderTree = preferIndexedDB ? folderTreeIndexedDB : folderTreeLocal;
  
  // Load data from IndexedDB on mount
  useEffect(() => {
    const loadFromIndexedDB = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Initialize database service if needed
        await databaseService.initialize();
        
        // Check if we should use IndexedDB by checking if it contains notes
        const notesCount = await databaseService.count(STORE_NAMES.NOTES);
        
        if (notesCount > 0) {
          // We have notes in IndexedDB, use it as primary storage
          setPreferIndexedDB(true);
          
          // Load notes and files
          const loadedNotes = await databaseService.getAll(STORE_NAMES.NOTES);
          const loadedFiles = await databaseService.getAll(STORE_NAMES.FILES);
          
          setNotes(loadedNotes);
          setIndexedFiles(loadedFiles);
          console.log(`Loaded ${loadedNotes.length} notes from IndexedDB`);
        } else {
          // No notes in IndexedDB, use localStorage data
          setPreferIndexedDB(false);
          setNotes(notesLocalStorage);
          
          // Try to get indexed files from localStorage
          const filesJSON = localStorage.getItem('cognicore-indexed-files');
          if (filesJSON) {
            try {
              setIndexedFiles(JSON.parse(filesJSON));
            } catch (e) {
              console.error('Error parsing indexed files from localStorage', e);
              setIndexedFiles([]);
            }
          }
          
          console.log(`Using ${notesLocalStorage.length} notes from localStorage`);
        }
        
        setInitializedFromDB(true);
      } catch (err) {
        console.error('Error loading notes from IndexedDB', err);
        setError(err instanceof Error ? err.message : 'Failed to load notes');
        
        // Fallback to localStorage
        setPreferIndexedDB(false);
        setNotes(notesLocalStorage);
        
        // Try to get indexed files from localStorage as fallback
        const filesJSON = localStorage.getItem('cognicore-indexed-files');
        if (filesJSON) {
          try {
            setIndexedFiles(JSON.parse(filesJSON));
          } catch (e) {
            console.error('Error parsing indexed files from localStorage', e);
            setIndexedFiles([]);
          }
        }
      } finally {
        setLoading(false);
      }
    };
    
    loadFromIndexedDB();
  }, [notesLocalStorage]);
  
  // Helper function for IndexedDB operations
  const refreshNotes = useCallback(async () => {
    if (!preferIndexedDB) return;
    
    try {
      setLoading(true);
      
      // Get fresh data from IndexedDB
      const freshNotes = await databaseService.getAll(STORE_NAMES.NOTES);
      setNotes(freshNotes);
      
      console.log(`Refreshed notes from IndexedDB: ${freshNotes.length} notes`);
    } catch (err) {
      console.error('Error refreshing notes', err);
    } finally {
      setLoading(false);
    }
  }, [preferIndexedDB]);
  
  // Create a new note (from object)
  const createNote = useCallback(async (noteData: { 
    title: string; 
    content: string; 
    folderId: string | null; 
    tags: string[] 
  }) => {
    const { title, content, folderId, tags } = noteData;
    
    const newNote: Note = {
      id: `note-${Date.now()}`,
      title,
      content,
      folderId: folderId || 'folder-root', // Default to root folder if not specified
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: tags || []
    };
    
    if (preferIndexedDB) {
      try {
        // Add to IndexedDB
        await databaseService.add(STORE_NAMES.NOTES, newNote);
        
        // Refresh notes list
        await refreshNotes();
        
        return newNote.id;
      } catch (err) {
        console.error('Error adding note to IndexedDB', err);
        throw err;
      }
    } else {
      // Add to localStorage
      setNotesLocalStorage(prev => [...prev, newNote]);
      setNotes(prev => [...prev, newNote]);
      return newNote.id;
    }
  }, [preferIndexedDB, setNotesLocalStorage, refreshNotes]);

  // Add a new note (legacy method)
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
    
    if (preferIndexedDB) {
      try {
        // Add to IndexedDB
        await databaseService.add(STORE_NAMES.NOTES, newNote);
        
        // Refresh notes list
        await refreshNotes();
        
        return newNote.id;
      } catch (err) {
        console.error('Error adding note to IndexedDB', err);
        throw err;
      }
    } else {
      // Add to localStorage
      setNotesLocalStorage(prev => [...prev, newNote]);
      setNotes(prev => [...prev, newNote]);
      return newNote.id;
    }
  }, [preferIndexedDB, setNotesLocalStorage, refreshNotes]);
  
  // Update an existing note
  const updateNote = useCallback(async (noteId: string, updates: Partial<Note>) => {
    if (preferIndexedDB) {
      try {
        // Ensure updatedAt is set
        const updatedFields = {
          ...updates,
          updatedAt: new Date()
        };
        
        // Update in IndexedDB
        await databaseService.update(STORE_NAMES.NOTES, noteId, updatedFields);
        
        // Refresh notes list
        await refreshNotes();
        
        return true;
      } catch (err) {
        console.error('Error updating note in IndexedDB', err);
        return false;
      }
    } else {
      // Update in localStorage
      setNotesLocalStorage(prev => 
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
      
      // Update local state
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
      
      return true;
    }
  }, [preferIndexedDB, setNotesLocalStorage, refreshNotes]);
  
  // Delete a note
  const deleteNote = useCallback(async (noteId: string) => {
    if (preferIndexedDB) {
      try {
        // Delete from IndexedDB
        await databaseService.delete(STORE_NAMES.NOTES, noteId);
        
        // Refresh notes list
        await refreshNotes();
        
        return true;
      } catch (err) {
        console.error('Error deleting note from IndexedDB', err);
        return false;
      }
    } else {
      // Delete from localStorage
      setNotesLocalStorage(prev => prev.filter(note => note.id !== noteId));
      
      // Update local state
      setNotes(prev => prev.filter(note => note.id !== noteId));
      
      return true;
    }
  }, [preferIndexedDB, setNotesLocalStorage, refreshNotes]);
  
  // Get notes by folder
  const getNotesByFolder = useCallback((folderId: string) => {
    if (loading) {
      return []; // Return empty array while loading
    }
    
    // Return all notes in this folder that have a valid title
    const folderNotes = notes.filter(note => 
      note.folderId === folderId && 
      (note.title || 'Untitled').trim() !== ''
    );
    
    // Sort by most recently updated
    return folderNotes.sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }, [notes, loading]);
  
  // Get note count
  const getAllNotesCount = useCallback(() => {
    return notes.length;
  }, [notes]);
  
  // Get note by ID
  const getNote = useCallback(async (noteId: string) => {
    if (preferIndexedDB) {
      try {
        // Get from IndexedDB
        return await databaseService.get(STORE_NAMES.NOTES, noteId);
      } catch (err) {
        console.error('Error getting note from IndexedDB', err);
        return null;
      }
    } else {
      // Get from local state
      return notes.find(note => note.id === noteId) || null;
    }
  }, [preferIndexedDB, notes]);
  
  // Move note to folder
  const moveNoteToFolder = useCallback(async (noteId: string, targetFolderId: string) => {
    return await updateNote(noteId, { folderId: targetFolderId });
  }, [updateNote]);
  
  // Search notes (basic text search)
  const searchNotes = useCallback((query: string) => {
    const searchTerms = query.toLowerCase().trim().split(/\s+/);
    
    return notes.filter(note => {
      const titleLower = (note.title || '').toLowerCase();
      const contentLower = (note.content || '').toLowerCase();
      
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

  // Migrate data from localStorage to IndexedDB
  const migrateToIndexedDB = useCallback(async () => {
    try {
      if (preferIndexedDB) {
        console.log('Already using IndexedDB, no migration needed');
        return true;
      }
      
      console.log('Starting migration to IndexedDB...');
      
      // Add all localStorage notes to IndexedDB
      let success = true;
      
      for (const note of notesLocalStorage) {
        try {
          // Make sure the note has a valid folderId and tags array
          const validNote = {
            ...note,
            folderId: note.folderId || 'folder-root',
            tags: note.tags || [],
          };
          
          await databaseService.add(STORE_NAMES.NOTES, validNote);
        } catch (err) {
          console.error(`Error migrating note ${note.id} to IndexedDB`, err);
          success = false;
        }
      }
      
      // Refresh data
      if (success) {
        setPreferIndexedDB(true);
        await refreshNotes();
        console.log('Migration to IndexedDB complete');
      }
      
      return success;
    } catch (err) {
      console.error('Error migrating to IndexedDB', err);
      return false;
    }
  }, [notesLocalStorage, preferIndexedDB, refreshNotes]);
  
  return {
    notes,
    indexedFiles,
    loading: loading || !initializedFromDB,
    error,
    addNote,
    createNote,
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
    preferIndexedDB,
    migrateToIndexedDB
  };
}

export default useNotes;