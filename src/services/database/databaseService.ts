/**
 * Database service for CogniCore
 * Provides a wrapper around IndexedDB operations with proper error handling and type safety
 */

import { Note, Folder, IndexedFile, ChatMessage, LMStudioConfig, Settings, ChatHistory, Embedding } from '@/lib/types';

// Define store names as constants to avoid typos
export const STORE_NAMES = {
  NOTES: 'notes',
  FOLDERS: 'folders',
  FILES: 'files',
  CHAT_MESSAGES: 'chat_messages',
  CHAT_HISTORIES: 'chat_histories',
  EMBEDDINGS: 'embeddings',
  SETTINGS: 'settings',
} as const;

// Define index names for each store
export const STORE_INDEXES = {
  [STORE_NAMES.NOTES]: {
    BY_FOLDER_ID: 'folderId',
    BY_UPDATED_AT: 'updatedAt',
    BY_CREATED_AT: 'createdAt',
    BY_TAGS: 'tags',
  },
  [STORE_NAMES.FOLDERS]: {
    BY_PARENT_ID: 'parentId',
  },
  [STORE_NAMES.FILES]: {
    BY_FILEPATH: 'filepath',
    BY_FILETYPE: 'filetype',
  },
  [STORE_NAMES.CHAT_MESSAGES]: {
    BY_TIMESTAMP: 'timestamp',
  },
  [STORE_NAMES.CHAT_HISTORIES]: {
    BY_UPDATED_AT: 'updatedAt',
    BY_CREATED_AT: 'createdAt',
    BY_IS_STARRED: 'isStarred',
    BY_TAGS: 'tags',
  },
} as const;

// Type for valid store names
export type StoreNames = typeof STORE_NAMES[keyof typeof STORE_NAMES];

// Type mapping store names to their respective model types
interface StoreModelMap {
  [STORE_NAMES.NOTES]: Note;
  [STORE_NAMES.FOLDERS]: Folder;
  [STORE_NAMES.FILES]: any;
  [STORE_NAMES.CHAT_MESSAGES]: ChatMessage;
  [STORE_NAMES.CHAT_HISTORIES]: ChatHistory;
  [STORE_NAMES.EMBEDDINGS]: Embedding;
  [STORE_NAMES.SETTINGS]: any;
}

class DatabaseService {
  private readonly DB_NAME = 'CogniCoreDB';
  private readonly DB_VERSION = 2; // Increased version to trigger schema update
  private db: IDBDatabase | null = null;
  private isInitializing = false;
  private initPromise: Promise<boolean> | null = null;
  private debugMode = false;

  /**
   * Enable or disable debug mode
   */
  public setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
    console.log(`Database debug mode ${enabled ? 'enabled' : 'disabled'}`);
  }
  
  /**
   * Get current debug mode state
   */
  public isDebugMode(): boolean {
    return this.debugMode;
  }

  /**
   * Initialize the database connection
   * Creates object stores and indexes if needed during version upgrade
   */
  public async initialize(): Promise<boolean> {
    // Return existing initialization promise if already in progress
    if (this.initPromise) {
      return this.initPromise;
    }
    
    if (this.db) {
      return Promise.resolve(true);
    }

    this.isInitializing = true;
    console.log('Initializing database...');
    
    this.initPromise = new Promise<boolean>((resolve, reject) => {
      try {
        // Open the database directly without attempting to delete it first
        this.openDatabase(resolve, reject);
      } catch (error) {
        console.error('Error during database initialization:', error);
        this.isInitializing = false;
        this.initPromise = null;
        reject(error);
      }
    });

    return this.initPromise;
  }

  private openDatabase(resolve: (value: boolean) => void, reject: (reason?: any) => void): void {
    const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
    
    request.onerror = (event) => {
      console.error('Database error:', event);
      this.isInitializing = false;
      this.initPromise = null;
      reject(new Error('Failed to open database'));
    };

    request.onsuccess = (event) => {
      this.db = (event.target as IDBOpenDBRequest).result;
      
      // Set up event handlers on the database
      this.db.onversionchange = () => {
        console.log('Database version changed in another tab');
        this.db?.close();
        this.db = null;
      };
      
      this.isInitializing = false;
      this.initPromise = null;
      resolve(true);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const oldVersion = event.oldVersion;
      
      try {
        this.createSchema(db, oldVersion, event);
      } catch (error) {
        console.error('Error during schema creation:', error);
        this.isInitializing = false;
        this.initPromise = null;
        reject(error);
      }
    };

    request.onblocked = () => {
      console.warn('Database blocked - waiting for other connections to close');
      setTimeout(() => {
        this.isInitializing = false;
        this.initPromise = null;
        this.initialize().then(resolve).catch(reject);
      }, 1000);
    };
  }

  /**
   * Creates the database schema (object stores and indexes)
   */
  private createSchema(db: IDBDatabase, oldVersion: number, event: IDBVersionChangeEvent): void {
    // Version 1 schema creation
    if (oldVersion < 1) {
      // Create notes store
      if (!db.objectStoreNames.contains(STORE_NAMES.NOTES)) {
        const notesStore = db.createObjectStore(STORE_NAMES.NOTES, { keyPath: 'id' });
        notesStore.createIndex(STORE_INDEXES[STORE_NAMES.NOTES].BY_FOLDER_ID, 'folderId', { unique: false });
        notesStore.createIndex(STORE_INDEXES[STORE_NAMES.NOTES].BY_UPDATED_AT, 'updatedAt', { unique: false });
        notesStore.createIndex(STORE_INDEXES[STORE_NAMES.NOTES].BY_CREATED_AT, 'createdAt', { unique: false });
        notesStore.createIndex(STORE_INDEXES[STORE_NAMES.NOTES].BY_TAGS, 'tags', { unique: false, multiEntry: true });
      }
      
      // Create folders store
      if (!db.objectStoreNames.contains(STORE_NAMES.FOLDERS)) {
        const foldersStore = db.createObjectStore(STORE_NAMES.FOLDERS, { keyPath: 'id' });
        foldersStore.createIndex(STORE_INDEXES[STORE_NAMES.FOLDERS].BY_PARENT_ID, 'parentId', { unique: false });
      }
      
      // Create files store
      if (!db.objectStoreNames.contains(STORE_NAMES.FILES)) {
        const filesStore = db.createObjectStore(STORE_NAMES.FILES, { keyPath: 'id' });
        filesStore.createIndex(STORE_INDEXES[STORE_NAMES.FILES].BY_FILEPATH, 'filepath', { unique: false });
        filesStore.createIndex(STORE_INDEXES[STORE_NAMES.FILES].BY_FILETYPE, 'filetype', { unique: false });
      }
      
      // Create chat messages store
      if (!db.objectStoreNames.contains(STORE_NAMES.CHAT_MESSAGES)) {
        const messagesStore = db.createObjectStore(STORE_NAMES.CHAT_MESSAGES, { keyPath: 'id' });
        messagesStore.createIndex(STORE_INDEXES[STORE_NAMES.CHAT_MESSAGES].BY_TIMESTAMP, 'timestamp', { unique: false });
      }
      
      // Create embeddings store
      if (!db.objectStoreNames.contains(STORE_NAMES.EMBEDDINGS)) {
        db.createObjectStore(STORE_NAMES.EMBEDDINGS, { keyPath: 'id' });
      }
      
      // Create chat histories store
      if (!db.objectStoreNames.contains(STORE_NAMES.CHAT_HISTORIES)) {
        const chatHistoriesStore = db.createObjectStore(STORE_NAMES.CHAT_HISTORIES, { keyPath: 'id' });
        chatHistoriesStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        chatHistoriesStore.createIndex('createdAt', 'createdAt', { unique: false });
        chatHistoriesStore.createIndex('isStarred', 'isStarred', { unique: false });
        chatHistoriesStore.createIndex('tags', 'tags', { unique: false, multiEntry: true });
      }
      
      // Create settings store (single record for app settings)
      if (!db.objectStoreNames.contains(STORE_NAMES.SETTINGS)) {
        db.createObjectStore(STORE_NAMES.SETTINGS, { keyPath: 'id' });
      }
    }
    
    // Version 2 schema updates
    if (oldVersion < 2) {
      console.log('Upgrading to schema version 2');
      
      // Handle upgrades within the version change transaction
      // The transaction is provided by the onupgradeneeded event
      if (db.objectStoreNames.contains(STORE_NAMES.CHAT_HISTORIES)) {
        // Correctly get the object store from the current version change transaction
        const transaction = event.target.transaction;
        const store = transaction.objectStore(STORE_NAMES.CHAT_HISTORIES);
          
        // Add missing indexes if they don't exist
        if (!store.indexNames.contains('updatedAt')) {
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
        }
        
        if (!store.indexNames.contains('createdAt')) {
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
        
        if (!store.indexNames.contains('isStarred')) {
          store.createIndex('isStarred', 'isStarred', { unique: false });
        }
        
        if (!store.indexNames.contains('tags')) {
          store.createIndex('tags', 'tags', { unique: false, multiEntry: true });
        }
      }
    }
  }

  /**
   * Ensures the database is initialized before performing operations
   */
  private async ensureDbInitialized(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.initialize();
    }
    
    if (!this.db) {
      throw new Error('Database failed to initialize');
    }
    
    return this.db;
  }

  /**
   * Creates a transaction for the specified store and mode
   */
  private createTransaction(
    storeName: StoreNames, 
    mode: IDBTransactionMode = 'readonly'
  ): { 
    store: IDBObjectStore; 
    transaction: IDBTransaction; 
  } {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    
    const transaction = this.db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    
    return { store, transaction };
  }

  /**
   * Generic method to add an item to a store
   */
  public async add<T extends StoreNames>(
    storeName: T, 
    item: StoreModelMap[T]
  ): Promise<string> {
    await this.ensureDbInitialized();
    
    if (this.debugMode) {
      console.log(`Adding item to ${storeName}:`, item);
    }
    
    return new Promise<string>((resolve, reject) => {
      try {
        const { store, transaction } = this.createTransaction(storeName, 'readwrite');
        const request = store.add(item);
        
        transaction.oncomplete = () => {
          if (this.debugMode) {
            console.log(`Successfully added item to ${storeName} with ID:`, (item as any).id);
          }
          resolve((item as any).id);
        };
        
        transaction.onerror = (event) => {
          console.error(`Failed to add item to ${storeName}:`, transaction.error);
          reject(new Error(`Failed to add item to ${storeName}: ${transaction.error?.message}`));
        };
      } catch (error) {
        console.error(`Error adding item to ${storeName}:`, error);
        reject(error);
      }
    });
  }
  
  /**
   * Generic method to put (add or update) an item in a store
   */
  public async put<T extends StoreNames>(
    storeName: T, 
    item: StoreModelMap[T]
  ): Promise<string> {
    await this.ensureDbInitialized();
    
    if (this.debugMode) {
      console.log(`Putting item in ${storeName}:`, item);
    }
    
    return new Promise<string>((resolve, reject) => {
      try {
        const { store, transaction } = this.createTransaction(storeName, 'readwrite');
        const request = store.put(item);
        
        transaction.oncomplete = () => {
          if (this.debugMode) {
            console.log(`Successfully put item in ${storeName} with ID:`, (item as any).id);
          }
          resolve((item as any).id);
        };
        
        transaction.onerror = (event) => {
          console.error(`Failed to put item in ${storeName}:`, transaction.error);
          reject(new Error(`Failed to put item in ${storeName}: ${transaction.error?.message}`));
        };
      } catch (error) {
        console.error(`Error putting item in ${storeName}:`, error);
        reject(error);
      }
    });
  }

  /**
   * Generic method to get an item from a store by its ID
   */
  public async get<T extends StoreNames>(
    storeName: T, 
    id: string
  ): Promise<StoreModelMap[T] | null> {
    await this.ensureDbInitialized();
    
    if (this.debugMode) {
      console.log(`Getting item from ${storeName} with ID:`, id);
    }
    
    return new Promise<StoreModelMap[T] | null>((resolve, reject) => {
      try {
        const { store } = this.createTransaction(storeName);
        const request = store.get(id);
        
        request.onsuccess = () => {
          if (this.debugMode) {
            console.log(`Get result from ${storeName}:`, request.result);
          }
          resolve(request.result || null);
        };
        
        request.onerror = () => {
          console.error(`Failed to get item from ${storeName}:`, request.error);
          reject(new Error(`Failed to get item from ${storeName}: ${request.error?.message}`));
        };
      } catch (error) {
        console.error(`Error getting item from ${storeName}:`, error);
        reject(error);
      }
    });
  }

  /**
   * Generic method to get all items from a store
   */
  public async getAll<T extends StoreNames>(
    storeName: T
  ): Promise<StoreModelMap[T][]> {
    await this.ensureDbInitialized();
    
    if (this.debugMode) {
      console.log(`Getting all items from ${storeName}`);
    }
    
    return new Promise<StoreModelMap[T][]>((resolve, reject) => {
      try {
        const { store } = this.createTransaction(storeName);
        const request = store.getAll();
        
        request.onsuccess = () => {
          const results = request.result || [];
          if (this.debugMode) {
            console.log(`Got ${results.length} items from ${storeName}`);
          }
          resolve(results);
        };
        
        request.onerror = () => {
          console.error(`Failed to get items from ${storeName}:`, request.error);
          reject(new Error(`Failed to get items from ${storeName}: ${request.error?.message}`));
        };
      } catch (error) {
        console.error(`Error getting all items from ${storeName}:`, error);
        reject(error);
      }
    });
  }

  /**
   * Generic method to update an item in a store
   */
  public async update<T extends StoreNames>(
    storeName: T, 
    id: string, 
    updates: Partial<StoreModelMap[T]>
  ): Promise<boolean> {
    await this.ensureDbInitialized();
    
    if (this.debugMode) {
      console.log(`Updating item in ${storeName} with ID ${id}:`, updates);
    }
    
    return new Promise<boolean>(async (resolve, reject) => {
      try {
        // First get the current item
        const currentItem = await this.get(storeName, id);
        
        if (!currentItem) {
          if (this.debugMode) {
            console.warn(`Item with ID ${id} not found in ${storeName}`);
          }
          resolve(false);
          return;
        }
        
        // Create updated item
        const updatedItem = { ...currentItem, ...updates };
        
        const { store, transaction } = this.createTransaction(storeName, 'readwrite');
        store.put(updatedItem);
        
        transaction.oncomplete = () => {
          if (this.debugMode) {
            console.log(`Successfully updated item in ${storeName} with ID ${id}`);
          }
          resolve(true);
        };
        
        transaction.onerror = () => {
          console.error(`Failed to update item in ${storeName}:`, transaction.error);
          reject(new Error(`Failed to update item in ${storeName}: ${transaction.error?.message}`));
        };
      } catch (error) {
        console.error(`Error updating item in ${storeName}:`, error);
        reject(error);
      }
    });
  }

  /**
   * Clean up resources
   */
  public close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  /**
   * Count items in a store
   */
  public async count<T extends StoreNames>(storeName: T): Promise<number> {
    await this.ensureDbInitialized();
    
    return new Promise<number>((resolve, reject) => {
      try {
        const { store } = this.createTransaction(storeName);
        const request = store.count();
        
        request.onsuccess = () => {
          resolve(request.result);
        };
        
        request.onerror = () => {
          console.error(`Failed to count items in ${storeName}:`, request.error);
          reject(request.error);
        };
      } catch (error) {
        console.error(`Error counting items in ${storeName}:`, error);
        reject(error);
      }
    });
  }

  /**
   * Delete an item from a store
   */
  public async delete<T extends StoreNames>(storeName: T, id: string): Promise<boolean> {
    await this.ensureDbInitialized();
    
    return new Promise<boolean>((resolve, reject) => {
      try {
        const { store, transaction } = this.createTransaction(storeName, 'readwrite');
        const request = store.delete(id);
        
        transaction.oncomplete = () => {
          resolve(true);
        };
        
        transaction.onerror = () => {
          console.error(`Failed to delete item from ${storeName}:`, transaction.error);
          reject(transaction.error);
        };
      } catch (error) {
        console.error(`Error deleting item from ${storeName}:`, error);
        reject(error);
      }
    });
  }

  /**
   * Clear all items from a store
   */
  public async clearStore<T extends StoreNames>(storeName: T): Promise<boolean> {
    await this.ensureDbInitialized();
    
    return new Promise<boolean>((resolve, reject) => {
      try {
        const { store, transaction } = this.createTransaction(storeName, 'readwrite');
        const request = store.clear();
        
        transaction.oncomplete = () => {
          resolve(true);
        };
        
        transaction.onerror = () => {
          console.error(`Failed to clear store ${storeName}:`, transaction.error);
          reject(transaction.error);
        };
      } catch (error) {
        console.error(`Error clearing store ${storeName}:`, error);
        reject(error);
      }
    });
  }

  /**
   * Clear all data from all stores
   */
  public async clearAllData(): Promise<boolean> {
    await this.ensureDbInitialized();
    
    const storeNames = Object.values(STORE_NAMES);
    
    try {
      for (const storeName of storeNames) {
        await this.clearStore(storeName);
      }
      return true;
    } catch (error) {
      console.error('Error clearing all data:', error);
      return false;
    }
  }

  /**
   * Run diagnostics on the database
   */
  public async runDiagnostics(): Promise<{
    status: 'healthy' | 'issues';
    issues: string[];
  }> {
    await this.ensureDbInitialized();
    
    const issues: string[] = [];
    
    // Check each store exists
    const storeNames = Object.values(STORE_NAMES);
    for (const storeName of storeNames) {
      if (!this.db?.objectStoreNames.contains(storeName)) {
        issues.push(`Store ${storeName} is missing`);
      }
    }
    
    return {
      status: issues.length === 0 ? 'healthy' : 'issues',
      issues
    };
  }

  /**
   * Repair chat histories with missing fields
   */
  public async repairChatHistories(): Promise<number> {
    await this.ensureDbInitialized();
    
    let fixedCount = 0;
    
    try {
      const histories = await this.getAll(STORE_NAMES.CHAT_HISTORIES);
      
      for (const history of histories) {
        let needsUpdate = false;
        
        // Check and fix required fields
        if (!history.id) {
          history.id = crypto.randomUUID();
          needsUpdate = true;
        }
        
        if (!history.title) {
          history.title = 'Chat ' + new Date().toLocaleString();
          needsUpdate = true;
        }
        
        if (!history.updatedAt) {
          history.updatedAt = new Date().toISOString();
          needsUpdate = true;
        }
        
        if (!history.createdAt) {
          history.createdAt = new Date().toISOString();
          needsUpdate = true;
        }
        
        if (history.isStarred === undefined) {
          history.isStarred = false;
          needsUpdate = true;
        }
        
        if (!Array.isArray(history.messages)) {
          history.messages = [];
          needsUpdate = true;
        }
        
        if (!Array.isArray(history.tags)) {
          history.tags = [];
          needsUpdate = true;
        }
        
        if (needsUpdate) {
          await this.put(STORE_NAMES.CHAT_HISTORIES, history);
          fixedCount++;
        }
      }
      
      return fixedCount;
    } catch (error) {
      console.error('Error repairing chat histories:', error);
      return 0;
    }
  }

  /**
   * Migrate data from localStorage to IndexedDB
   */
  public async migrateFromLocalStorage(): Promise<{
    success: boolean;
    notesCount: number;
    foldersCount: number;
    chatHistoriesCount: number;
  }> {
    await this.ensureDbInitialized();
    
    try {
      let notesCount = 0;
      let foldersCount = 0;
      let chatHistoriesCount = 0;
      
      // Migrate notes
      const notesJson = localStorage.getItem('cognicore-notes');
      if (notesJson) {
        try {
          const notes = JSON.parse(notesJson);
          if (Array.isArray(notes)) {
            for (const note of notes) {
              await this.put(STORE_NAMES.NOTES, note);
              notesCount++;
            }
          }
        } catch (e) {
          console.error('Error migrating notes:', e);
        }
      }
      
      // Migrate folders
      const foldersJson = localStorage.getItem('cognicore-folders') || localStorage.getItem('folders');
      if (foldersJson) {
        try {
          const folders = JSON.parse(foldersJson);
          if (Array.isArray(folders)) {
            for (const folder of folders) {
              await this.put(STORE_NAMES.FOLDERS, folder);
              foldersCount++;
            }
          }
        } catch (e) {
          console.error('Error migrating folders:', e);
        }
      }
      
      // Migrate chat histories
      const historiesJson = localStorage.getItem('cognicore-chat-histories');
      if (historiesJson) {
        try {
          const histories = JSON.parse(historiesJson);
          if (Array.isArray(histories)) {
            for (const history of histories) {
              await this.put(STORE_NAMES.CHAT_HISTORIES, history);
              chatHistoriesCount++;
            }
          }
        } catch (e) {
          console.error('Error migrating chat histories:', e);
        }
      }
      
      return {
        success: true,
        notesCount,
        foldersCount,
        chatHistoriesCount
      };
    } catch (error) {
      console.error('Error during migration:', error);
      return {
        success: false,
        notesCount: 0,
        foldersCount: 0,
        chatHistoriesCount: 0
      };
    }
  }
}

export default new DatabaseService();