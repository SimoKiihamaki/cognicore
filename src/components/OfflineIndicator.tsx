
import React, { useState, useEffect } from 'react';
import { useOfflineStatus } from '@/hooks/useOfflineStatus';
import { Switch } from '@/components/ui/switch';
import {
  AlertCircle,
  CheckCircle2,
  Wifi,
  WifiOff
} from 'lucide-react';

interface OfflineIndicatorProps {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  showOfflineMessage?: boolean;
}

const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  position = 'top-right',
  showOfflineMessage = true
}) => {
  // Use the hook for offline status
  const { isOffline, isOfflineMode, toggleOfflineMode } = useOfflineStatus();
  const [showDetails, setShowDetails] = useState(false);
  const [hasCachedData, setHasCachedData] = useState(true); // Just a placeholder, would come from a real check

  // Position class mapping
  const positionClasses = {
    'top-left': 'top-2 left-2',
    'top-right': 'top-2 right-2',
    'bottom-left': 'bottom-2 left-2',
    'bottom-right': 'bottom-2 right-2'
  };

  // Update document title when offline
  useEffect(() => {
    if (isOffline) {
      document.title = '📴 Offline - CogniCore';
    } else {
      document.title = 'CogniCore';
    }
  }, [isOffline]);

  // Only show when offline or in offline mode
  if (!isOffline && !isOfflineMode) return null;

  return (
    <div className={`fixed ${positionClasses[position]} z-50`}>
      {/* Main indicator */}
      <div
        className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm shadow-md cursor-pointer transition-all duration-200 ${
          isOffline
            ? 'bg-destructive/10 text-destructive border border-destructive/20'
            : isOfflineMode
            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
            : 'bg-transparent border border-transparent'
        }`}
        onClick={() => setShowDetails(!showDetails)}
      >
        {isOffline ? (
          <WifiOff className="h-4 w-4" />
        ) : (
          <Wifi className="h-4 w-4" />
        )}
        <span className="font-medium">
          {isOffline ? 'Offline' : 'Offline Mode'}
        </span>
      </div>

      {/* Details panel */}
      {showDetails && (
        <div className="mt-2 rounded-md shadow-lg border border-border bg-background p-4 w-64">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold">Connection Status</h3>
            {isOffline ? (
              <AlertCircle className="h-5 w-5 text-destructive" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-primary" />
            )}
          </div>

          {/* Status indicator */}
          <div className="mb-4 p-2 rounded-md bg-muted">
            <p className="text-sm">
              {isOffline
                ? 'You are currently offline. Limited functionality is available.'
                : 'You are connected to the network, but working in offline mode.'}
            </p>
          </div>

          {/* Offline mode toggle */}
          <div className="flex justify-between items-center mb-3">
            <div>
              <p className="font-medium text-sm">Offline Mode</p>
              <p className="text-xs text-muted-foreground">
                Work locally without network
              </p>
            </div>
            <Switch
              id="offline-mode"
              checked={isOfflineMode}
              onCheckedChange={toggleOfflineMode}
              className="scale-90"
            />
          </div>

          {/* Cached data status */}
          <div className="text-xs text-muted-foreground mt-3 flex items-center">
            <span className={`w-2 h-2 rounded-full mr-2 ${
              hasCachedData ? 'bg-green-500' : 'bg-amber-500'
            }`}></span>
            {hasCachedData
              ? 'Local data available for offline use'
              : 'Limited data available offline'}
          </div>
        </div>
      )}
    </div>
  );
};

export default OfflineIndicator;
