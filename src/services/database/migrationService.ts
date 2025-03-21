/**
 * Enhanced Migration service for CogniCore
 * Provides utilities for migrating data from localStorage to IndexedDB
 * with improved error handling, verification, and progress reporting
 */

import databaseService, { STORE_NAMES } from './databaseService';
import { Note, Folder, ChatHistory, IndexedFile } from '@/lib/types';
import { ensureInitialData } from './migrationUtils';
import { migrateAllFromLocalStorage, syncFromIndexedDBToLocalStorage } from '@/services/migration/storageCompatibility';

interface MigrationProgress {
  totalItems: number;
  processedItems: number;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  error?: string;
  details?: {
    notes?: number;
    folders?: number;
    files?: number;
    chatHistories?: number;
    settings?: number;
  };
}

class MigrationService {
  private readonly MIGRATION_COMPLETED_KEY = 'cognicore-migration-completed';
  private readonly MIGRATION_VERSION_KEY = 'cognicore-migration-version';
  private readonly CURRENT_MIGRATION_VERSION = '1.1.0'; // Increment when migration logic changes

  /**
   * Check if migration is needed by looking for data in localStorage
   */
  public async isMigrationNeeded(): Promise<boolean> {
    try {
      // Check if migration has already been completed for the current version
      const completedVersion = localStorage.getItem(this.MIGRATION_VERSION_KEY);
      if (completedVersion === this.CURRENT_MIGRATION_VERSION) {
        console.log(`Migration already completed for version ${this.CURRENT_MIGRATION_VERSION}`);
        return false;
      }
      
      // Check if we have any data in localStorage that needs migration
      const localStorageKeys = [
        'cognicore-notes',
        'cognicore-folders',
        'cognicore-indexed-files',
        'cognicore-chat-histories',
        'cognicore-chat-messages',
        'cognicore-settings',
        'lmStudio-config',
        'folders'
      ];
      
      const hasLocalStorageData = localStorageKeys.some(key => {
        const data = localStorage.getItem(key);
        return data !== null && data !== '[]' && data !== '{}';
      });
      
      if (!hasLocalStorageData) {
        console.log('No localStorage data found to migrate');
        return false;
      }
      
      // Check if IndexedDB is already populated
      try {
        await databaseService.initialize();
        
        const notesCount = await databaseService.count(STORE_NAMES.NOTES);
        const foldersCount = await databaseService.count(STORE_NAMES.FOLDERS);
        const chatHistoriesCount = await databaseService.count(STORE_NAMES.CHAT_HISTORIES);
        
        const hasIndexedDBData = notesCount > 0 || foldersCount > 0 || chatHistoriesCount > 0;
        
        if (hasIndexedDBData) {
          console.log('IndexedDB already contains data, checking if migration is still needed');
          
          // If we have data in both, check if migration version has changed
          // or if localStorage has more data than IndexedDB
          const notesInLS = this.countItemsInLocalStorage('cognicore-notes');
          const foldersInLS = this.countItemsInLocalStorage('cognicore-folders') || 
                             this.countItemsInLocalStorage('folders');
          
          if (
            notesInLS > notesCount ||
            foldersInLS > foldersCount ||
            completedVersion !== this.CURRENT_MIGRATION_VERSION
          ) {
            console.log('Migration still needed - localStorage has more data or migration version changed');
            return true;
          }
          
          console.log('No migration needed - IndexedDB is already populated');
          return false;
        }
        
        // If we have localStorage data but no IndexedDB data, we need to migrate
        console.log('Migration needed - localStorage data exists but IndexedDB is empty');
        return true;
      } catch (error) {
        console.error('Error checking IndexedDB status:', error);
        
        // If we can't access IndexedDB, but have localStorage data, assume migration is needed
        return hasLocalStorageData;
      }
    } catch (error) {
      console.error('Error in isMigrationNeeded:', error);
      return false;
    }
  }

  /**
   * Count the number of items in a localStorage key
   */
  private countItemsInLocalStorage(key: string): number {
    const json = localStorage.getItem(key);
    if (!json) return 0;
    
    try {
      const data = JSON.parse(json);
      return Array.isArray(data) ? data.length : (Object.keys(data).length > 0 ? 1 : 0);
    } catch {
      return 0;
    }
  }

  /**
   * Migrate all data from localStorage to IndexedDB
   * @param progressCallback Optional callback to report migration progress
   */
  public async migrateAllData(
    progressCallback?: (progress: MigrationProgress) => void
  ): Promise<boolean> {
    // Initialize progress
    const progress: MigrationProgress = {
      totalItems: 0,
      processedItems: 0,
      status: 'pending',
      details: {
        notes: 0,
        folders: 0,
        files: 0,
        chatHistories: 0,
        settings: 0
      }
    };
    
    try {
      // Enable debug mode in database service during migration
      databaseService.setDebugMode(true);
      
      // Count total items for progress tracking
      const localStorageItems = {
        notes: this.countItemsInLocalStorage('cognicore-notes'),
        folders: this.countItemsInLocalStorage('cognicore-folders') + this.countItemsInLocalStorage('folders'),
        files: this.countItemsInLocalStorage('cognicore-indexed-files'),
        chatHistories: this.countItemsInLocalStorage('cognicore-chat-histories'),
        settings: localStorage.getItem('cognicore-settings') ? 1 : 0,
        lmStudioConfig: localStorage.getItem('lmStudio-config') ? 1 : 0
      };
      
      progress.totalItems = Object.values(localStorageItems).reduce((a, b) => a + b, 0);
      progress.details = {
        notes: localStorageItems.notes,
        folders: localStorageItems.folders,
        files: localStorageItems.files,
        chatHistories: localStorageItems.chatHistories,
        settings: localStorageItems.settings + localStorageItems.lmStudioConfig
      };
      
      if (progress.totalItems === 0) {
        console.log('No data to migrate');
        
        // Mark migration as completed
        localStorage.setItem(this.MIGRATION_COMPLETED_KEY, 'true');
        localStorage.setItem(this.MIGRATION_VERSION_KEY, this.CURRENT_MIGRATION_VERSION);
        
        progress.status = 'completed';
        if (progressCallback) progressCallback({ ...progress });
        
        // Ensure initial data exists
        await ensureInitialData();
        
        return true;
      }
      
      // Start migration
      progress.status = 'in-progress';
      if (progressCallback) progressCallback({ ...progress });
      
      // Make sure DB is initialized with proper error handling
      try {
        await databaseService.initialize();
      } catch (initError) {
        console.warn('First database initialization attempt failed during migration, retrying:', initError);
        // Wait a bit and try again
        await new Promise(resolve => setTimeout(resolve, 500));
        await databaseService.initialize();
      }
      
      // Perform the migration using both methods for redundancy
      // First try with the comprehensive migration utility
      const migrationResults = await migrateAllFromLocalStorage();
      
      // Also try with the original migration method for any items that might have been missed
      await databaseService.migrateFromLocalStorage();
      
      // Update progress
      progress.processedItems = migrationResults.notesCount +
                               migrationResults.foldersCount +
                               migrationResults.filesCount +
                               migrationResults.historiesCount;
      
      if (progress.details) {
        progress.details.notes = migrationResults.notesCount;
        progress.details.folders = migrationResults.foldersCount;
        progress.details.files = migrationResults.filesCount;
        progress.details.chatHistories = migrationResults.historiesCount;
      }
      
      // Sync data back to localStorage for components that still use it
      await syncFromIndexedDBToLocalStorage();
      
      // Ensure initial data exists if migration didn't add any data
      if (progress.processedItems === 0) {
        await ensureInitialData();
      }
      
      // Repair any malformed data in the database
      await databaseService.runDiagnostics();
      await databaseService.repairChatHistories();
      
      // Mark migration as completed
      localStorage.setItem(this.MIGRATION_COMPLETED_KEY, 'true');
      localStorage.setItem(this.MIGRATION_VERSION_KEY, this.CURRENT_MIGRATION_VERSION);
      
      progress.status = 'completed';
      if (progressCallback) progressCallback({ ...progress });
      
      console.log('Migration completed successfully');
      
      // Disable debug mode
      databaseService.setDebugMode(false);
      
      return true;
    } catch (error) {
      console.error('Migration failed:', error);
      
      progress.status = 'failed';
      progress.error = error instanceof Error ? error.message : String(error);
      
      if (progressCallback) progressCallback({ ...progress });
      
      // Disable debug mode
      databaseService.setDebugMode(false);
      
      return false;
    }
  }

  /**
   * Clean up localStorage after successful migration
   * Only removes keys that are definitely migrated to IndexedDB
   */
  public cleanupAfterMigration(): void {
    // Get counts from IndexedDB to verify migration before cleanup
    const verifyAndCleanup = async () => {
      try {
        const notesCount = await databaseService.count(STORE_NAMES.NOTES);
        const notesInLS = this.countItemsInLocalStorage('cognicore-notes');
        
        // Only clean up if we have at least as many items in IndexedDB as in localStorage
        if (notesCount >= notesInLS && notesCount > 0) {
          // List of keys that are safe to remove
          const keysToClean = [
            'cognicore-notes',
            'cognicore-folders',
            'cognicore-indexed-files',
            'cognicore-chat-histories',
            'cognicore-chat-messages'
          ];
          
          // Don't remove settings or lmStudio config yet
          // as we want to ensure those are properly preserved
          
          for (const key of keysToClean) {
            localStorage.removeItem(key);
          }
          
          console.log('Cleaned up localStorage after migration verification');
        } else {
          console.warn('Not cleaning localStorage - migration verification failed');
        }
      } catch (error) {
        console.error('Error during migration cleanup verification:', error);
      }
    };
    
    // Run verification asynchronously
    verifyAndCleanup();
    
    // Always mark as completed regardless of verification
    localStorage.setItem(this.MIGRATION_COMPLETED_KEY, 'true');
    localStorage.setItem(this.MIGRATION_VERSION_KEY, this.CURRENT_MIGRATION_VERSION);
  }

  /**
   * Check if migration has been completed
   */
  public isMigrationCompleted(): boolean {
    const completed = localStorage.getItem(this.MIGRATION_COMPLETED_KEY) === 'true';
    const version = localStorage.getItem(this.MIGRATION_VERSION_KEY);
    
    return completed && version === this.CURRENT_MIGRATION_VERSION;
  }

  /**
   * Reset migration status for testing/debugging
   */
  public resetMigrationStatus(): void {
    localStorage.removeItem(this.MIGRATION_COMPLETED_KEY);
    localStorage.removeItem(this.MIGRATION_VERSION_KEY);
  }

  /**
   * Fully revert to localStorage (for emergency cases)
   * This should only be used if IndexedDB becomes corrupted
   */
  public async revertToLocalStorage(): Promise<boolean> {
    try {
      // First sync from IndexedDB to localStorage to ensure we don't lose data
      await syncFromIndexedDBToLocalStorage();
      
      // Clear IndexedDB
      await databaseService.clearAllData();
      
      // Reset migration status
      this.resetMigrationStatus();
      
      return true;
    } catch (error) {
      console.error('Error reverting to localStorage:', error);
      return false;
    }
  }
}

// Export a singleton instance
const migrationService = new MigrationService();
export default migrationService;