/**
 * Utility functions for migrating data between storage methods
 */
import databaseService, { STORE_NAMES } from './databaseService';
import { toast } from 'sonner';

/**
 * Migrates data from localStorage to IndexedDB
 * @returns Promise that resolves to true if migration was successful
 */
export async function migrateFromLocalStorage(): Promise<boolean> {
  try {
    let migrationPerformed = false;
    
    // Check if migration has already been performed
    const migrationStatus = localStorage.getItem('cognicore-migration-completed');
    if (migrationStatus === 'true') {
      // Migration has already been completed
      return false;
    }
    
    // Migrate notes
    const notesJson = localStorage.getItem('cognicore-notes');
    if (notesJson) {
      try {
        const notes = JSON.parse(notesJson);
        
        // Verify if notes already exist in IndexedDB
        const existingNotesCount = await databaseService.count(STORE_NAMES.NOTES);
        
        if (existingNotesCount === 0 && notes.length > 0) {
          console.log(`Migrating ${notes.length} notes from localStorage to IndexedDB`);
          
          for (const note of notes) {
            // Ensure dates are properly converted to Date objects
            const formattedNote = {
              ...note,
              createdAt: new Date(note.createdAt || Date.now()),
              updatedAt: new Date(note.updatedAt || Date.now())
            };
            
            await databaseService.add(STORE_NAMES.NOTES, formattedNote);
          }
          
          migrationPerformed = true;
          console.log('Notes migration completed');
        }
      } catch (error) {
        console.error('Error migrating notes:', error);
        toast.error('Error migrating notes from localStorage');
      }
    }
    
    // Migrate folders
    const foldersJson = localStorage.getItem('folders');
    if (foldersJson) {
      try {
        const folders = JSON.parse(foldersJson);
        
        // Verify if folders already exist in IndexedDB
        const existingFoldersCount = await databaseService.count(STORE_NAMES.FOLDERS);
        
        if (existingFoldersCount === 0 && folders.length > 0) {
          console.log(`Migrating ${folders.length} folders from localStorage to IndexedDB`);
          
          // First, migrate root folders
          for (const folder of folders) {
            if (!folder.parentId) {
              // Process root folders first
              await migrateFolder(folder);
            }
          }
          
          // Since we're manually processing the hierarchy, we need to mark this as migrated
          migrationPerformed = true;
          console.log('Folders migration completed');
        }
      } catch (error) {
        console.error('Error migrating folders:', error);
        toast.error('Error migrating folders from localStorage');
      }
    }
    
    // Migrate LM Studio config
    const lmStudioConfig = localStorage.getItem('lmStudio-config');
    if (lmStudioConfig) {
      try {
        const config = JSON.parse(lmStudioConfig);
        
        // Check if config already exists in IndexedDB
        const existingConfig = await databaseService.get(STORE_NAMES.SETTINGS, 'lmStudio');
        
        if (!existingConfig && Object.keys(config).length > 0) {
          console.log('Migrating LM Studio config from localStorage to IndexedDB');
          
          await databaseService.add(STORE_NAMES.SETTINGS, {
            id: 'lmStudio',
            value: config,
            createdAt: new Date(),
            updatedAt: new Date()
          });
          
          migrationPerformed = true;
          console.log('LM Studio config migration completed');
        }
      } catch (error) {
        console.error('Error migrating LM Studio config:', error);
        toast.error('Error migrating LM Studio config from localStorage');
      }
    }
    
    // If any migration was performed, mark as completed
    if (migrationPerformed) {
      localStorage.setItem('cognicore-migration-completed', 'true');
      toast.success('Data successfully migrated to IndexedDB');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error during migration:', error);
    toast.error('Data migration failed');
    return false;
  }
}

/**
 * Helper function to recursively migrate folders
 */
async function migrateFolder(folder: any): Promise<void> {
  // Format the folder with proper dates
  const formattedFolder = {
    ...folder,
    createdAt: new Date(folder.createdAt || Date.now()),
    updatedAt: new Date(folder.updatedAt || Date.now())
  };
  
  // Remove children array as it's not part of the database schema
  const { children, ...folderToSave } = formattedFolder;
  
  // Add to database
  await databaseService.add(STORE_NAMES.FOLDERS, folderToSave);
  
  // Process children recursively
  if (children && Array.isArray(children) && children.length > 0) {
    for (const child of children) {
      await migrateFolder(child);
    }
  }
}

/**
 * Checks if data exists in IndexedDB and populates with initial data if empty
 */
export async function ensureInitialData(): Promise<void> {
  try {
    // Check if folders exist
    const foldersCount = await databaseService.count(STORE_NAMES.FOLDERS);
    
    if (foldersCount === 0) {
      // Create default folders
      const rootFolder = {
        id: 'folder-root',
        name: 'My Notes',
        parentId: null,
        expanded: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await databaseService.add(STORE_NAMES.FOLDERS, rootFolder);
      
      // Add Work subfolder
      await databaseService.add(STORE_NAMES.FOLDERS, {
        id: 'work',
        name: 'Work',
        parentId: 'folder-root',
        expanded: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      // Add Personal subfolder
      await databaseService.add(STORE_NAMES.FOLDERS, {
        id: 'personal',
        name: 'Personal',
        parentId: 'folder-root',
        expanded: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      console.log('Created default folders');
    }
    
    // Check if notes exist
    const notesCount = await databaseService.count(STORE_NAMES.NOTES);
    
    if (notesCount === 0) {
      // Create welcome note
      await databaseService.add(STORE_NAMES.NOTES, {
        id: 'note-welcome',
        title: 'Welcome to CogniCore',
        content: '# Welcome to CogniCore\n\nThis is your first note. You can edit it or create new ones.',
        folderId: 'folder-root',
        createdAt: new Date(),
        updatedAt: new Date(),
        tags: ['welcome', 'getting-started']
      });
      
      // Create getting started note
      await databaseService.add(STORE_NAMES.NOTES, {
        id: 'note-getting-started',
        title: 'Getting Started',
        content: '# Getting Started\n\n1. Create folders to organize your notes\n2. Connect to LM Studio for AI-powered features\n3. Add files to monitor for automatic indexing\n4. Use the graph view to see connections between your notes',
        folderId: 'folder-root',
        createdAt: new Date(),
        updatedAt: new Date(),
        tags: ['tutorial', 'getting-started']
      });
      
      console.log('Created sample notes');
    }
  } catch (error) {
    console.error('Error ensuring initial data:', error);
  }
}