/**
 * Embedding Worker Service
 * 
 * Manages the web worker for generating embeddings in a background thread.
 * This service uses a Promise-based API to communicate with the worker and
 * manages worker lifecycle.
 */

// Type definitions for worker messages
export interface WorkerRequest {
  type: string;
  data?: any;
  id: string;
}

export interface WorkerResponse {
  type: string;
  success?: boolean;
  error?: string;
  embedding?: number[];
  results?: EmbeddingResult[];
  status?: string;
  modelName?: string;
  completed?: number;
  total?: number;
  id?: string;
}

export interface EmbeddingResult {
  embedding: number[] | null;
  success: boolean;
  error?: string;
  id: string | null;
  index: number;
}

// Pending requests map
interface PendingRequest {
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
}

/**
 * Service for generating embeddings using a web worker
 */
class EmbeddingWorkerService {
  private worker: Worker | null = null;
  private isInitialized: boolean = false;
  private isInitializing: boolean = false;
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private progressCallback: ((status: string) => void) | null = null;
  private batchProgressCallback: ((completed: number, total: number) => void) | null = null;
  private currentModelName: string = 'Xenova/all-MiniLM-L6-v2';
  
  /**
   * Initialize the worker
   */
  public async initialize(modelName?: string): Promise<boolean> {
    // Check if the worker is already initialized or being initialized
    if (this.isInitialized) {
      return true;
    }
    
    if (this.isInitializing) {
      return new Promise((resolve, reject) => {
        // Poll until initialization completes
        const checkInterval = setInterval(() => {
          if (this.isInitialized) {
            clearInterval(checkInterval);
            resolve(true);
          } else if (!this.isInitializing) {
            clearInterval(checkInterval);
            reject(new Error('Worker initialization failed'));
          }
        }, 100);
      });
    }
    
    this.isInitializing = true;
    
    try {
      // Create the worker
      this.worker = new Worker('/embedding-worker.js');
      
      // Set up message handler
      this.worker.onmessage = this.handleWorkerMessage.bind(this);
      
      // Set up error handler
      this.worker.onerror = (error) => {
        console.error('Worker error:', error);
        this.isInitializing = false;
        throw new Error(`Failed to initialize embedding worker: ${error.message}`);
      };
      
      // Wait for the worker to be ready
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Worker initialization timed out'));
        }, 10000); // 10 second timeout
        
        const messageHandler = (event: MessageEvent) => {
          if (event.data.type === 'ready') {
            this.worker?.removeEventListener('message', messageHandler);
            clearTimeout(timeout);
            resolve();
          }
        };
        
        this.worker?.addEventListener('message', messageHandler);
      });
      
      // Initialize the model
      const requestId = `init-${Date.now()}`;
      const initResult = await this.sendWorkerRequest({
        type: 'init',
        data: { modelName: modelName || this.currentModelName },
        id: requestId
      });
      
      if (initResult.success) {
        this.isInitialized = true;
        this.isInitializing = false;
        if (modelName) {
          this.currentModelName = modelName;
        }
        return true;
      } else {
        throw new Error(initResult.error || 'Failed to initialize embedding model');
      }
    } catch (error) {
      this.isInitializing = false;
      console.error('Worker initialization failed:', error);
      throw error;
    }
  }
  
  /**
   * Generate embeddings for a text
   * @param text The text to generate embeddings for
   * @returns The embedding vector
   */
  public async generateEmbedding(text: string): Promise<number[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    const requestId = `embed-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    const response = await this.sendWorkerRequest({
      type: 'generate_embedding',
      data: { text },
      id: requestId
    });
    
    if (!response.success || !response.embedding) {
      throw new Error(response.error || 'Failed to generate embedding');
    }
    
    return response.embedding;
  }
  
  /**
   * Generate embeddings for multiple texts in batch
   * @param texts Array of texts to generate embeddings for
   * @param itemIds Optional array of IDs corresponding to each text
   * @returns Array of embedding results
   */
  public async generateBatchEmbeddings(
    texts: string[],
    itemIds?: string[]
  ): Promise<EmbeddingResult[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    const requestId = `batch-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    const response = await this.sendWorkerRequest({
      type: 'batch_generate',
      data: { 
        texts,
        itemIds 
      },
      id: requestId
    });
    
    if (!response.success || !response.results) {
      throw new Error(response.error || 'Failed to generate batch embeddings');
    }
    
    return response.results;
  }
  
  /**
   * Change the embedding model
   * @param modelName The name of the new model to use
   * @returns Whether the model was changed successfully
   */
  public async changeModel(modelName: string): Promise<boolean> {
    if (modelName === this.currentModelName) {
      return true; // No change needed
    }
    
    if (!this.worker) {
      // If worker doesn't exist, just initialize with the new model
      this.currentModelName = modelName;
      return await this.initialize(modelName);
    }
    
    const requestId = `change-model-${Date.now()}`;
    
    const response = await this.sendWorkerRequest({
      type: 'change_model',
      data: { modelName },
      id: requestId
    });
    
    if (response.success) {
      this.currentModelName = modelName;
      return true;
    } else {
      throw new Error(response.error || 'Failed to change embedding model');
    }
  }
  
  /**
   * Set a callback for progress updates
   * @param callback The callback function
   */
  public setProgressCallback(callback: (status: string) => void): void {
    this.progressCallback = callback;
  }
  
  /**
   * Set a callback for batch progress updates
   * @param callback The callback function
   */
  public setBatchProgressCallback(callback: (completed: number, total: number) => void): void {
    this.batchProgressCallback = callback;
  }
  
  /**
   * Terminate the worker
   */
  public terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.isInitialized = false;
      this.isInitializing = false;
      this.pendingRequests.clear();
    }
  }
  
  /**
   * Handle messages from the worker
   */
  private handleWorkerMessage(event: MessageEvent): void {
    const response: WorkerResponse = event.data;
    
    // Handle progress updates
    if (response.type === 'progress' && response.status && this.progressCallback) {
      this.progressCallback(response.status);
      return;
    }
    
    // Handle batch progress updates
    if (response.type === 'batch_progress' && 
        response.completed !== undefined && 
        response.total !== undefined && 
        this.batchProgressCallback) {
      this.batchProgressCallback(response.completed, response.total);
      return;
    }
    
    // Handle responses to requests
    if (response.id && this.pendingRequests.has(response.id)) {
      const { resolve, reject } = this.pendingRequests.get(response.id)!;
      this.pendingRequests.delete(response.id);
      
      if (response.type === 'error') {
        reject(new Error(response.error || 'Unknown worker error'));
      } else {
        resolve(response);
      }
    }
  }
  
  /**
   * Send a request to the worker and wait for the response
   */
  private sendWorkerRequest(request: WorkerRequest): Promise<WorkerResponse> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('Worker not initialized'));
        return;
      }
      
      // Store the promise callbacks
      this.pendingRequests.set(request.id, { resolve, reject });
      
      // Set a timeout to prevent hanging promises
      const timeout = setTimeout(() => {
        if (this.pendingRequests.has(request.id)) {
          this.pendingRequests.delete(request.id);
          reject(new Error(`Request ${request.type} timed out after 30 seconds`));
        }
      }, 30000); // 30 second timeout
      
      // Wrap resolve to clear the timeout
      const wrappedResolve = (value: any) => {
        clearTimeout(timeout);
        resolve(value);
      };
      
      // Wrap reject to clear the timeout
      const wrappedReject = (reason?: any) => {
        clearTimeout(timeout);
        reject(reason);
      };
      
      // Update the stored callbacks
      this.pendingRequests.set(request.id, { 
        resolve: wrappedResolve, 
        reject: wrappedReject 
      });
      
      // Send the request to the worker
      this.worker.postMessage(request);
    });
  }
}

// Create a singleton instance
const embeddingWorkerService = new EmbeddingWorkerService();

export default embeddingWorkerService;
