
import { useEffect, useState } from "react";
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
import TestComponent from '@/components/TestComponent';
import OfflineBanner from '@/components/OfflineBanner';
import { Button } from '@/components/ui/button';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

const App = () => {
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  
  // Initialize caching and embedding services
  useEffect(() => {
    // Get cache size from localStorage or use default
    const cacheSize = parseInt(localStorage.getItem('cognicore-max-cache-size') || '50');
    
    // Initialize cache service
    cacheService.initialize(cacheSize);
    
    // Initialize embedding service
    try {
      initializeEmbeddingService();
      console.log('Embedding service initialized');
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
  
  const renderDiagnosticView = () => (
    <div className="test-wrapper bg-background text-foreground h-screen w-screen p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">CogniCore Diagnostic</h1>
        <Button onClick={() => setShowDiagnostic(false)}>
          Show Full App
        </Button>
      </div>
      <p className="mb-4">If you can see this text, basic app rendering is working.</p>
      
      <div className="mb-4 p-4 border border-primary rounded">
        <h2 className="text-xl font-bold mb-2">Test Component (Isolated)</h2>
        <TestComponent />
      </div>
      
      <div className="mb-4">
        <Button 
          variant="destructive"
          onClick={() => {
            localStorage.removeItem('cognicore-custom-themes');
            localStorage.removeItem('cognicore-active-theme');
            localStorage.removeItem('lmStudio-config');
            window.location.reload();
          }}
          className="mr-2"
        >
          Reset Theme & LM Studio Settings
        </Button>
        
        <Button 
          variant="secondary"
          onClick={() => window.location.reload()}
        >
          Reload Page
        </Button>
      </div>
    </div>
  );
  
  const renderFullApp = () => (
    <TooltipProvider>
      <FoldersProvider>
        <div className="relative h-screen">
          {showDiagnostic && (
            <div className="absolute top-2 right-2 z-50">
              <Button size="sm" onClick={() => setShowDiagnostic(true)}>
                Show Diagnostic
              </Button>
            </div>
          )}
          <Toaster />
          <Sonner position="top-right" />
          <OfflineBanner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </div>
      </FoldersProvider>
    </TooltipProvider>
  );
  
  return (
    <QueryClientProvider client={queryClient}>
      {showDiagnostic ? renderDiagnosticView() : renderFullApp()}
    </QueryClientProvider>
  );
};

export default App;
