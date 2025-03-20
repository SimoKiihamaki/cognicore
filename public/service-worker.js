/**
 * CogniCore Service Worker
 * Provides offline functionality, caching, and background sync
 */

// Cache name and version
const CACHE_NAME = 'cognicore-cache-v1';

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/favicon.ico',
  '/service-worker.js',
  '/embedding-worker.js'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service worker installing - caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting()) // Activate immediately
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.filter((cacheName) => {
            return cacheName !== CACHE_NAME;
          }).map((cacheName) => {
            return caches.delete(cacheName);
          })
        );
      })
      .then(() => self.clients.claim()) // Take control of all clients
  );
});

// Fetch event - serve from cache if available, otherwise fetch from network
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }
  
  // Skip LM Studio API requests (they can't be cached)
  if (event.request.url.includes('/v1/chat/completions')) {
    return;
  }
  
  // Handle API requests differently from static assets
  if (event.request.url.includes('/api/')) {
    // For API requests, try network first, then cache
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache the response
          const responseClone = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseClone);
            });
          return response;
        })
        .catch(() => {
          // If network fails, try cache
          return caches.match(event.request);
        })
    );
  } else {
    // For static assets, try cache first, then network
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          if (response) {
            return response; // Return from cache if available
          }
          
          // Fetch from network and cache
          return fetch(event.request)
            .then((response) => {
              // Don't cache non-successful responses
              if (!response || response.status !== 200 || response.type !== 'basic') {
                return response;
              }
              
              // Clone the response to cache it
              const responseToCache = response.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseToCache);
                });
              
              return response;
            });
        })
    );
  }
});

// Background sync for offline operations
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-notes') {
    event.waitUntil(syncNotes());
  }
});

// Push notification event
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  const data = event.data.json();
  const title = data.title || 'CogniCore Notification';
  const options = {
    body: data.body || 'You have a new notification',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    data: data.data
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window' })
      .then((clientList) => {
        // If a window client is available, focus it
        for (const client of clientList) {
          if (client.url.includes('/') && 'focus' in client) {
            return client.focus();
          }
        }
        // Otherwise open a new window
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
  );
});

// Helper function to sync notes (placeholder)
async function syncNotes() {
  // This would implement actual sync logic
  console.log('Syncing notes in background');
  return Promise.resolve();
}

// Send heartbeat message to clients
setInterval(() => {
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'HEARTBEAT',
        timestamp: new Date().toISOString()
      });
    });
  });
}, 60000); // Every minute

// Log when service worker is ready
console.log('Service worker loaded and ready');
