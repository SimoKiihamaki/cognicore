/**
 * File System Access API Fix
 * 
 * This script patches the File System Access API to handle permissions better
 * and ensures service workers are unregistered in development mode.
 * It should be imported at the app's entry point.
 */

// Unregister any service workers in development mode
if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    for (let registration of registrations) {
      registration.unregister();
      console.log('Service worker unregistered for development environment');
    }
  });
}

// Check if the File System Access API is available
if ('showDirectoryPicker' in window) {
  // Store the original function
  const originalShowDirectoryPicker = window.showDirectoryPicker;

  // Override with our patched version
  window.showDirectoryPicker = async function(...args) {
    try {
      // Call the original function
      const handle = await originalShowDirectoryPicker(...args);
      
      try {
        // Explicitly request permissions to ensure they're granted
        const permissionState = await handle.requestPermission({ mode: 'readwrite' });
        
        if (permissionState !== 'granted') {
          console.warn('Permission was not granted for directory access');
        }
      } catch (permError) {
        console.error('Permission request failed:', permError);
        // Continue anyway, as we still have the handle
      }
      
      // Return the handle even if permissions check failed
      return handle;
    } catch (error) {
      // Log the real error for debugging
      console.error('Directory picker error:', error);
      
      // Re-throw but with a more helpful message
      if (error.name === 'NotAllowedError') {
        throw new Error('Permission to access the folder was denied. Please try again and grant access when prompted.');
      } else if (error.name === 'AbortError') {
        throw new Error('Folder selection was cancelled.');
      } else {
        throw error;
      }
    }
  };
  
  console.log('File System Access API patched for better permission handling');
}
