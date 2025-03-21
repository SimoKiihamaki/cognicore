import { FileSystemHandle } from 'fs-access';

interface FileMonitorOptions {
  onFileChange?: (path: string, type: 'created' | 'modified' | 'deleted') => void;
  onError?: (error: Error) => void;
}

class FileMonitorService {
  private handles: Map<string, FileSystemDirectoryHandle> = new Map();
  private options: FileMonitorOptions;
  private isMonitoring: boolean = false;

  constructor(options: FileMonitorOptions = {}) {
    this.options = options;
  }

  public async requestPermission(path: string): Promise<boolean> {
    try {
      // Check if we already have a handle for this path
      if (this.handles.has(path)) {
        const handle = this.handles.get(path)!;
        const status = await handle.requestPermission({ mode: 'read' });
        return status === 'granted';
      }

      // Request permission for the directory
      const dirHandle = await window.showDirectoryPicker();
      this.handles.set(path, dirHandle);
      return true;
    } catch (error) {
      console.error('Error requesting file system permission:', error);
      this.options.onError?.(error as Error);
      return false;
    }
  }

  public async startMonitoring(path: string): Promise<boolean> {
    try {
      const hasPermission = await this.requestPermission(path);
      if (!hasPermission) {
        throw new Error('Permission denied');
      }

      const handle = this.handles.get(path);
      if (!handle) {
        throw new Error('No handle found for path');
      }

      this.isMonitoring = true;
      this.monitorDirectory(handle);
      return true;
    } catch (error) {
      console.error('Error starting file monitoring:', error);
      this.options.onError?.(error as Error);
      return false;
    }
  }

  public stopMonitoring(path: string): void {
    this.handles.delete(path);
    if (this.handles.size === 0) {
      this.isMonitoring = false;
    }
  }

  private async monitorDirectory(handle: FileSystemDirectoryHandle): Promise<void> {
    if (!this.isMonitoring) return;

    try {
      const entries = await handle.entries();
      for (const [name, entry] of entries) {
        if (entry.kind === 'file') {
          // Handle file changes
          this.options.onFileChange?.(name, 'modified');
        } else if (entry.kind === 'directory') {
          // Recursively monitor subdirectories
          await this.monitorDirectory(entry);
        }
      }
    } catch (error) {
      console.error('Error monitoring directory:', error);
      this.options.onError?.(error as Error);
    }
  }
}

export default new FileMonitorService(); 