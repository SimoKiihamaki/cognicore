/**
 * Hook for managing file monitoring functionality 
 */
import { useState, useEffect, useCallback } from 'react';
import { MonitoredFolder, IndexedFile, MonitoringStats } from '@/lib/types';
import { useLocalStorage } from './useLocalStorage';
import fileMonitorService from '@/services/FileMonitorService';
import databaseService from '@/services/database/databaseService';
import { STORE_NAMES } from '@/services/database/databaseService';
import { toast } from 'sonner';

// Default monitoring options
export interface FileMonitoringOptions {
  scanInterval: number;
  textFilesOnly: boolean;
  skipExcludedDirs: boolean;
  maxFileSize: number;
}

const defaultOptions: FileMonitoringOptions = {
  scanInterval: 30000, // 30 seconds
  textFilesOnly: true,
  skipExcludedDirs: true,
  maxFileSize: 5 * 1024 * 1024 // 5MB
};

/**
 * Hook for managing file monitoring
 */
export function useFileMonitor() {
  // State for folders and files
  const [monitoredFolders, setMonitoredFolders] = useState<MonitoredFolder[]>([]);
  const [indexedFiles, setIndexedFiles] = useState<IndexedFile[]>([]);
  
  // Monitoring options from local storage
  const [monitoringOptions, setMonitoringOptions] = useLocalStorage<FileMonitoringOptions>(
    'file-monitoring-options',
    defaultOptions
  );
  
  // Monitoring state
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<MonitoringStats | null>(null);
  
  // Load monitored folders and files
  const loadMonitoredItems = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Get folders from database
      const folders = await databaseService.getAll<MonitoredFolder>(STORE_NAMES.FOLDERS);
      setMonitoredFolders(folders);
      
      // Get active files from database (non-deleted)
      const allFiles = await databaseService.getAll<IndexedFile>(STORE_NAMES.FILES);
      setIndexedFiles(allFiles.filter(file => !file.isDeleted));
      
      // Update monitoring state
      setIsMonitoring(folders.some(folder => folder.isActive));
      
      // Get stats
      setStats(fileMonitorService.getStats());
    } catch (error) {
      console.error('Error loading monitored items:', error);
      toast.error('Failed to load monitored items');
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // Initialize on mount
  useEffect(() => {
    loadMonitoredItems();
    
    // Set up event listeners for file changes
    const handleFileEvent = (event: any) => {
      // Refresh data when files change
      loadMonitoredItems();
    };
    
    fileMonitorService.addEventListener('added', handleFileEvent);
    fileMonitorService.addEventListener('modified', handleFileEvent);
    fileMonitorService.addEventListener('deleted', handleFileEvent);
    
    return () => {
      // Clean up event listeners
      fileMonitorService.removeEventListener('added', handleFileEvent);
      fileMonitorService.removeEventListener('modified', handleFileEvent);
      fileMonitorService.removeEventListener('deleted', handleFileEvent);
    };
  }, [loadMonitoredItems]);
  
  // Apply monitoring options whenever they change
  useEffect(() => {
    fileMonitorService.setDefaultPollingInterval(monitoringOptions.scanInterval);
  }, [monitoringOptions.scanInterval]);
  
  // Add a folder for monitoring
  const addFolder = async (handle: FileSystemDirectoryHandle, path: string) => {
    try {
      setIsLoading(true);
      
      const newFolder = await fileMonitorService.addFolder(handle, path);
      
      // Refresh folders
      await loadMonitoredItems();
      
      toast.success(`Added folder: ${path}`);
      return newFolder;
    } catch (error) {
      console.error('Error adding folder:', error);
      toast.error(`Failed to add folder: ${path}`);
      return null;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Remove a folder from monitoring
  const removeFolder = async (folderId: string) => {
    try {
      setIsLoading(true);
      
      const folder = monitoredFolders.find(f => f.id === folderId);
      if (!folder) {
        throw new Error(`Folder with ID ${folderId} not found`);
      }
      
      await fileMonitorService.removeFolder(folderId);
      
      // Refresh folders and files
      await loadMonitoredItems();
      
      toast.success(`Removed folder: ${folder.path}`);
      return true;
    } catch (error) {
      console.error('Error removing folder:', error);
      toast.error('Failed to remove folder');
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Start monitoring all folders
  const startMonitoring = async () => {
    try {
      setIsLoading(true);
      
      // Start monitoring all folders that aren't already being monitored
      const inactiveFolders = monitoredFolders.filter(folder => !folder.isActive);
      
      for (const folder of inactiveFolders) {
        await fileMonitorService.startMonitoring(folder.id, monitoringOptions.scanInterval);
      }
      
      // Refresh folders
      await loadMonitoredItems();
      
      toast.success('File monitoring started');
    } catch (error) {
      console.error('Error starting monitoring:', error);
      toast.error('Failed to start monitoring');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Stop monitoring all folders
  const stopMonitoring = async () => {
    try {
      setIsLoading(true);
      
      // Stop monitoring all active folders
      const activeFolders = monitoredFolders.filter(folder => folder.isActive);
      
      for (const folder of activeFolders) {
        await fileMonitorService.stopMonitoring(folder.id);
      }
      
      // Refresh folders
      await loadMonitoredItems();
      
      toast.success('File monitoring stopped');
    } catch (error) {
      console.error('Error stopping monitoring:', error);
      toast.error('Failed to stop monitoring');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Update monitoring options
  const updateMonitoringOptions = (options: Partial<FileMonitoringOptions>) => {
    setMonitoringOptions(prev => ({ ...prev, ...options }));
  };
  
  return {
    monitoredFolders,
    indexedFiles,
    isMonitoring,
    isLoading,
    stats,
    monitoringOptions,
    addFolder,
    removeFolder,
    startMonitoring,
    stopMonitoring,
    updateMonitoringOptions,
    refreshData: loadMonitoredItems
  };
}
