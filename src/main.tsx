
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initFileSystemPolyfills } from './polyfills/fileSystemPolyfill';

// Service worker registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then((registration) => {
        console.log('ServiceWorker registration successful with scope: ', registration.scope);
      })
      .catch((error) => {
        console.error('ServiceWorker registration failed: ', error);
      });
  });
}

// Initialize polyfills
initFileSystemPolyfills();

createRoot(document.getElementById("root")!).render(<App />);
