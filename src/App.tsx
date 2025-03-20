
import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { FoldersProvider } from "@/hooks/useFolders";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import cacheService from '@/services/cacheService';
import { initializeEmbeddingService, terminateEmbeddingService } from '@/utils/embeddings';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

// Test and diagnostic components
import TestComponent from '@/components/TestComponent';
import OfflineBanner from '@/components/OfflineBanner';

const App = () => {
  console.log('App rendering - diagnostics enabled');
  
  // Initialize caching and embedding services
  useEffect(() => {
    // Get cache size from localStorage or use default
    const cacheSize = parseInt(localStorage.getItem('cognicore-max-cache-size') || '50');
    
    // Initialize cache service
    cacheService.initialize(cacheSize);
    
    // Get model name from localStorage or use default
    const modelName = localStorage.getItem('cognicore-embedding-model') || 'Xenova/all-MiniLM-L6-v2';
    
    // Initialize embedding service
    try {
      initializeEmbeddingService();
    } catch (error) {
      console.error('Failed to initialize embedding service:', error);
    }
    
    // Clean up on unmount
    return () => {
      // Dispose cache service
      cacheService.dispose();
      
      // Terminate embedding worker
      terminateEmbeddingService();
    };
  }, []);
  
  return (
    <QueryClientProvider client={queryClient}>
      <div className="test-wrapper bg-background text-foreground h-screen w-screen p-4">
        <h1 className="text-2xl font-bold mb-4">CogniCore Diagnostic</h1>
        <p className="mb-4">If you can see this text, basic app rendering is working.</p>
        
        <div className="mb-4 p-4 border border-primary rounded">
          <h2 className="text-xl font-bold mb-2">Test Component (Isolated)</h2>
          <TestComponent />
        </div>
        
        <div className="mb-4">
          <button 
            onClick={() => {
              localStorage.removeItem('cognicore-custom-themes');
              localStorage.removeItem('cognicore-active-theme');
              localStorage.removeItem('lmStudio-config');
              window.location.reload();
            }}
            className="px-4 py-2 bg-destructive text-destructive-foreground rounded mr-2"
          >
            Reset Theme & LM Studio Settings
          </button>
          
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded"
          >
            Reload Page
          </button>
        </div>
        
        <details className="mb-4">
          <summary className="cursor-pointer font-semibold">View Full App (Click to expand)</summary>
          <div className="mt-4 border border-border p-4 rounded">
            <TooltipProvider>
              <FoldersProvider>
                <Toaster />
                <Sonner position="top-right" />
                <OfflineBanner />
                <BrowserRouter>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </BrowserRouter>
              </FoldersProvider>
            </TooltipProvider>
          </div>
        </details>
      </div>
    </QueryClientProvider>
  );
};

export default App;
