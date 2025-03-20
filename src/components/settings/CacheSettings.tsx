import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  CacheIcon, 
  MemoryStick, 
  Trash2, 
  BarChart3, 
  RefreshCw,
  Check,
  AlertTriangle,
  Ban
} from 'lucide-react';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import cacheService, { CacheNamespaces, CacheStats } from '@/services/cacheService';
import { useLocalStorage } from '@/hooks/useLocalStorage';

// Format bytes to human-readable string
function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Component for managing application cache settings
 */
const CacheSettings = () => {
  const { toast } = useToast();
  const [cacheStats, setCacheStats] = useState<Record<string, CacheStats>>({});
  const [memoryUsage, setMemoryUsage] = useState({ current: 0, max: 0, percentage: 0 });
  const [isInitialized, setIsInitialized] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [maxCacheSize, setMaxCacheSize] = useLocalStorage<number>('cognicore-max-cache-size', 50);
  const [selectedNamespace, setSelectedNamespace] = useState<string | null>(null);
  
  // Initialize cache service when component mounts
  useEffect(() => {
    if (!isInitialized) {
      cacheService.initialize(maxCacheSize);
      setIsInitialized(true);
    }
    
    refreshStats();
    
    // Set up interval to refresh stats periodically
    const interval = setInterval(refreshStats, 30000); // Every 30 seconds
    
    return () => {
      clearInterval(interval);
    };
  }, [isInitialized, maxCacheSize]);
  
  // Refresh cache statistics
  const refreshStats = () => {
    setIsRefreshing(true);
    
    // Get cache stats
    const stats = cacheService.getStats();
    setCacheStats(stats);
    
    // Get memory usage
    const usage = cacheService.getMemoryUsage();
    setMemoryUsage(usage);
    
    setIsRefreshing(false);
  };
  
  // Clear all cache
  const clearAllCache = () => {
    cacheService.clear();
    
    toast({
      title: "Cache Cleared",
      description: "Application cache has been completely cleared."
    });
    
    refreshStats();
  };
  
  // Clear a specific namespace
  const clearNamespace = (namespace: string) => {
    cacheService.clearNamespace(namespace);
    
    toast({
      title: "Cache Namespace Cleared",
      description: `The "${namespace}" cache has been cleared.`
    });
    
    refreshStats();
  };
  
  // Update maximum cache size
  const updateMaxCacheSize = (size: number) => {
    // Initialize cache with new size
    cacheService.initialize(size);
    setMaxCacheSize(size);
    
    toast({
      title: "Cache Size Updated",
      description: `Maximum cache size set to ${size}MB.`
    });
    
    refreshStats();
  };
  
  // Run manual cleanup
  const runCleanup = () => {
    cacheService.cleanup();
    
    toast({
      title: "Cache Cleanup Complete",
      description: "Manual cache cleanup has been performed."
    });
    
    refreshStats();
  };
  
  // Get status indicator for memory usage
  const getMemoryStatusIndicator = () => {
    const percentage = memoryUsage.percentage;
    
    if (percentage < 50) {
      return (
        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-600/20">
          <Check className="h-3 w-3 mr-1" />
          <span>Optimal</span>
        </Badge>
      );
    } else if (percentage < 80) {
      return (
        <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-600/20">
          <AlertTriangle className="h-3 w-3 mr-1" />
          <span>Moderate</span>
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-600/20">
          <Ban className="h-3 w-3 mr-1" />
          <span>High Usage</span>
        </Badge>
      );
    }
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CacheIcon className="mr-2 h-5 w-5" />
            Cache Management
          </CardTitle>
          <CardDescription>
            Monitor and manage application cache to optimize performance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Memory Usage */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-sm">Memory Usage</Label>
              {getMemoryStatusIndicator()}
            </div>
            <div className="space-y-1">
              <Progress value={memoryUsage.percentage} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>
                  {formatBytes(memoryUsage.current)} used
                </span>
                <span>
                  {formatBytes(memoryUsage.max)} max
                </span>
              </div>
            </div>
          </div>
          
          {/* Cache Size Setting */}
          <div className="space-y-2 pt-2">
            <Label htmlFor="max-cache-size">Maximum Cache Size</Label>
            <div className="flex items-center space-x-2">
              <Select
                value={maxCacheSize.toString()}
                onValueChange={(value) => updateMaxCacheSize(parseInt(value))}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 MB</SelectItem>
                  <SelectItem value="25">25 MB</SelectItem>
                  <SelectItem value="50">50 MB</SelectItem>
                  <SelectItem value="100">100 MB</SelectItem>
                  <SelectItem value="200">200 MB</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">
                <MemoryStick className="h-4 w-4 inline mr-1" />
                Higher values improve performance but use more memory
              </span>
            </div>
          </div>
          
          <Separator className="my-4" />
          
          {/* Cache Statistics */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-sm">Cache Statistics</Label>
              <Button 
                variant="outline" 
                size="sm"
                onClick={refreshStats}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
            
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {Object.entries(cacheStats).map(([namespace, stats]) => (
                <Card key={namespace} className="overflow-hidden">
                  <CardHeader className="p-3 pb-1">
                    <CardTitle className="text-sm font-medium">
                      {namespace} Cache
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="rounded-md bg-muted p-2">
                        <div className="font-medium">{stats.hits}</div>
                        <div className="text-muted-foreground">Hits</div>
                      </div>
                      <div className="rounded-md bg-muted p-2">
                        <div className="font-medium">{stats.misses}</div>
                        <div className="text-muted-foreground">Misses</div>
                      </div>
                      <div className="rounded-md bg-muted p-2">
                        <div className="font-medium">{formatBytes(stats.size)}</div>
                        <div className="text-muted-foreground">Size</div>
                      </div>
                    </div>
                    
                    <div className="mt-2 text-xs text-muted-foreground">
                      Last cleaned: {stats.lastCleaned 
                        ? new Date(stats.lastCleaned).toLocaleString() 
                        : 'Never'}
                    </div>
                  </CardContent>
                  <div className="p-1 text-right border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => clearNamespace(namespace)}
                      className="text-xs"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Clear
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between border-t pt-6">
          <p className="text-sm text-muted-foreground">
            <BarChart3 className="h-4 w-4 inline-block mr-1" />
            <span>
              Cache helps improve performance by storing frequently accessed data.
            </span>
          </p>
          <div className="space-x-2">
            <Button
              variant="outline"
              onClick={runCleanup}
              className="relative"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Run Cleanup
            </Button>
            <Button
              variant="destructive"
              onClick={clearAllCache}
              className="relative"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All Cache
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default CacheSettings;
