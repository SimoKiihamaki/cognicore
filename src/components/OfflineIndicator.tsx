import { useEffect, useState } from 'react';
import { useOfflineStatus } from '@/hooks/useOfflineStatus';
import { Wifi, WifiOff, Download, RefreshCw } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface OfflineIndicatorProps {
  className?: string;
}

/**
 * Component to display offline status and provide controls for offline mode
 */
const OfflineIndicator = ({ className = '' }: OfflineIndicatorProps) => {
  const { 
    isOnline, 
    isServiceWorkerActive, 
    isOfflineModeEnabled,
    hasAppUpdate,
    updateServiceWorker,
    enableOfflineMode
  } = useOfflineStatus();
  const { toast } = useToast();
  const [showTooltip, setShowTooltip] = useState(false);

  // Show toast when online/offline status changes
  useEffect(() => {
    if (isOnline) {
      toast({
        title: 'Online',
        description: 'You are now connected to the internet.',
        variant: 'default'
      });
    } else {
      toast({
        title: 'Offline',
        description: 'You are now offline. Some features may be limited.',
        variant: 'destructive'
      });
    }
  }, [isOnline, toast]);

  // Toggle offline mode
  const handleOfflineModeToggle = (enabled: boolean) => {
    enableOfflineMode(enabled);
    
    toast({
      title: enabled ? 'Offline Mode Enabled' : 'Offline Mode Disabled',
      description: enabled 
        ? 'App will work offline with reduced functionality.'
        : 'App will use online features when available.',
      variant: 'default'
    });
  };

  // Handle update service worker
  const handleUpdate = () => {
    updateServiceWorker();
    
    toast({
      title: 'Updating',
      description: 'Installing new version. Page will reload shortly.',
      variant: 'default'
    });
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Offline status indicator */}
      <TooltipProvider>
        <Tooltip open={showTooltip} onOpenChange={setShowTooltip}>
          <TooltipTrigger asChild>
            <div 
              className={`p-1.5 rounded-full ${isOnline ? 'bg-green-500/20' : 'bg-destructive/20'}`}
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
            >
              {isOnline ? (
                <Wifi className="h-4 w-4 text-green-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-destructive" />
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <div className="space-y-2 p-1">
              <p className="text-sm font-medium">
                {isOnline ? 'Online' : 'Offline'}
              </p>
              <div className="flex items-center space-x-2">
                <Label htmlFor="offline-mode" className="text-xs cursor-pointer">
                  Offline Mode
                </Label>
                <Switch
                  id="offline-mode"
                  checked={isOfflineModeEnabled}
                  onCheckedChange={handleOfflineModeToggle}
                  size="sm"
                />
              </div>
              {!isServiceWorkerActive && isOnline && (
                <p className="text-xs text-amber-500">
                  Service Worker not active. Offline support limited.
                </p>
              )}
              {hasAppUpdate && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full mt-1 h-7 text-xs"
                  onClick={handleUpdate}
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Update App
                </Button>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      {/* Update indicator */}
      {hasAppUpdate && (
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1 bg-primary/20 hover:bg-primary/30 border-primary/40"
          onClick={handleUpdate}
        >
          <Download className="h-3.5 w-3.5" />
          <span className="text-xs">Update</span>
        </Button>
      )}
    </div>
  );
};

export default OfflineIndicator;
