/**
 * Custom hook for using the file system service
 */

import { useState, useCallback, useEffect } from 'react';
import fileSystemService from '@/services/fileSystem/fileSystemService';
import { IndexedFile } from '@/lib/types';
import { useIndexedDB } from './useIndexedDB';
import { STORE_NAMES } from '@/services/database/databaseService';

export function useFileSystem() {
  const [isFileSystemSupported, setIsFileSystemSupported] = useState<boolean>(false);
  const [isFallbackSupported, setIsFallbackSupported] = useState<boolean>(false);
  const [directoryHandle, setDirectoryHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const { 
    addItem: addFileToDb,
    updateItem: updateFileInDb,
    deleteItem: deleteFileFromDb,
    refresh: refreshFiles
  } = useIndexedDB(STORE_NAMES.FILES);

  // Check browser support on mount
  useEffect(() => {
    setIsFileSystemSupported(fileSystemService.isFileSystemAccessSupported());
    setIsFallbackSupported(fileSystemService.isWebkitDirectorySupported());
    
    // Check if we already have a directory handle
    const handle = fileSystemService.getDirectoryHandle();
    if (handle) {
      setDirectoryHandle(handle);
    }
  }, []);

  /**
   * Request access to a directory 
   */
  const requestDirectoryAccess = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await fileSystemService.requestDirectoryAccess();
      
      if (result.success) {
        if (result.handle) {
          setDirectoryHandle(result.handle);
        }
        
        // Process files if using fallback method
        if (result.files) {
          await processUploadedFiles(result.files);
        }
        
        return result;
      } else {
        setError(result.error || 'Failed to access directory');
        return result;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Process uploaded files from fallback method
   */
  const processUploadedFiles = useCallback(async (files: File[]) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await fileSystemService.processUploadedFiles(files);
      
      if (result.success && result.data) {
        // Store files in IndexedDB
        for (const file of result.data) {
          await addFileToDb(file);
        }
        
        await refreshFiles();
        return result;
      } else {
        setError(result.error || 'Failed to process files');
        return result;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setIsLoading(false);
    }
  }, [addFileToDb, refreshFiles]);

  /**
   * List the contents of the current directory
   */
  const listDirectory = useCallback(async (customHandle?: FileSystemDirectoryHandle) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const handle = customHandle || directoryHandle;
      
      if (!handle) {
        setError('No directory selected');
        return {
          success: false,
          error: 'No directory selected'
        };
      }
      
      const result = await fileSystemService.listDirectory(handle);
      
      if (!result.success) {
        setError(result.error || 'Failed to list directory contents');
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setIsLoading(false);
    }
  }, [directoryHandle]);

  /**
   * Read a file's content
   */
  const readFile = useCallback(async (fileHandle: FileSystemFileHandle | File) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await fileSystemService.readFile(fileHandle);
      
      if (!result.success) {
        setError(result.error || 'Failed to read file');
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Write content to a file
   */
  const writeFile = useCallback(async (fileHandle: FileSystemFileHandle, content: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await fileSystemService.writeFile(fileHandle, content);
      
      if (!result.success) {
        setError(result.error || 'Failed to write to file');
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Create a new file in the current directory
   */
  const createFile = useCallback(async (fileName: string, content: string = '') => {
    setIsLoading(true);
    setError(null);
    
    try {
      if (!directoryHandle) {
        setError('No directory selected');
        return {
          success: false,
          error: 'No directory selected'
        };
      }
      
      const result = await fileSystemService.createFile(directoryHandle, fileName, content);
      
      if (!result.success) {
        setError(result.error || 'Failed to create file');
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setIsLoading(false);
    }
  }, [directoryHandle]);

  /**
   * Verify that we still have access to the directory
   */
  const verifyAccess = useCallback(async () => {
    if (!directoryHandle) {
      return false;
    }
    
    return await fileSystemService.verifyDirectoryAccess(directoryHandle);
  }, [directoryHandle]);

  return {
    isFileSystemSupported,
    isFallbackSupported,
    directoryHandle,
    isLoading,
    error,
    requestDirectoryAccess,
    processUploadedFiles,
    listDirectory,
    readFile,
    writeFile,
    createFile,
    verifyAccess
  };
}
