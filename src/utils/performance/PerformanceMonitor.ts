/**
 * Performance Monitor
 * 
 * Utility for monitoring performance of operations and resource usage.
 * Provides methods for timing operations, tracking resource usage,
 * and measuring memory consumption.
 */

export type PerformanceMetric = {
  name: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, any>;
};

export type ResourceUsage = {
  memory: MemoryUsage;
  cpu?: number; // Not always available in browsers
  timestamp: number;
};

export type MemoryUsage = {
  totalJSHeapSize?: number;
  usedJSHeapSize?: number;
  jsHeapSizeLimit?: number;
};

export type PerformanceConfig = {
  maxMetrics?: number;
  enableResourceMonitoring?: boolean;
};

/**
 * Monitor application performance and resource usage
 */
class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private resourceUsage: ResourceUsage[] = [];
  private maxMetrics: number;
  private enableResourceMonitoring: boolean;
  private timers: Map<string, number> = new Map();
  private resourceMonitoringInterval: number | null = null;
  
  constructor(config?: PerformanceConfig) {
    this.maxMetrics = config?.maxMetrics || 1000;
    this.enableResourceMonitoring = config?.enableResourceMonitoring || false;
    
    if (this.enableResourceMonitoring) {
      this.startResourceMonitoring();
    }
  }
  
  /**
   * Start timing an operation
   * @param name Operation name
   */
  public startTimer(name: string): void {
    this.timers.set(name, performance.now());
  }
  
  /**
   * Stop timing an operation and record the metric
   * @param name Operation name
   * @param metadata Additional metadata for the operation
   * @returns Duration in milliseconds
   */
  public stopTimer(name: string, metadata?: Record<string, any>): number {
    const startTime = this.timers.get(name);
    if (startTime === undefined) {
      console.warn(`No timer found for ${name}`);
      return 0;
    }
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    this.recordMetric({
      name,
      duration,
      timestamp: Date.now(),
      metadata
    });
    
    this.timers.delete(name);
    return duration;
  }
  
  /**
   * Record a performance metric
   * @param metric Performance metric object
   */
  public recordMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);
    this.trimMetrics();
  }
  
  /**
   * Get all recorded metrics
   * @param name Optional filter by operation name
   * @returns Array of performance metrics
   */
  public getMetrics(name?: string): PerformanceMetric[] {
    if (name) {
      return this.metrics.filter(metric => metric.name === name);
    }
    return [...this.metrics];
  }
  
  /**
   * Get average duration for a specific operation
   * @param name Operation name
   * @returns Average duration in milliseconds
   */
  public getAverageDuration(name: string): number {
    const metrics = this.metrics.filter(metric => metric.name === name);
    if (metrics.length === 0) {
      return 0;
    }
    
    const totalDuration = metrics.reduce((sum, metric) => sum + metric.duration, 0);
    return totalDuration / metrics.length;
  }
  
  /**
   * Get current memory usage
   * @returns Memory usage object
   */
  public getMemoryUsage(): MemoryUsage {
    if (performance && 'memory' in performance) {
      const memory = (performance as any).memory;
      return {
        totalJSHeapSize: memory.totalJSHeapSize,
        usedJSHeapSize: memory.usedJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit
      };
    }
    
    return {};
  }
  
  /**
   * Get resource usage history
   * @param limit Maximum number of entries to return
   * @returns Array of resource usage objects
   */
  public getResourceUsageHistory(limit?: number): ResourceUsage[] {
    const history = [...this.resourceUsage];
    if (limit && limit > 0) {
      return history.slice(-limit);
    }
    return history;
  }
  
  /**
   * Clear all recorded metrics
   */
  public clearMetrics(): void {
    this.metrics = [];
  }
  
  /**
   * Start monitoring resource usage
   * @param intervalMs Monitoring interval in milliseconds
   */
  public startResourceMonitoring(intervalMs: number = 5000): void {
    if (this.resourceMonitoringInterval !== null) {
      this.stopResourceMonitoring();
    }
    
    this.enableResourceMonitoring = true;
    this.resourceMonitoringInterval = window.setInterval(() => {
      this.recordResourceUsage();
    }, intervalMs);
  }
  
  /**
   * Stop monitoring resource usage
   */
  public stopResourceMonitoring(): void {
    if (this.resourceMonitoringInterval !== null) {
      clearInterval(this.resourceMonitoringInterval);
      this.resourceMonitoringInterval = null;
    }
    this.enableResourceMonitoring = false;
  }
  
  /**
   * Dispose of the performance monitor
   */
  public dispose(): void {
    this.stopResourceMonitoring();
    this.metrics = [];
    this.resourceUsage = [];
    this.timers.clear();
  }
  
  /**
   * Measure the performance of a function
   * @param name Operation name
   * @param fn Function to measure
   * @param metadata Additional metadata for the operation
   * @returns Result of the function
   */
  public async measure<T>(
    name: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    this.startTimer(name);
    try {
      const result = await fn();
      this.stopTimer(name, metadata);
      return result;
    } catch (error) {
      this.stopTimer(name, { ...metadata, error: true });
      throw error;
    }
  }
  
  /**
   * Measure the performance of a synchronous function
   * @param name Operation name
   * @param fn Function to measure
   * @param metadata Additional metadata for the operation
   * @returns Result of the function
   */
  public measureSync<T>(
    name: string,
    fn: () => T,
    metadata?: Record<string, any>
  ): T {
    this.startTimer(name);
    try {
      const result = fn();
      this.stopTimer(name, metadata);
      return result;
    } catch (error) {
      this.stopTimer(name, { ...metadata, error: true });
      throw error;
    }
  }
  
  /**
   * Record current resource usage
   */
  private recordResourceUsage(): void {
    const memory = this.getMemoryUsage();
    const usage: ResourceUsage = {
      memory,
      timestamp: Date.now()
    };
    
    this.resourceUsage.push(usage);
    this.trimResourceUsage();
  }
  
  /**
   * Trim metrics array to maxMetrics
   */
  private trimMetrics(): void {
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }
  
  /**
   * Trim resource usage array to maxMetrics
   */
  private trimResourceUsage(): void {
    if (this.resourceUsage.length > this.maxMetrics) {
      this.resourceUsage = this.resourceUsage.slice(-this.maxMetrics);
    }
  }
}

// Export a singleton instance
const performanceMonitor = new PerformanceMonitor();
export default performanceMonitor;
