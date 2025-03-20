import { useState, useEffect } from 'react';
import { useOfflineStatus } from '@/hooks/useOfflineStatus';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { WifiOff, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Banner that appears when the application is offline
 */
const OfflineBanner = () => {
  const { isOnline, isOfflineModeEnabled } = useOfflineStatus();
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Show banner when offline
  useEffect(() => {
    if (!isOnline && !dismissed) {
      // Add a slight delay to prevent flickering on initial load
      const timer = setTimeout(() => {
        setVisible(true);
      }, 500);
      
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [isOnline, dismissed]);

  // Reset dismissed state when coming back online
  useEffect(() => {
    if (isOnline) {
      setDismissed(false);
    }
  }, [isOnline]);

  // Don't show if user has enabled offline mode explicitly
  if (isOfflineModeEnabled || !visible) {
    return null;
  }

  return (
    <Alert 
      variant="destructive" 
      className="rounded-none border-t-0 border-x-0 fixed top-0 w-full z-50 flex items-center justify-between animate-in fade-in"
    >
      <div className="flex items-center">
        <WifiOff className="h-4 w-4 mr-2" />
        <AlertDescription>
          You are currently offline. Some features may be limited.
        </AlertDescription>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setDismissed(true)}
        className="h-6 w-6"
      >
        <X className="h-4 w-4" />
      </Button>
    </Alert>
  );
};

export default OfflineBanner;
