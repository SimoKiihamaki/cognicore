/**
 * Worker Pool Service
 * 
 * Provides a singleton instance of the worker pool for use throughout the application.
 * This service manages worker creation, task distribution, and resource optimization.
 */

import WorkerPool, { PoolStatus } from './WorkerPool';

export type WorkerPoolServiceOptions = {
  maxWorkers?: number;
  initializationTimeout?: number;
  taskTimeout?: number;
  embeddingWorkerPath?: string;
};

/**
 * Service that manages a pool of workers for various types of tasks
 */
class WorkerPoolService {
  private embeddingPool: WorkerPool | null = null;
  private statusListeners: ((status: PoolStatus) => void)[] = [];
  private options: WorkerPoolServiceOptions = {
    maxWorkers: undefined, // Use default from WorkerPool
    initializationTimeout: 10000, // 10 seconds
    taskTimeout: 30000, // 30 seconds
    embeddingWorkerPath: '/embedding-worker-inline.js'
  };

  /**
   * Initialize the worker pool service with optional configuration
   */
  public initialize(options?: Partial<WorkerPoolServiceOptions>): void {
    this.options = { ...this.options, ...options };
    
    // Initialize the embedding pool if needed
    if (!this.embeddingPool) {
      this.embeddingPool = new WorkerPool({
        maxWorkers: this.options.maxWorkers,
        initializationTimeout: this.options.initializationTimeout,
        taskTimeout: this.options.taskTimeout,
        workerScript: this.options.embeddingWorkerPath!
      });
      
      // Forward status changes to listeners
      this.embeddingPool.onStatusChange(status => {
        this.statusListeners.forEach(listener => listener(status));
      });
    }
  }

  /**
   * Get the embedding worker pool
   */
  public getEmbeddingPool(): WorkerPool {
    if (!this.embeddingPool) {
      this.initialize();
    }
    return this.embeddingPool!;
  }

  /**
   * Register a status change listener
   */
  public onStatusChange(listener: (status: PoolStatus) => void): void {
    this.statusListeners.push(listener);
    
    // If the pool exists, register the listener there too
    if (this.embeddingPool) {
      this.embeddingPool.onStatusChange(listener);
    }
  }

  /**
   * Unregister a status change listener
   */
  public offStatusChange(listener: (status: PoolStatus) => void): void {
    const index = this.statusListeners.indexOf(listener);
    if (index !== -1) {
      this.statusListeners.splice(index, 1);
    }
  }

  /**
   * Get the current status of the worker pools
   */
  public getStatus(): { embedding: PoolStatus | null } {
    return {
      embedding: this.embeddingPool ? this.embeddingPool.getStatus() : null
    };
  }

  /**
   * Terminate all worker pools
   */
  public terminate(): void {
    if (this.embeddingPool) {
      this.embeddingPool.terminate();
      this.embeddingPool = null;
    }
  }
}

// Create a singleton instance
const workerPoolService = new WorkerPoolService();
export default workerPoolService;
