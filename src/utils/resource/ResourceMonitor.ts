/**
 * Resource Monitor
 * 
 * Monitors system resources (memory, CPU, etc.) and adapts application
 * behavior based on available resources. This allows for graceful
 * degradation on resource-constrained devices.
 */

export type ResourceConstraints = {
  memory: MemoryConstraint;
  // We can add more constraints like CPU in the future
};

export type MemoryConstraint = {
  low: number;    // Percentage threshold for low memory (e.g., 80%)
  critical: number; // Percentage threshold for critical memory (e.g., 90%)
};

export type ResourceStatus = {
  memory: {
    usage: number;      // Current memory usage percentage
    available: number;  // Available memory in bytes
    total: number;      // Total memory in bytes
    state: 'normal' | 'low' | 'critical';
  };
  timestamp: number;
};

export type ResourceOptions = {
  pollingInterval?: number;
  memoryConstraints?: MemoryConstraint;
  enablePolling?: boolean;
};

// Resource state change callback
export type ResourceStateChangeCallback = (status: ResourceStatus) => void;

/**
 * Class for monitoring system resources and adapting application behavior
 */
class ResourceMonitor {
  private pollingInterval: number;
  private constraints: ResourceConstraints;
  private pollingTimer: number | null = null;
  private stateChangeCallbacks: ResourceStateChangeCallback[] = [];
  private currentStatus: ResourceStatus | null = null;
  private enablePolling: boolean;
  
  constructor(options?: ResourceOptions) {
    this.pollingInterval = options?.pollingInterval || 10000; // 10 seconds
    this.enablePolling = options?.enablePolling ?? true;
    
    this.constraints = {
      memory: options?.memoryConstraints || {
        low: 80, // 80% usage is considered low memory
        critical: 90 // 90% usage is considered critical
      }
    };
    
    if (this.enablePolling) {
      this.startPolling();
    }
  }
  
  /**
   * Start polling for resource status
   */
  public startPolling(): void {
    if (this.pollingTimer !== null) {
      this.stopPolling();
    }
    
    // Update status immediately
    this.updateStatus();
    
    // Set up polling
    this.pollingTimer = window.setInterval(() => {
      this.updateStatus();
    }, this.pollingInterval);
  }
  
  /**
   * Alias for startPolling for backward compatibility
   */
  public startResourceMonitoring(): void {
    this.startPolling();
  }
  
  /**
   * Stop polling for resource status
   */
  public stopPolling(): void {
    if (this.pollingTimer !== null) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
  }
  
  /**
   * Alias for stopPolling for backward compatibility
   */
  public stopResourceMonitoring(): void {
    this.stopPolling();
  }
  
  /**
   * Register a callback for resource state changes
   */
  public onStateChange(callback: ResourceStateChangeCallback): void {
    this.stateChangeCallbacks.push(callback);
    
    // Call callback immediately with current status if available
    if (this.currentStatus) {
      callback(this.currentStatus);
    }
  }
  
  /**
   * Unregister a state change callback
   */
  public offStateChange(callback: ResourceStateChangeCallback): void {
    const index = this.stateChangeCallbacks.indexOf(callback);
    if (index !== -1) {
      this.stateChangeCallbacks.splice(index, 1);
    }
  }
  
  /**
   * Get current resource status
   */
  public getStatus(): ResourceStatus | null {
    if (!this.currentStatus) {
      this.updateStatus();
    }
    return this.currentStatus;
  }
  
  /**
   * Check if system is in low memory state
   */
  public isLowMemory(): boolean {
    return this.currentStatus?.memory.state === 'low' || 
           this.currentStatus?.memory.state === 'critical';
  }
  
  /**
   * Check if system is in critical memory state
   */
  public isCriticalMemory(): boolean {
    return this.currentStatus?.memory.state === 'critical';
  }
  
  /**
   * Get recommended batch size based on current resources
   * @param defaultSize Default batch size
   * @param minSize Minimum batch size
   */
  public getRecommendedBatchSize(defaultSize: number, minSize: number = 1): number {
    if (!this.currentStatus) {
      return defaultSize;
    }
    
    // Adjust batch size based on memory state
    switch (this.currentStatus.memory.state) {
      case 'normal':
        return defaultSize;
      case 'low':
        return Math.max(minSize, Math.floor(defaultSize / 2));
      case 'critical':
        return minSize;
      default:
        return defaultSize;
    }
  }
  
  /**
   * Get recommended worker count based on current resources
   * @param defaultCount Default worker count
   * @param minCount Minimum worker count
   */
  public getRecommendedWorkerCount(defaultCount: number, minCount: number = 1): number {
    if (!this.currentStatus) {
      return defaultCount;
    }
    
    // Get available CPU cores
    const availableCores = navigator.hardwareConcurrency || 4;
    
    // Base count on hardware, but cap at defaultCount
    let count = Math.min(defaultCount, availableCores - 1);
    
    // Adjust worker count based on memory state
    switch (this.currentStatus.memory.state) {
      case 'normal':
        return count;
      case 'low':
        return Math.max(minCount, Math.floor(count / 2));
      case 'critical':
        return minCount;
      default:
        return count;
    }
  }
  
  /**
   * Update current resource status
   */
  private updateStatus(): void {
    try {
      const memoryInfo = this.getMemoryInfo();
      const memoryUsage = (memoryInfo.usedJSHeapSize / memoryInfo.jsHeapSizeLimit) * 100;
      
      // Determine memory state
      let memoryState: 'normal' | 'low' | 'critical' = 'normal';
      if (memoryUsage >= this.constraints.memory.critical) {
        memoryState = 'critical';
      } else if (memoryUsage >= this.constraints.memory.low) {
        memoryState = 'low';
      }
      
      const newStatus: ResourceStatus = {
        memory: {
          usage: memoryUsage,
          available: memoryInfo.jsHeapSizeLimit - memoryInfo.usedJSHeapSize,
          total: memoryInfo.jsHeapSizeLimit,
          state: memoryState
        },
        timestamp: Date.now()
      };
      
      // Check if state has changed
      const stateChanged = this.hasStateChanged(this.currentStatus, newStatus);
      
      // Update current status
      this.currentStatus = newStatus;
      
      // Notify callbacks if state has changed
      if (stateChanged) {
        this.notifyStateChange();
      }
    } catch (error) {
      console.error('Error updating resource status:', error);
    }
  }
  
  /**
   * Check if the resource state has changed
   */
  private hasStateChanged(
    oldStatus: ResourceStatus | null, 
    newStatus: ResourceStatus
  ): boolean {
    if (!oldStatus) {
      return true;
    }
    
    return oldStatus.memory.state !== newStatus.memory.state;
  }
  
  /**
   * Notify all state change callbacks
   */
  private notifyStateChange(): void {
    if (!this.currentStatus) {
      return;
    }
    
    this.stateChangeCallbacks.forEach(callback => {
      try {
        callback(this.currentStatus!);
      } catch (error) {
        console.error('Error in resource state change callback:', error);
      }
    });
  }
  
  /**
   * Get memory information from performance API
   */
  private getMemoryInfo(): {
    totalJSHeapSize: number;
    usedJSHeapSize: number;
    jsHeapSizeLimit: number;
  } {
    if (performance && 'memory' in performance) {
      const memory = (performance as any).memory;
      return {
        totalJSHeapSize: memory.totalJSHeapSize,
        usedJSHeapSize: memory.usedJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit
      };
    }
    
    // Fallback values if performance.memory is not available
    return {
      totalJSHeapSize: 0,
      usedJSHeapSize: 0,
      jsHeapSizeLimit: 1024 * 1024 * 1024 // Assume 1GB
    };
  }
  
  /**
   * Dispose resource monitor
   */
  public dispose(): void {
    this.stopPolling();
    this.stateChangeCallbacks = [];
    this.currentStatus = null;
  }
}

// Export a singleton instance
const resourceMonitor = new ResourceMonitor({
  pollingInterval: 10000, // 10 seconds
  memoryConstraints: {
    low: 80,    // 80% memory usage threshold
    critical: 90 // 90% memory usage threshold
  },
  enablePolling: true
});

export default resourceMonitor;
