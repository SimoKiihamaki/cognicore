import React, { useEffect, useState, Suspense } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { MigrationPrompt } from "@/components/database/MigrationPrompt";
import { HelmetProvider } from "react-helmet-async";
import { ServiceProvider } from "@/providers/ServiceProvider";
import NotificationsProvider from "@/providers/NotificationsProvider";
import NotFound from "./routes/not-found";
import ChatRoute from "./routes/chat";
import MainLayout from "./components/layout/MainLayout";
import GraphRoute from "./routes/graph";
import EditorRoute from "./routes/editor";
import SettingsRoute from "./routes/settings";
import PerformanceRoute from "./routes/performance";
import AccessibilityRoute from "./routes/accessibility";
const VisionChatRoute = React.lazy(() => import('./routes/vision-chat'));
import cacheService from '@/services/cacheService';
import { initializeEmbeddingService, terminateEmbeddingService } from '@/utils/embeddings';
import { validateAppCache } from '@/utils/cacheValidation';
import TestComponent from '@/components/TestComponent';
import DevModeIndicator from '@/components/DevModeIndicator';
import OfflineBanner from '@/components/OfflineBanner';
import { Button } from '@/components/ui/button';
import workerPoolService from '@/services/workerPool/WorkerPoolService';
import resourceMonitor from '@/utils/resource/ResourceMonitor';
import { KeyboardShortcutsProvider } from "@/providers/accessibility/KeyboardShortcutsProvider";
import databaseService from '@/services/database/databaseService';
import { migrateFromLocalStorage, ensureInitialData } from '@/services/database/migrationUtils';

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
  const [isMigrationComplete, setIsMigrationComplete] = useState(false);
  
  // Initialize caching, embedding services, worker pool, and resource monitoring
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Immediately set migration as complete if already done
        if (localStorage.getItem('cognicore-migration-completed') === 'true') {
          setIsMigrationComplete(true);
        }
        
        // Validate app cache to ensure consistent state
        try {
          await validateAppCache();
        } catch (err) {
          console.error('Cache validation failed:', err);
        }
        
        // Get cache size from localStorage or use default
        const cacheSize = parseInt(localStorage.getItem('cognicore-max-cache-size') || '50');
        
        // Initialize cache service
        try {
          await cacheService.initialize(cacheSize);
        } catch (cacheError) {
          console.error('Cache service initialization failed:', cacheError);
        }
        
        // Initialize worker pool service
        try {
          await workerPoolService.initialize({
            embeddingWorkerPath: '/embedding-worker.js'
          });
        } catch (workerError) {
          console.error('Worker pool initialization failed:', workerError);
        }
        
        // Initialize resource monitor
        try {
          resourceMonitor.startResourceMonitoring();
        } catch (monitorError) {
          console.error('Resource monitor initialization failed:', monitorError);
        }
        
        // Initialize database with retries
        let dbInitialized = false;
        for (let i = 0; i < 3; i++) {
          try {
            await databaseService.initialize();
            console.log('Database initialized successfully');
            dbInitialized = true;
            break;
          } catch (error) {
            console.error(`Database initialization attempt ${i + 1} failed:`, error);
            if (i < 2) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
        }
        
        // Perform database health check with error handling
        try {
          if (dbInitialized) {
            const healthCheckModule = await import('@/services/database/healthCheck');
            if (typeof healthCheckModule.checkAndFixDatabaseHealth === 'function') {
              const healthResult = await healthCheckModule.checkAndFixDatabaseHealth();
              
              if (healthResult.status !== 'healthy') {
                console.warn('Database health check issues:', healthResult);
              }
            } else {
              console.warn('Health check function not found, skipping database health check');
            }
          }
        } catch (healthCheckError) {
          console.error('Error during health check:', healthCheckError);
        }
        
        // Ensure we have initial data
        try {
          if (dbInitialized) {
            await ensureInitialData();
          }
        } catch (dataError) {
          console.error('Error ensuring initial data:', dataError);
        }
        
        // Initialize embedding service
        try {
          await initializeEmbeddingService();
        } catch (embeddingError) {
          console.error('Error initializing embedding service:', embeddingError);
        }
        
        // Sync data back to localStorage for compatibility
        try {
          if (dbInitialized) {
            const { syncFromIndexedDBToLocalStorage } = await import('@/services/migration/storageCompatibility');
            await syncFromIndexedDBToLocalStorage();
          }
        } catch (syncError) {
          console.error('Error syncing data to localStorage:', syncError);
        }
        
        console.log('Services initialization completed');
      } catch (error) {
        console.error('Failed to initialize services:', error);
      } finally {
        // Always set migration complete to allow app to start
        if (!isMigrationComplete) {
          setIsMigrationComplete(true);
        }
      }
    };

    initializeApp();
    
    // Clean up on unmount
    return () => {
      try {
        // Dispose cache service
        cacheService.dispose();
        
        // Terminate worker pool
        workerPoolService.terminate();
        
        // Stop resource monitoring
        resourceMonitor.stopResourceMonitoring();
        
        // Terminate embedding worker
        terminateEmbeddingService();
      } catch (cleanupError) {
        console.error('Error during cleanup:', cleanupError);
      }
    };
  }, [isMigrationComplete]);
  
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
    <HelmetProvider>
      <TooltipProvider>
        <ServiceProvider>
          <NotificationsProvider>
            <BrowserRouter>
              <KeyboardShortcutsProvider>
              <div className="relative h-screen">
                <DevModeIndicator />
                {!showDiagnostic && (
                  <div className="fixed bottom-2 right-2 z-50">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setShowDiagnostic(true)}
                    >
                      Diagnostic
                    </Button>
                  </div>
                )}
                <Toaster />
                <Sonner position="top-right" />
                <OfflineBanner />
                <Routes>
                  <Route path="/" element={<Navigate to="/editor" replace />} />
                  <Route element={<MainLayout />}>
                    <Route path="/chat" element={<ChatRoute />} />
                    <Route path="/vision-chat" element={
                      <Suspense fallback={<div className="flex items-center justify-center h-full">Loading Vision Chat...</div>}>
                        <VisionChatRoute />
                      </Suspense>
                    } />
                    <Route path="/graph" element={<GraphRoute />} />
                    <Route path="/editor" element={<EditorRoute />} />
                    <Route path="/editor/:noteId" element={<EditorRoute />} />
                    <Route path="/settings" element={<SettingsRoute />} />
                    <Route path="/performance" element={<PerformanceRoute />} />
                    <Route path="/accessibility" element={<AccessibilityRoute />} />
                  </Route>
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </div>
              </KeyboardShortcutsProvider>
            </BrowserRouter>
          </NotificationsProvider>
        </ServiceProvider>
      </TooltipProvider>
    </HelmetProvider>
  );
  
  // Handle migration completion
  const handleMigrationComplete = () => {
    setIsMigrationComplete(true);
  };

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        {/* Show MigrationPrompt if needed */}
        {!isMigrationComplete && (
          <MigrationPrompt onMigrationComplete={handleMigrationComplete} />
        )}
        
        {/* Render app content only when migration is done */}
        {isMigrationComplete && (
          showDiagnostic ? renderDiagnosticView() : renderFullApp()
        )}
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
