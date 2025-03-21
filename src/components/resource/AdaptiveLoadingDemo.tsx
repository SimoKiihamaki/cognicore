/**
 * Adaptive Loading Demo Component
 * 
 * Demonstrates the adaptive loading capabilities with resource monitoring.
 * Shows how batch sizes and loading behavior adapt based on system resources.
 */

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Info, AlertTriangle, AlertCircle, Check } from 'lucide-react';
import useAdaptiveLoading from '@/hooks/useAdaptiveLoading';
import VirtualizedList from '@/components/virtualization/VirtualizedList';
import resourceMonitor from '@/utils/resource/ResourceMonitor';

// Mock item type
type Item = {
  id: string;
  title: string;
  description: string;
  size: number; // simulated size in KB
  createdAt: Date;
};

// Generate mock items with variable size
const generateMockItems = (count: number, offset: number): Item[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: `item-${offset + i}`,
    title: `Item ${offset + i}`,
    description: `This is a description for item ${offset + i} that contains variable length text to simulate different content sizes.`,
    size: Math.floor(Math.random() * 500) + 10, // 10-510 KB
    createdAt: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000)
  }));
};

// Component that demonstrates adaptive loading
const AdaptiveLoadingDemo: React.FC = () => {
  // Settings
  const [defaultBatchSize, setDefaultBatchSize] = useState(50);
  const [artificialDelay, setArtificialDelay] = useState(0);
  const [memoryConsumption, setMemoryConsumption] = useState(0);
  const [enableResourceMonitoring, setEnableResourceMonitoring] = useState(true);
  const [testData, setTestData] = useState<ArrayBuffer | null>(null);
  
  // Load batch with artificial delay and memory consumption for testing
  const loadBatch = useCallback(async (offset: number, limit: number): Promise<Item[]> => {
    // Add artificial delay
    if (artificialDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, artificialDelay));
    }
    
    // Simulate memory consumption by allocating memory
    if (memoryConsumption > 0) {
      const megabytes = memoryConsumption;
      const bytesPerMB = 1024 * 1024;
      const totalBytes = megabytes * bytesPerMB;
      
      // Allocate memory
      setTestData(new ArrayBuffer(totalBytes));
    }
    
    // Generate items
    return generateMockItems(limit, offset);
  }, [artificialDelay, memoryConsumption]);
  
  // Use adaptive loading hook
  const {
    data,
    isLoading,
    error,
    progress,
    resourceStatus,
    loadMore,
    reload,
    hasMore
  } = useAdaptiveLoading<Item>({
    loadBatch,
    defaultBatchSize,
    minBatchSize: 10,
    maxBatchSize: 200,
    enableResourceMonitoring,
    dependencies: [defaultBatchSize, artificialDelay, memoryConsumption, enableResourceMonitoring]
  });
  
  // Force garbage collection (for demo purposes)
  const forceGC = () => {
    setTestData(null);
    
    // Run multiple times to help browser GC
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        // Reference to large object will be removed
        setTestData(null);
      }, i * 100);
    }
  };
  
  // Render item in virtualized list
  const renderItem = (item: Item, index: number) => (
    <div className="p-3 border-b last:border-b-0">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-medium">{item.title}</h3>
          <p className="text-sm text-muted-foreground">{item.description}</p>
        </div>
        <Badge variant="outline">{item.size} KB</Badge>
      </div>
      <div className="flex justify-between items-center mt-2 text-xs text-muted-foreground">
        <span>ID: {item.id}</span>
        <span>{item.createdAt.toLocaleString()}</span>
      </div>
    </div>
  );
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Resource-Aware Loading</CardTitle>
          <CardDescription>
            Demonstrates how data loading adapts based on system resources
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Settings</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="batch-size">Default Batch Size: {defaultBatchSize}</Label>
                <Slider 
                  id="batch-size"
                  min={10} 
                  max={200} 
                  step={10} 
                  value={[defaultBatchSize]} 
                  onValueChange={(value) => setDefaultBatchSize(value[0])}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="artificial-delay">Artificial Delay: {artificialDelay}ms</Label>
                <Slider 
                  id="artificial-delay"
                  min={0} 
                  max={2000} 
                  step={100} 
                  value={[artificialDelay]} 
                  onValueChange={(value) => setArtificialDelay(value[0])}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="memory-consumption">
                  Memory Consumption: {memoryConsumption} MB
                </Label>
                <Slider 
                  id="memory-consumption"
                  min={0} 
                  max={500} 
                  step={10} 
                  value={[memoryConsumption]} 
                  onValueChange={(value) => setMemoryConsumption(value[0])}
                />
              </div>
              
              <div className="flex items-center space-x-2 pt-6">
                <Switch
                  id="resource-monitoring"
                  checked={enableResourceMonitoring}
                  onCheckedChange={setEnableResourceMonitoring}
                />
                <Label htmlFor="resource-monitoring">Enable Resource Monitoring</Label>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <Button onClick={reload}>Reload Data</Button>
              <Button onClick={forceGC} variant="secondary">Release Memory</Button>
            </div>
          </div>
          
          <Separator />
          
          {/* Status */}
          <div className="space-y-3">
            <h3 className="text-lg font-medium">Status</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <span className="text-sm text-muted-foreground">Memory State</span>
                <div className="flex items-center mt-1">
                  {resourceStatus.memoryState === 'normal' && (
                    <Badge className="bg-green-500">
                      <Check className="w-3 h-3 mr-1" /> Normal
                    </Badge>
                  )}
                  {resourceStatus.memoryState === 'low' && (
                    <Badge className="bg-yellow-500">
                      <AlertTriangle className="w-3 h-3 mr-1" /> Low
                    </Badge>
                  )}
                  {resourceStatus.memoryState === 'critical' && (
                    <Badge className="bg-red-500">
                      <AlertCircle className="w-3 h-3 mr-1" /> Critical
                    </Badge>
                  )}
                </div>
              </div>
              
              <div>
                <span className="text-sm text-muted-foreground">Current Batch Size</span>
                <p className="text-lg font-semibold">{resourceStatus.batchSize}</p>
              </div>
              
              <div>
                <span className="text-sm text-muted-foreground">Loaded Items</span>
                <p className="text-lg font-semibold">{data.length}</p>
              </div>
            </div>
            
            {resourceStatus.memoryState !== 'normal' && (
              <Alert variant={resourceStatus.memoryState === 'critical' ? 'destructive' : 'warning'}>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>
                  {resourceStatus.memoryState === 'critical' 
                    ? 'Critical Memory State' 
                    : 'Low Memory State'}
                </AlertTitle>
                <AlertDescription>
                  {resourceStatus.memoryState === 'critical'
                    ? 'The system is running critically low on memory. Batch sizes have been reduced to minimize memory usage.'
                    : 'The system is running low on memory. Batch sizes have been reduced to optimize loading.'}
                </AlertDescription>
              </Alert>
            )}
            
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error Loading Data</AlertTitle>
                <AlertDescription>
                  {error.message}
                </AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Loading Progress</span>
                <span>{progress.loaded} items loaded</span>
              </div>
              <Progress value={isLoading ? undefined : 100} />
            </div>
          </div>
          
          <Separator />
          
          {/* Data Display */}
          <div className="space-y-3">
            <h3 className="text-lg font-medium">Data</h3>
            
            <div className="border rounded-md h-80">
              {isLoading && data.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <Loader2 className="animate-spin mr-2" />
                  <span>Loading data...</span>
                </div>
              ) : (
                <VirtualizedList
                  data={data}
                  itemHeight={88}
                  renderItem={renderItem}
                  loadMoreItems={loadMore}
                  hasMoreItems={hasMore}
                  isLoading={isLoading}
                  keyExtractor={(item) => item.id}
                  className="h-full"
                  footer={
                    isLoading ? (
                      <div className="flex justify-center items-center p-4">
                        <Loader2 className="animate-spin mr-2" />
                        <span>Loading more...</span>
                      </div>
                    ) : hasMore ? (
                      <Button 
                        onClick={loadMore} 
                        variant="ghost" 
                        className="w-full"
                      >
                        Load More
                      </Button>
                    ) : (
                      <div className="text-center p-4 text-muted-foreground">
                        No more items to load
                      </div>
                    )
                  }
                />
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdaptiveLoadingDemo;
