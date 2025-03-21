/**
 * CogniCore Service Worker
 * Provides offline functionality, caching, and background sync
 */

// Cache name with timestamp to force updates when new versions are deployed
const CACHE_NAME = 'cognicore-cache-v2-' + new Date().toISOString().slice(0, 10);
const RUNTIME_CACHE = 'cognicore-runtime';

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/favicon.ico',
  '/service-worker.js',
  '/embedding-worker.js'
];

// Check if we're in development mode
const IS_DEV = self.location.hostname === 'localhost' || 
               self.location.hostname === '127.0.0.1' ||
               self.location.port === '8080' || 
               self.location.port === '8081' || 
               self.location.port === '8082' ||
               self.location.port === '5173';

// Skip caching in development mode
const shouldCache = !IS_DEV;

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log(`Service worker installing (${IS_DEV ? 'Development' : 'Production'} mode)`);
  
  // Skip caching in development
  if (!shouldCache) {
    console.log('Development mode: skipping cache setup');
    self.skipWaiting();
    return;
  }
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting()) // Activate immediately
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service worker activating');
  
  // Skip cache cleanup in development
  if (!shouldCache) {
    console.log('Development mode: skipping cache cleanup');
    self.clients.claim();
    return;
  }
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.filter((cacheName) => {
            // Keep current cache and runtime cache
            return cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE;
          }).map((cacheName) => {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          })
        );
      })
      .then(() => self.clients.claim()) // Take control of all clients
  );
});

// Fetch event - in development mode, always use network
self.addEventListener('fetch', (event) => {
  // Skip cache handling in development mode - always use network
  if (IS_DEV) {
    return;
  }
  
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }
  
  // Skip API requests that shouldn't be cached
  if (event.request.url.includes('/v1/chat/completions') || 
      event.request.url.includes('/v1/models')) {
    return;
  }
  
  // Handle JavaScript, CSS and HTML files - network first with cache fallback
  if (event.request.url.endsWith('.js') || 
      event.request.url.endsWith('.css') || 
      event.request.url.endsWith('.html') ||
      event.request.url.endsWith('/')) {
    
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache the fresh response
          const responseToCache = response.clone();
          caches.open(RUNTIME_CACHE)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });
          return response;
        })
        .catch(() => {
          // If network fails, try cache
          return caches.match(event.request);
        })
    );
  } else {
    // For other assets (images, fonts, etc), try cache first
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
              caches.open(RUNTIME_CACHE)
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

// Development mode utility function to unregister service worker
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHES') {
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          console.log('Clearing cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      event.ports[0].postMessage({ result: 'Caches cleared successfully' });
    });
  }
});

// Send heartbeat message to clients
setInterval(() => {
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'HEARTBEAT',
        timestamp: new Date().toISOString(),
        mode: IS_DEV ? 'development' : 'production',
        caching: shouldCache ? 'enabled' : 'disabled'
      });
    });
  });
}, 60000); // Every minute

// Log when service worker is ready
console.log(`Service worker loaded and ready (${IS_DEV ? 'Development' : 'Production'} mode)`);
