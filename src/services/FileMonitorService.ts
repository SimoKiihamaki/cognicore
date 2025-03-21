/**
 * FileMonitorService
 * 
 * Responsible for monitoring file system directories for changes and triggering
 * appropriate actions when files are added, modified, or deleted.
 */
import { v4 as uuidv4 } from 'uuid';
import { extractTextFromFile } from '@/utils/fileUtils';
import databaseService from './database/databaseService';
import embeddingService from './embedding/embeddingService';
import { MonitoredFolder, IndexedFile, MonitoringStats } from '@/lib/types';
import { toast } from 'sonner';
import { STORE_NAMES } from './database/databaseService';

// File types constants
export const TEXT_FILE_EXTENSIONS = [
  'txt', 'md', 'markdown', 'html', 'htm', 'json', 'csv',
  'js', 'ts', 'jsx', 'tsx', 'css', 'scss', 'yaml', 'yml'
];

export const EXCLUDED_DIRECTORIES = [
  'node_modules', '.git', '.vscode', 'dist', 'build',
  'coverage', '.next', 'out', 'target', 'temp', 'tmp'
];

// Events emitted by the FileMonitorService
export type FileEventType = 'added' | 'modified' | 'deleted' | 'error' | 'all';

// File change event interface
export interface FileChangeEvent {
  type: FileEventType;
  file: IndexedFile;
  error?: Error;
}

// File event callback type
export type FileEventCallback = (event: FileChangeEvent) => void;

/**
 * FileMonitorService class
 * 
 * Provides functionality to monitor file system directories and detect changes.
 * It handles scanning directories, indexing files, and managing monitored folders.
 */
export class FileMonitorService {
  // Monitored folders
  private folders: MonitoredFolder[] = [];
  
  // Interval for checking changes
  private pollingIntervals: Map<string, number> = new Map();
  
  // Default polling interval in milliseconds (30 seconds)
  private defaultPollingInterval: number = 30000;
  
  // Flag to indicate whether the service is initialized
  private initialized: boolean = false;
  
  // Event listeners
  private eventListeners: Map<FileEventType, FileEventCallback[]> = new Map();
  
  // Statistics
  private stats: MonitoringStats = {
    totalFiles: 0,
    filesMonitored: 0,
    filesProcessed: 0,
    activeMonitors: 0,
    lastScanTime: null,
    fileTypes: {}
  };

  /**
   * Initialize the service
   */
  public async initialize(): Promise<boolean> {
    if (this.initialized) {
      return true;
    }
    
    try {
      // Load monitored folders from database
      const storedFolders = await databaseService.getAll<MonitoredFolder>(STORE_NAMES.FOLDERS);
      
      // Add each folder to monitoring
      for (const folder of storedFolders) {
        try {
          // Check if handle exists and is valid
          if (!folder.handle || typeof folder.handle.requestPermission !== 'function') {
            console.warn(`Skipping folder with invalid handle: ${folder.path}`);
            
            // Mark the folder as inactive
            folder.isActive = false;
            await databaseService.update(STORE_NAMES.FOLDERS, folder.id, { isActive: false });
            continue;
          }
          
          // Check if the folder handle is still valid (this will prompt for permission if needed)
          await folder.handle.requestPermission({ mode: 'read' });
          
          this.folders.push(folder);
          
          // Start monitoring if folder is active
          if (folder.isActive) {
            await this.startMonitoring(folder.id);
          }
        } catch (error) {
          console.error(`Failed to restore folder monitoring for ${folder.path}:`, error);
          // Mark the folder as inactive since we couldn't get permission
          folder.isActive = false;
          await databaseService.update(STORE_NAMES.FOLDERS, folder.id, { isActive: false });
        }
      }
      
      // Update stats
      await this.updateStats();
      
      this.initialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize FileMonitorService:', error);
      return false;
    }
  }

  /**
   * Add a folder to be monitored
   * 
   * @param handle The directory handle for the folder
   * @param path Display path for the folder
   * @param options Optional settings for monitoring
   * @returns The created monitored folder object
   */
  public async addFolder(
    handle: FileSystemDirectoryHandle,
    path: string,
    options: { isActive?: boolean; pollingInterval?: number } = {}
  ): Promise<MonitoredFolder> {
    try {
      // Check if folder already exists
      const existingFolder = this.folders.find(f => f.path === path);
      if (existingFolder) {
        return existingFolder;
      }
      
      // Create new folder object
      const newFolder: MonitoredFolder = {
        id: uuidv4(),
        path,
        handle,
        isActive: options.isActive !== undefined ? options.isActive : true
      };
      
      // Save to database
      await databaseService.add(STORE_NAMES.FOLDERS, newFolder);
      
      // Add to local list
      this.folders.push(newFolder);
      
      // Start monitoring if active
      if (newFolder.isActive) {
        await this.startMonitoring(
          newFolder.id, 
          options.pollingInterval || this.defaultPollingInterval
        );
      }
      
      // Update stats
      await this.updateStats();
      
      return newFolder;
    } catch (error) {
      console.error(`Error adding folder ${path}:`, error);
      throw error;
    }
  }

  /**
   * Remove a folder from monitoring
   * 
   * @param folderId The ID of the folder to remove
   * @returns True if successfully removed
   */
  public async removeFolder(folderId: string): Promise<boolean> {
    try {
      // Stop monitoring first
      await this.stopMonitoring(folderId);
      
      // Find folder
      const folderIndex = this.folders.findIndex(f => f.id === folderId);
      if (folderIndex === -1) {
        return false;
      }
      
      const folder = this.folders[folderIndex];
      
      // Remove from local list
      this.folders.splice(folderIndex, 1);
      
      // Remove from database
      await databaseService.delete(STORE_NAMES.FOLDERS, folderId);
      
      // Mark files from this folder as deleted
      const folderFiles = await databaseService.queryByIndex<IndexedFile>(
        STORE_NAMES.FILES, 
        'filepath', 
        folder.path
      );
      
      for (const file of folderFiles) {
        // Update file status
        file.isDeleted = true;
        await databaseService.update(STORE_NAMES.FILES, file.id, { isDeleted: true });
        
        // Emit event
        this.emitEvent({
          type: 'deleted',
          file
        });
      }
      
      // Update stats
      await this.updateStats();
      
      return true;
    } catch (error) {
      console.error(`Error removing folder ${folderId}:`, error);
      return false;
    }
  }

  /**
   * Start monitoring a folder
   * 
   * @param folderId The ID of the folder to monitor
   * @param pollingInterval Optional interval for polling in milliseconds
   * @returns True if successfully started
   */
  public async startMonitoring(
    folderId: string, 
    pollingInterval?: number
  ): Promise<boolean> {
    try {
      // Find folder
      const folder = this.folders.find(f => f.id === folderId);
      if (!folder) {
        console.error(`Folder with ID ${folderId} not found`);
        return false;
      }
      
      // Stop existing monitoring if any
      await this.stopMonitoring(folderId);
      
      // Update folder status
      folder.isActive = true;
      await databaseService.update(STORE_NAMES.FOLDERS, folderId, { isActive: true });
      
      // Set interval for polling
      const intervalMs = pollingInterval || this.defaultPollingInterval;
      
      // Create the interval
      const intervalId = window.setInterval(async () => {
        try {
          await this.scanFolder(folder);
        } catch (error) {
          console.error(`Error scanning folder ${folder.path}:`, error);
        }
      }, intervalMs);
      
      // Store interval ID
      this.pollingIntervals.set(folderId, intervalId);
      
      // Perform initial scan
      try {
        await this.scanFolder(folder);
      } catch (error) {
        console.error(`Error during initial scan of ${folder.path}:`, error);
      }
      
      // Update stats
      await this.updateStats();
      
      return true;
    } catch (error) {
      console.error(`Error starting monitoring for folder ${folderId}:`, error);
      return false;
    }
  }

  /**
   * Stop monitoring a folder
   * 
   * @param folderId The ID of the folder to stop monitoring
   * @returns True if successfully stopped
   */
  public async stopMonitoring(folderId: string): Promise<boolean> {
    try {
      // Clear interval if exists
      const intervalId = this.pollingIntervals.get(folderId);
      if (intervalId) {
        window.clearInterval(intervalId);
        this.pollingIntervals.delete(folderId);
      }
      
      // Find folder
      const folder = this.folders.find(f => f.id === folderId);
      if (folder) {
        // Update folder status
        folder.isActive = false;
        await databaseService.update(STORE_NAMES.FOLDERS, folderId, { isActive: false });
      }
      
      // Update stats
      await this.updateStats();
      
      return true;
    } catch (error) {
      console.error(`Error stopping monitoring for folder ${folderId}:`, error);
      return false;
    }
  }

  /**
   * Scan a folder for changes
   * 
   * @param folder The folder to scan
   */
  public async scanFolder(folder: MonitoredFolder): Promise<void> {
    try {
      console.log(`Scanning folder: ${folder.path}`);
      
      // Get all existing files for this folder from database
      const existingFiles = await databaseService.queryByIndex<IndexedFile>(
        STORE_NAMES.FILES, 
        'filepath', 
        folder.path
      );
      
      // Create a map for quick lookups
      const existingFilesMap = new Map<string, IndexedFile>();
      for (const file of existingFiles) {
        if (!file.isDeleted) {
          existingFilesMap.set(file.filepath, file);
        }
      }
      
      // Scan directory recursively
      const currentFiles = await this.listFilesRecursively(folder.handle, folder.path);
      
      // Process new and modified files
      for (const fileInfo of currentFiles) {
        try {
          await this.processFile(fileInfo, existingFilesMap);
        } catch (error) {
          console.error(`Error processing file ${fileInfo.path}:`, error);
        }
      }
      
      // Find deleted files (files in database but not in current scan)
      const currentFilePaths = new Set(currentFiles.map(f => f.path));
      
      for (const [filepath, file] of existingFilesMap.entries()) {
        if (!currentFilePaths.has(filepath)) {
          // Mark as deleted
          file.isDeleted = true;
          await databaseService.update(STORE_NAMES.FILES, file.id, { isDeleted: true });
          
          // Emit event
          this.emitEvent({
            type: 'deleted',
            file
          });
        }
      }
      
      // Update stats
      this.stats.lastScanTime = new Date();
      await this.updateStats();
    } catch (error) {
      console.error(`Error scanning folder ${folder.path}:`, error);
      throw error;
    }
  }

  /**
   * Process a file (add new or update existing)
   * 
   * @param fileInfo Information about the file
   * @param existingFilesMap Map of existing files
   */
  private async processFile(
    fileInfo: { 
      path: string; 
      name: string; 
      handle: FileSystemFileHandle 
    },
    existingFilesMap: Map<string, IndexedFile>
  ): Promise<void> {
    try {
      // Get file object
      const fileObj = await fileInfo.handle.getFile();
      
      // Check if file exists in our index
      const existingFile = existingFilesMap.get(fileInfo.path);
      
      // Skip if file hasn't changed
      if (
        existingFile && 
        existingFile.lastModified.getTime() === fileObj.lastModified &&
        existingFile.size === fileObj.size
      ) {
        return;
      }
      
      // Determine file type
      const filetype = fileInfo.name.split('.').pop()?.toLowerCase() || '';
      
      // Create new file object
      const file: IndexedFile = existingFile ? {
        ...existingFile,
        lastModified: new Date(fileObj.lastModified),
        size: fileObj.size
      } : {
        id: uuidv4(),
        filename: fileInfo.name,
        filepath: fileInfo.path,
        filetype,
        lastModified: new Date(fileObj.lastModified),
        size: fileObj.size,
        isDeleted: false
      };
      
      // Extract content for supported file types
      if (this.isSupportedFileType(filetype)) {
        try {
          file.content = await extractTextFromFile(fileObj);
        } catch (error) {
          console.error(`Error extracting content from ${fileInfo.path}:`, error);
          file.content = '';
        }
      }
      
      // Save to database
      if (existingFile) {
        await databaseService.update(STORE_NAMES.FILES, file.id, file);
        
        // Emit event
        this.emitEvent({
          type: 'modified',
          file
        });
        
        // Generate embeddings for modified file
        this.generateEmbeddings(file);
      } else {
        await databaseService.add(STORE_NAMES.FILES, file);
        
        // Emit event
        this.emitEvent({
          type: 'added',
          file
        });
        
        // Generate embeddings for new file
        this.generateEmbeddings(file);
      }
    } catch (error) {
      console.error(`Error processing file ${fileInfo.path}:`, error);
      
      // Emit error event
      this.emitEvent({
        type: 'error',
        file: {
          id: '',
          filename: fileInfo.name,
          filepath: fileInfo.path,
          filetype: fileInfo.name.split('.').pop()?.toLowerCase() || '',
          lastModified: new Date(),
          size: 0,
          isDeleted: false
        },
        error: error instanceof Error ? error : new Error(String(error))
      });
      
      throw error;
    }
  }

  /**
   * Generate embeddings for a file
   * 
   * @param file The file to generate embeddings for
   */
  private async generateEmbeddings(file: IndexedFile): Promise<void> {
    // Only generate embeddings for supported file types
    if (file.content && this.isSupportedFileType(file.filetype)) {
      try {
        // Check if embedding service is initialized
        if (!embeddingService.isInitialized()) {
          await embeddingService.initialize();
        }
        
        // Generate embeddings
        await embeddingService.generateEmbeddingsForFile(file.id);
        
        // Update stats
        this.stats.filesProcessed++;
        await this.updateStats();
      } catch (error) {
        console.error(`Error generating embeddings for ${file.filename}:`, error);
      }
    }
  }

  /**
   * List all files in a directory recursively
   * 
   * @param dirHandle Directory handle to list files from
   * @param basePath Base path for constructing full paths
   * @returns Array of file information
   */
  private async listFilesRecursively(
    dirHandle: FileSystemDirectoryHandle, 
    basePath: string
  ): Promise<{ path: string; name: string; handle: FileSystemFileHandle }[]> {
    const files: { path: string; name: string; handle: FileSystemFileHandle }[] = [];
    
    try {
      // Use the entries() method to iterate through directory contents
      for await (const [name, handle] of dirHandle.entries()) {
        const path = `${basePath}/${name}`;
        
        if (handle.kind === 'file') {
          files.push({
            path,
            name,
            handle: handle as FileSystemFileHandle
          });
        } else if (handle.kind === 'directory') {
          // Skip excluded directories
          if (EXCLUDED_DIRECTORIES.includes(name)) {
            continue;
          }
          
          // Recursively scan subdirectories
          const subFiles = await this.listFilesRecursively(
            handle as FileSystemDirectoryHandle, 
            path
          );
          files.push(...subFiles);
        }
      }
    } catch (error) {
      console.error(`Error listing files in ${basePath}:`, error);
      
      // If we fail to scan due to permission, try to request permission
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        try {
          await dirHandle.requestPermission({ mode: 'read' });
          // Try listing again
          return this.listFilesRecursively(dirHandle, basePath);
        } catch (permError) {
          console.error(`Failed to get permission for ${basePath}:`, permError);
        }
      }
    }
    
    return files;
  }

  /**
   * Check if a file type is supported for content extraction
   * 
   * @param filetype The file type to check
   * @returns True if supported
   */
  private isSupportedFileType(filetype: string): boolean {
    return TEXT_FILE_EXTENSIONS.includes(filetype.toLowerCase());
  }

  /**
   * Update monitoring statistics
   */
  private async updateStats(): Promise<void> {
    try {
      // Count active folders
      this.stats.activeMonitors = this.folders.filter(f => f.isActive).length;
      
      // Get file counts from database
      const allFiles = await databaseService.getAll<IndexedFile>(STORE_NAMES.FILES);
      const activeFiles = allFiles.filter(f => !f.isDeleted);
      
      this.stats.totalFiles = allFiles.length;
      this.stats.filesMonitored = activeFiles.length;
      
      // Count file types
      this.stats.fileTypes = {};
      for (const file of activeFiles) {
        const type = file.filetype.toLowerCase();
        this.stats.fileTypes[type] = (this.stats.fileTypes[type] || 0) + 1;
      }
    } catch (error) {
      console.error('Error updating stats:', error);
    }
  }

  /**
   * Get current monitoring statistics
   * 
   * @returns Current monitoring statistics
   */
  public getStats(): MonitoringStats {
    return { ...this.stats };
  }

  /**
   * Get all monitored folders
   * 
   * @returns Array of monitored folders
   */
  public async getMonitoredFolders(): Promise<MonitoredFolder[]> {
    return [...this.folders];
  }

  /**
   * Add event listener
   * 
   * @param eventType Type of event to listen for
   * @param callback Function to call when event occurs
   */
  public addEventListener(eventType: FileEventType, callback: FileEventCallback): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    
    this.eventListeners.get(eventType)!.push(callback);
  }

  /**
   * Remove event listener
   * 
   * @param eventType Type of event to stop listening for
   * @param callback Function to remove
   */
  public removeEventListener(eventType: FileEventType, callback: FileEventCallback): void {
    if (!this.eventListeners.has(eventType)) {
      return;
    }
    
    const listeners = this.eventListeners.get(eventType)!;
    const index = listeners.indexOf(callback);
    
    if (index !== -1) {
      listeners.splice(index, 1);
    }
  }

  /**
   * Emit an event to all listeners
   * 
   * @param event Event to emit
   */
  private emitEvent(event: FileChangeEvent): void {
    // Emit to specific event type listeners
    const listeners = this.eventListeners.get(event.type);
    if (listeners) {
      for (const callback of listeners) {
        try {
          callback(event);
        } catch (error) {
          console.error(`Error in file event listener for ${event.type}:`, error);
        }
      }
    }
    
    // Also emit to 'all' listeners
    const allListeners = this.eventListeners.get('all');
    if (allListeners) {
      for (const callback of allListeners) {
        try {
          callback(event);
        } catch (error) {
          console.error(`Error in 'all' file event listener:`, error);
        }
      }
    }
  }

  /**
   * Set the default polling interval
   * 
   * @param intervalMs Interval in milliseconds
   */
  public setDefaultPollingInterval(intervalMs: number): void {
    this.defaultPollingInterval = intervalMs;
  }

  /**
   * Dispose of resources
   */
  public dispose(): void {
    // Stop all monitoring
    for (const [folderId, intervalId] of this.pollingIntervals.entries()) {
      window.clearInterval(intervalId);
    }
    
    this.pollingIntervals.clear();
    this.eventListeners.clear();
    this.initialized = false;
  }
}

// Create a singleton instance
const fileMonitorService = new FileMonitorService();
export default fileMonitorService;
