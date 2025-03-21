/**
 * Cache Service
 * 
 * Provides a memory and persistence caching layer for frequently accessed data
 * to improve application performance.
 */

// Type definitions
export interface CacheOptions {
  ttl?: number;              // Time to live in milliseconds
  persist?: boolean;         // Whether to persist in localStorage
  invalidateOnUpdate?: boolean; // Invalidate cache when content is updated
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  lastCleaned: Date | null;
}

export interface CacheEntry<T> {
  data: T;
  created: number;
  expires: number | null; // null for no expiration
  lastAccessed: number;
}

interface CacheMap {
  [key: string]: CacheEntry<any>;
}

const DEFAULT_OPTIONS: CacheOptions = {
  ttl: 1000 * 60 * 60, // 1 hour
  persist: false,
  invalidateOnUpdate: true
};

// Namespace for storing different cache types
const CACHE_NAMESPACES = {
  EMBEDDINGS: 'embeddings',
  SIMILAR_NOTES: 'similar-notes',
  QUERY_RESULTS: 'query-results',
  GRAPH_DATA: 'graph-data'
};

// Local storage key
const STORAGE_KEY = 'cognicore-cache';

/**
 * Cache service for storing and retrieving frequently accessed data
 */
class CacheService {
  private cache: CacheMap = {};
  private stats: Record<string, CacheStats> = {};
  private isInitialized: boolean = false;
  private maxMemorySize: number = 50 * 1024 * 1024; // 50MB default max size
  private currentMemorySize: number = 0;
  private autocleanInterval: number | null = null;
  
  /**
   * Initialize the cache service
   */
  public initialize(maxMemorySizeMB: number = 50): void {
    if (this.isInitialized) return;
    
    // Set max memory size
    this.maxMemorySize = maxMemorySizeMB * 1024 * 1024;
    
    // Initialize cache from localStorage if available
    this.loadFromStorage();
    
    // Initialize stats for each namespace
    Object.values(CACHE_NAMESPACES).forEach(namespace => {
      if (!this.stats[namespace]) {
        this.stats[namespace] = {
          hits: 0,
          misses: 0,
          size: 0,
          lastCleaned: null
        };
      }
    });
    
    // Set up auto-cleanup interval (every 5 minutes)
    this.autocleanInterval = window.setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
    
    this.isInitialized = true;
    console.log('Cache service initialized with max size:', maxMemorySizeMB, 'MB');
  }
  
  /**
   * Get a value from the cache
   * @returns The cached value, or undefined if not found/expired
   */
  public get<T>(
    namespace: string, 
    key: string
  ): T | undefined {
    if (!this.isInitialized) this.initialize();
    
    // Ensure stats exist for this namespace
    if (!this.stats[namespace]) {
      this.stats[namespace] = {
        hits: 0,
        misses: 0,
        size: 0,
        lastCleaned: null
      };
    }
    
    const cacheKey = this.getCacheKey(namespace, key);
    const entry = this.cache[cacheKey];
    
    if (!entry) {
      // Cache miss
      this.stats[namespace].misses++;
      return undefined;
    }
    
    // Check if expired
    if (entry.expires !== null && entry.expires < Date.now()) {
      // Expired entry
      delete this.cache[cacheKey];
      this.stats[namespace].misses++;
      return undefined;
    }
    
    // Update last accessed time
    entry.lastAccessed = Date.now();
    this.stats[namespace].hits++;
    
    return entry.data;
  }
  
  /**
   * Set a value in the cache
   */
  public set<T>(
    namespace: string, 
    key: string, 
    data: T, 
    options: CacheOptions = {}
  ): void {
    if (!this.isInitialized) this.initialize();
    
    // Merge options with defaults
    const mergedOptions: CacheOptions = { ...DEFAULT_OPTIONS, ...options };
    
    const cacheKey = this.getCacheKey(namespace, key);
    const now = Date.now();
    
    // Calculate expiration time
    const expires = mergedOptions.ttl ? now + mergedOptions.ttl : null;
    
    // Create cache entry
    const entry: CacheEntry<T> = {
      data,
      created: now,
      expires,
      lastAccessed: now
    };
    
    // Add to cache
    this.cache[cacheKey] = entry;
    
    // Update size estimation (rough estimate)
    const size = this.estimateSize(data);
    this.currentMemorySize += size;
    this.stats[namespace].size += size;
    
    // Check if we need to clean up
    if (this.currentMemorySize > this.maxMemorySize) {
      this.cleanup();
    }
    
    // Persist to storage if needed
    if (mergedOptions.persist) {
      this.saveToStorage();
    }
  }
  
  /**
   * Check if a key exists in the cache
   */
  public has(namespace: string, key: string): boolean {
    if (!this.isInitialized) this.initialize();
    
    const cacheKey = this.getCacheKey(namespace, key);
    const entry = this.cache[cacheKey];
    
    if (!entry) return false;
    
    // Check if expired
    if (entry.expires !== null && entry.expires < Date.now()) {
      delete this.cache[cacheKey];
      return false;
    }
    
    return true;
  }
  
  /**
   * Remove a specific key from the cache
   */
  public remove(namespace: string, key: string): void {
    if (!this.isInitialized) this.initialize();
    
    const cacheKey = this.getCacheKey(namespace, key);
    
    if (this.cache[cacheKey]) {
      // Adjust size estimation
      const size = this.estimateSize(this.cache[cacheKey].data);
      this.currentMemorySize -= size;
      this.stats[namespace].size -= size;
      
      // Remove from cache
      delete this.cache[cacheKey];
    }
  }
  
  /**
   * Remove all items from a namespace
   */
  public clearNamespace(namespace: string): void {
    if (!this.isInitialized) this.initialize();
    
    // Find all keys in this namespace
    const keys = Object.keys(this.cache).filter(key => 
      key.startsWith(`${namespace}:`)
    );
    
    // Remove each key
    keys.forEach(key => {
      // Adjust size estimation
      const size = this.estimateSize(this.cache[key].data);
      this.currentMemorySize -= size;
      this.stats[namespace].size -= size;
      
      // Remove from cache
      delete this.cache[key];
    });
    
    // Reset stats for this namespace
    this.stats[namespace] = {
      hits: 0,
      misses: 0,
      size: 0,
      lastCleaned: new Date()
    };
    
    // Update storage
    this.saveToStorage();
  }
  
  /**
   * Clear the entire cache
   */
  public clear(): void {
    if (!this.isInitialized) this.initialize();
    
    this.cache = {};
    this.currentMemorySize = 0;
    
    // Reset all stats
    Object.values(CACHE_NAMESPACES).forEach(namespace => {
      this.stats[namespace] = {
        hits: 0,
        misses: 0,
        size: 0,
        lastCleaned: new Date()
      };
    });
    
    // Clear from storage
    localStorage.removeItem(STORAGE_KEY);
  }
  
  /**
   * Get cache statistics
   */
  public getStats(): Record<string, CacheStats> {
    if (!this.isInitialized) this.initialize();
    return this.stats;
  }
  
  /**
   * Get all cache keys for a namespace
   */
  public getKeys(namespace: string): string[] {
    if (!this.isInitialized) this.initialize();
    
    return Object.keys(this.cache)
      .filter(key => key.startsWith(`${namespace}:`))
      .map(key => key.substring(namespace.length + 1)); // Remove namespace prefix
  }
  
  /**
   * Get cache memory usage
   */
  public getMemoryUsage(): { current: number, max: number, percentage: number } {
    if (!this.isInitialized) this.initialize();
    
    return {
      current: this.currentMemorySize,
      max: this.maxMemorySize,
      percentage: (this.currentMemorySize / this.maxMemorySize) * 100
    };
  }
  
  /**
   * Clean up expired and least recently used entries
   */
  public cleanup(): void {
    if (!this.isInitialized) this.initialize();
    
    const now = Date.now();
    const keysToRemove: string[] = [];
    
    // First pass: remove expired entries
    Object.keys(this.cache).forEach(key => {
      const entry = this.cache[key];
      if (entry.expires !== null && entry.expires < now) {
        keysToRemove.push(key);
      }
    });
    
    // If still above memory limit, remove least recently used entries
    if (this.currentMemorySize > this.maxMemorySize * 0.9) {
      // Get all entries, sorted by lastAccessed (oldest first)
      const sortedEntries = Object.entries(this.cache)
        .filter(([key]) => !keysToRemove.includes(key))
        .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);
      
      // Remove oldest entries until we're under 80% of max memory
      let newSize = this.currentMemorySize;
      let i = 0;
      
      while (newSize > this.maxMemorySize * 0.8 && i < sortedEntries.length) {
        const [key, entry] = sortedEntries[i];
        const size = this.estimateSize(entry.data);
        newSize -= size;
        keysToRemove.push(key);
        i++;
      }
    }
    
    // Remove entries
    keysToRemove.forEach(key => {
      // Get namespace from key
      const namespace = key.split(':')[0];
      
      // Adjust size estimation
      const size = this.estimateSize(this.cache[key].data);
      this.currentMemorySize -= size;
      if (this.stats[namespace]) {
        this.stats[namespace].size -= size;
        this.stats[namespace].lastCleaned = new Date();
      }
      
      // Remove from cache
      delete this.cache[key];
    });
    
    if (keysToRemove.length > 0) {
      console.log(`Cache cleanup: removed ${keysToRemove.length} entries`);
      this.saveToStorage();
    }
  }
  
  /**
   * Create the cache key
   */
  private getCacheKey(namespace: string, key: string): string {
    return `${namespace}:${key}`;
  }
  
  /**
   * Estimate the size of a value in bytes (very rough approximation)
   */
  private estimateSize(value: any): number {
    if (value === null || value === undefined) return 8;
    if (typeof value === 'boolean') return 4;
    if (typeof value === 'number') return 8;
    if (typeof value === 'string') return value.length * 2;
    
    if (Array.isArray(value)) {
      // For arrays, estimate each element
      return value.reduce((size, item) => {
        return size + this.estimateSize(item);
      }, 0);
    }
    
    if (typeof value === 'object') {
      // For objects, estimate each property
      return Object.entries(value).reduce((size, [key, val]) => {
        return size + key.length * 2 + this.estimateSize(val);
      }, 0);
    }
    
    // Default fallback
    return 8;
  }
  
  /**
   * Save persistent cache to localStorage
   */
  private saveToStorage(): void {
    try {
      // Filter for entries that should be persisted
      const persistentCache: CacheMap = {};
      const persistentKeys = Object.keys(this.cache).filter(key => 
        // Only include small values to avoid localStorage limits
        this.estimateSize(this.cache[key].data) < 10 * 1024 // 10KB max
      );
      
      persistentKeys.forEach(key => {
        persistentCache[key] = this.cache[key];
      });
      
      if (persistentKeys.length > 0) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(persistentCache));
      }
    } catch (error) {
      console.error('Failed to save cache to storage:', error);
      // If localStorage is full, clear it and try again
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }
  
  /**
   * Load persistent cache from localStorage
   */
  private loadFromStorage(): void {
    try {
      const storedCache = localStorage.getItem(STORAGE_KEY);
      
      if (storedCache) {
        const parsedCache = JSON.parse(storedCache);
        
        // Validate and merge into memory cache
        Object.entries(parsedCache).forEach(([key, entry]) => {
          if (
            entry && 
            typeof entry === 'object' && 
            'data' in entry &&
            'created' in entry &&
            'lastAccessed' in entry
          ) {
            this.cache[key] = entry as CacheEntry<any>;
            
            // Update size estimation
            const size = this.estimateSize(entry.data);
            this.currentMemorySize += size;
            
            // Update namespace stats
            const namespace = key.split(':')[0];
            if (this.stats[namespace]) {
              this.stats[namespace].size += size;
            }
          }
        });
        
        console.log(`Loaded ${Object.keys(parsedCache).length} items from cache storage`);
      }
    } catch (error) {
      console.error('Failed to load cache from storage:', error);
      // If corrupt, clear it
      localStorage.removeItem(STORAGE_KEY);
    }
  }
  
  /**
   * Clean up on application exit (should be called from main component)
   */
  public dispose(): void {
    if (this.autocleanInterval !== null) {
      window.clearInterval(this.autocleanInterval);
      this.autocleanInterval = null;
    }
    
    // Save persistent cache before unloading
    this.saveToStorage();
    
    this.isInitialized = false;
  }
}

// Export namespace constants
export const CacheNamespaces = CACHE_NAMESPACES;

// Create singleton instance
const cacheService = new CacheService();

export default cacheService;
