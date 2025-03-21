/**
 * Worker Pool Service
 * 
 * Manages a pool of web workers for distributing tasks and optimizing resource usage.
 * This implementation uses a queue system for tasks and distributes them across
 * available workers based on priority and resource constraints.
 */

export type WorkerTask = {
  id: string;
  type: string;
  data: any;
  priority: number;
  callback: (result: any) => void;
  errorCallback: (error: Error) => void;
};

export type PoolWorker = {
  worker: Worker;
  busy: boolean;
  taskId: string | null;
  startTime: number | null;
};

export type WorkerPoolOptions = {
  maxWorkers?: number;
  initializationTimeout?: number;
  taskTimeout?: number;
  workerScript: string;
};

export type PoolStatus = {
  maxWorkers: number;
  activeWorkers: number;
  busyWorkers: number;
  queuedTasks: number;
  completedTasks: number;
  failedTasks: number;
};

/**
 * Worker Pool that manages multiple web workers to distribute tasks
 */
class WorkerPool {
  private workers: PoolWorker[] = [];
  private taskQueue: WorkerTask[] = [];
  private maxWorkers: number;
  private workerScript: string;
  private initializationTimeout: number;
  private taskTimeout: number;
  private isInitialized: boolean = false;
  private busyTimeout: Map<string, NodeJS.Timeout> = new Map();
  private completedTasks: number = 0;
  private failedTasks: number = 0;
  private onStatusChangeCallbacks: ((status: PoolStatus) => void)[] = [];

  constructor(options: WorkerPoolOptions) {
    // Calculate optimal number of workers based on hardware
    const optimalWorkers = Math.max(1, (navigator.hardwareConcurrency || 4) - 1);
    
    this.maxWorkers = options.maxWorkers || optimalWorkers;
    this.workerScript = options.workerScript;
    this.initializationTimeout = options.initializationTimeout || 10000; // 10 seconds
    this.taskTimeout = options.taskTimeout || 30000; // 30 seconds
  }

  /**
   * Initialize the worker pool
   */
  public async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      return true;
    }

    try {
      // Create initial workers (start with half and scale up as needed)
      const initialWorkers = Math.max(1, Math.ceil(this.maxWorkers / 2));
      
      for (let i = 0; i < initialWorkers; i++) {
        await this.createWorker();
      }
      
      this.isInitialized = true;
      this.notifyStatusChange();
      return true;
    } catch (error) {
      console.error('Failed to initialize worker pool:', error);
      return false;
    }
  }

  /**
   * Submit a task to the worker pool
   * @param type Task type
   * @param data Task data
   * @param priority Task priority (higher number = higher priority)
   * @returns Promise that resolves with the task result
   */
  public async submitTask<T>(
    type: string, 
    data: any, 
    priority: number = 1
  ): Promise<T> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      // Create a task object
      const task: WorkerTask = {
        id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        type,
        data,
        priority,
        callback: resolve,
        errorCallback: reject
      };

      // Add the task to the queue
      this.enqueueTask(task);
      
      // Process the queue
      this.processQueue();
    });
  }

  /**
   * Get the current status of the worker pool
   */
  public getStatus(): PoolStatus {
    return {
      maxWorkers: this.maxWorkers,
      activeWorkers: this.workers.length,
      busyWorkers: this.workers.filter(w => w.busy).length,
      queuedTasks: this.taskQueue.length,
      completedTasks: this.completedTasks,
      failedTasks: this.failedTasks
    };
  }

  /**
   * Register a callback for status changes
   * @param callback Function to call when status changes
   */
  public onStatusChange(callback: (status: PoolStatus) => void): void {
    this.onStatusChangeCallbacks.push(callback);
  }

  /**
   * Terminate all workers and clear the queue
   */
  public terminate(): void {
    // Clear all timeouts
    this.busyTimeout.forEach(timeout => clearTimeout(timeout));
    this.busyTimeout.clear();

    // Terminate all workers
    this.workers.forEach(worker => worker.worker.terminate());
    this.workers = [];

    // Clear the queue
    this.taskQueue = [];
    this.isInitialized = false;
    this.notifyStatusChange();
  }

  /**
   * Add a task to the queue
   */
  private enqueueTask(task: WorkerTask): void {
    // Add task to the queue
    this.taskQueue.push(task);
    
    // Sort the queue by priority (higher first)
    this.taskQueue.sort((a, b) => b.priority - a.priority);
    
    this.notifyStatusChange();
  }

  /**
   * Process the task queue
   */
  private processQueue(): void {
    // Check if there are tasks waiting
    if (this.taskQueue.length === 0) {
      return;
    }

    // Find idle workers
    const idleWorkers = this.workers.filter(worker => !worker.busy);

    // If there are idle workers, assign tasks
    if (idleWorkers.length > 0) {
      const worker = idleWorkers[0];
      const task = this.taskQueue.shift();
      
      if (task) {
        this.assignTaskToWorker(worker, task);
      }
    } 
    // If there are no idle workers but we can create more, do so
    else if (this.workers.length < this.maxWorkers) {
      this.createWorker().then(() => {
        // Try processing the queue again after creating a new worker
        this.processQueue();
      }).catch(error => {
        console.error('Failed to create worker:', error);
      });
    }
    // Otherwise, we'll wait for a worker to become available
  }

  /**
   * Assign a task to a worker
   */
  private assignTaskToWorker(worker: PoolWorker, task: WorkerTask): void {
    worker.busy = true;
    worker.taskId = task.id;
    worker.startTime = Date.now();

    // Set a timeout for the task
    const timeout = setTimeout(() => {
      // If the worker is still busy with this task, consider it timed out
      if (worker.busy && worker.taskId === task.id) {
        worker.busy = false;
        worker.taskId = null;
        worker.startTime = null;
        
        this.failedTasks++;
        this.notifyStatusChange();
        
        // Call the error callback
        task.errorCallback(new Error(`Task ${task.type} timed out after ${this.taskTimeout}ms`));
        
        // Process the next task
        this.processQueue();
      }
    }, this.taskTimeout);

    this.busyTimeout.set(task.id, timeout);

    // Post the task to the worker
    worker.worker.postMessage({
      id: task.id,
      type: task.type,
      data: task.data
    });
    
    this.notifyStatusChange();
  }

  /**
   * Create a new worker
   */
  private async createWorker(): Promise<PoolWorker> {
    return new Promise<PoolWorker>((resolve, reject) => {
      try {
        const worker = new Worker(this.workerScript);
        
        const workerWrapper: PoolWorker = {
          worker,
          busy: false,
          taskId: null,
          startTime: null
        };

        // Set up message handler
        worker.onmessage = (event) => {
          const { id, type, ...data } = event.data;
          
          // If this is a task completion message
          if (id && workerWrapper.taskId === id) {
            // Clear the timeout
            if (this.busyTimeout.has(id)) {
              clearTimeout(this.busyTimeout.get(id)!);
              this.busyTimeout.delete(id);
            }
            
            // Mark the worker as idle
            workerWrapper.busy = false;
            workerWrapper.taskId = null;
            workerWrapper.startTime = null;
            
            // Find the corresponding task
            const taskIndex = this.taskQueue.findIndex(t => t.id === id);
            
            if (taskIndex !== -1) {
              const task = this.taskQueue.splice(taskIndex, 1)[0];
              
              if (type === 'error') {
                this.failedTasks++;
                task.errorCallback(new Error(data.error || 'Unknown worker error'));
              } else {
                this.completedTasks++;
                task.callback(data);
              }
            }
            
            this.notifyStatusChange();
            
            // Process the next task
            this.processQueue();
          }
          
          // If this is the initialization message
          else if (type === 'ready') {
            // Add the worker to the pool
            this.workers.push(workerWrapper);
            this.notifyStatusChange();
            
            // Resolve the promise
            resolve(workerWrapper);
            
            // Process the queue (in case there are waiting tasks)
            this.processQueue();
          }
          
          // If this is a progress update or other message, ignore it
        };

        // Set up error handler
        worker.onerror = (error) => {
          console.error('Worker error:', error);
          
          // If the worker has a task, mark it as failed
          if (workerWrapper.taskId) {
            // Clear the timeout
            if (this.busyTimeout.has(workerWrapper.taskId)) {
              clearTimeout(this.busyTimeout.get(workerWrapper.taskId)!);
              this.busyTimeout.delete(workerWrapper.taskId);
            }
            
            // Find the corresponding task
            const taskIndex = this.taskQueue.findIndex(t => t.id === workerWrapper.taskId);
            
            if (taskIndex !== -1) {
              const task = this.taskQueue.splice(taskIndex, 1)[0];
              this.failedTasks++;
              task.errorCallback(new Error(`Worker error: ${error.message}`));
            }
          }
          
          // Remove the worker from the pool
          const index = this.workers.findIndex(w => w === workerWrapper);
          if (index !== -1) {
            this.workers.splice(index, 1);
          }
          
          this.notifyStatusChange();
          
          // Create a new worker to replace the failed one
          this.createWorker().catch(console.error);
          
          // Reject the promise
          reject(error);
        };

        // Set a timeout for the worker initialization
        const initTimeout = setTimeout(() => {
          reject(new Error('Worker initialization timed out'));
        }, this.initializationTimeout);

        // Wait for the ready message to resolve the promise
        worker.addEventListener('message', function initHandler(event) {
          if (event.data.type === 'ready') {
            worker.removeEventListener('message', initHandler);
            clearTimeout(initTimeout);
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Notify all status change callbacks
   */
  private notifyStatusChange(): void {
    const status = this.getStatus();
    this.onStatusChangeCallbacks.forEach(callback => callback(status));
  }
}

export default WorkerPool;
