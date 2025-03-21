/**
 * Embedding Worker Service
 * 
 * Manages communication with the embedding worker and provides a clean API
 * for generating embeddings in the background.
 */

// Define types for responses from the worker
interface WorkerResponse {
  id: string;
  success: boolean;
  embedding?: number[];
  embeddings?: number[][];
  error?: string;
}

interface ProgressUpdate {
  type: 'progress';
  status: string;
  progress?: number;
}

// Define types for request tracking
interface PendingRequest {
  resolve: (value: any) => void;
  reject: (reason: any) => void;
}

class EmbeddingWorkerService {
  private worker: Worker | null = null;
  private isInitialized: boolean = false;
  private isInitializing: boolean = false;
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private progressCallback: ((update: ProgressUpdate) => void) | null = null;

  /**
   * Initialize the embedding worker
   * @param modelName Optional name of the model to use
   * @param progressCallback Optional callback for progress updates
   */
  public async initialize(
    modelName: string = 'Xenova/all-MiniLM-L6-v2',
    progressCallback?: (update: ProgressUpdate) => void
  ): Promise<boolean> {
    // Skip if already initialized or initializing
    if (this.isInitialized) {
      return true;
    }
    
    if (this.isInitializing) {
      return new Promise((resolve) => {
        // Check every 100ms if initialization is complete
        const checkInterval = setInterval(() => {
          if (this.isInitialized) {
            clearInterval(checkInterval);
            resolve(true);
          }
        }, 100);
      });
    }
    
    try {
      this.isInitializing = true;
      this.progressCallback = progressCallback || null;
      
      // Create worker
      this.worker = new Worker(
        new URL('../../workers/embedding-worker.ts', import.meta.url),
        { type: 'module' }
      );
      
      // Set up message handler
      this.worker.onmessage = this.handleWorkerMessage.bind(this);
      
      // Initialize the worker with the specified model
      const result = await this.sendToWorker('initialize', { modelName });
      this.isInitialized = result.success;
      this.isInitializing = false;
      
      return result.success;
    } catch (error) {
      console.error('Error initializing embedding worker:', error);
      this.isInitialized = false;
      this.isInitializing = false;
      return false;
    }
  }

  /**
   * Generate an embedding for a single text
   */
  public async generateEmbedding(text: string): Promise<number[]> {
    try {
      // Ensure worker is initialized
      if (!this.isInitialized && !this.isInitializing) {
        await this.initialize();
      }
      
      // Send request to worker
      const result = await this.sendToWorker('generate', { text });
      
      if (!result.success || !result.embedding) {
        throw new Error(result.error || 'Failed to generate embedding');
      }
      
      return result.embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw error;
    }
  }

  /**
   * Generate embeddings for multiple texts
   */
  public async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      // Ensure worker is initialized
      if (!this.isInitialized && !this.isInitializing) {
        await this.initialize();
      }
      
      // Send request to worker
      const result = await this.sendToWorker('batch', { texts });
      
      if (!result.success || !result.embeddings) {
        throw new Error(result.error || 'Failed to generate batch embeddings');
      }
      
      return result.embeddings;
    } catch (error) {
      console.error('Error generating batch embeddings:', error);
      throw error;
    }
  }

  /**
   * Terminate the worker and clean up resources
   */
  public async terminate(): Promise<void> {
    if (!this.worker) {
      return;
    }
    
    try {
      // Send terminate command to worker
      await this.sendToWorker('terminate');
    } catch (error) {
      console.error('Error terminating worker:', error);
    } finally {
      // Terminate worker
      this.worker.terminate();
      this.worker = null;
      this.isInitialized = false;
      this.isInitializing = false;
      
      // Reject all pending requests
      for (const [id, request] of this.pendingRequests) {
        request.reject(new Error('Worker terminated'));
        this.pendingRequests.delete(id);
      }
    }
  }

  /**
   * Send a message to the worker and wait for a response
   */
  private sendToWorker(action: string, payload?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('Worker not initialized'));
        return;
      }
      
      // Generate unique ID for this request
      const id = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Store promise callbacks
      this.pendingRequests.set(id, { resolve, reject });
      
      // Send message to worker
      this.worker.postMessage({ id, action, payload });
    });
  }

  /**
   * Handle messages from the worker
   */
  private handleWorkerMessage(event: MessageEvent): void {
    const data = event.data;
    
    // Handle progress updates
    if (data.type === 'progress') {
      if (this.progressCallback) {
        this.progressCallback(data);
      }
      return;
    }
    
    // Handle responses to requests
    const { id, success, error, ...result } = data;
    
    // Get promise callbacks
    const request = this.pendingRequests.get(id);
    if (!request) {
      console.warn(`Received response for unknown request: ${id}`);
      return;
    }
    
    // Remove from pending requests
    this.pendingRequests.delete(id);
    
    // Resolve or reject promise
    if (success) {
      request.resolve(data);
    } else {
      request.reject(new Error(error || 'Unknown error'));
    }
  }

  /**
   * Check if the worker is initialized
   */
  public isInitializedStatus(): boolean {
    return this.isInitialized;
  }

  /**
   * Check if the worker is currently initializing
   */
  public isInitializingStatus(): boolean {
    return this.isInitializing;
  }
}

// Export singleton instance
const embeddingWorkerService = new EmbeddingWorkerService();
export default embeddingWorkerService;
