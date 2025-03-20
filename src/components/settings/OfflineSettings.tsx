import { useState } from 'react';
import { useOfflineStatus } from '@/hooks/useOfflineStatus';
import { useOfflineQueue } from '@/hooks/useOfflineQueue';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  WifiOff, 
  Database, 
  HardDrive, 
  RefreshCcw, 
  Check, 
  Clock, 
  Loader2
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';

/**
 * Component for managing offline mode settings
 */
const OfflineSettings = () => {
  const { 
    isOnline, 
    isServiceWorkerActive, 
    isOfflineModeEnabled, 
    hasAppUpdate,
    updateServiceWorker,
    enableOfflineMode
  } = useOfflineStatus();
  
  const {
    queuedOperations,
    queueStats,
    isProcessing,
    clearQueue,
    processQueue
  } = useOfflineQueue();
  
  const { toast } = useToast();
  const [isClearingCache, setIsClearingCache] = useState(false);
  
  // Handle clearing application cache
  const handleClearCache = async () => {
    setIsClearingCache(true);
    
    try {
      if ('caches' in window) {
        const cacheKeys = await caches.keys();
        await Promise.all(
          cacheKeys.map(key => caches.delete(key))
        );
        
        toast({
          title: 'Cache Cleared',
          description: 'The application cache has been cleared successfully.',
          variant: 'default'
        });
      } else {
        toast({
          title: 'Cache API Not Available',
          description: 'Your browser does not support the Cache API.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Failed to clear cache:', error);
      toast({
        title: 'Failed to Clear Cache',
        description: 'An error occurred while clearing the application cache.',
        variant: 'destructive'
      });
    } finally {
      setIsClearingCache(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Offline Settings</h3>
        <p className="text-sm text-muted-foreground">
          Configure how the application behaves when offline.
        </p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <WifiOff className="h-5 w-5" />
            Offline Mode
          </CardTitle>
          <CardDescription>
            Control how the application behaves when you're offline.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="offline-mode" className="text-base">Enable Offline Mode</Label>
                <p className="text-sm text-muted-foreground">
                  Allow the application to work offline with limited functionality.
                </p>
              </div>
              <Switch
                id="offline-mode"
                checked={isOfflineModeEnabled}
                onCheckedChange={enableOfflineMode}
              />
            </div>
            
            <div className="text-sm grid grid-cols-2 gap-4">
              <div className={`p-3 rounded-md ${isOnline ? 'bg-green-500/10' : 'bg-destructive/10'}`}>
                <div className="font-medium flex items-center gap-1.5 mb-1">
                  {isOnline ? (
                    <>
                      <Check className="h-4 w-4 text-green-500" />
                      <span className="text-green-500">Online</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="h-4 w-4 text-destructive" />
                      <span className="text-destructive">Offline</span>
                    </>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {isOnline 
                    ? 'All features are available while online.'
                    : 'Limited functionality available while offline.'}
                </div>
              </div>
              
              <div className={`p-3 rounded-md ${isServiceWorkerActive ? 'bg-green-500/10' : 'bg-amber-500/10'}`}>
                <div className="font-medium flex items-center gap-1.5 mb-1">
                  {isServiceWorkerActive ? (
                    <>
                      <Check className="h-4 w-4 text-green-500" />
                      <span className="text-green-500">Service Worker Active</span>
                    </>
                  ) : (
                    <>
                      <Clock className="h-4 w-4 text-amber-500" />
                      <span className="text-amber-500">Service Worker Inactive</span>
                    </>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {isServiceWorkerActive 
                    ? 'Offline support is fully enabled.'
                    : 'Limited offline support available.'}
                </div>
              </div>
            </div>
          </div>
          
          <Separator />
          
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-2">Operation Queue</h4>
              <p className="text-xs text-muted-foreground">
                When offline, operations are queued and processed when you're back online.
              </p>
            </div>
            
            {queuedOperations.length > 0 ? (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span>Queue Status</span>
                    <span>{queueStats.pendingItems} pending, {isProcessing ? '1 processing' : '0 processing'}</span>
                  </div>
                  <Progress value={(queueStats.totalItems - queueStats.pendingItems) / queueStats.totalItems * 100} />
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => processQueue()}
                    disabled={!isOnline || isProcessing || queueStats.pendingItems === 0}
                    className="flex items-center gap-1"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCcw className="h-3.5 w-3.5" />
                        <span>Process Queue</span>
                      </>
                    )}
                  </Button>
                  
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={clearQueue}
                    disabled={queuedOperations.length === 0}
                    className="flex items-center gap-1"
                  >
                    <span>Clear Queue</span>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                No operations are currently queued.
              </div>
            )}
          </div>
          
          <Separator />
          
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-2">Application Cache</h4>
              <p className="text-xs text-muted-foreground">
                Manage the application cache used for offline support.
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearCache}
                disabled={isClearingCache}
                className="flex items-center gap-1"
              >
                {isClearingCache ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Clearing...</span>
                  </>
                ) : (
                  <>
                    <Database className="h-3.5 w-3.5" />
                    <span>Clear Cache</span>
                  </>
                )}
              </Button>
              
              {hasAppUpdate && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={updateServiceWorker}
                  className="flex items-center gap-1"
                >
                  <RefreshCcw className="h-3.5 w-3.5" />
                  <span>Update Application</span>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OfflineSettings;
