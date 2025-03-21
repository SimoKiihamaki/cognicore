/**
 * Folder Permission Helper
 * 
 * Provides utilities to diagnose and fix folder access permission issues
 */

// Interface for directory handle info
export interface DirectoryHandleInfo {
  name: string;
  kind: string;
  path?: string;
  permissionStatus?: 'granted' | 'denied' | 'prompt' | 'unknown';
  accessError?: string;
  readableEntries?: number;
  entryNames?: string[];
}

/**
 * Get detailed information about a directory handle
 * 
 * @param handle The directory handle to inspect
 * @returns Promise resolving to information about the handle
 */
export async function getDirectoryHandleInfo(
  handle: FileSystemDirectoryHandle
): Promise<DirectoryHandleInfo> {
  const info: DirectoryHandleInfo = {
    name: handle.name,
    kind: handle.kind,
  };
  
  // Try to get permissions
  try {
    const permissionStatus = await handle.queryPermission({ mode: 'read' });
    info.permissionStatus = permissionStatus;
    
    // If permission is not granted, try to request it
    if (permissionStatus !== 'granted') {
      try {
        console.log('Attempting to request permission for diagnostics...');
        const newStatus = await handle.requestPermission({ mode: 'readwrite' });
        info.permissionStatus = newStatus;
        console.log('New permission status:', newStatus);
      } catch (permError) {
        console.error('Error requesting permission during diagnostics:', permError);
      }
    }
  } catch (error) {
    info.permissionStatus = 'unknown';
    info.accessError = error instanceof Error ? error.message : 'Unknown error checking permissions';
  }
  
  // Try to read entries
  let retryCount = 0;
  const maxRetries = 3;
  
  while (retryCount < maxRetries) {
    try {
      const entries: string[] = [];
      let entryCount = 0;
      
      for await (const [name, entry] of handle.entries()) {
        entries.push(`${name} (${entry.kind})`);
        entryCount++;
        
        // Limit to first 10 entries to avoid excessive processing
        if (entryCount >= 10) {
          break;
        }
      }
      
      info.readableEntries = entryCount;
      info.entryNames = entries;
      
      // If we got here, we succeeded
      break;
    } catch (error) {
      retryCount++;
      info.accessError = error instanceof Error ? error.message : 'Unknown error reading directory';
      
      if (retryCount < maxRetries) {
        console.log(`Retry ${retryCount}/${maxRetries} for directory access...`);
        // Wait briefly before retrying
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Try to request permission again
        try {
          await handle.requestPermission({ mode: 'readwrite' });
        } catch (permError) {
          console.error('Error requesting permission during retry:', permError);
        }
      }
    }
  }
  
  return info;
}

/**
 * Request permanent permission for a directory handle
 * 
 * @param handle The directory handle to request permission for
 * @returns Promise resolving to a boolean indicating success
 */
export async function requestPermanentPermission(
  handle: FileSystemDirectoryHandle
): Promise<boolean> {
  // Try multiple times with a delay between attempts
  const maxAttempts = 3;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`Permission request attempt ${attempt}/${maxAttempts}...`);
      
      // Try to get permanent permission
      const permissionStatus = await handle.requestPermission({ mode: 'readwrite' });
      console.log(`Permission status on attempt ${attempt}: ${permissionStatus}`);
      
      if (permissionStatus === 'granted') {
        return true;
      }
      
      // Wait before retry
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error(`Error requesting permission on attempt ${attempt}:`, error);
      
      // Wait before retry
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  }
  
  // If we get here, all attempts failed
  return false;
}

/**
 * Verify access to a directory by trying to read its entries
 * 
 * @param handle The directory handle to verify
 * @returns Promise resolving to a boolean indicating if access is possible
 */
export async function verifyDirectoryAccess(
  handle: FileSystemDirectoryHandle
): Promise<boolean> {
  const maxAttempts = 3;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`Verification attempt ${attempt}/${maxAttempts}...`);
      
      // Try to read at least one entry to verify access
      let hasEntries = false;
      for await (const [name, entry] of handle.entries()) {
        hasEntries = true;
        console.log(`Successfully read entry: ${name}`);
        break;
      }
      
      // Success - either has entries or is an empty directory
      return true;
    } catch (error) {
      console.error(`Error verifying directory access on attempt ${attempt}:`, error);
      
      // Try to request permission again
      try {
        await handle.requestPermission({ mode: 'readwrite' });
      } catch (permError) {
        console.error('Error requesting permission during verification:', permError);
      }
      
      // Wait before retry
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  }
  
  // If we get here, all attempts failed
  return false;
}

/**
 * Request permission for a directory and verify access
 * 
 * @param handle The directory handle to fix
 * @returns Promise resolving to a boolean indicating success
 */
export async function fixDirectoryPermissions(
  handle: FileSystemDirectoryHandle
): Promise<boolean> {
  try {
    console.log('Attempting to fix directory permissions...');
    
    // First try requesting permission
    const permissionGranted = await requestPermanentPermission(handle);
    
    if (!permissionGranted) {
      console.error('Permission not granted after multiple attempts');
      return false;
    }
    
    // Verify that we can access the directory
    const accessVerified = await verifyDirectoryAccess(handle);
    
    if (!accessVerified) {
      console.error('Access verification failed after multiple attempts');
      return false;
    }
    
    console.log('Directory permissions fixed successfully');
    return true;
  } catch (error) {
    console.error('Error fixing directory permissions:', error);
    return false;
  }
}

/**
 * Attempt to recover a folder handle from serialized data
 * Note: This is a best-effort approach since proper serialization of handles is not well-supported
 */
export async function recoverFolderHandle(
  serializedData: string
): Promise<FileSystemDirectoryHandle | null> {
  try {
    // Parse the serialized data
    const data = JSON.parse(serializedData);
    
    // Show a message to the user
    console.info('Need to reselect folder:', data.name);
    
    // We don't have the actual handle, so we need to ask the user to select it again
    const pickerOpts = {
      id: data.name, // Unique ID to help browser identify the folder
      startIn: 'documents' as FileSystemDirectoryHandle | 'desktop' | 'documents' | 'downloads' | 'music' | 'pictures' | 'videos',
      mode: 'readwrite' as FileSystemPermissionMode
    };
    
    // Let the user choose the same folder again
    const directoryHandle = await window.showDirectoryPicker(pickerOpts);
    
    if (!directoryHandle) {
      throw new Error('No directory handle returned');
    }
    
    // Verify that this is the same folder by checking the name
    if (directoryHandle.name !== data.name) {
      console.warn(`Selected folder name "${directoryHandle.name}" does not match expected name "${data.name}"`);
      // We'll still proceed - the user may have renamed the folder
    }
    
    // Request permanent permission with multiple attempts
    let permissionGranted = false;
    for (let i = 0; i < 3; i++) {
      const permissionStatus = await directoryHandle.requestPermission({ mode: 'readwrite' });
      if (permissionStatus === 'granted') {
        permissionGranted = true;
        break;
      }
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    if (!permissionGranted) {
      throw new Error('Permission not granted after multiple attempts');
    }
    
    // Verify access
    try {
      for await (const [name, entry] of directoryHandle.entries()) {
        // Just checking we can read entries
        break;
      }
    } catch (accessError) {
      throw new Error(`Cannot access folder: ${accessError instanceof Error ? accessError.message : 'Unknown error'}`);
    }
    
    return directoryHandle;
  } catch (error) {
    console.error('Error recovering folder handle:', error);
    return null;
  }
}

/**
 * Check if the File System Access API is fully supported in this browser
 */
export function isFileSystemAccessSupported(): boolean {
  return !!(
    window.showDirectoryPicker && 
    typeof FileSystemDirectoryHandle !== 'undefined' &&
    typeof FileSystemFileHandle !== 'undefined'
  );
}
