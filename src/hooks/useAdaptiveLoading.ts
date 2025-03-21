/**
 * Adaptive Loading Hook
 * 
 * Custom hook for loading data with adaptive behavior based on system resources.
 * Automatically adjusts batch sizes, throttles loading, and prioritizes tasks
 * based on available memory and device capabilities.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import resourceMonitor from '@/utils/resource/ResourceMonitor';
import performanceMonitor from '@/utils/performance/PerformanceMonitor';

export type AdaptiveLoadingOptions<T> = {
  // Function to load a batch of data
  loadBatch: (offset: number, limit: number) => Promise<T[]>;
  
  // Default batch size
  defaultBatchSize?: number;
  
  // Minimum batch size
  minBatchSize?: number;
  
  // Maximum batch size
  maxBatchSize?: number;
  
  // Performance threshold in ms (reduce batch size if loading takes longer)
  performanceThreshold?: number;
  
  // Enable resource monitoring
  enableResourceMonitoring?: boolean;
  
  // Delay between batches in ms
  batchDelay?: number;
  
  // Optional total count if known
  totalCount?: number;
  
  // Dependency array for reloading
  dependencies?: any[];
};

export type AdaptiveLoadingResult<T> = {
  // Loaded data
  data: T[];
  
  // Loading state
  isLoading: boolean;
  
  // Error state
  error: Error | null;
  
  // Progress information
  progress: {
    loaded: number;
    total: number | null;
    percentage: number | null;
  };
  
  // Resource status
  resourceStatus: {
    memoryState: 'normal' | 'low' | 'critical';
    batchSize: number;
  };
  
  // Load more data
  loadMore: () => Promise<void>;
  
  // Reload all data
  reload: () => Promise<void>;
  
  // Check if there's more data to load
  hasMore: boolean;
};

/**
 * Hook for adaptive data loading based on system resources
 */
function useAdaptiveLoading<T>({
  loadBatch,
  defaultBatchSize = 100,
  minBatchSize = 10,
  maxBatchSize = 500,
  performanceThreshold = 300,
  enableResourceMonitoring = true,
  batchDelay = 0,
  totalCount,
  dependencies = []
}: AdaptiveLoadingOptions<T>): AdaptiveLoadingResult<T> {
  // Loaded data
  const [data, setData] = useState<T[]>([]);
  
  // Loading state
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // Error state
  const [error, setError] = useState<Error | null>(null);
  
  // Current offset
  const [offset, setOffset] = useState<number>(0);
  
  // Current batch size
  const [batchSize, setBatchSize] = useState<number>(defaultBatchSize);
  
  // Memory state
  const [memoryState, setMemoryState] = useState<'normal' | 'low' | 'critical'>('normal');
  
  // Whether there's more data to load
  const [hasMore, setHasMore] = useState<boolean>(true);
  
  // Track if component is mounted
  const mounted = useRef<boolean>(true);
  
  // Auto-adjust batch size based on loading performance
  const adjustBatchSize = useCallback((loadingTime: number) => {
    if (!enableResourceMonitoring) {
      return;
    }
    
    let newBatchSize = batchSize;
    
    // Adjust based on loading time
    if (loadingTime > performanceThreshold) {
      // Reduce batch size if loading takes too long
      newBatchSize = Math.max(minBatchSize, Math.floor(batchSize * 0.8));
    } else if (loadingTime < performanceThreshold / 2) {
      // Increase batch size if loading is fast
      newBatchSize = Math.min(maxBatchSize, Math.floor(batchSize * 1.2));
    }
    
    // Further adjust based on memory state
    const recommendedBatchSize = resourceMonitor.getRecommendedBatchSize(
      newBatchSize,
      minBatchSize
    );
    
    if (recommendedBatchSize !== batchSize) {
      setBatchSize(recommendedBatchSize);
    }
  }, [batchSize, minBatchSize, maxBatchSize, performanceThreshold, enableResourceMonitoring]);
  
  // Update memory state when resource status changes
  useEffect(() => {
    if (!enableResourceMonitoring) {
      return;
    }
    
    const handleResourceChange = (status: any) => {
      if (mounted.current) {
        setMemoryState(status.memory.state);
        
        // Adjust batch size based on memory state
        const recommendedBatchSize = resourceMonitor.getRecommendedBatchSize(
          batchSize,
          minBatchSize
        );
        
        if (recommendedBatchSize !== batchSize) {
          setBatchSize(recommendedBatchSize);
        }
      }
    };
    
    // Register resource change listener
    resourceMonitor.onStateChange(handleResourceChange);
    
    // Initial status
    const initialStatus = resourceMonitor.getStatus();
    if (initialStatus) {
      handleResourceChange(initialStatus);
    }
    
    return () => {
      resourceMonitor.offStateChange(handleResourceChange);
    };
  }, [batchSize, minBatchSize, enableResourceMonitoring]);
  
  // Load more data
  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) {
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Measure loading time for performance monitoring
      const startTime = performance.now();
      
      // Load batch with current offset and batch size
      const newItems = await loadBatch(offset, batchSize);
      
      // Calculate loading time
      const loadingTime = performance.now() - startTime;
      
      // Record performance metric
      performanceMonitor.recordMetric({
        name: 'loadBatch',
        duration: loadingTime,
        timestamp: Date.now(),
        metadata: {
          offset,
          batchSize,
          itemCount: newItems.length
        }
      });
      
      // Adjust batch size based on loading time
      adjustBatchSize(loadingTime);
      
      if (mounted.current) {
        // Check if we've reached the end
        if (newItems.length === 0 || (totalCount !== undefined && offset + newItems.length >= totalCount)) {
          setHasMore(false);
        }
        
        // Update data
        setData(prevData => [...prevData, ...newItems]);
        
        // Update offset
        setOffset(prevOffset => prevOffset + newItems.length);
      }
    } catch (err) {
      if (mounted.current) {
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    } finally {
      if (mounted.current) {
        setIsLoading(false);
      }
    }
  }, [loadBatch, offset, batchSize, isLoading, hasMore, totalCount, adjustBatchSize]);
  
  // Reload all data
  const reload = useCallback(async () => {
    if (isLoading) {
      return;
    }
    
    // Reset state
    setData([]);
    setOffset(0);
    setError(null);
    setHasMore(true);
    
    // Load first batch
    try {
      setIsLoading(true);
      
      // Measure loading time for performance monitoring
      const startTime = performance.now();
      
      // Load first batch
      const newItems = await loadBatch(0, batchSize);
      
      // Calculate loading time
      const loadingTime = performance.now() - startTime;
      
      // Record performance metric
      performanceMonitor.recordMetric({
        name: 'reloadData',
        duration: loadingTime,
        timestamp: Date.now(),
        metadata: {
          batchSize,
          itemCount: newItems.length
        }
      });
      
      // Adjust batch size based on loading time
      adjustBatchSize(loadingTime);
      
      if (mounted.current) {
        // Check if we've reached the end
        if (newItems.length === 0 || (totalCount !== undefined && newItems.length >= totalCount)) {
          setHasMore(false);
        }
        
        // Update data
        setData(newItems);
        
        // Update offset
        setOffset(newItems.length);
      }
    } catch (err) {
      if (mounted.current) {
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    } finally {
      if (mounted.current) {
        setIsLoading(false);
      }
    }
  }, [loadBatch, batchSize, isLoading, totalCount, adjustBatchSize]);
  
  // Initial load and reload when dependencies change
  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependencies]);
  
  // Clean up on unmount
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  
  // Calculate progress
  const progress = {
    loaded: data.length,
    total: totalCount || null,
    percentage: totalCount ? (data.length / totalCount) * 100 : null
  };
  
  // Resource status
  const resourceStatus = {
    memoryState,
    batchSize
  };
  
  return {
    data,
    isLoading,
    error,
    progress,
    resourceStatus,
    loadMore,
    reload,
    hasMore
  };
}

export default useAdaptiveLoading;
