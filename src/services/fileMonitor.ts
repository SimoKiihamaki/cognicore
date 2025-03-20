/**
 * File monitoring service for automatically integrating files into the application
 * Uses the File System Access API for local file system access
 */

import { IndexedFile } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

// Store file handles for monitored folders
const folderHandles: Map<string, FileSystemDirectoryHandle> = new Map();

// Store watchers for monitored directories
const directoryWatchers: Map<string, any> = new Map();

/**
 * Request permission to access a folder
 * @returns The folder handle or null if permission was denied
 */
export async function requestFolderAccess(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const folderHandle = await window.showDirectoryPicker({
      mode: 'read'
    });
    
    return folderHandle;
  } catch (error) {
    console.error('Error requesting folder access:', error);
    return null;
  }
}

/**
 * Add a folder to monitor for changes
 * @param folderPath Folder path identifier (for display purposes)
 * @param directoryHandle The directory handle from File System Access API
 */
export function addMonitoredFolder(
  folderPath: string,
  directoryHandle: FileSystemDirectoryHandle
): void {
  if (folderHandles.has(folderPath)) {
    console.log(`Folder ${folderPath} is already being monitored`);
    return;
  }
  
  folderHandles.set(folderPath, directoryHandle);
  console.log(`Added folder ${folderPath} to monitored folders`);
}

/**
 * Remove a folder from monitoring
 * @param folderPath The folder path to stop monitoring
 */
export function removeMonitoredFolder(folderPath: string): void {
  if (!folderHandles.has(folderPath)) {
    console.log(`Folder ${folderPath} is not being monitored`);
    return;
  }
  
  folderHandles.delete(folderPath);
  
  // Also stop any active watcher
  if (directoryWatchers.has(folderPath)) {
    directoryWatchers.delete(folderPath);
  }
  
  console.log(`Removed folder ${folderPath} from monitored folders`);
}

/**
 * Get all monitored folders
 * @returns Map of folder paths to their handles
 */
export function getMonitoredFolders(): Map<string, FileSystemDirectoryHandle> {
  return folderHandles;
}

/**
 * Read a file from a directory handle
 * @param directoryHandle Directory handle
 * @param fileName File name to read
 * @returns File content as text
 */
export async function readFile(
  directoryHandle: FileSystemDirectoryHandle,
  fileName: string
): Promise<string> {
  try {
    const fileHandle = await directoryHandle.getFileHandle(fileName);
    const file = await fileHandle.getFile();
    return await file.text();
  } catch (error) {
    console.error(`Error reading file ${fileName}:`, error);
    throw error;
  }
}

/**
 * Create an IndexedFile object from a file
 * @param file File object
 * @param filePath Path to the file
 * @returns IndexedFile object
 */
export async function createIndexedFile(
  file: File,
  filePath: string
): Promise<IndexedFile> {
  // Only process text-based files
  const isTextFile = file.type.startsWith('text/') || 
    ['md', 'txt', 'json', 'csv', 'js', 'ts', 'html', 'css'].some(ext => 
      file.name.toLowerCase().endsWith(`.${ext}`)
    );
  
  let content = '';
  if (isTextFile) {
    try {
      content = await file.text();
    } catch (error) {
      console.error(`Error reading text from file ${file.name}:`, error);
    }
  }
  
  return {
    id: uuidv4(),
    filename: file.name,
    filepath: filePath,
    content: isTextFile ? content : undefined,
    filetype: file.type || getFileTypeFromName(file.name),
    lastModified: new Date(file.lastModified),
    size: file.size
  };
}

/**
 * Get file type based on file extension
 * @param fileName File name
 * @returns MIME type string
 */
function getFileTypeFromName(fileName: string): string {
  const extension = fileName.split('.').pop()?.toLowerCase();
  
  if (!extension) return 'application/octet-stream';
  
  const mimeTypes: Record<string, string> = {
    'txt': 'text/plain',
    'md': 'text/markdown',
    'json': 'application/json',
    'js': 'text/javascript',
    'ts': 'text/typescript',
    'html': 'text/html',
    'css': 'text/css',
    'csv': 'text/csv',
    'pdf': 'application/pdf',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  };
  
  return mimeTypes[extension] || 'application/octet-stream';
}

// File types to consider for text-based processing
export const TEXT_FILE_EXTENSIONS = [
  'md', 'txt', 'json', 'csv', 
  'js', 'ts', 'jsx', 'tsx', 
  'html', 'css', 'py', 'java',
  'c', 'cpp', 'cs', 'go', 'rb',
  'php', 'xml', 'yaml', 'yml',
  'sh', 'bat', 'ps1', 'conf',
  'ini', 'cfg', 'toml'
];

// File types to ignore during scanning
export const IGNORED_FILE_EXTENSIONS = [
  'exe', 'dll', 'so', 'dylib',
  'jar', 'war', 'ear', 'zip',
  'rar', '7z', 'tar', 'gz',
  'mp3', 'mp4', 'avi', 'mov',
  'jpg', 'jpeg', 'png', 'gif',
  'bmp', 'ico', 'svg', 'webp',
  'pdf', 'doc', 'docx', 'xls',
  'xlsx', 'db', 'sqlite'
];

// Excluded directory names to skip during scanning
export const EXCLUDED_DIRECTORIES = [
  'node_modules', '.git', '.svn',
  'dist', 'build', 'target',
  '.cache', '.vscode', '.idea',
  '__pycache__', 'venv', 'env'
];

interface ScanOptions {
  maxFileSize?: number;           // Maximum file size in bytes (default: 5MB)
  includeAllFileTypes?: boolean;  // Include all file types regardless of extension (default: false)
  skipExcludedDirs?: boolean;     // Skip excluded directory paths (default: true)
  maxDepth?: number;              // Maximum directory depth to scan (default: Infinity)
  textFilesOnly?: boolean;        // Only scan text-based files (default: true)
}

/**
 * Scan a directory for all files recursively
 * @param directoryHandle Directory handle to scan
 * @param basePath Base path for constructing file paths
 * @param options Scanning options
 * @returns Array of IndexedFile objects
 */
export async function scanDirectory(
  directoryHandle: FileSystemDirectoryHandle,
  basePath: string = '',
  options: ScanOptions = {}
): Promise<IndexedFile[]> {
  const {
    maxFileSize = 5 * 1024 * 1024, // 5MB default max file size
    includeAllFileTypes = false,
    skipExcludedDirs = true,
    maxDepth = Infinity,
    textFilesOnly = true
  } = options;

  const results: IndexedFile[] = [];
  const currentDepth = basePath ? basePath.split('/').length : 0;
  
  // If we've exceeded the max depth, return empty results
  if (currentDepth > maxDepth) {
    return results;
  }
  
  try {
    for await (const [name, handle] of directoryHandle.entries()) {
      const path = basePath ? `${basePath}/${name}` : name;
      
      if (handle.kind === 'file') {
        try {
          // Check file extension
          const extension = name.split('.').pop()?.toLowerCase() || '';
          
          // Skip based on extension filters
          if (!includeAllFileTypes && textFilesOnly && 
              !TEXT_FILE_EXTENSIONS.includes(extension) &&
              !name.includes('.')) {
            continue;
          }
          
          if (!includeAllFileTypes && 
              IGNORED_FILE_EXTENSIONS.includes(extension)) {
            continue;
          }
          
          const file = await handle.getFile();
          
          // Skip files that exceed the max size
          if (file.size > maxFileSize) {
            console.log(`Skipping large file: ${path} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
            continue;
          }
          
          results.push(await createIndexedFile(file, path));
        } catch (fileError) {
          console.error(`Error processing file ${path}:`, fileError);
          // Continue with other files even if one fails
        }
      } else if (handle.kind === 'directory') {
        // Skip excluded directories if enabled
        if (skipExcludedDirs && EXCLUDED_DIRECTORIES.includes(name)) {
          console.log(`Skipping excluded directory: ${path}`);
          continue;
        }
        
        // Recursively scan subdirectories
        try {
          const subDirResults = await scanDirectory(handle, path, {
            ...options,
            maxDepth
          });
          results.push(...subDirResults);
        } catch (dirError) {
          console.error(`Error scanning directory ${path}:`, dirError);
          // Continue with other directories even if one fails
        }
      }
    }
  } catch (error) {
    console.error(`Error scanning directory ${basePath}:`, error);
    throw new Error(`Failed to scan directory ${basePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  return results;
}

// Store monitoring status information
export interface MonitoringStatus {
  folderPath: string;
  isActive: boolean;
  lastScanTime: Date | null;
  fileCount: number;
  errorCount: number;
  lastError: string | null;
  scanIntervalMs: number;
}

// Status for each monitored folder
const monitoringStatus: Map<string, MonitoringStatus> = new Map();

/**
 * Get monitoring status for a specific folder or all folders
 * @param folderPath Optional folder path to get status for
 * @returns Monitoring status object or array of all status objects
 */
export function getMonitoringStatus(folderPath?: string): MonitoringStatus | MonitoringStatus[] {
  if (folderPath) {
    return monitoringStatus.get(folderPath) || {
      folderPath,
      isActive: false,
      lastScanTime: null,
      fileCount: 0,
      errorCount: 0,
      lastError: null,
      scanIntervalMs: 0
    };
  }
  
  return Array.from(monitoringStatus.values());
}

/**
 * Monitor a folder for changes and call the callback when files change
 * Note: Due to browser limitations, this uses polling rather than native file watchers
 * @param folderPath Folder path identifier
 * @param callback Function to call when files change
 * @param options Options for monitoring and scanning
 */
export function startMonitoringFolder(
  folderPath: string,
  callback: (files: IndexedFile[], eventType: 'initial' | 'changed' | 'deleted') => void,
  options: {
    intervalMs?: number;
    scanOptions?: ScanOptions;
    errorCallback?: (error: Error) => void;
  } = {}
): void {
  const {
    intervalMs = 30000,
    scanOptions = {
      maxFileSize: 5 * 1024 * 1024,
      textFilesOnly: true,
      skipExcludedDirs: true
    },
    errorCallback
  } = options;

  if (!folderHandles.has(folderPath)) {
    const error = new Error(`Cannot monitor folder ${folderPath} - not in monitored folders`);
    console.error(error);
    if (errorCallback) errorCallback(error);
    return;
  }
  
  const directoryHandle = folderHandles.get(folderPath)!;
  
  // Stop any existing watcher
  if (directoryWatchers.has(folderPath)) {
    clearInterval(directoryWatchers.get(folderPath));
  }
  
  // Initialize or update monitoring status
  const status: MonitoringStatus = monitoringStatus.get(folderPath) || {
    folderPath,
    isActive: false,
    lastScanTime: null,
    fileCount: 0,
    errorCount: 0,
    lastError: null,
    scanIntervalMs: intervalMs
  };
  
  status.isActive = true;
  status.scanIntervalMs = intervalMs;
  monitoringStatus.set(folderPath, status);
  
  // Keep track of last modified times and content hashes
  const fileStates = new Map<string, { modTime: number, size: number }>();
  
  // Initial scan
  scanDirectory(directoryHandle, folderPath, scanOptions)
    .then(files => {
      // Store initial file states
      files.forEach(file => {
        fileStates.set(file.filepath, { 
          modTime: file.lastModified.getTime(),
          size: file.size
        });
      });
      
      // Update status
      status.lastScanTime = new Date();
      status.fileCount = files.length;
      monitoringStatus.set(folderPath, status);
      
      // Call callback with initial files
      callback(files, 'initial');
    })
    .catch(error => {
      console.error(`Error during initial scan of ${folderPath}:`, error);
      
      // Update error status
      status.errorCount++;
      status.lastError = error instanceof Error ? error.message : String(error);
      monitoringStatus.set(folderPath, status);
      
      if (errorCallback) errorCallback(error instanceof Error ? error : new Error(String(error)));
    });
  
  // Set up polling watcher with exponential backoff on error
  let consecutiveErrors = 0;
  let currentInterval = intervalMs;
  
  const intervalId = setInterval(async () => {
    try {
      const files = await scanDirectory(directoryHandle, folderPath, scanOptions);
      const changedFiles: IndexedFile[] = [];
      
      // Check for new or modified files
      files.forEach(file => {
        const existingState = fileStates.get(file.filepath);
        const currentState = { 
          modTime: file.lastModified.getTime(),
          size: file.size 
        };
        
        // Detect changes by comparing modified time and file size
        if (!existingState || 
            existingState.modTime !== currentState.modTime ||
            existingState.size !== currentState.size) {
          changedFiles.push(file);
          fileStates.set(file.filepath, currentState);
        }
      });
      
      // Check for deleted files
      const currentPaths = new Set(files.map(file => file.filepath));
      const deletedPaths: string[] = [];
      const deletedFiles: IndexedFile[] = [];
      
      fileStates.forEach((state, path) => {
        if (!currentPaths.has(path)) {
          deletedPaths.push(path);
          
          // Create a placeholder object for deleted files to inform the callback
          deletedFiles.push({
            id: path, // Use path as ID for deleted files
            filename: path.split('/').pop() || '',
            filepath: path,
            lastModified: new Date(),
            size: 0,
            isDeleted: true
          });
        }
      });
      
      // Remove deleted files from the state
      deletedPaths.forEach(path => {
        fileStates.delete(path);
      });
      
      // Update status
      status.lastScanTime = new Date();
      status.fileCount = files.length;
      status.errorCount = 0; // Reset error count on successful scan
      status.lastError = null;
      monitoringStatus.set(folderPath, status);
      
      // Reset backoff parameters on success
      consecutiveErrors = 0;
      
      if (currentInterval !== intervalMs) {
        // Reset interval to original value if it was increased due to errors
        clearInterval(intervalId);
        currentInterval = intervalMs;
        directoryWatchers.set(folderPath, setInterval(intervalId, currentInterval));
      }
      
      // If there are changes, call the callback
      if (changedFiles.length > 0) {
        callback(changedFiles, 'changed');
      }
      
      // If there are deleted files, call the callback
      if (deletedFiles.length > 0) {
        callback(deletedFiles, 'deleted');
      }
    } catch (error) {
      console.error(`Error polling folder ${folderPath}:`, error);
      
      // Update error status
      status.errorCount++;
      status.lastError = error instanceof Error ? error.message : String(error);
      monitoringStatus.set(folderPath, status);
      
      // Implement exponential backoff on error
      consecutiveErrors++;
      
      if (consecutiveErrors > 3) {
        // Cap at 5 minute interval maximum
        const newInterval = Math.min(intervalMs * Math.pow(1.5, consecutiveErrors - 3), 300000);
        
        if (newInterval !== currentInterval) {
          clearInterval(intervalId);
          currentInterval = newInterval;
          directoryWatchers.set(folderPath, setInterval(intervalId, currentInterval));
          
          console.log(`Adjusted polling interval for ${folderPath} to ${currentInterval}ms due to errors`);
        }
      }
      
      if (errorCallback) errorCallback(error instanceof Error ? error : new Error(String(error)));
    }
  }, currentInterval);
  
  directoryWatchers.set(folderPath, intervalId);
}

/**
 * Stop monitoring a folder for changes
 * @param folderPath Folder path to stop monitoring
 */
export function stopMonitoringFolder(folderPath: string): void {
  if (!directoryWatchers.has(folderPath)) {
    console.log(`Folder ${folderPath} is not being actively monitored`);
    return;
  }
  
  clearInterval(directoryWatchers.get(folderPath));
  directoryWatchers.delete(folderPath);
  console.log(`Stopped monitoring folder ${folderPath}`);
}

/**
 * Check if File System Access API is supported
 * @returns True if supported, false otherwise
 */
export function isFileAccessSupported(): boolean {
  return 'showDirectoryPicker' in window;
}
