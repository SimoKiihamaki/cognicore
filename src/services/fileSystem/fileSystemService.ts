/**
 * File System Service for CogniCore
 * 
 * Provides access to the File System Access API with fallbacks
 * for browsers that don't support it.
 */

import { IndexedFile } from '@/lib/types';

// Define result types
interface FileSystemResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface DirectoryResult {
  success: boolean;
  handle?: FileSystemDirectoryHandle;
  files?: File[];
  error?: string;
}

class FileSystemService {
  private directoryHandle: FileSystemDirectoryHandle | null = null;
  
  /**
   * Check if File System Access API is supported in the current browser
   */
  public isFileSystemAccessSupported(): boolean {
    return 'showDirectoryPicker' in window;
  }

  /**
   * Check if the webkitdirectory attribute is supported (for fallback)
   */
  public isWebkitDirectorySupported(): boolean {
    const input = document.createElement('input');
    return 'webkitdirectory' in input;
  }

  /**
   * Request access to a directory using the File System Access API
   * Falls back to traditional file input method for unsupported browsers
   */
  public async requestDirectoryAccess(): Promise<DirectoryResult> {
    try {
      // Try to use the File System Access API if supported
      if (this.isFileSystemAccessSupported()) {
        const handle = await window.showDirectoryPicker();
        this.directoryHandle = handle;
        return { success: true, handle };
      } else {
        // Fall back to using a traditional file input
        const files = await this.fallbackDirectorySelection();
        if (files.length === 0) {
          return { 
            success: false, 
            error: 'No files selected or browser does not support folder selection' 
          };
        }
        return { success: true, files };
      }
    } catch (error) {
      console.error('Error requesting directory access:', error);
      
      // Handle permission errors specifically
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        return { 
          success: false, 
          error: 'Permission to access directory was denied' 
        };
      }
      
      // Handle other errors
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error accessing directory' 
      };
    }
  }

  /**
   * Fallback method for browsers that don't support File System Access API
   * Uses a traditional file input with webkitdirectory attribute
   */
  private async fallbackDirectorySelection(): Promise<File[]> {
    return new Promise<File[]>((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = true;
      
      // Use webkitdirectory if available
      if (this.isWebkitDirectorySupported()) {
        input.webkitdirectory = true;
      }
      
      input.onchange = () => {
        if (input.files && input.files.length > 0) {
          resolve(Array.from(input.files));
        } else {
          resolve([]);
        }
      };
      
      // Handle cancellation
      input.oncancel = () => resolve([]);
      
      // Add the input temporarily to the DOM and click it
      document.body.appendChild(input);
      input.click();
      document.body.removeChild(input);
    });
  }

  /**
   * Get the current directory handle or null if none has been selected
   */
  public getDirectoryHandle(): FileSystemDirectoryHandle | null {
    return this.directoryHandle;
  }

  /**
   * Read a file's content using File System Access API or traditional File API
   */
  public async readFile(
    fileHandle: FileSystemFileHandle | File
  ): Promise<FileSystemResult<string>> {
    try {
      let fileContent: string;
      
      // Handle different types of file objects
      if ('getFile' in fileHandle) {
        // File System Access API
        const file = await fileHandle.getFile();
        fileContent = await file.text();
      } else {
        // Traditional File API
        fileContent = await fileHandle.text();
      }
      
      return {
        success: true,
        data: fileContent
      };
    } catch (error) {
      console.error('Error reading file:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error reading file'
      };
    }
  }

  /**
   * Write content to a file using File System Access API
   */
  public async writeFile(
    fileHandle: FileSystemFileHandle,
    content: string
  ): Promise<FileSystemResult<void>> {
    try {
      // Check if file system access API is supported
      if (!this.isFileSystemAccessSupported()) {
        return {
          success: false,
          error: 'File System Access API is not supported in this browser'
        };
      }
      
      // Create a writable stream and write the content
      const writable = await fileHandle.createWritable();
      await writable.write(content);
      await writable.close();
      
      return { success: true };
    } catch (error) {
      console.error('Error writing to file:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error writing to file'
      };
    }
  }

  /**
   * List the contents of a directory using File System Access API
   */
  public async listDirectory(
    directoryHandle: FileSystemDirectoryHandle | null = null
  ): Promise<FileSystemResult<Map<string, FileSystemHandle>>> {
    try {
      // Use provided handle or fallback to stored handle
      const handle = directoryHandle || this.directoryHandle;
      
      if (!handle) {
        return {
          success: false,
          error: 'No directory handle available'
        };
      }
      
      const entries = new Map<string, FileSystemHandle>();
      
      // Iterate through all entries in the directory
      for await (const [name, entry] of handle.entries()) {
        entries.set(name, entry);
      }
      
      return {
        success: true,
        data: entries
      };
    } catch (error) {
      console.error('Error listing directory:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error listing directory'
      };
    }
  }

  /**
   * Create a new file in the specified directory
   */
  public async createFile(
    directoryHandle: FileSystemDirectoryHandle | null = null,
    fileName: string,
    content: string = ''
  ): Promise<FileSystemResult<FileSystemFileHandle>> {
    try {
      // Use provided handle or fallback to stored handle
      const handle = directoryHandle || this.directoryHandle;
      
      if (!handle) {
        return {
          success: false,
          error: 'No directory handle available'
        };
      }
      
      // Create the file
      const fileHandle = await handle.getFileHandle(fileName, { create: true });
      
      // Write initial content if provided
      if (content) {
        const writeResult = await this.writeFile(fileHandle, content);
        if (!writeResult.success) {
          return {
            success: false,
            error: `File created but failed to write content: ${writeResult.error}`
          };
        }
      }
      
      return {
        success: true,
        data: fileHandle
      };
    } catch (error) {
      console.error('Error creating file:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error creating file'
      };
    }
  }

  /**
   * Process files from traditional file input
   * Converts File objects to IndexedFile objects for storage
   */
  public async processUploadedFiles(files: File[]): Promise<FileSystemResult<IndexedFile[]>> {
    try {
      const results: IndexedFile[] = [];
      
      for (const file of files) {
        try {
          const content = await file.text();
          const path = 'webkitRelativePath' in file && file.webkitRelativePath
            ? file.webkitRelativePath
            : file.name;
          
          results.push({
            id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            filename: file.name,
            filepath: path,
            content,
            filetype: file.type || this.getFileTypeFromExtension(file.name),
            lastModified: new Date(file.lastModified),
            size: file.size
          });
        } catch (error) {
          console.error(`Error processing file ${file.name}:`, error);
        }
      }
      
      return {
        success: true,
        data: results
      };
    } catch (error) {
      console.error('Error processing uploaded files:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error processing files'
      };
    }
  }

  /**
   * Get file type from file extension
   */
  public getFileTypeFromExtension(filename: string): string {
    const extension = filename.split('.').pop()?.toLowerCase() || '';
    
    const mimeTypes: Record<string, string> = {
      'md': 'text/markdown',
      'txt': 'text/plain',
      'json': 'application/json',
      'html': 'text/html',
      'htm': 'text/html',
      'css': 'text/css',
      'js': 'text/javascript',
      'ts': 'text/typescript',
      'jsx': 'text/jsx',
      'tsx': 'text/tsx',
      'pdf': 'application/pdf',
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'svg': 'image/svg+xml'
    };
    
    return mimeTypes[extension] || 'application/octet-stream';
  }

  /**
   * Verify that a directory handle is still valid and accessible
   */
  public async verifyDirectoryAccess(
    directoryHandle: FileSystemDirectoryHandle | null = null
  ): Promise<boolean> {
    try {
      const handle = directoryHandle || this.directoryHandle;
      
      if (!handle) {
        return false;
      }
      
      // Try to access the directory to verify permissions
      await handle.requestPermission({ mode: 'read' });
      
      // If no error was thrown, we have access
      return true;
    } catch (error) {
      console.error('Error verifying directory access:', error);
      return false;
    }
  }
}

// Export a singleton instance
const fileSystemService = new FileSystemService();
export default fileSystemService;
