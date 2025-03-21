/**
 * Performance Optimization Demo Page
 * 
 * Demonstrates the various performance optimizations implemented in Phase 4,
 * including worker pool, virtualized rendering, and performance monitoring.
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import Layout from '@/components/layout/Layout';
import PerformanceMetrics from '@/components/performance/PerformanceMetrics';
import VirtualizedList from '@/components/virtualization/VirtualizedList';
import AdaptiveLoadingDemo from '@/components/resource/AdaptiveLoadingDemo';
import performanceMonitor from '@/utils/performance/PerformanceMonitor';
import workerPoolService from '@/services/workerPool/WorkerPoolService';
import embeddingService from '@/services/embedding/embeddingService';
import { useKeyboardShortcuts } from '@/providers/accessibility/KeyboardShortcutsProvider';

// Mock data for demonstration
const generateMockData = (count: number) => {
  return Array.from({ length: count }, (_, index) => ({
    id: `item-${index}`,
    title: `Item ${index}`,
    description: `This is a description for item ${index}`,
    timestamp: Date.now() - Math.floor(Math.random() * 1000000)
  }));
};

// Worker pool demo component
const WorkerPoolDemo: React.FC = () => {
  const [status, setStatus] = useState(workerPoolService.getStatus());
  const [tasks, setTasks] = useState<{ id: string; status: string }[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  
  useEffect(() => {
    // Register status change listener
    workerPoolService.onStatusChange(setStatus);
    
    return () => {
      workerPoolService.offStatusChange(setStatus);
    };
  }, []);
  
  // Run a batch of embedding tasks
  const runBatchTasks = async () => {
    const batchSize = 10;
    const totalTasks = 50;
    
    setIsRunning(true);
    setTasks([]);
    
    try {
      // Initialize worker pool
      const pool = workerPoolService.getEmbeddingPool();
      await pool.initialize();
      
      // Generate random texts
      const texts = Array.from({ length: totalTasks }, (_, i) => 
        `This is test text ${i} for embedding generation. It contains some random words like ${
          Math.random().toString(36).substring(2, 7)
        } to make it unique.`
      );
      
      // Submit tasks in batches
      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);
        
        // Create task entries
        const newTasks = batch.map((_, index) => ({
          id: `task-${i + index}`,
          status: 'pending'
        }));
        
        setTasks(prev => [...prev, ...newTasks]);
        
        // Process batch with performance monitoring
        await performanceMonitor.measure('processBatch', async () => {
          try {
            // Generate embeddings in parallel
            await Promise.all(batch.map(async (text, index) => {
              try {
                // Add a delay to simulate variable processing times
                await new Promise(resolve => setTimeout(resolve, Math.random() * 200));
                
                // Generate embedding
                await embeddingService.generateEmbedding(text);
                
                // Update task status
                setTasks(prev => 
                  prev.map(task => 
                    task.id === `task-${i + index}` 
                      ? { ...task, status: 'completed' } 
                      : task
                  )
                );
              } catch (error) {
                console.error(`Error processing task ${i + index}:`, error);
                
                // Update task status
                setTasks(prev => 
                  prev.map(task => 
                    task.id === `task-${i + index}` 
                      ? { ...task, status: 'failed' } 
                      : task
                  )
                );
              }
            }));
          } catch (error) {
            console.error('Error processing batch:', error);
          }
        });
      }
    } catch (error) {
      console.error('Error running batch tasks:', error);
    } finally {
      setIsRunning(false);
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Worker Pool Demonstration</CardTitle>
        <CardDescription>
          Shows how the worker pool distributes tasks across multiple workers
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-4 gap-4">
          <div>
            <span className="text-sm text-muted-foreground">Max Workers</span>
            <p className="text-lg font-semibold">{status.embedding?.maxWorkers || 0}</p>
          </div>
          <div>
            <span className="text-sm text-muted-foreground">Active Workers</span>
            <p className="text-lg font-semibold">{status.embedding?.activeWorkers || 0}</p>
          </div>
          <div>
            <span className="text-sm text-muted-foreground">Completed Tasks</span>
            <p className="text-lg font-semibold">{status.embedding?.completedTasks || 0}</p>
          </div>
          <div>
            <span className="text-sm text-muted-foreground">Failed Tasks</span>
            <p className="text-lg font-semibold">{status.embedding?.failedTasks || 0}</p>
          </div>
        </div>
        
        <div className="flex space-x-4">
          <Button 
            onClick={runBatchTasks} 
            disabled={isRunning}
          >
            Run Batch Tasks
          </Button>
        </div>
        
        <div className="h-64 border rounded-md p-2 overflow-y-auto">
          <div className="space-y-2">
            {tasks.map(task => (
              <div 
                key={task.id} 
                className={`p-2 rounded-md ${
                  task.status === 'completed' 
                    ? 'bg-green-100 dark:bg-green-900/20' 
                    : task.status === 'failed'
                    ? 'bg-red-100 dark:bg-red-900/20'
                    : 'bg-gray-100 dark:bg-gray-800'
                }`}
              >
                <div className="flex justify-between">
                  <span className="font-medium">{task.id}</span>
                  <span className={`text-sm ${
                    task.status === 'completed' 
                      ? 'text-green-600 dark:text-green-400' 
                      : task.status === 'failed'
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}>
                    {task.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Virtual list demo component
const VirtualListDemo: React.FC = () => {
  const [items, setItems] = useState(generateMockData(1000));
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  
  // Load more items
  const loadMoreItems = async () => {
    performanceMonitor.startTimer('loadMoreItems');
    
    setIsLoading(true);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Generate more mock data
    const newItems = generateMockData(100);
    setItems(prev => [...prev, ...newItems]);
    
    // After 5000 items, stop loading more
    if (items.length + newItems.length >= 5000) {
      setHasMore(false);
    }
    
    setIsLoading(false);
    
    performanceMonitor.stopTimer('loadMoreItems');
  };
  
  // Render a list item
  const renderItem = (item: any, index: number) => (
    <div className="border-b p-3 last:border-0">
      <div className="font-medium">{item.title}</div>
      <div className="text-sm text-muted-foreground">{item.description}</div>
      <div className="text-xs text-muted-foreground mt-1">
        {new Date(item.timestamp).toLocaleString()}
      </div>
    </div>
  );
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Virtualized List Demonstration</CardTitle>
        <CardDescription>
          Shows how virtualization improves performance with large datasets
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-96 border rounded-md">
          <VirtualizedList
            data={items}
            itemHeight={80}
            renderItem={renderItem}
            loadMoreItems={loadMoreItems}
            hasMoreItems={hasMore}
            isLoading={isLoading}
            keyExtractor={(item) => item.id}
          />
        </div>
        <div className="mt-4 text-sm text-muted-foreground">
          Displaying {items.length} items with virtualization. Only visible items are rendered.
        </div>
      </CardContent>
    </Card>
  );
};

// Performance metrics demo component
const MetricsDemo: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  
  // Run different operations for performance monitoring
  const runOperations = async () => {
    setIsRunning(true);
    
    try {
      // Run a series of operations with different timings
      for (let i = 0; i < 10; i++) {
        // Operation 1: Fast operation
        await performanceMonitor.measure('fastOperation', async () => {
          await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
        });
        
        // Operation 2: Medium operation
        await performanceMonitor.measure('mediumOperation', async () => {
          await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 100));
        });
        
        // Operation 3: Slow operation
        await performanceMonitor.measure('slowOperation', async () => {
          await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));
        });
      }
    } catch (error) {
      console.error('Error running operations:', error);
    } finally {
      setIsRunning(false);
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance Metrics Demonstration</CardTitle>
        <CardDescription>
          Shows how the performance monitor tracks operation times and resource usage
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runOperations} 
          disabled={isRunning}
        >
          Run Sample Operations
        </Button>
        
        <PerformanceMetrics 
          refreshInterval={1000}
          showResourceUsage
          showWorkerPool
        />
      </CardContent>
    </Card>
  );
};

// Main performance page component
const PerformancePage: React.FC = () => {
  const keyboardShortcuts = useKeyboardShortcuts();
  
  // Register page-specific shortcuts
  useEffect(() => {
    // Add the performance page scope
    keyboardShortcuts.addScope('performance-page');
    
    // Register page-specific shortcuts
    const ids = [
      keyboardShortcuts.registerShortcut({
        description: 'Toggle worker pool tab',
        keys: { key: '1', alt: true },
        callback: () => {
          const workersTab = document.querySelector('[data-value="workers"]');
          if (workersTab) {
            (workersTab as HTMLElement).click();
          }
        },
        scope: 'performance-page',
        priority: 90,
        preventDefault: true
      }),
      keyboardShortcuts.registerShortcut({
        description: 'Toggle virtualization tab',
        keys: { key: '2', alt: true },
        callback: () => {
          const virtualizationTab = document.querySelector('[data-value="virtualization"]');
          if (virtualizationTab) {
            (virtualizationTab as HTMLElement).click();
          }
        },
        scope: 'performance-page',
        priority: 90,
        preventDefault: true
      }),
      keyboardShortcuts.registerShortcut({
        description: 'Toggle metrics tab',
        keys: { key: '3', alt: true },
        callback: () => {
          const metricsTab = document.querySelector('[data-value="metrics"]');
          if (metricsTab) {
            (metricsTab as HTMLElement).click();
          }
        },
        scope: 'performance-page',
        priority: 90,
        preventDefault: true
      }),
      keyboardShortcuts.registerShortcut({
        description: 'Toggle adaptive loading tab',
        keys: { key: '4', alt: true },
        callback: () => {
          const adaptiveTab = document.querySelector('[data-value="adaptive-loading"]');
          if (adaptiveTab) {
            (adaptiveTab as HTMLElement).click();
          }
        },
        scope: 'performance-page',
        priority: 90,
        preventDefault: true
      })
    ];
    
    // Clean up on unmount
    return () => {
      ids.forEach(id => keyboardShortcuts.unregisterShortcut(id));
      keyboardShortcuts.removeScope('performance-page');
    };
  }, [keyboardShortcuts]);
  
  return (
    <Layout>
      <div className="container py-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Performance Optimizations</h1>
          <p className="text-muted-foreground mb-6">
            Demonstrations of the performance optimization features implemented in Phase 4
          </p>
        </div>
        
        <Tabs defaultValue="workers">
          <TabsList className="mb-4">
            <TabsTrigger value="workers" data-value="workers">Worker Pool</TabsTrigger>
            <TabsTrigger value="virtualization" data-value="virtualization">Virtualization</TabsTrigger>
            <TabsTrigger value="metrics" data-value="metrics">Performance Metrics</TabsTrigger>
            <TabsTrigger value="adaptive-loading" data-value="adaptive-loading">Adaptive Loading</TabsTrigger>
          </TabsList>
          
          <TabsContent value="workers">
            <WorkerPoolDemo />
          </TabsContent>
          
          <TabsContent value="virtualization">
            <VirtualListDemo />
          </TabsContent>
          
          <TabsContent value="metrics">
            <MetricsDemo />
          </TabsContent>
          
          <TabsContent value="adaptive-loading">
            <AdaptiveLoadingDemo />
          </TabsContent>
        </Tabs>
        
        <Separator />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Implementation Details</CardTitle>
              <CardDescription>
                Technical details about the performance optimizations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">Worker Pool</h3>
                <p className="text-sm text-muted-foreground">
                  The worker pool manages multiple web workers to distribute tasks efficiently.
                  It dynamically creates workers based on available hardware and manages task
                  queues with priority support. This optimizes resource usage and prevents
                  the main thread from being blocked during intensive operations.
                </p>
              </div>
              
              <div>
                <h3 className="font-medium mb-2">Virtualized Rendering</h3>
                <p className="text-sm text-muted-foreground">
                  The virtualized list component only renders items that are visible in the
                  viewport, with a small overscan area to prevent flickering during scrolling.
                  This significantly improves performance when dealing with large datasets,
                  reducing memory usage and DOM operations.
                </p>
              </div>
              
              <div>
                <h3 className="font-medium mb-2">Performance Monitoring</h3>
                <p className="text-sm text-muted-foreground">
                  The performance monitoring utility tracks operation times, memory usage,
                  and other metrics to help identify bottlenecks and optimize critical paths.
                  It provides visualization of performance data for easier analysis.
                </p>
              </div>
              
              <div>
                <h3 className="font-medium mb-2">Adaptive Loading</h3>
                <p className="text-sm text-muted-foreground">
                  The adaptive loading system adjusts batch sizes and loading behavior based
                  on available system resources. This ensures optimal performance across
                  different devices and reduces the risk of crashes due to memory constraints.
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Benefits</CardTitle>
              <CardDescription>
                How these optimizations improve the application
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">Improved Responsiveness</h3>
                <p className="text-sm text-muted-foreground">
                  By moving intensive operations off the main thread, the UI remains responsive
                  even during complex computations like embedding generation or similarity
                  calculations.
                </p>
              </div>
              
              <div>
                <h3 className="font-medium mb-2">Reduced Memory Usage</h3>
                <p className="text-sm text-muted-foreground">
                  Virtualization significantly reduces memory usage by only rendering visible
                  elements. This is especially important for large datasets with thousands
                  of items.
                </p>
              </div>
              
              <div>
                <h3 className="font-medium mb-2">Better Resource Utilization</h3>
                <p className="text-sm text-muted-foreground">
                  The worker pool automatically scales based on available hardware, ensuring
                  optimal utilization of system resources. This improves performance on
                  machines with multiple CPU cores.
                </p>
              </div>
              
              <div>
                <h3 className="font-medium mb-2">Adaptive Performance</h3>
                <p className="text-sm text-muted-foreground">
                  The adaptive loading system ensures that the application performs well
                  across different devices by adjusting its behavior based on available
                  resources. This provides a consistent experience for all users.
                </p>
              </div>
              
              <div>
                <h3 className="font-medium mb-2">Insightful Performance Data</h3>
                <p className="text-sm text-muted-foreground">
                  Performance monitoring provides valuable insights into application behavior,
                  helping developers identify and fix bottlenecks before they impact users.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default PerformancePage;
