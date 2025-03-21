/**
 * Provider component for database initialization and data migration
 */

import React, { useState, useEffect, createContext, useContext } from 'react';
import databaseService from '@/services/database/databaseService';
import { MigrationPrompt } from './MigrationPrompt';

interface DatabaseContextType {
  isInitialized: boolean;
  isInitializing: boolean;
  error: Error | null;
}

const DatabaseContext = createContext<DatabaseContextType>({
  isInitialized: false,
  isInitializing: true,
  error: null
});

export const useDatabaseContext = () => useContext(DatabaseContext);

interface DatabaseProviderProps {
  children: React.ReactNode;
}

export const DatabaseProvider: React.FC<DatabaseProviderProps> = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [showMigration, setShowMigration] = useState(true);

  useEffect(() => {
    // This effect runs only once on mount
    const initializeDatabase = async () => {
      try {
        setIsInitializing(true);
        await databaseService.initialize();
        setIsInitialized(true);
        setError(null);
      } catch (err) {
        console.error('Failed to initialize database:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
        setIsInitialized(false);
      } finally {
        setIsInitializing(false);
      }
    };

    initializeDatabase();
  }, []);

  const handleMigrationComplete = () => {
    setShowMigration(false);
  };

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="p-4 bg-muted rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-2">Initializing Database...</h3>
          <p className="text-sm text-muted-foreground">Please wait while we set up the data storage.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="p-4 bg-destructive/20 rounded-lg shadow-md max-w-md">
          <h3 className="text-lg font-semibold mb-2 text-destructive">Database Error</h3>
          <p className="text-sm mb-4">{error.message}</p>
          <p className="text-sm mb-4">
            This might happen if your browser doesn't support IndexedDB or if there was an error accessing it.
          </p>
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

  return (
    <DatabaseContext.Provider value={{ isInitialized, isInitializing, error }}>
      {showMigration && isInitialized ? (
        <MigrationPrompt onMigrationComplete={handleMigrationComplete} />
      ) : null}
      {!showMigration && isInitialized ? children : null}
    </DatabaseContext.Provider>
  );
};
