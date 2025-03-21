/**
 * Performance Metrics Component
 * 
 * Displays performance metrics and resource usage in a UI component.
 * Can be used for debugging, monitoring, or user information.
 */

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import performanceMonitor, { PerformanceMetric, ResourceUsage } from '@/utils/performance/PerformanceMonitor';
import workerPoolService from '@/services/workerPool/WorkerPoolService';
import { PoolStatus } from '@/services/workerPool/WorkerPool';

type PerformanceMetricsProps = {
  refreshInterval?: number;
  showResourceUsage?: boolean;
  showWorkerPool?: boolean;
  maxMetrics?: number;
};

/**
 * Component that displays performance metrics and resource usage
 */
const PerformanceMetrics: React.FC<PerformanceMetricsProps> = ({
  refreshInterval = 2000,
  showResourceUsage = true,
  showWorkerPool = true,
  maxMetrics = 10
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [resourceUsage, setResourceUsage] = useState<ResourceUsage[]>([]);
  const [memoryUsage, setMemoryUsage] = useState<{ used: number; total: number; limit: number }>({
    used: 0,
    total: 0,
    limit: 0
  });
  const [workerPoolStatus, setWorkerPoolStatus] = useState<{ embedding: PoolStatus | null }>({
    embedding: null
  });
  const [activeTab, setActiveTab] = useState('metrics');

  // Fetch metrics at regular intervals
  useEffect(() => {
    const fetchMetrics = () => {
      setMetrics(performanceMonitor.getMetrics().slice(-maxMetrics));
      
      if (showResourceUsage) {
        setResourceUsage(performanceMonitor.getResourceUsageHistory(maxMetrics));
        
        const memory = performanceMonitor.getMemoryUsage();
        setMemoryUsage({
          used: memory.usedJSHeapSize || 0,
          total: memory.totalJSHeapSize || 0,
          limit: memory.jsHeapSizeLimit || 0
        });
      }
      
      if (showWorkerPool) {
        setWorkerPoolStatus(workerPoolService.getStatus());
      }
    };

    // Initial fetch
    fetchMetrics();

    // Set up interval
    const interval = setInterval(fetchMetrics, refreshInterval);

    // Clean up
    return () => {
      clearInterval(interval);
    };
  }, [refreshInterval, showResourceUsage, showWorkerPool, maxMetrics]);

  // Format bytes to human-readable format
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format duration to human-readable format
  const formatDuration = (duration: number): string => {
    if (duration < 1) return `${(duration * 1000).toFixed(2)} μs`;
    if (duration < 1000) return `${duration.toFixed(2)} ms`;
    return `${(duration / 1000).toFixed(2)} s`;
  };

  // Generate chart data from performance metrics
  const generateMetricsChartData = () => {
    const operationNames = [...new Set(metrics.map(m => m.name))];
    const chartData = operationNames.map(name => {
      const operationMetrics = metrics.filter(m => m.name === name);
      const averageDuration = operationMetrics.reduce((sum, m) => sum + m.duration, 0) / operationMetrics.length;
      
      return {
        name,
        avgDuration: averageDuration,
        count: operationMetrics.length
      };
    });
    
    return chartData;
  };

  // Generate chart data from resource usage
  const generateResourceChartData = () => {
    return resourceUsage.map((usage, index) => ({
      name: `${index}`,
      memory: usage.memory.usedJSHeapSize ? usage.memory.usedJSHeapSize / (1024 * 1024) : 0, // Convert to MB
      timestamp: usage.timestamp
    }));
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Performance Metrics</CardTitle>
        <CardDescription>
          Monitor application performance and resource usage
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="metrics">Operation Metrics</TabsTrigger>
            {showResourceUsage && <TabsTrigger value="resource">Resource Usage</TabsTrigger>}
            {showWorkerPool && <TabsTrigger value="workers">Worker Pool</TabsTrigger>}
          </TabsList>
          
          <TabsContent value="metrics">
            <div className="space-y-4">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={generateMetricsChartData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value) => [`${formatDuration(Number(value))}`, 'Avg Duration']}
                    />
                    <Bar dataKey="avgDuration" fill="#8884d8" name="Avg Duration" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Operation</TableHead>
                    <TableHead>Avg Duration</TableHead>
                    <TableHead>Count</TableHead>
                    <TableHead>Last Executed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...new Set(metrics.map(m => m.name))].map(name => {
                    const operationMetrics = metrics.filter(m => m.name === name);
                    const avgDuration = operationMetrics.reduce((sum, m) => sum + m.duration, 0) / operationMetrics.length;
                    const lastExecuted = new Date(Math.max(...operationMetrics.map(m => m.timestamp)));
                    
                    return (
                      <TableRow key={name}>
                        <TableCell>{name}</TableCell>
                        <TableCell>{formatDuration(avgDuration)}</TableCell>
                        <TableCell>{operationMetrics.length}</TableCell>
                        <TableCell>{lastExecuted.toLocaleTimeString()}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
          
          {showResourceUsage && (
            <TabsContent value="resource">
              <div className="space-y-4">
                <div>
                  <h3 className="text-md font-medium mb-2">Memory Usage</h3>
                  <div className="grid grid-cols-3 gap-4 mb-2">
                    <div>
                      <span className="text-sm text-muted-foreground">Used</span>
                      <p className="text-lg font-semibold">{formatBytes(memoryUsage.used)}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Total Allocated</span>
                      <p className="text-lg font-semibold">{formatBytes(memoryUsage.total)}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Limit</span>
                      <p className="text-lg font-semibold">{formatBytes(memoryUsage.limit)}</p>
                    </div>
                  </div>
                  <Progress 
                    value={(memoryUsage.used / memoryUsage.limit) * 100} 
                    className="h-2"
                  />
                </div>
                
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={generateResourceChartData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value) => [`${value} MB`, 'Memory Usage']}
                      />
                      <Bar dataKey="memory" fill="#82ca9d" name="Memory (MB)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </TabsContent>
          )}
          
          {showWorkerPool && (
            <TabsContent value="workers">
              <div className="space-y-4">
                <div>
                  <h3 className="text-md font-medium mb-2">Embedding Worker Pool</h3>
                  {workerPoolStatus.embedding ? (
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <span className="text-sm text-muted-foreground">Active Workers</span>
                        <p className="text-lg font-semibold">
                          {workerPoolStatus.embedding.activeWorkers} / {workerPoolStatus.embedding.maxWorkers}
                        </p>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">Busy Workers</span>
                        <p className="text-lg font-semibold">
                          {workerPoolStatus.embedding.busyWorkers} / {workerPoolStatus.embedding.activeWorkers}
                        </p>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">Queued Tasks</span>
                        <p className="text-lg font-semibold">{workerPoolStatus.embedding.queuedTasks}</p>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">Completed Tasks</span>
                        <p className="text-lg font-semibold">{workerPoolStatus.embedding.completedTasks}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">Worker pool not initialized</p>
                  )}
                </div>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default PerformanceMetrics;
