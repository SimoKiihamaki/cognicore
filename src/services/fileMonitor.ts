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
    // Using the polyfill or native implementation
    const dirHandle = 'showDirectoryPicker' in window 
      ? await window.showDirectoryPicker() 
      : null;
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
  // Implementation simplified for now
  monitor.scanFolder(path);
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
  
  await monitor.scanFolder(folder.path);
  return monitor.indexedFiles.filter(f => f.filepath.startsWith(basePath));
}

// Class to manage file monitoring
export class FileMonitor {
  public folders: MonitoredFolder[] = [];
  public indexedFiles: IndexedFile[] = [];
  public isMonitoring: boolean = false;
  public monitoringInterval: NodeJS.Timeout | null = null;
  public stats: MonitoringStats = {
    totalFiles: 0,
    filesMonitored: 0,
    filesProcessed: 0,
    activeMonitors: 0,
    lastScanTime: null,
    fileTypes: {}
  };
  
  // Callbacks for events
  public onFileIndexed: ((file: IndexedFile) => void) | null = null;
  public onFileUpdated: ((file: IndexedFile) => void) | null = null;
  public onFileDeleted: ((fileId: string) => void) | null = null;
  public onStatsUpdated: ((stats: MonitoringStats) => void) | null = null;
  
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
    await this.scanFolder(path);
    
    return newFolder;
  }
  
  // Remove a folder from monitoring
  public removeFolder(folderId: string): boolean {
    const initialLength = this.folders.length;
    this.folders = this.folders.filter(f => f.id !== folderId);
    
    // Mark files from this folder as deleted
    const folderPath = this.getFolderPath(folderId);
    const filesToDelete = this.indexedFiles.filter(f => 
      f.filepath.startsWith(folderPath)
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
  public getFolderPath(folderId: string): string {
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
      await this.scanFolder(folder.path);
    }
    
    this.stats.lastScanTime = new Date();
    this.updateStats();
  }
  
  // Scan a specific folder
  public async scanFolder(folderPath: string): Promise<void> {
    // Simplified implementation for now
    console.log(`Scanning folder: ${folderPath}`);
    
    // In a real implementation, you would:
    // 1. Get the folder handle
    // 2. List all files
    // 3. Process each file
    // 4. Update the indexed files
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
  
  // Update monitoring statistics
  public updateStats(): void {
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
  
  // These methods are removed for simplicity but would be implemented in a real app
  // listFiles(), processFile(), checkForDeletedFiles(), addIndexedFile(), updateIndexedFile(), etc.
  
  // Add placeholder implementations
  private addIndexedFile(file: IndexedFile): void {
    this.indexedFiles.push(file);
    this.updateStats();
  }
  
  private updateIndexedFile(file: Partial<IndexedFile> & { id: string }): void {
    const index = this.indexedFiles.findIndex(f => f.id === file.id);
    if (index !== -1) {
      this.indexedFiles[index] = { ...this.indexedFiles[index], ...file };
    }
  }
  
  private processFileContent(file: IndexedFile): void {
    // Placeholder
  }
  
  private getFileId(path: string): string {
    return `file-${path.split('/').join('-').replace(/[^a-zA-Z0-9-]/g, '')}`;
  }
  
  private getFileType(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || '';
  }
  
  private isSupportedFileType(filetype: string): boolean {
    return TEXT_FILE_EXTENSIONS.includes(filetype.toLowerCase());
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
