
/**
 * File Monitor Service
 * Handles monitoring of file system directories for changes
 */
import { v4 as uuidv4 } from 'uuid';
import { extractTextFromFile } from '@/utils/fileUtils';

// Request permission to access a directory
export async function requestDirectoryAccess() {
  try {
    const dirHandle = await window.showDirectoryPicker();
    return dirHandle;
  } catch (error) {
    console.error('Error accessing directory:', error);
    return null;
  }
}

// Types for file monitoring
interface MonitoredFolder {
  id: string;
  path: string;
  handle: FileSystemDirectoryHandle;
  isActive: boolean;
}

interface IndexedFileInfo {
  id: string;
  filename: string;
  filepath: string;
  filetype: string;
  lastModified: Date;
  size: number;
  content?: string;
  isDeleted: boolean;
}

interface MonitorStats {
  totalFiles: number;
  filesMonitored: number;
  filesProcessed: number;
  activeMonitors: number;
  lastScanTime: Date | null;
  fileTypes: Record<string, number>;
}

interface FileHandlerCallbacks {
  onFileIndexed?: (file: IndexedFileInfo) => void;
  onFileUpdated?: (file: IndexedFileInfo) => void;
  onFileDeleted?: (fileId: string) => void;
  onStatsUpdated?: (stats: MonitorStats) => void;
}

// Class to manage file monitoring
export class FileMonitor {
  // Properties are now public
  public folders: MonitoredFolder[] = [];
  public indexedFiles: IndexedFileInfo[] = [];
  public isMonitoring: boolean = false;
  public monitoringInterval: NodeJS.Timeout | null = null;
  public stats: MonitorStats = {
    totalFiles: 0,
    filesMonitored: 0,
    filesProcessed: 0,
    activeMonitors: 0,
    lastScanTime: null,
    fileTypes: {}
  };
  
  // Callbacks for events
  public onFileIndexed: ((file: IndexedFileInfo) => void) | null = null;
  public onFileUpdated: ((file: IndexedFileInfo) => void) | null = null;
  public onFileDeleted: ((fileId: string) => void) | null = null;
  public onStatsUpdated: ((stats: MonitorStats) => void) | null = null;
  
  constructor(initialFolders: MonitoredFolder[] = [], initialFiles: IndexedFileInfo[] = []) {
    this.folders = initialFolders;
    this.indexedFiles = initialFiles;
    this.updateStats();
  }
  
  // Set event handlers
  setHandlers({ onFileIndexed, onFileUpdated, onFileDeleted, onStatsUpdated }: FileHandlerCallbacks) {
    if (onFileIndexed) this.onFileIndexed = onFileIndexed;
    if (onFileUpdated) this.onFileUpdated = onFileUpdated;
    if (onFileDeleted) this.onFileDeleted = onFileDeleted;
    if (onStatsUpdated) this.onStatsUpdated = onStatsUpdated;
  }
  
  // Add a new folder to monitor
  async addFolder(path: string, handle: FileSystemDirectoryHandle) {
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
  removeFolder(folderId: string) {
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
  getFolderPath(folderId: string) {
    const folder = this.folders.find(f => f.id === folderId);
    return folder ? folder.path : '';
  }
  
  // Toggle folder active state
  toggleFolderActive(folderId: string, isActive: boolean) {
    const folder = this.folders.find(f => f.id === folderId);
    if (folder) {
      folder.isActive = isActive;
      this.updateStats();
    }
  }
  
  // Get all monitored folders
  getMonitoredFolders() {
    return [...this.folders];
  }
  
  // Get all indexed files
  getIndexedFiles() {
    return this.indexedFiles.filter(f => !f.isDeleted);
  }
  
  // Get monitoring statistics
  getStats() {
    return { ...this.stats };
  }
  
  // Start monitoring
  startMonitoring(intervalMs = 60000) {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.scanAllFolders();
    }, intervalMs);
    
    // Initial scan
    this.scanAllFolders();
  }
  
  // Stop monitoring
  stopMonitoring() {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }
  
  // Scan all active folders
  async scanAllFolders() {
    const activeFolders = this.folders.filter(f => f.isActive);
    
    for (const folder of activeFolders) {
      await this.scanFolder(folder);
    }
    
    this.stats.lastScanTime = new Date();
    this.updateStats();
  }
  
  // Scan a specific folder
  async scanFolder(folder: MonitoredFolder) {
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
  async listFiles(dirHandle: FileSystemDirectoryHandle, basePath: string) {
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
          // Recursively scan subdirectories
          const subFiles = await this.listFiles(handle as FileSystemDirectoryHandle, path);
          files.push(...subFiles);
        }
      }
    } catch (error) {
      console.error(`Error listing files in ${basePath}:`, error);
    }
    
    return files;
  }
  
  // Process a file (index or update)
  async processFile(
    file: { path: string; name: string; handle: FileSystemFileHandle }, 
    folder: MonitoredFolder
  ) {
    try {
      const fileObj = await file.handle.getFile();
      const fileId = this.getFileId(file.path);
      
      // Check if file already exists in index
      const existingFile = this.indexedFiles.find(f => f.id === fileId);
      
      // Skip if file hasn't changed
      if (
        existingFile && 
        existingFile.lastModified.getTime() === fileObj.lastModified && 
        existingFile.size === fileObj.size && 
        !existingFile.isDeleted
      ) {
        return;
      }
      
      // Get file type
      const filetype = this.getFileType(file.name);
      
      // Create or update file index
      const indexedFile: IndexedFileInfo = {
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
  checkForDeletedFiles(folder: MonitoredFolder, currentFiles: { path: string }[]) {
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
  addIndexedFile(file: IndexedFileInfo) {
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
  updateIndexedFile(file: Partial<IndexedFileInfo> & { id: string }) {
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
  processFileContent(file: IndexedFileInfo) {
    // This would be implemented to extract metadata, generate embeddings, etc.
    // For now, just update stats
    this.stats.filesProcessed++;
    this.updateStats();
  }
  
  // Generate a consistent ID for a file based on its path
  getFileId(path: string) {
    // Use a hash of the path or a UUID
    return `file-${path.split('/').join('-').replace(/[^a-zA-Z0-9-]/g, '')}`;
  }
  
  // Get file type from filename
  getFileType(filename: string) {
    const extension = filename.split('.').pop()?.toLowerCase() || '';
    return extension;
  }
  
  // Check if file type is supported for content extraction
  isSupportedFileType(filetype: string) {
    const supportedTypes = [
      'txt', 'md', 'markdown', 'html', 'htm', 'json', 'csv',
      'js', 'ts', 'jsx', 'tsx', 'css', 'scss'
    ];
    
    return supportedTypes.includes(filetype.toLowerCase());
  }
  
  // Update monitoring statistics
  updateStats() {
    this.stats.totalFiles = this.indexedFiles.length;
    this.stats.filesMonitored = this.indexedFiles.filter(f => !f.isDeleted).length;
    this.stats.activeMonitors = this.folders.filter(f => f.isActive).length;
    
    // Count file types
    this.stats.fileTypes = {};
    this.indexedFiles.filter(f => !f.isDeleted).forEach(file => {
      const type = file.filetype.toLowerCase();
      this.stats.fileTypes[type] = (this.stats.fileTypes[type] || 0) + 1;
    });
    
    if (this.onStatsUpdated) {
      this.onStatsUpdated({ ...this.stats });
    }
  }
  
  // Clean up resources
  dispose() {
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
  initialFiles?: IndexedFileInfo[]
): FileMonitor {
  if (!fileMonitorInstance) {
    fileMonitorInstance = new FileMonitor(
      initialFolders || [], 
      initialFiles || []
    );
  }
  
  return fileMonitorInstance;
}

// Reset the file monitor (for testing)
export function resetFileMonitor() {
  if (fileMonitorInstance) {
    fileMonitorInstance.dispose();
    fileMonitorInstance = null;
  }
}
