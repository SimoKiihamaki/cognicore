/**
 * Cache Validation Utility
 * 
 * Provides functions to validate application cache integrity
 * and force a reload if there are issues.
 */

// App version (should be updated with each release)
const APP_VERSION = '1.0.0';
const CACHE_VERSION_KEY = 'cognicore-cache-version';

/**
 * Checks if the application cache version matches the current version.
 * If not, it will clear caches and reload the application.
 */
export async function validateAppCache(): Promise<void> {
  // Skip in development mode since we handle it elsewhere
  if (import.meta.env.DEV) {
    console.log('Cache validation skipped in development mode');
    localStorage.setItem(CACHE_VERSION_KEY, APP_VERSION);
    return;
  }

  const cachedVersion = localStorage.getItem(CACHE_VERSION_KEY);
  
  // If cache version doesn't match or doesn't exist
  if (cachedVersion !== APP_VERSION) {
    console.log(`Cache version mismatch: ${cachedVersion} vs ${APP_VERSION}`);
    await clearAppCache();
    
    // Update the cache version and reload
    localStorage.setItem(CACHE_VERSION_KEY, APP_VERSION);
    window.location.reload();
  }
}

/**
 * Clears all application caches.
 */
export async function clearAppCache(): Promise<void> {
  try {
    // Clear application caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => {
          console.log(`Clearing cache: ${cacheName}`);
          return caches.delete(cacheName);
        })
      );
    }
    
    // Don't clear local storage completely as it contains user data
    // Just remove cache-related items
    const cacheKeys = Object.keys(localStorage).filter(key => 
      key.includes('cache') || 
      key.includes('timestamp') ||
      key.includes('version')
    );
    
    cacheKeys.forEach(key => {
      console.log(`Clearing localStorage key: ${key}`);
      localStorage.removeItem(key);
    });
    
    console.log('Application cache cleared successfully');
  } catch (error) {
    console.error('Error clearing application cache:', error);
  }
}
