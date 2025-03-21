/**
 * Direct Folder Access Utility
 * 
 * This module provides a direct implementation for folder access
 * that bypasses the existing implementations that may have issues.
 */
import { v4 as uuidv4 } from 'uuid';
import databaseService from '@/services/database/databaseService';
import { STORE_NAMES } from '@/services/database/databaseService';
import { MonitoredFolder } from '@/lib/types';

/**
 * Check if the File System Access API is available
 */
export function isFolderAccessSupported(): boolean {
  return !!(window.showDirectoryPicker);
}

/**
 * Request access to a folder and create a folder entry
 * 
 * @returns {Promise<Object|null>} The folder object or null if failed
 */
export async function requestFolderAccess(): Promise<MonitoredFolder | null> {
  try {
    console.log('Requesting folder access with direct method...');
    
    // First check if File System Access API is supported
    if (!isFolderAccessSupported()) {
      throw new Error('File System Access API is not supported in your browser. Try using a newer version of Chrome, Edge, or other Chromium-based browsers.');
    }
    
    // Use a simple approach without excessive options that might cause issues
    console.log('Opening directory picker dialog...');
    const directoryHandle = await window.showDirectoryPicker();
    
    if (!directoryHandle) {
      console.error('No directory handle returned');
      return null;
    }
    
    // Explicit permission request
    const permissionState = await directoryHandle.requestPermission({ mode: 'readwrite' });
    console.log('Permission state:', permissionState);
    
    if (permissionState !== 'granted') {
      throw new Error(`Permission to access folder was denied (status: ${permissionState}). Please try again and grant access when prompted.`);
    }
    
    // Verify we can actually read the directory with multiple attempts
    try {
      await verifyFolderAccessWithRetry(directoryHandle);
    } catch (err) {
      console.error('Directory access verification failed:', err);
      throw new Error(`Access verification failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
    
    // Create a folder object
    const folderId = `folder-${uuidv4()}`;
    
    // Store the directory handle directly - this is correct approach for IndexedDB
    // which can store complex objects including file handles
    const folder = {
      id: folderId,
      name: directoryHandle.name,
      path: directoryHandle.name, // We can only see the name, not the full path
      handle: directoryHandle, // Store the actual handle object
      isActive: true,
      lastScanned: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    try {
      // First check if we already have this folder - don't use the name as it might not be unique
      const existingFolders = await databaseService.getAll(STORE_NAMES.FOLDERS);
      
      // No need to check for duplicate - we should add the new folder entry
      // as each directory selection represents a new monitoring request
      
      // Save new folder to IndexedDB using database service
      await databaseService.add(STORE_NAMES.FOLDERS, folder);
      
      console.log('Folder added to monitored folders:', folder);
      return folder;
    } catch (e) {
      console.error('Error saving folder to database:', e);
      return null;
    }
  } catch (error) {
    console.error('Direct folder access error:', error);
    
    // Throw a more specific error for permission issues
    if (error instanceof DOMException && error.name === 'NotAllowedError') {
      throw new Error('Permission to access folder was denied. Please try again and grant access when prompted.');
    }
    
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error('Unknown error accessing folder');
    }
  }
}

/**
 * Serialize a directory handle for storage and verify we can access every level
 */
async function serializeDirectoryHandle(handle: FileSystemDirectoryHandle): Promise<string> {
  // We can't fully serialize the handle, but we can store important information
  const serialized = {
    name: handle.name,
    kind: handle.kind,
    timestamp: Date.now()
  };
  
  return JSON.stringify(serialized);
}

/**
 * Verify access to a folder by trying to read it with multiple attempts
 */
export async function verifyFolderAccessWithRetry(directoryHandle: FileSystemDirectoryHandle, maxRetries = 3): Promise<boolean> {
  let lastError = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Verification attempt ${attempt}/${maxRetries}...`);
      
      // Request permission with each attempt
      const permissionState = await directoryHandle.requestPermission({ mode: 'readwrite' });
      
      if (permissionState !== 'granted') {
        lastError = new Error(`Permission not granted (status: ${permissionState})`);
        console.warn(`Permission not granted on attempt ${attempt}: ${permissionState}`);
        
        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 500));
        continue;
      }
      
      // Try to read the directory
      let hasEntries = false;
      for await (const [name, entry] of directoryHandle.entries()) {
        // Just need to verify we can read at least one entry
        hasEntries = true;
        console.log(`Successfully read entry: ${name}`);
        break;
      }
      
      // If we get here without errors, access is working
      console.log(`Directory access verified on attempt ${attempt}`);
      return true;
    } catch (error) {
      lastError = error;
      console.error(`Verification attempt ${attempt} failed:`, error);
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  // If we get here, all attempts failed
  const errorMessage = lastError instanceof Error ? lastError.message : 'Unknown error';
  throw new Error(`Failed to verify folder access after ${maxRetries} attempts: ${errorMessage}`);
}

/**
 * Verify access to a folder by trying to read it
 */
export async function verifyFolderAccess(directoryHandle: FileSystemDirectoryHandle): Promise<boolean> {
  try {
    // Request permission
    const permissionState = await directoryHandle.requestPermission({ mode: 'readwrite' });
    
    if (permissionState !== 'granted') {
      return false;
    }
    
    // Try to read the directory
    for await (const [name, entry] of directoryHandle.entries()) {
      // Just need to verify we can read at least one entry
      return true;
    }
    
    // If it's an empty directory, we still have access
    return true;
  } catch (error) {
    console.error('Folder access verification failed:', error);
    return false;
  }
}
