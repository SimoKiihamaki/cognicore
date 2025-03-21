
import { createRoot } from 'react-dom/client';
import './fixFileAccess.js'; // Import our fix first
import App from './App.tsx';
import './index.css';
import './noteFixes.css'; // Import our note visibility fixes
import { initFileSystemPolyfills } from './polyfills/fileSystemPolyfill';

// Service worker registration - only in production
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then((registration) => {
        console.log('ServiceWorker registration successful with scope: ', registration.scope);
      })
      .catch((error) => {
        console.error('ServiceWorker registration failed: ', error);
      });
  });
} else if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  // Unregister service workers in development mode
  window.addEventListener('load', () => {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (let registration of registrations) {
        registration.unregister();
        console.log('ServiceWorker unregistered for development mode');
      }
    });
  });
}

// Initialize polyfills
initFileSystemPolyfills();

createRoot(document.getElementById("root")!).render(<App />);
