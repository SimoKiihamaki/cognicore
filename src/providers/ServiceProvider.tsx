/**
 * Service Provider Component
 * 
 * Provides access to the Service Locator through React Context
 * Handles initialization of all services when the application starts
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import serviceLocator from '@/services/ServiceLocator';
import { DatabaseProvider } from '@/components/database/DatabaseProvider';

interface ServiceContextType {
  isInitialized: boolean;
  isInitializing: boolean;
  error: Error | null;
  getService: <T>(name: string) => T;
  hasService: (name: string) => boolean;
}

const ServiceContext = createContext<ServiceContextType>({
  isInitialized: false,
  isInitializing: true,
  error: null,
  getService: <T,>(name: string) => { throw new Error('Service Provider not initialized'); },
  hasService: (name: string) => false
});

export const useService = () => useContext(ServiceContext);

// Helper hook to get a specific service by name
export function useServiceInstance<T>(name: string): T {
  const { getService } = useContext(ServiceContext);
  return getService<T>(name);
}

interface ServiceProviderProps {
  children: React.ReactNode;
}

// Import FoldersProvider
import { FoldersProvider } from '@/hooks/useFolders';

export const ServiceProvider: React.FC<ServiceProviderProps> = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState<boolean>(serviceLocator.isInitialized());
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  // Initialize services on mount
  useEffect(() => {
    const initializeServices = async () => {
      try {
        setIsInitializing(true);
        const result = await serviceLocator.initialize();
        setIsInitialized(result);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        setIsInitialized(false);
      } finally {
        setIsInitializing(false);
      }
    };

    initializeServices();
  }, []);

  // Wrapper around serviceLocator.getService with proper error handling
  const getService = <T,>(name: string): T => {
    try {
      return serviceLocator.getService<T>(name as any);
    } catch (error) {
      console.error(`Error getting service '${name}':`, error);
      throw error;
    }
  };

  // Wrapper around serviceLocator.hasService
  const hasService = (name: string): boolean => {
    return serviceLocator.hasService(name as any);
  };

  // Loading state
  if (isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="p-4 bg-muted rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-2">Initializing Application...</h3>
          <p className="text-sm text-muted-foreground">Please wait while we set things up.</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="p-4 bg-destructive/20 rounded-lg shadow-md max-w-md">
          <h3 className="text-lg font-semibold mb-2 text-destructive">Initialization Error</h3>
          <p className="text-sm mb-4">{error.message}</p>
          <button
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
            onClick={() => window.location.reload()}
          >
            Reload Application
          </button>
        </div>
      </div>
    );
  }

  // Provide services through context
  return (
    <ServiceContext.Provider
      value={{
        isInitialized,
        isInitializing,
        error,
        getService,
        hasService
      }}
    >
      <DatabaseProvider>
        <FoldersProvider>
          {children}
        </FoldersProvider>
      </DatabaseProvider>
    </ServiceContext.Provider>
  );
};
