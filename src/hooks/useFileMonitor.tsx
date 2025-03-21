import { useState, useCallback, useEffect } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { useToast } from './use-toast';
import { useEmbeddings } from './useEmbeddings';
import * as fileMonitor from '../services/fileMonitor';

interface MonitoredFolder {
  id: string;
  path: string;
  handle: FileSystemDirectoryHandle;
  isActive: boolean;
}

interface IndexedFile {
  id: string;
  filename: string;
  filepath: string;
  filetype: string;
  lastModified: Date;
  size: number;
  content?: string;
  isDeleted: boolean;
}

// Filter options for file monitoring
export interface FileMonitoringOptions {
  textFilesOnly: boolean;
  maxFileSize: number;
  scanInterval: number;
  skipExcludedDirs: boolean;
  includeAllFileTypes: boolean;
}

// Status of individual folders with monitoring statistics
interface FolderMonitoringStats extends MonitoredFolder {
  lastScanTime: Date | null;
  fileCount: number;
  errorCount: number;
  lastError: string | null;
}

/**
 * Hook for managing file monitoring and integration
 */
export function useFileMonitor() {
  const [monitoredFolders, setMonitoredFolders] = useLocalStorage<MonitoredFolder[]>('cognicore-monitored-folders', []);
  const [indexedFiles, setIndexedFiles] = useLocalStorage<IndexedFile[]>('cognicore-indexed-files', []);
  const [folderStats, setFolderStats] = useState<FolderMonitoringStats[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [monitoringOptions, setMonitoringOptions] = useLocalStorage<FileMonitoringOptions>('cognicore-monitoring-options', {
    textFilesOnly: true,
    maxFileSize: 5 * 1024 * 1024, // 5MB default
    scanInterval: 30000, // 30 seconds default
    skipExcludedDirs: true,
    includeAllFileTypes: false
  });
  
  const { toast } = useToast();
  const { generateEmbeddingsForFile } = useEmbeddings();
  
  // Check if file system access is supported
  const isSupported = fileMonitor.isFileAccessSupported?.() || false;
  
  // Update folder stats from the monitoring service
  const updateFolderStats = useCallback(() => {
    if (!isMonitoring) return;
    
    const statuses = (fileMonitor.getMonitoringStatus?.() || []) as fileMonitor.MonitoringStatus[];
    
    // Merge status data with folder data
    const updatedStats = monitoredFolders.map(folder => {
      const status = statuses.find(s => s.folderPath === folder.path);
      
      return {
        ...folder,
        lastScanTime: status?.lastScanTime || null,
        fileCount: status?.fileCount || 0,
        errorCount: status?.errorCount || 0,
        lastError: status?.lastError || null
      };
    });
    
    setFolderStats(updatedStats);
  }, [monitoredFolders, isMonitoring]);
  
  // Update stats periodically when monitoring is active
  useEffect(() => {
    if (!isMonitoring) return;
    
    // Initial update
    updateFolderStats();
    
    // Update every 5 seconds
    const interval = setInterval(updateFolderStats, 5000);
    
    return () => clearInterval(interval);
  }, [isMonitoring, updateFolderStats]);
  
  // Start monitoring all active folders
  const startMonitoring = useCallback(() => {
    if (!isSupported) {
      toast({
        title: "Not Supported",
        description: "File system monitoring is not supported in your browser. Please use a modern browser that supports the File System Access API.",
        variant: "destructive"
      });
      return;
    }
    
    const activeFolders = monitoredFolders.filter(folder => folder.isActive);
    
    if (activeFolders.length === 0) {
      toast({
        title: "No Active Folders",
        description: "Please add and activate folders to monitor.",
      });
      return;
    }
    
    // Start monitoring each active folder
    activeFolders.forEach(folder => {
      try {
        fileMonitor.addMonitoredFolder(folder.path, folder.handle);
        
        fileMonitor.startMonitoringFolder(
          folder.path,
          (changedFiles, eventType) => {
            // Process files based on event type
            if (eventType === 'initial') {
              // Initial scan completed
              if (changedFiles.length > 0) {
                // Update indexed files with initial scan results
                setIndexedFiles(prev => {
                  const existingIds = new Set(prev.map(file => file.id));
                  const uniqueNewFiles = changedFiles.filter(file => !existingIds.has(file.id));
                  
                  if (uniqueNewFiles.length > 0) {
                    toast({
                      title: "Initial Scan Complete",
                      description: `Found ${uniqueNewFiles.length} files in "${folder.path}".`
                    });
                  }
                  
                  return [...prev, ...uniqueNewFiles];
                });
              }
            } else if (eventType === 'changed') {
              // Files changed or added
              if (changedFiles.length > 0) {
                setIndexedFiles(prev => {
                  // Remove any existing versions of these files
                  const filesToUpdate = new Set(changedFiles.map(file => file.filepath));
                  const remainingFiles = prev.filter(file => !filesToUpdate.has(file.filepath));
                  
                  toast({
                    title: "Files Updated",
                    description: `${changedFiles.length} files changed in "${folder.path}".`
                  });
                  
                  return [...remainingFiles, ...changedFiles];
                });
              }
            } else if (eventType === 'deleted') {
              // Files deleted
              if (changedFiles.length > 0) {
                setIndexedFiles(prev => {
                  const deletedPaths = new Set(changedFiles.map(file => file.filepath));
                  const remainingFiles = prev.filter(file => !deletedPaths.has(file.filepath));
                  
                  toast({
                    title: "Files Deleted",
                    description: `${changedFiles.length} files removed from "${folder.path}".`
                  });
                  
                  return remainingFiles;
                });
              }
            }
            
            // Update folder stats
            updateFolderStats();
          },
          {
            intervalMs: monitoringOptions.scanInterval,
            scanOptions: {
              maxFileSize: monitoringOptions.maxFileSize,
              textFilesOnly: monitoringOptions.textFilesOnly,
              skipExcludedDirs: monitoringOptions.skipExcludedDirs,
              includeAllFileTypes: monitoringOptions.includeAllFileTypes
            },
            errorCallback: (error) => {
              // Show error toast on monitoring error, but only for significant errors
              if (error.message.includes("permission") || 
                  error.message.includes("access denied") ||
                  error.message.includes("not found")) {
                toast({
                  title: "Monitoring Error",
                  description: `Error in folder "${folder.path}": ${error.message}`,
                  variant: "destructive"
                });
              }
              
              // Update folder stats to show the error
              updateFolderStats();
            }
          }
        );
      } catch (error) {
        console.error(`Error starting monitoring for folder ${folder.path}:`, error);
        toast({
          title: "Monitoring Error",
          description: `Failed to start monitoring folder "${folder.path}": ${error instanceof Error ? error.message : 'Unknown error'}`,
          variant: "destructive"
        });
      }
    });
    
    setIsMonitoring(true);
    
    toast({
      title: "Monitoring Started",
      description: `Monitoring ${activeFolders.length} folder(s) for changes.`
    });
  }, [monitoredFolders, isSupported, toast, monitoringOptions, setIndexedFiles, updateFolderStats]);
  
  // Stop monitoring all folders
  const stopMonitoring = useCallback(() => {
    monitoredFolders.forEach(folder => {
      fileMonitor.stopMonitoringFolder?.(folder.path);
    });
    
    setIsMonitoring(false);
    
    toast({
      title: "Monitoring Stopped",
      description: "Stopped monitoring all folders."
    });
  }, [monitoredFolders, toast]);
  
  // Add a new folder to monitor
  const addFolder = useCallback(async () => {
    if (!isSupported) {
      toast({
        title: "Not Supported",
        description: "File system access is not supported in your browser. Please use a modern browser that supports the File System Access API.",
        variant: "destructive"
      });
      return null;
    }
    
    setIsLoading(true);
    
    try {
      // Request folder access with better error handling
      let directoryHandle;
      try {
        directoryHandle = await fileMonitor.requestFolderAccess();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error accessing directory';
        toast({
          title: "Access Error",
          description: errorMessage,
          variant: "destructive"
        });
        return null;
      }
      
      // Additional check just to be sure
      if (!directoryHandle) {
        toast({
          title: "Access Denied",
          description: "Permission to access the folder was denied. Please try again and grant permission.",
          variant: "destructive"
        });
        return null;
      }
      
      // Extract folder name from the path
      const folderName = directoryHandle.name;
      const folderId = `folder-${Date.now()}`;
      const newFolder: MonitoredFolder = {
        id: folderId,
        path: folderName,
        handle: directoryHandle,
        isActive: true
      };
      
      // Check if folder is already monitored
      const existingFolder = monitoredFolders.find(
        folder => folder.path === folderName
      );
      
      if (existingFolder) {
        toast({
          title: "Folder Already Monitored",
          description: `The folder "${folderName}" is already being monitored.`,
        });
        return existingFolder;
      }
      
      // Add to monitored folders
      setMonitoredFolders([...monitoredFolders, newFolder]);
      
      // Scan the folder for initial files
      const files = await fileMonitor.scanDirectory(directoryHandle, folderName);
      
      // Add files to indexed files
      setIndexedFiles(prev => {
        const existingPaths = new Set(prev.map(file => file.filepath));
        const uniqueNewFiles = files.filter(file => !existingPaths.has(file.filepath));
        
        return [...prev, ...uniqueNewFiles];
      });
      
      toast({
        title: "Folder Added",
        description: `Added "${folderName}" with ${files.length} files.`
      });
      
      // If monitoring is active, start monitoring this folder too
      if (isMonitoring) {
        try {
          fileMonitor.addMonitoredFolder(folderName, directoryHandle);
          fileMonitor.startMonitoringFolder(
            folderName,
            (changedFiles) => {
              // Process changed files (same as in startMonitoring)
              if (changedFiles.length > 0) {
                setIndexedFiles(prev => {
                  const existingIds = new Set(prev.map(file => file.id));
                  const uniqueNewFiles = changedFiles.filter(file => !existingIds.has(file.id));
                  
                  if (uniqueNewFiles.length > 0) {
                    toast({
                      title: "Files Updated",
                      description: `${uniqueNewFiles.length} new or modified files detected.`
                    });
                  }
                  
                  return [...prev, ...uniqueNewFiles];
                });
              }
            }
          );
        } catch (error) {
          console.error(`Error starting monitoring for new folder ${folderName}:`, error);
          toast({
            title: "Monitoring Error",
            description: `Failed to start monitoring new folder "${folderName}": ${error instanceof Error ? error.message : 'Unknown error'}`,
            variant: "destructive"
          });
        }
      }
      
      return newFolder;
    } catch (error) {
      console.error('Error adding folder:', error);
      toast({
        title: "Error Adding Folder",
        description: `Failed to add folder: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [monitoredFolders, isSupported, isMonitoring, toast, setMonitoredFolders, setIndexedFiles]);
  
  // Remove a folder from monitoring
  const removeFolder = useCallback((folderId: string) => {
    const folder = monitoredFolders.find(f => f.id === folderId);
    
    if (!folder) {
      console.error(`Cannot remove folder with ID ${folderId} - not found`);
      return;
    }
    
    // Stop monitoring if active
    if (isMonitoring && folder.isActive) {
      fileMonitor.stopMonitoringFolder?.(folder.path);
      fileMonitor.removeMonitoredFolder(folder.path);
    }
    
    // Remove from monitored folders
    setMonitoredFolders(monitoredFolders.filter(f => f.id !== folderId));
    
    toast({
      title: "Folder Removed",
      description: `Removed "${folder.path}" from monitored folders.`
    });
  }, [monitoredFolders, isMonitoring, toast, setMonitoredFolders]);
  
  // Toggle active status of a folder
  const toggleFolderActive = useCallback((folderId: string) => {
    const updatedFolders = monitoredFolders.map(folder => 
      folder.id === folderId 
        ? { ...folder, isActive: !folder.isActive } 
        : folder
    );
    
    const folder = monitoredFolders.find(f => f.id === folderId);
    const updatedFolder = updatedFolders.find(f => f.id === folderId);
    
    if (folder && updatedFolder) {
      // If monitoring is active, update the monitoring status
      if (isMonitoring) {
        if (folder.isActive && !updatedFolder.isActive) {
          // Folder was active and is now inactive, stop monitoring
          fileMonitor.stopMonitoringFolder?.(folder.path);
          fileMonitor.removeMonitoredFolder(folder.path);
        } else if (!folder.isActive && updatedFolder.isActive) {
          // Folder was inactive and is now active, start monitoring
          fileMonitor.addMonitoredFolder(folder.path, folder.handle);
          fileMonitor.startMonitoringFolder(
            folder.path,
            (changedFiles) => {
              // Process changed files (same as before)
              if (changedFiles.length > 0) {
                setIndexedFiles(prev => {
                  const existingIds = new Set(prev.map(file => file.id));
                  const uniqueNewFiles = changedFiles.filter(file => !existingIds.has(file.id));
                  
                  if (uniqueNewFiles.length > 0) {
                    toast({
                      title: "Files Updated",
                      description: `${uniqueNewFiles.length} new or modified files detected.`
                    });
                  }
                  
                  return [...prev, ...uniqueNewFiles];
                });
              }
            }
          );
        }
      }
      
      setMonitoredFolders(updatedFolders);
    }
  }, [monitoredFolders, isMonitoring, toast, setMonitoredFolders, setIndexedFiles]);
  
  // Update monitoring options
  const updateMonitoringOptions = useCallback((options: Partial<FileMonitoringOptions>) => {
    setMonitoringOptions(prev => ({
      ...prev,
      ...options
    }));
    
    // If we're actively monitoring, restart monitors with new options
    if (isMonitoring) {
      // Stop current monitoring
      stopMonitoring();
      
      // Wait a moment to ensure everything is stopped
      setTimeout(() => {
        // Restart with new options
        startMonitoring();
      }, 500);
    }
  }, [isMonitoring, stopMonitoring, startMonitoring, setMonitoringOptions]);
  
  // Process all indexed files
  const processIndexedFiles = useCallback(async () => {
    if (!isSupported) {
      toast({
        title: "Not Supported",
        description: "File system access is not supported in your browser. Please use a modern browser that supports the File System Access API.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      // Process each indexed file
      for (const file of indexedFiles) {
        if (!file.isDeleted) {
          await generateEmbeddingsForFile(file.id);
        }
      }

      toast({
        title: "Processing Complete",
        description: `Processed ${indexedFiles.length} files.`
      });
    } catch (error) {
      console.error('Error processing files:', error);
      toast({
        title: "Processing Error",
        description: `Failed to process files: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [indexedFiles, isSupported, generateEmbeddingsForFile, toast]);
  
  // Delete all indexed files for a specific folder
  const clearFolderFiles = useCallback((folderId: string) => {
    const folder = monitoredFolders.find(f => f.id === folderId);
    if (!folder) return;
    
    // Find and remove files from this folder
    setIndexedFiles(prev => {
      const remainingFiles = prev.filter(file => !file.filepath.startsWith(folder.path));
      const removedCount = prev.length - remainingFiles.length;
      
      if (removedCount > 0) {
        toast({
          title: "Folder Files Cleared",
          description: `Removed ${removedCount} indexed files from "${folder.path}".`
        });
      }
      
      return remainingFiles;
    });
  }, [monitoredFolders, setIndexedFiles, toast]);
  
  // Delete all indexed files
  const clearAllFiles = useCallback(() => {
    const count = indexedFiles.length;
    
    if (count === 0) {
      toast({
        title: "No Files to Clear",
        description: "There are no indexed files to clear."
      });
      return;
    }
    
    setIndexedFiles([]);
    
    toast({
      title: "All Files Cleared",
      description: `Removed ${count} indexed files.`
    });
  }, [indexedFiles.length, setIndexedFiles, toast]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isMonitoring) {
        monitoredFolders.forEach(folder => {
          if (folder.isActive) {
            fileMonitor.stopMonitoringFolder?.(folder.path);
          }
        });
      }
    };
  }, [isMonitoring, monitoredFolders]);
  
  return {
    monitoredFolders,
    indexedFiles,
    isMonitoring,
    isLoading,
    isSupported,
    folderStats,
    monitoringOptions,
    startMonitoring,
    stopMonitoring,
    addFolder,
    removeFolder,
    toggleFolderActive,
    processIndexedFiles,
    updateMonitoringOptions,
    clearFolderFiles,
    clearAllFiles
  };
}
