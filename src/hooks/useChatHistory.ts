/**
 * Hook for managing chat histories
 */
import { useState, useEffect, useCallback } from 'react';
import { ChatHistory, ChatMessage } from '@/lib/types';
import chatHistoryService from '@/services/chat/chatHistoryService';

export function useChatHistory(initialHistoryId?: string) {
  const [histories, setHistories] = useState<ChatHistory[]>([]);
  const [currentHistory, setCurrentHistory] = useState<ChatHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load all chat histories
  const loadHistories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const loadedHistories = await chatHistoryService.getAllChatHistories();
      setHistories(loadedHistories);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chat histories');
      console.error('Error loading chat histories:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load a specific chat history by ID
  const loadHistory = useCallback(async (historyId: string) => {
    try {
      setLoading(true);
      setError(null);
      const history = await chatHistoryService.getChatHistory(historyId);
      
      if (history) {
        setCurrentHistory(history);
      } else {
        setError(`Chat history not found: ${historyId}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to load chat history: ${historyId}`);
      console.error(`Error loading chat history ${historyId}:`, err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Create a new chat history
  const createHistory = useCallback(async (
    messages: ChatMessage[] = [],
    title: string = 'New Conversation',
    modelName: string = 'Unknown'
  ): Promise<string> => {
    try {
      setError(null);
      
      // Create the history using the service
      const historyId = await chatHistoryService.createChatHistory(
        messages,
        title,
        modelName
      );
      
      // Reload histories
      await loadHistories();
      
      // Load the new history
      await loadHistory(historyId);
      
      return historyId;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create chat history');
      console.error('Error creating chat history:', err);
      throw err;
    }
  }, [loadHistories, loadHistory]);

  // Update an existing chat history
  const updateHistory = useCallback(async (
    historyId: string,
    updates: Partial<ChatHistory>
  ): Promise<boolean> => {
    try {
      setError(null);
      const success = await chatHistoryService.updateChatHistory(historyId, updates);
      
      if (success) {
        // Update current history if it's the one being updated
        if (currentHistory?.id === historyId) {
          // Reload the current history to get the updated version
          await loadHistory(historyId);
        }
        
        // Reload histories
        await loadHistories();
      }
      
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to update chat history: ${historyId}`);
      console.error(`Error updating chat history ${historyId}:`, err);
      return false;
    }
  }, [currentHistory?.id, loadHistory, loadHistories]);

  // Delete a chat history
  const deleteHistory = useCallback(async (historyId: string): Promise<boolean> => {
    try {
      setError(null);
      const success = await chatHistoryService.deleteChatHistory(historyId);
      
      if (success) {
        // Clear current history if it's the one being deleted
        if (currentHistory?.id === historyId) {
          setCurrentHistory(null);
        }
        
        // Reload histories
        await loadHistories();
      }
      
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to delete chat history: ${historyId}`);
      console.error(`Error deleting chat history ${historyId}:`, err);
      return false;
    }
  }, [currentHistory?.id, loadHistories]);

  // Add a message to the current history
  const addMessage = useCallback(async (message: ChatMessage): Promise<boolean> => {
    if (!currentHistory) {
      setError('No active chat history');
      return false;
    }
    
    try {
      setError(null);
      const success = await chatHistoryService.addMessageToChatHistory(
        currentHistory.id,
        message
      );
      
      if (success) {
        // Reload the current history to get the updated version
        await loadHistory(currentHistory.id);
      }
      
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add message to chat history');
      console.error('Error adding message to chat history:', err);
      return false;
    }
  }, [currentHistory, loadHistory]);

  // Search chat histories
  const searchHistories = useCallback(async (query: string): Promise<ChatHistory[]> => {
    try {
      setError(null);
      return await chatHistoryService.searchChatHistories(query);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search chat histories');
      console.error('Error searching chat histories:', err);
      return [];
    }
  }, []);

  // Star/unstar a chat history
  const toggleStarred = useCallback(async (historyId: string): Promise<boolean> => {
    try {
      setError(null);
      const success = await chatHistoryService.toggleStarred(historyId);
      
      if (success) {
        // Update current history if it's the one being updated
        if (currentHistory?.id === historyId) {
          await loadHistory(historyId);
        }
        
        // Reload histories
        await loadHistories();
      }
      
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to toggle star status: ${historyId}`);
      console.error(`Error toggling star status for history ${historyId}:`, err);
      return false;
    }
  }, [currentHistory?.id, loadHistory, loadHistories]);

  // Initialize
  useEffect(() => {
    // Load all histories
    loadHistories();
    
    // Load specific history if ID is provided
    if (initialHistoryId) {
      loadHistory(initialHistoryId);
    }
  }, [initialHistoryId, loadHistories, loadHistory]);

  return {
    histories,
    currentHistory,
    loading,
    error,
    loadHistories,
    loadHistory,
    createHistory,
    updateHistory,
    deleteHistory,
    addMessage,
    searchHistories,
    toggleStarred,
  };
}

export default useChatHistory;