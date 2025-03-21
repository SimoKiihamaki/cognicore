/**
 * Direct Folder Access Utility
 * 
 * This module provides a direct implementation for folder access
 * that bypasses the existing implementations that may have issues.
 */

/**
 * Request access to a folder and create a folder entry
 * 
 * @returns {Promise<Object|null>} The folder object or null if failed
 */
export async function requestFolderAccess() {
  try {
    console.log('Requesting folder access with direct method...');
    
    // Direct implementation using the File System Access API
    const directoryHandle = await window.showDirectoryPicker({
      mode: 'readwrite',
      startIn: 'documents'
    });
    
    if (!directoryHandle) {
      console.error('No directory handle returned');
      return null;
    }
    
    // Try to verify permissions
    try {
      // Request permission explicitly
      const permissionState = await directoryHandle.requestPermission({ mode: 'readwrite' });
      console.log('Permission state:', permissionState);
      
      // Test with a simple file access
      let hasAccess = false;
      try {
        for await (const [name, handle] of directoryHandle.entries()) {
          hasAccess = true;
          break;
        }
      } catch (e) {
        console.warn('Could not read directory entries:', e);
      }
      
      if (!hasAccess && permissionState !== 'granted') {
        console.error('Could not access directory contents');
        // Continue anyway - we may still be able to use the handle
      }
    } catch (err) {
      console.warn('Permission verification failed:', err);
      // Continue anyway - we may still be able to use the handle
    }
    
    // Create a folder object
    const folder = {
      id: `folder-${Date.now()}`,
      path: directoryHandle.name,
      handle: directoryHandle,
      isActive: true
    };
    
    // Check existing folders in localStorage
    let existingFolders = [];
    try {
      const storedFolders = localStorage.getItem('cognicore-monitored-folders');
      if (storedFolders) {
        existingFolders = JSON.parse(storedFolders);
      }
    } catch (e) {
      console.error('Error reading stored folders:', e);
    }
    
    // Check if folder already exists
    const folderExists = existingFolders.some(f => f.path === folder.path);
    if (folderExists) {
      console.log('Folder already exists in monitored folders');
      return null;
    }
    
    // Serialize the handle
    try {
      // Save the folder in localStorage directly
      const newFolders = [...existingFolders, folder];
      localStorage.setItem('cognicore-monitored-folders', JSON.stringify(newFolders));
      console.log('Folder added to monitored folders:', folder);
      return folder;
    } catch (e) {
      console.error('Error saving folder:', e);
      return null;
    }
  } catch (error) {
    console.error('Direct folder access error:', error);
    return null;
  }
}
