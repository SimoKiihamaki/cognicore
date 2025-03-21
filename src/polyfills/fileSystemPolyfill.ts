
/**
 * Adds polyfills for File System Access API methods if they're not available
 */
export function initFileSystemPolyfills() {
  // Detect browser type
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  
  if (!window.showDirectoryPicker) {
    // Polyfill for showDirectoryPicker with better error messaging
    window.showDirectoryPicker = async () => {
      const message = isSafari 
        ? 'File System Access API is not supported in Safari. Please try Chrome, Edge, or another Chromium-based browser.'
        : 'File System Access API is not supported in this browser. Please update to a newer version or try Chrome, Edge, or another Chromium-based browser.';
      
      console.warn(message);
      throw new Error(message);
    };
  }

  // Add FileSystemDirectoryHandle.entries polyfill if needed
  if (window.FileSystemDirectoryHandle && !window.FileSystemDirectoryHandle.prototype.entries) {
    // @ts-ignore - Adding polyfill
    window.FileSystemDirectoryHandle.prototype.entries = async function*() {
      const message = isSafari 
        ? 'FileSystemDirectoryHandle.entries is not supported in Safari. Please try Chrome, Edge, or another Chromium-based browser.'
        : 'FileSystemDirectoryHandle.entries is not supported in this browser. Please update to a newer version or try Chrome, Edge, or another Chromium-based browser.';
        
      console.warn(message);
      throw new Error(message);
    };
  }
  
  // Log browser compatibility information
  if (isSafari) {
    console.info('Browser detected as Safari. Some features requiring File System Access API may be limited.');
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
