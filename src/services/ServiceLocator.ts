/**
 * Service Locator pattern implementation
 * 
 * Provides centralized access to all services in the application
 * with proper initialization and dependency management.
 */

import databaseService from './database/databaseService';
import fileSystemService from './fileSystem/fileSystemService';
import migrationService from './database/migrationService';
import embeddingService from './embedding/embeddingService';
import lmStudioService from './lmStudio/lmStudioService';
import fileMonitorService from './FileMonitorService';

type ServiceName = 
  | 'database'
  | 'fileSystem'
  | 'migration'
  | 'embedding'
  | 'lmStudio'
  | 'fileMonitor';

class ServiceLocator {
  private initialized: boolean = false;
  private initializing: boolean = false;
  private initializationError: Error | null = null;
  private initPromise: Promise<boolean> | null = null;
  
  // Service registry
  private services: Record<ServiceName, any> = {
    database: databaseService,
    fileSystem: fileSystemService,
    migration: migrationService,
    embedding: embeddingService,
    lmStudio: lmStudioService,
    fileMonitor: fileMonitorService
  };

  /**
   * Initialize all services in the correct order
   */
  public async initialize(): Promise<boolean> {
    // Return existing initialization promise if already in progress
    if (this.initPromise) {
      return this.initPromise;
    }
    
    if (this.initialized) {
      return Promise.resolve(true);
    }

    this.initializing = true;
    
    this.initPromise = new Promise<boolean>(async (resolve, reject) => {
      try {
        console.log('Initializing services...');
        
        // Initialize database first (fundamental service)
        await databaseService.initialize();
        console.log('Database service initialized');
        
        // Initialize embedding service
        try {
          // Try to load settings for model name
          let modelName = 'Xenova/all-MiniLM-L6-v2'; // Default model
          
          try {
            const settings = await databaseService.get('settings', 'app-settings');
            if (settings && settings.embeddingModel) {
              modelName = settings.embeddingModel;
            }
          } catch (settingsError) {
            console.warn('Could not load embedding model from settings, using default');
          }
          
          await embeddingService.initialize(modelName, (update) => {
            console.log('Embedding initialization progress:', update.status || update);
          });
          console.log('Embedding service initialized with model:', modelName);
        } catch (embeddingError) {
          console.warn('Embedding service initialization failed, will try later:', embeddingError);
          // We don't fail the entire initialization for embedding service
          // as it's not critical for basic functionality
        }
        
        // Initialize LM Studio service
        try {
          await lmStudioService.initialize();
          console.log('LM Studio service initialized');
        } catch (lmStudioError) {
          console.warn('LM Studio service initialization failed, will try later:', lmStudioError);
          // We don't fail the entire initialization for LM Studio service
          // as it's not critical for basic functionality
        }
        
        // Initialize file monitor service
        try {
          await fileMonitorService.initialize();
          console.log('File monitor service initialized');
        } catch (fileMonitorError) {
          console.warn('File monitor service initialization failed, will try later:', fileMonitorError);
          // We don't fail the entire initialization for file monitor service
          // as it's not critical for basic functionality
        }
        
        this.initialized = true;
        this.initializing = false;
        this.initializationError = null;
        console.log('All services initialized successfully');
        resolve(true);
      } catch (error) {
        console.error('Service initialization failed:', error);
        this.initialized = false;
        this.initializing = false;
        this.initializationError = error instanceof Error ? error : new Error(String(error));
        reject(error);
      }
    });
    
    return this.initPromise;
  }

  /**
   * Get a specific service by name
   */
  public getService<T>(name: ServiceName): T {
    const service = this.services[name];
    
    if (!service) {
      throw new Error(`Service '${name}' not found or not initialized`);
    }
    
    return service as T;
  }

  /**
   * Check if a service is available
   */
  public hasService(name: ServiceName): boolean {
    return this.services[name] !== null && this.services[name] !== undefined;
  }

  /**
   * Register a service (typically used for testing or custom implementations)
   */
  public registerService(name: ServiceName, service: any): void {
    this.services[name] = service;
  }

  /**
   * Check if all services are initialized
   */
  public isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Check if services are currently initializing
   */
  public isInitializing(): boolean {
    return this.initializing;
  }

  /**
   * Get initialization error if any
   */
  public getInitializationError(): Error | null {
    return this.initializationError;
  }

  /**
   * Reset service locator (mainly for testing)
   */
  public reset(): void {
    this.initialized = false;
    this.initializing = false;
    this.initializationError = null;
    this.initPromise = null;
  }
}

// Export a singleton instance
const serviceLocator = new ServiceLocator();
export default serviceLocator;
