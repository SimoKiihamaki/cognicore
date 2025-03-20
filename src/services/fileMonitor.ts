/**
 * File Monitor Service
 * Handles monitoring of file system directories for changes
 */

import { v4 as uuidv4 } from 'uuid';
import { IndexedFile } from '@/lib/types';
import { extractTextFromFile } from '@/utils/fileUtils';
import { debounce } from '@/utils/debounce';

// Define common text file extensions to monitor
export const TEXT_FILE_EXTENSIONS = [
  'txt', 'md', 'markdown', 'html', 'htm', 'json', 'csv',
  'js', 'ts', 'jsx', 'tsx', 'css', 'scss', 'xml',
  'yaml', 'yml', 'toml', 'ini', 'env', 'gitignore',
  'config', 'log'
];

// Define directories that are typically excluded from monitoring
export const EXCLUDED_DIRECTORIES = [
  'node_modules', '.git', 'dist', 'build', 'coverage',
  '.next', '.nuxt', '.output', '.cache', '.vscode',
  'vendor', 'tmp', 'temp', 'logs', '.DS_Store'
];

// Define types for the file monitoring system
export interface MonitoredFolder {
  id: string;
  path: string;
  handle: FileSystemDirectoryHandle;
  isActive: boolean;
}

export interface MonitoringStats {
  totalFiles: number;
  filesMonitored: number;
  filesProcessed: number;
  activeMonitors: number;
  lastScanTime: Date | null;
  fileTypes: {
    [key: string]: number;
  };
}

export interface MonitoringStatus {
  folderPath: string;
  lastScanTime: Date | null;
  fileCount: number;
  errorCount: number;
  lastError: string | null;
}

// Request permission to access a directory
export async function requestDirectoryAccess(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const dirHandle = await window.showDirectoryPicker();
    return dirHandle;
  } catch (error) {
    console.error('Error accessing directory:', error);
    return null;
  }
}

// File system access support check
export function isFileAccessSupported(): boolean {
  return 'showDirectoryPicker' in window;
}

// Request access to a specific folder
export async function requestFolderAccess(): Promise<FileSystemDirectoryHandle | null> {
  return requestDirectoryAccess();
}

// Add a folder to be monitored
export function addMonitoredFolder(path: string, handle: FileSystemDirectoryHandle) {
  const monitor = getFileMonitor();
  return monitor.addFolder(path, handle);
}

// Start monitoring a folder
export function startMonitoringFolder(
  path: string,
  callback: (files: IndexedFile[], eventType: 'initial' | 'changed' | 'deleted') => void,
  options?: {
    intervalMs?: number,
    scanOptions?: {
      maxFileSize?: number,
      textFilesOnly?: boolean,
      skipExcludedDirs?: boolean,
      includeAllFileTypes?: boolean
    },
    errorCallback?: (error: Error) => void
  }
) {
  const monitor = getFileMonitor();
  // Implementation would go here
  // For now, just do a basic scan
  monitor.scanFolder(monitor.folders.find(f => f.path === path)!);
}

// Stop monitoring a folder
export function stopMonitoringFolder(path: string) {
  // Implementation would go here
}

// Remove a monitored folder
export function removeMonitoredFolder(path: string) {
  const monitor = getFileMonitor();
  const folder = monitor.folders.find(f => f.path === path);
  if (folder) {
    monitor.removeFolder(folder.id);
  }
}

// Get monitoring status for all folders
export function getMonitoringStatus(): MonitoringStatus[] {
  const monitor = getFileMonitor();
  return monitor.folders.map(folder => ({
    folderPath: folder.path,
    lastScanTime: monitor.stats.lastScanTime,
    fileCount: monitor.indexedFiles.filter(f => f.filepath.startsWith(folder.path)).length,
    errorCount: 0,
    lastError: null
  }));
}

// Scan a directory and return indexed files
export async function scanDirectory(
  handle: FileSystemDirectoryHandle,
  basePath: string
): Promise<IndexedFile[]> {
  const monitor = getFileMonitor();
  const folder: MonitoredFolder = {
    id: uuidv4(),
    path: basePath,
    handle,
    isActive: true
  };
  
  await monitor.scanFolder(folder);
  return monitor.indexedFiles.filter(f => f.filepath.startsWith(basePath));
}

// Class to manage file monitoring
export class FileMonitor {
  private folders: MonitoredFolder[] = [];
  private indexedFiles: IndexedFile[] = [];
  private isMonitoring: boolean = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private stats: MonitoringStats = {
    totalFiles: 0,
    filesMonitored: 0,
    filesProcessed: 0,
    activeMonitors: 0,
    lastScanTime: null,
    fileTypes: {}
  };
  
  // Callbacks for events
  private onFileIndexed: ((file: IndexedFile) => void) | null = null;
  private onFileUpdated: ((file: IndexedFile) => void) | null = null;
  private onFileDeleted: ((fileId: string) => void) | null = null;
  private onStatsUpdated: ((stats: MonitoringStats) => void) | null = null;
  
  constructor(
    initialFolders: MonitoredFolder[] = [],
    initialFiles: IndexedFile[] = []
  ) {
    this.folders = initialFolders;
    this.indexedFiles = initialFiles;
    this.updateStats();
  }
  
  // Set event handlers
  public setHandlers({
    onFileIndexed,
    onFileUpdated,
    onFileDeleted,
    onStatsUpdated
  }: {
    onFileIndexed?: (file: IndexedFile) => void;
    onFileUpdated?: (file: IndexedFile) => void;
    onFileDeleted?: (fileId: string) => void;
    onStatsUpdated?: (stats: MonitoringStats) => void;
  }) {
    if (onFileIndexed) this.onFileIndexed = onFileIndexed;
    if (onFileUpdated) this.onFileUpdated = onFileUpdated;
    if (onFileDeleted) this.onFileDeleted = onFileDeleted;
    if (onStatsUpdated) this.onStatsUpdated = onStatsUpdated;
  }
  
  // Add a new folder to monitor
  public async addFolder(path: string, handle: FileSystemDirectoryHandle): Promise<MonitoredFolder> {
    // Check if folder already exists
    const existingFolder = this.folders.find(f => f.path === path);
    if (existingFolder) {
      return existingFolder;
    }
    
    const newFolder: MonitoredFolder = {
      id: uuidv4(),
      path,
      handle,
      isActive: true
    };
    
    this.folders.push(newFolder);
    this.updateStats();
    
    // Initial scan of the folder
    await this.scanFolder(newFolder);
    
    return newFolder;
  }
  
  // Remove a folder from monitoring
  public removeFolder(folderId: string): boolean {
    const initialLength = this.folders.length;
    this.folders = this.folders.filter(f => f.id !== folderId);
    
    // Mark files from this folder as deleted
    const filesToDelete = this.indexedFiles.filter(f => 
      f.filepath.startsWith(this.getFolderPath(folderId))
    );
    
    filesToDelete.forEach(file => {
      this.updateIndexedFile({
        id: file.id,
        filename: file.filename,
        filepath: file.filepath,
        filetype: file.filetype,
        lastModified: file.lastModified,
        size: file.size,
        isDeleted: true
      });
      
      if (this.onFileDeleted) {
        this.onFileDeleted(file.id);
      }
    });
    
    this.updateStats();
    return initialLength !== this.folders.length;
  }
  
  // Get folder by ID
  private getFolderPath(folderId: string): string {
    const folder = this.folders.find(f => f.id === folderId);
    return folder ? folder.path : '';
  }
  
  // Toggle folder active state
  public toggleFolderActive(folderId: string, isActive: boolean): void {
    const folder = this.folders.find(f => f.id === folderId);
    if (folder) {
      folder.isActive = isActive;
      this.updateStats();
    }
  }
  
  // Get all monitored folders
  public getMonitoredFolders(): MonitoredFolder[] {
    return [...this.folders];
  }
  
  // Get all indexed files
  public getIndexedFiles(): IndexedFile[] {
    return this.indexedFiles.filter(f => !f.isDeleted);
  }
  
  // Get monitoring statistics
  public getStats(): MonitoringStats {
    return { ...this.stats };
  }
  
  // Start monitoring
  public startMonitoring(intervalMs: number = 60000): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.scanAllFolders();
    }, intervalMs);
    
    // Initial scan
    this.scanAllFolders();
  }
  
  // Stop monitoring
  public stopMonitoring(): void {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }
  
  // Scan all active folders
  public async scanAllFolders(): Promise<void> {
    const activeFolders = this.folders.filter(f => f.isActive);
    
    for (const folder of activeFolders) {
      await this.scanFolder(folder);
    }
    
    this.stats.lastScanTime = new Date();
    this.updateStats();
  }
  
  // Scan a specific folder
  private async scanFolder(folder: MonitoredFolder): Promise<void> {
    try {
      const files = await this.listFiles(folder.handle, folder.path);
      
      // Process found files
      for (const file of files) {
        await this.processFile(file, folder);
      }
      
      // Check for deleted files
      this.checkForDeletedFiles(folder, files);
      
    } catch (error) {
      console.error(`Error scanning folder ${folder.path}:`, error);
    }
  }
  
  // List all files in a directory recursively
  private async listFiles(
    dirHandle: FileSystemDirectoryHandle, 
    basePath: string
  ): Promise<{ path: string; name: string; handle: FileSystemFileHandle; }[]> {
    const files: { path: string; name: string; handle: FileSystemFileHandle; }[] = [];
    
    try {
      // Use the entries() method to iterate through directory contents
      for await (const [name, handle] of dirHandle.entries()) {
        const path = `${basePath}/${name}`;
        
        if (handle.kind === 'file') {
          files.push({ path, name, handle });
        } else if (handle.kind === 'directory') {
          // Recursively scan subdirectories
          const subFiles = await this.listFiles(handle, path);
          files.push(...subFiles);
        }
      }
    } catch (error) {
      console.error(`Error listing files in ${basePath}:`, error);
    }
    
    return files;
  }
  
  // Process a file (index or update)
  private async processFile(
    file: { path: string; name: string; handle: FileSystemFileHandle; },
    folder: MonitoredFolder
  ): Promise<void> {
    try {
      const fileObj = await file.handle.getFile();
      const fileId = this.getFileId(file.path);
      
      // Check if file already exists in index
      const existingFile = this.indexedFiles.find(f => f.id === fileId);
      
      // Skip if file hasn't changed
      if (existingFile && 
          existingFile.lastModified.getTime() === fileObj.lastModified && 
          existingFile.size === fileObj.size &&
          !existingFile.isDeleted) {
        return;
      }
      
      // Get file type
      const filetype = this.getFileType(file.name);
      
      // Create or update file index
      const indexedFile: IndexedFile = {
        id: fileId,
        filename: file.name,
        filepath: file.path,
        filetype,
        lastModified: new Date(fileObj.lastModified),
        size: fileObj.size,
        isDeleted: false
      };
      
      // Extract content for supported file types
      if (this.isSupportedFileType(filetype)) {
        try {
          const content = await extractTextFromFile(fileObj);
          indexedFile.content = content;
        } catch (error) {
          console.error(`Error extracting content from ${file.path}:`, error);
        }
      }
      
      // Update or add the file
      if (existingFile) {
        this.updateIndexedFile(indexedFile);
      } else {
        this.addIndexedFile(indexedFile);
      }
      
    } catch (error) {
      console.error(`Error processing file ${file.path}:`, error);
    }
  }
  
  // Check for files that have been deleted
  private checkForDeletedFiles(
    folder: MonitoredFolder,
    currentFiles: { path: string; name: string; handle: FileSystemFileHandle; }[]
  ): void {
    // Get all files that should be in this folder
    const folderFiles = this.indexedFiles.filter(
      f => f.filepath.startsWith(folder.path) && !f.isDeleted
    );
    
    // Get current file paths
    const currentPaths = new Set(currentFiles.map(f => f.path));
    
    // Find files that no longer exist
    const deletedFiles = folderFiles.filter(f => !currentPaths.has(f.filepath));
    
    // Mark files as deleted
    deletedFiles.forEach(file => {
      this.updateIndexedFile({
        id: file.id,
        filename: file.filename,
        filepath: file.filepath,
        filetype: file.filetype,
        lastModified: file.lastModified,
        size: file.size,
        isDeleted: true
      });
      
      if (this.onFileDeleted) {
        this.onFileDeleted(file.id);
      }
    });
  }
  
  // Add a new indexed file
  private addIndexedFile(file: IndexedFile): void {
    this.indexedFiles.push(file);
    this.updateStats();
    
    if (this.onFileIndexed) {
      this.onFileIndexed(file);
    }
    
    // Debounce content processing for performance
    setTimeout(() => {
      this.processFileContent(file);
    }, 500);
  }
  
  // Update an existing indexed file
  private updateIndexedFile(file: Partial<IndexedFile> & { id: string }): void {
    const index = this.indexedFiles.findIndex(f => f.id === file.id);
    
    if (index !== -1) {
      this.indexedFiles[index] = {
        ...this.indexedFiles[index],
        ...file
      };
      
      this.updateStats();
      
      if (this.onFileUpdated) {
        this.onFileUpdated(this.indexedFiles[index]);
      }
      
      // Debounce content processing for performance
      if (!file.isDeleted) {
        setTimeout(() => {
          this.processFileContent(this.indexedFiles[index]);
        }, 500);
      }
    }
  }
  
  // Process file content (extract metadata, generate embeddings, etc.)
  private processFileContent(file: IndexedFile): void {
    // This would be implemented to extract metadata, generate embeddings, etc.
    // For now, just update stats
    this.stats.filesProcessed++;
    this.updateStats();
  }
  
  // Generate a consistent ID for a file based on its path
  private getFileId(path: string): string {
    // Use a hash of the path or a UUID
    return `file-${path.split('/').join('-').replace(/[^a-zA-Z0-9-]/g, '')}`;
  }
  
  // Get file type from filename
  private getFileType(filename: string): string {
    const extension = filename.split('.').pop()?.toLowerCase() || '';
    return extension;
  }
  
  // Check if file type is supported for content extraction
  private isSupportedFileType(filetype: string): boolean {
    const supportedTypes = ['txt', 'md', 'markdown', 'html', 'htm', 'json', 'csv', 'js', 'ts', 'jsx', 'tsx', 'css', 'scss'];
    return supportedTypes.includes(filetype.toLowerCase());
  }
  
  // Update monitoring statistics
  private updateStats(): void {
    this.stats.totalFiles = this.indexedFiles.length;
    this.stats.filesMonitored = this.indexedFiles.filter(f => !f.isDeleted).length;
    this.stats.activeMonitors = this.folders.filter(f => f.isActive).length;
    
    // Count file types
    this.stats.fileTypes = {};
    this.indexedFiles
      .filter(f => !f.isDeleted)
      .forEach(file => {
        const type = file.filetype.toLowerCase();
        this.stats.fileTypes[type] = (this.stats.fileTypes[type] || 0) + 1;
      });
    
    if (this.onStatsUpdated) {
      this.onStatsUpdated({ ...this.stats });
    }
  }
  
  // Clean up resources
  public dispose(): void {
    this.stopMonitoring();
    this.folders = [];
    this.indexedFiles = [];
    this.onFileIndexed = null;
    this.onFileUpdated = null;
    this.onFileDeleted = null;
    this.onStatsUpdated = null;
  }
}

// Create a singleton instance
let fileMonitorInstance: FileMonitor | null = null;

// Get or create the file monitor instance
export function getFileMonitor(
  initialFolders?: MonitoredFolder[],
  initialFiles?: IndexedFile[]
): FileMonitor {
  if (!fileMonitorInstance) {
    fileMonitorInstance = new FileMonitor(initialFolders, initialFiles);
  }
  return fileMonitorInstance;
}

// Reset the file monitor (for testing)
export function resetFileMonitor(): void {
  if (fileMonitorInstance) {
    fileMonitorInstance.dispose();
    fileMonitorInstance = null;
  }
}
