
/**
 * Adds polyfills for File System Access API methods if they're not available
 */
export function initFileSystemPolyfills() {
  if (!window.showDirectoryPicker) {
    // Polyfill for showDirectoryPicker
    window.showDirectoryPicker = async () => {
      throw new Error('File System Access API is not supported in this browser');
    };
  }

  // Add FileSystemDirectoryHandle.entries polyfill if needed
  if (window.FileSystemDirectoryHandle && !window.FileSystemDirectoryHandle.prototype.entries) {
    // @ts-ignore - Adding polyfill
    window.FileSystemDirectoryHandle.prototype.entries = async function*() {
      throw new Error('FileSystemDirectoryHandle.entries is not supported in this browser');
    };
  }
}

// Add to Window interface
declare global {
  interface Window {
    showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>;
  }
  
  interface FileSystemDirectoryHandle {
    entries?: () => AsyncIterableIterator<[string, FileSystemHandle]>;
  }
}
