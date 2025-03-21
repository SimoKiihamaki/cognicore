/**
 * Database Health Check Module
 * 
 * Provides utilities for checking and fixing database health issues
 */

import databaseService, { STORE_NAMES } from './databaseService';

interface HealthCheckResult {
  status: 'healthy' | 'fixed' | 'issues';
  issues: string[];
  fixes: string[];
}

/**
 * Run a comprehensive database health check and attempt to fix issues
 */
export async function checkAndFixDatabaseHealth(): Promise<HealthCheckResult> {
  const result: HealthCheckResult = {
    status: 'healthy',
    issues: [],
    fixes: []
  };
  
  try {
    // Ensure database is initialized with proper error handling
    try {
      await databaseService.initialize();
    } catch (initError) {
      console.error('Database initialization failed during health check:', initError);
      result.status = 'issues';
      result.issues.push('Database initialization failed');
      return result;
    }
    
    // Simple approach to check database health
    let hasIssues = false;
    
    // Check each store exists and has basic operations
    const storeNames = Object.values(STORE_NAMES);
    for (const storeName of storeNames) {
      try {
        // Try to get all items from the store
        await databaseService.getAll(storeName);
      } catch (error) {
        hasIssues = true;
        result.issues.push(`Error accessing store '${storeName}': ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    if (hasIssues) {
      result.status = 'issues';
    }
    
    // 2. If issues found, attempt repairs
    if (hasIssues) {
      console.log('Database issues found, attempting repairs...');
      
      // Chat history repair
      try {
        // Attempt to repair chat histories if they exist
        try {
          const count = await databaseService.count(STORE_NAMES.CHAT_HISTORIES);
          if (count > 0) {
            console.log('Repairing chat histories...');
            
            // Implement simplified repair - re-save all chat histories with fixed structures
            const histories = await databaseService.getAll(STORE_NAMES.CHAT_HISTORIES);
            let repairCount = 0;
            
            for (const history of histories) {
              let needsRepair = false;
              
              // Fix common issues
              if (!history.id) {
                history.id = crypto.randomUUID();
                needsRepair = true;
              }
              
              if (!history.title) {
                history.title = 'Chat ' + new Date().toLocaleString();
                needsRepair = true;
              }
              
              if (!history.createdAt) {
                history.createdAt = new Date().toISOString();
                needsRepair = true;
              }
              
              if (!history.updatedAt) {
                history.updatedAt = new Date().toISOString();
                needsRepair = true;
              }
              
              if (!Array.isArray(history.messages)) {
                history.messages = [];
                needsRepair = true;
              }
              
              if (needsRepair) {
                await databaseService.put(STORE_NAMES.CHAT_HISTORIES, history);
                repairCount++;
              }
            }
            
            if (repairCount > 0) {
              result.fixes.push(`Fixed ${repairCount} chat histories`);
            }
          }
        } catch (historyError) {
          console.error('Error accessing chat histories:', historyError);
        }
      } catch (repairError) {
        console.error('Error during repairs:', repairError);
        result.issues.push('Error during repairs');
      }
      
      // Re-check database after repairs
      let stillHasIssues = false;
      
      for (const storeName of storeNames) {
        try {
          await databaseService.getAll(storeName);
        } catch (error) {
          stillHasIssues = true;
          break;
        }
      }
      
      // Update status based on repair results
      result.status = stillHasIssues ? 'issues' : 'fixed';
      
      if (result.status === 'fixed') {
        console.log('Successfully fixed database issues');
      } else {
        console.warn('Some database issues remain after repair attempts');
      }
    } else {
      console.log('Database health check passed - no issues found');
    }
    
    return result;
  } catch (error) {
    console.error('Error during database health check:', error);
    
    result.status = 'issues';
    result.issues.push(
      error instanceof Error 
        ? `Database health check error: ${error.message}` 
        : 'Unknown error during database health check'
    );
    
    return result;
  }
}

/**
 * Run a full database recovery - to be used only as a last resort
 * This will:
 * 1. Export all data from IndexedDB to localStorage
 * 2. Clear the IndexedDB database
 * 3. Recreate the database schema
 * 4. Import the data back from localStorage
 */
export async function performFullDatabaseRecovery(): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    console.log('Starting full database recovery...');
    
    // 1. Export all data to localStorage
    try {
      // Get all data from stores
      const notes = await databaseService.getAll(STORE_NAMES.NOTES);
      const folders = await databaseService.getAll(STORE_NAMES.FOLDERS);
      const files = await databaseService.getAll(STORE_NAMES.FILES);
      const chatHistories = await databaseService.getAll(STORE_NAMES.CHAT_HISTORIES);
      const chatMessages = await databaseService.getAll(STORE_NAMES.CHAT_MESSAGES);
      
      // Save to localStorage
      localStorage.setItem('cognicore-notes', JSON.stringify(notes));
      localStorage.setItem('cognicore-folders', JSON.stringify(folders));
      localStorage.setItem('cognicore-indexed-files', JSON.stringify(files));
      localStorage.setItem('cognicore-chat-histories', JSON.stringify(chatHistories));
      localStorage.setItem('cognicore-chat-messages', JSON.stringify(chatMessages));
      
      console.log('Data exported to localStorage');
    } catch (exportError) {
      console.error('Error exporting data to localStorage:', exportError);
    }
    
    // 2. Close and reinitialize the database
    try {
      databaseService.close();
      await databaseService.initialize();
      console.log('Database reinitialized');
    } catch (initError) {
      console.error('Error reinitializing database:', initError);
      return {
        success: false,
        message: 'Failed to reinitialize database'
      };
    }
    
    // 3. Import the data back from localStorage
    const notesJson = localStorage.getItem('cognicore-notes');
    const foldersJson = localStorage.getItem('cognicore-folders');
    const filesJson = localStorage.getItem('cognicore-indexed-files');
    const historiesJson = localStorage.getItem('cognicore-chat-histories');
    
    let importCount = 0;
    
    // Import notes
    if (notesJson) {
      try {
        const notes = JSON.parse(notesJson);
        for (const note of notes) {
          await databaseService.put(STORE_NAMES.NOTES, note);
          importCount++;
        }
        console.log(`Imported ${notes.length} notes`);
      } catch (noteError) {
        console.error('Error importing notes:', noteError);
      }
    }
    
    // Import folders
    if (foldersJson) {
      try {
        const folders = JSON.parse(foldersJson);
        for (const folder of folders) {
          await databaseService.put(STORE_NAMES.FOLDERS, folder);
          importCount++;
        }
        console.log(`Imported ${folders.length} folders`);
      } catch (folderError) {
        console.error('Error importing folders:', folderError);
      }
    }
    
    // Import files
    if (filesJson) {
      try {
        const files = JSON.parse(filesJson);
        for (const file of files) {
          await databaseService.put(STORE_NAMES.FILES, file);
          importCount++;
        }
        console.log(`Imported ${files.length} files`);
      } catch (fileError) {
        console.error('Error importing files:', fileError);
      }
    }
    
    // Import chat histories
    if (historiesJson) {
      try {
        const histories = JSON.parse(historiesJson);
        for (const history of histories) {
          await databaseService.put(STORE_NAMES.CHAT_HISTORIES, history);
          importCount++;
        }
        console.log(`Imported ${histories.length} chat histories`);
      } catch (historyError) {
        console.error('Error importing chat histories:', historyError);
      }
    }
    
    if (importCount === 0) {
      console.warn('No data was imported during recovery');
      return {
        success: false,
        message: 'Recovery completed but no data was imported. Your database may be empty.'
      };
    }
    
    // 4. Run final health check
    const healthCheck = await checkAndFixDatabaseHealth();
    
    if (healthCheck.status === 'healthy' || healthCheck.status === 'fixed') {
      return {
        success: true,
        message: `Recovery successful. Imported ${importCount} items.`
      };
    } else {
      return {
        success: false,
        message: `Recovery completed with issues: ${healthCheck.issues.join(', ')}`
      };
    }
  } catch (error) {
    console.error('Error during full database recovery:', error);
    return {
      success: false,
      message: error instanceof Error 
        ? `Recovery failed: ${error.message}` 
        : 'Recovery failed with an unknown error'
    };
  }
}