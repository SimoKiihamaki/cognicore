/**
 * Storage Compatibility Layer
 * 
 * This module provides a compatibility layer between localStorage and IndexedDB,
 * ensuring that data can be properly migrated and synchronized.
 */

import databaseService, { STORE_NAMES } from '@/services/database/databaseService';
import { Note, Folder, ChatHistory, IndexedFile } from '@/lib/types';

/**
 * Migrates notes from localStorage to IndexedDB
 */
export async function migrateNotesFromLocalStorage(): Promise<number> {
  try {
    const notesJson = localStorage.getItem('cognicore-notes');
    if (!notesJson) {
      return 0;
    }
    
    const notes = JSON.parse(notesJson) as Note[];
    let importedCount = 0;
    
    // Add each note to the database
    for (const note of notes) {
      try {
        // Check if the note already exists in IndexedDB
        const existingNote = await databaseService.get(STORE_NAMES.NOTES, note.id);
        if (!existingNote) {
          await databaseService.add(STORE_NAMES.NOTES, note);
          importedCount++;
        }
      } catch (error) {
        console.error(`Error importing note ${note.id}:`, error);
      }
    }
    
    return importedCount;
  } catch (error) {
    console.error('Error migrating notes from localStorage:', error);
    return 0;
  }
}

/**
 * Migrates folders from localStorage to IndexedDB
 */
export async function migrateFoldersFromLocalStorage(): Promise<number> {
  try {
    const foldersJson = localStorage.getItem('cognicore-folders');
    if (!foldersJson) {
      return 0;
    }
    
    const folders = JSON.parse(foldersJson) as Folder[];
    let importedCount = 0;
    
    // Add each folder to the database
    for (const folder of folders) {
      try {
        // Check if the folder already exists in IndexedDB
        const existingFolder = await databaseService.get(STORE_NAMES.FOLDERS, folder.id);
        if (!existingFolder) {
          await databaseService.add(STORE_NAMES.FOLDERS, folder);
          importedCount++;
        }
      } catch (error) {
        console.error(`Error importing folder ${folder.id}:`, error);
      }
    }
    
    return importedCount;
  } catch (error) {
    console.error('Error migrating folders from localStorage:', error);
    return 0;
  }
}

/**
 * Migrates indexed files from localStorage to IndexedDB
 */
export async function migrateFilesFromLocalStorage(): Promise<number> {
  try {
    const filesJson = localStorage.getItem('cognicore-indexed-files');
    if (!filesJson) {
      return 0;
    }
    
    const files = JSON.parse(filesJson) as IndexedFile[];
    let importedCount = 0;
    
    // Add each file to the database
    for (const file of files) {
      try {
        // Check if the file already exists in IndexedDB
        const existingFile = await databaseService.get(STORE_NAMES.FILES, file.id);
        if (!existingFile) {
          await databaseService.add(STORE_NAMES.FILES, file);
          importedCount++;
        }
      } catch (error) {
        console.error(`Error importing file ${file.id}:`, error);
      }
    }
    
    return importedCount;
  } catch (error) {
    console.error('Error migrating files from localStorage:', error);
    return 0;
  }
}

/**
 * Migrates chat histories from localStorage to IndexedDB
 */
export async function migrateChatHistoriesFromLocalStorage(): Promise<number> {
  try {
    const historiesJson = localStorage.getItem('cognicore-chat-histories');
    if (!historiesJson) {
      return 0;
    }
    
    const histories = JSON.parse(historiesJson) as ChatHistory[];
    let importedCount = 0;
    
    // Add each history to the database
    for (const history of histories) {
      try {
        // Check if the history already exists in IndexedDB
        const existingHistory = await databaseService.get(STORE_NAMES.CHAT_HISTORIES, history.id);
        if (!existingHistory) {
          await databaseService.add(STORE_NAMES.CHAT_HISTORIES, history);
          importedCount++;
        }
      } catch (error) {
        console.error(`Error importing chat history ${history.id}:`, error);
      }
    }
    
    return importedCount;
  } catch (error) {
    console.error('Error migrating chat histories from localStorage:', error);
    return 0;
  }
}

/**
 * Run a complete migration from localStorage to IndexedDB
 */
export async function migrateAllFromLocalStorage(): Promise<{
  notesCount: number;
  foldersCount: number;
  filesCount: number;
  historiesCount: number;
}> {
  const results = {
    notesCount: await migrateNotesFromLocalStorage(),
    foldersCount: await migrateFoldersFromLocalStorage(),
    filesCount: await migrateFilesFromLocalStorage(),
    historiesCount: await migrateChatHistoriesFromLocalStorage()
  };
  
  return results;
}

/**
 * Sync any changes from IndexedDB back to localStorage for backward compatibility
 * This helps during transition period where some components might still use localStorage
 */
export async function syncFromIndexedDBToLocalStorage(): Promise<void> {
  try {
    // Sync notes
    const notes = await databaseService.getAll(STORE_NAMES.NOTES);
    localStorage.setItem('cognicore-notes', JSON.stringify(notes));
    
    // Sync folders
    const folders = await databaseService.getAll(STORE_NAMES.FOLDERS);
    localStorage.setItem('cognicore-folders', JSON.stringify(folders));
    
    // Sync files
    const files = await databaseService.getAll(STORE_NAMES.FILES);
    localStorage.setItem('cognicore-indexed-files', JSON.stringify(files));
    
    // Sync chat histories
    const histories = await databaseService.getAll(STORE_NAMES.CHAT_HISTORIES);
    localStorage.setItem('cognicore-chat-histories', JSON.stringify(histories));
  } catch (error) {
    console.error('Error syncing from IndexedDB to localStorage:', error);
  }
}
