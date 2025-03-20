
import { useState, useEffect, useCallback } from 'react';

interface OfflineStatusHook {
  isOnline: boolean;
  isServiceWorkerActive: boolean;
  isOfflineModeEnabled: boolean;
  hasAppUpdate: boolean;
  updateServiceWorker: () => void;
  enableOfflineMode: (enabled: boolean) => void;
  isOffline: boolean;
  isOfflineMode: boolean;
  toggleOfflineMode: () => void;
}

/**
 * Hook to manage offline status and service worker functionality
 */
export function useOfflineStatus(): OfflineStatusHook {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isServiceWorkerActive, setIsServiceWorkerActive] = useState<boolean>(false);
  const [isOfflineModeEnabled, setIsOfflineModeEnabled] = useState<boolean>(
    localStorage.getItem('cognicore-offline-mode') === 'true'
  );
  const [hasAppUpdate, setHasAppUpdate] = useState<boolean>(false);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);

  // Calculate isOffline based on online status
  const isOffline = !isOnline;
  
  // isOfflineMode is an alias to isOfflineModeEnabled
  const isOfflineMode = isOfflineModeEnabled;

  // Check if service worker is supported
  const isSWSupported = 'serviceWorker' in navigator;

  // Enable or disable offline mode
  const enableOfflineMode = useCallback((enabled: boolean) => {
    setIsOfflineModeEnabled(enabled);
    localStorage.setItem('cognicore-offline-mode', enabled ? 'true' : 'false');
  }, []);
  
  // Toggle offline mode
  const toggleOfflineMode = useCallback(() => {
    enableOfflineMode(!isOfflineModeEnabled);
  }, [enableOfflineMode, isOfflineModeEnabled]);

  // Register service worker
  useEffect(() => {
    if (isSWSupported) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
          .then((registration) => {
            console.log('ServiceWorker registration successful with scope: ', registration.scope);
            setSwRegistration(registration);
            setIsServiceWorkerActive(!!registration.active);
            
            // Check for service worker updates
            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing;
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    setHasAppUpdate(true);
                  }
                });
              }
            });
          })
          .catch((error) => {
            console.error('ServiceWorker registration failed: ', error);
            setIsServiceWorkerActive(false);
          });
      });

      // Check if a service worker already controls the page
      if (navigator.serviceWorker.controller) {
        setIsServiceWorkerActive(true);
      }
    }
  }, [isSWSupported]);

  // Update service worker when update is available
  const updateServiceWorker = useCallback(() => {
    if (swRegistration && hasAppUpdate) {
      if (swRegistration.waiting) {
        // Notify the service worker to skip waiting and activate new version
        swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
      
      // Reload the page to load the new version
      window.location.reload();
    }
  }, [swRegistration, hasAppUpdate]);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    isOnline,
    isServiceWorkerActive,
    isOfflineModeEnabled,
    hasAppUpdate,
    updateServiceWorker,
    enableOfflineMode,
    isOffline,
    isOfflineMode,
    toggleOfflineMode
  };
}
