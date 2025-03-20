import { useState, useEffect, useCallback } from 'react';
import { useOfflineStatus } from './useOfflineStatus';
import { useLocalStorage } from './useLocalStorage';
import { useToast } from '@/components/ui/use-toast';
import { v4 as uuidv4 } from 'uuid';

// Define operation types
export type OperationType = 'lm-studio-chat' | 'mcp-request' | 'embedding-generation';

// Define queue item
export interface QueueItem {
  id: string;
  type: OperationType;
  data: any;
  timestamp: Date;
  attemptCount: number;
  maxAttempts: number;
}

// Stats for the queue
export interface QueueStats {
  totalItems: number;
  pendingItems: number;
  processingItems: number;
  completedItems: number;
  failedItems: number;
}

/**
 * Hook for managing offline operations queue
 */
export function useOfflineQueue() {
  const { isOnline } = useOfflineStatus();
  const [queuedOperations, setQueuedOperations] = useLocalStorage<QueueItem[]>('cognicore-operation-queue', []);
  const [isProcessing, setIsProcessing] = useState(false);
  const [queueStats, setQueueStats] = useState<QueueStats>({
    totalItems: 0,
    pendingItems: 0,
    processingItems: 0,
    completedItems: 0,
    failedItems: 0
  });
  const { toast } = useToast();

  // Process the queue when online
  const processQueue = useCallback(async () => {
    if (!isOnline || isProcessing || queuedOperations.length === 0) return;

    setIsProcessing(true);

    try {
      // Create a copy of the queue to avoid race conditions
      const queue = [...queuedOperations];
      
      // Process the oldest item in the queue
      const item = queue[0];
      
      // Mark the item as processing
      setQueuedOperations(queue.map(qItem => 
        qItem.id === item.id ? { ...qItem, attemptCount: qItem.attemptCount + 1 } : qItem
      ));

      // Process based on operation type
      let success = false;
      let errorMessage = '';

      try {
        switch (item.type) {
          case 'lm-studio-chat':
            // For LM Studio operations, attempt to process when online
            success = true; // Placeholder - actual implementation would call the API
            break;
          case 'mcp-request':
            // For MCP API operations
            success = true; // Placeholder - actual implementation would call the API
            break;
          case 'embedding-generation':
            // For embedding generation operations
            success = true; // Placeholder - actual implementation would process embeddings
            break;
          default:
            errorMessage = `Unknown operation type: ${item.type}`;
            success = false;
        }
      } catch (error) {
        success = false;
        errorMessage = error instanceof Error ? error.message : 'Unknown error';
      }

      // Update the queue based on the result
      setQueuedOperations(prevQueue => {
        // Remove the item from the queue if successful or reached max attempts
        if (success || item.attemptCount >= item.maxAttempts) {
          const newQueue = prevQueue.filter(qItem => qItem.id !== item.id);
          
          // Show toast if completed all items
          if (success && newQueue.length === 0) {
            toast({
              title: 'Queue Processed',
              description: 'All pending operations have been completed.',
              variant: 'default'
            });
          } else if (!success && item.attemptCount >= item.maxAttempts) {
            toast({
              title: 'Operation Failed',
              description: `Failed to process ${item.type} after ${item.maxAttempts} attempts.`,
              variant: 'destructive'
            });
          }
          
          return newQueue;
        }
        
        // Otherwise, keep it in the queue
        return prevQueue;
      });
    } finally {
      setIsProcessing(false);
    }
  }, [isOnline, isProcessing, queuedOperations, setQueuedOperations, toast]);

  // Add an operation to the queue
  const queueOperation = useCallback((
    type: OperationType,
    data: any,
    options: { maxAttempts?: number } = {}
  ): string => {
    const { maxAttempts = 3 } = options;
    
    const operationId = uuidv4();
    const queueItem: QueueItem = {
      id: operationId,
      type,
      data,
      timestamp: new Date(),
      attemptCount: 0,
      maxAttempts
    };
    
    setQueuedOperations(prev => [...prev, queueItem]);
    
    return operationId;
  }, [setQueuedOperations]);

  // Clear the queue
  const clearQueue = useCallback(() => {
    setQueuedOperations([]);
    
    toast({
      title: 'Queue Cleared',
      description: 'All pending operations have been cleared.',
      variant: 'default'
    });
  }, [setQueuedOperations, toast]);

  // Check if an operation is pending
  const isOperationPending = useCallback((operationId: string): boolean => {
    return queuedOperations.some(item => item.id === operationId);
  }, [queuedOperations]);

  // Update queue stats
  useEffect(() => {
    setQueueStats({
      totalItems: queuedOperations.length,
      pendingItems: queuedOperations.filter(item => item.attemptCount === 0).length,
      processingItems: isProcessing ? 1 : 0,
      completedItems: 0, // This would need external tracking
      failedItems: queuedOperations.filter(item => item.attemptCount >= item.maxAttempts).length
    });
  }, [queuedOperations, isProcessing]);

  // Process the queue periodically when online
  useEffect(() => {
    if (!isOnline || queuedOperations.length === 0) return;
    
    const interval = setInterval(() => {
      processQueue();
    }, 5000); // Try every 5 seconds
    
    return () => clearInterval(interval);
  }, [isOnline, queuedOperations, processQueue]);

  // Show notification when operations are pending and app comes online
  useEffect(() => {
    if (isOnline && queuedOperations.length > 0) {
      toast({
        title: 'Processing Pending Operations',
        description: `${queuedOperations.length} operation(s) are being processed in the background.`,
        variant: 'default'
      });
    }
  }, [isOnline, queuedOperations.length, toast]);

  return {
    queuedOperations,
    queueStats,
    isProcessing,
    queueOperation,
    processQueue,
    clearQueue,
    isOperationPending
  };
}
