import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: true,
    },
    watch: {
      usePolling: true,
    },
    proxy: {
      // Proxy /v1 requests to LM Studio API (default port 1234)
      '/lmstudio-api': {
        target: 'http://localhost:1234',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/lmstudio-api/, ''),
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('LM Studio proxy error:', err);
          });
          proxy.on('proxyReq', (_proxyReq, req, _res) => {
            console.log('Proxying to LM Studio:', req.method, req.url);
          });
        },
      },
    },
  },
  plugins: [
    react()
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Add cache busting for development builds
  build: {
    sourcemap: mode === 'development',
    rollupOptions: {
      output: {
        // Add timestamp to chunk filenames in development for cache busting
        chunkFileNames: mode === 'development' 
          ? 'assets/[name]-[hash]-[timestamp].js' 
          : 'assets/[name]-[hash].js',
        entryFileNames: mode === 'development'
          ? 'assets/[name]-[hash]-[timestamp].js'
          : 'assets/[name]-[hash].js',
        assetFileNames: mode === 'development'
          ? 'assets/[name]-[hash]-[timestamp].[ext]'
          : 'assets/[name]-[hash].[ext]',
      },
    },
  },
}));
