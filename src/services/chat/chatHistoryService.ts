/**
 * Chat History Service
 * 
 * Service for managing chat histories and messages using IndexedDB
 */

import { v4 as uuidv4 } from 'uuid';
import databaseService, { STORE_NAMES } from '@/services/database/databaseService';
import { ChatHistory, ChatMessage } from '@/lib/types';

class ChatHistoryService {
  /**
   * Create a new chat history
   */
  async createChatHistory(
    messages: ChatMessage[] = [],
    title: string = 'New Conversation',
    modelName: string = 'unknown',
    summary?: string,
    tags: string[] = []
  ): Promise<string> {
    const timestamp = new Date();
    const hasImages = messages.some(msg => 
      typeof msg.content !== 'string' && 
      msg.content.some(item => item.type === 'image_url')
    );
    
    const history: ChatHistory = {
      id: `hist-${uuidv4()}`,
      title,
      modelName,
      messages,
      createdAt: timestamp,
      updatedAt: timestamp,
      summary: summary || `Conversation with ${modelName}`,
      tags,
      isStarred: false,
      hasImages
    };
    
    try {
      await databaseService.add(STORE_NAMES.CHAT_HISTORIES, history);
      return history.id;
    } catch (error) {
      console.error('Error creating chat history:', error);
      throw new Error('Failed to create chat history');
    }
  }
  
  /**
   * Get all chat histories
   */
  async getAllChatHistories(): Promise<ChatHistory[]> {
    try {
      const histories = await databaseService.getAll(STORE_NAMES.CHAT_HISTORIES);
      return histories.sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    } catch (error) {
      console.error('Error getting chat histories:', error);
      return [];
    }
  }
  
  /**
   * Get a specific chat history by ID
   */
  async getChatHistory(historyId: string): Promise<ChatHistory | null> {
    try {
      return await databaseService.get(STORE_NAMES.CHAT_HISTORIES, historyId);
    } catch (error) {
      console.error(`Error getting chat history ${historyId}:`, error);
      return null;
    }
  }
  
  /**
   * Update a chat history
   */
  async updateChatHistory(historyId: string, updates: Partial<ChatHistory>): Promise<boolean> {
    try {
      const history = await this.getChatHistory(historyId);
      if (!history) {
        throw new Error(`Chat history ${historyId} not found`);
      }
      
      // Always update the timestamp
      const updatedFields = {
        ...updates,
        updatedAt: new Date()
      };
      
      // Check if messages were updated and recalculate hasImages
      if (updates.messages) {
        updatedFields.hasImages = updates.messages.some(msg => 
          typeof msg.content !== 'string' && 
          msg.content.some(item => item.type === 'image_url')
        );
      }
      
      return await databaseService.update(STORE_NAMES.CHAT_HISTORIES, historyId, updatedFields);
    } catch (error) {
      console.error(`Error updating chat history ${historyId}:`, error);
      return false;
    }
  }
  
  /**
   * Add a message to a chat history
   */
  async addMessageToChatHistory(
    historyId: string, 
    message: ChatMessage
  ): Promise<boolean> {
    try {
      const history = await this.getChatHistory(historyId);
      if (!history) {
        throw new Error(`Chat history ${historyId} not found`);
      }
      
      const updatedMessages = [...history.messages, message];
      
      // If adding assistant message, update summary
      let updatedSummary = history.summary;
      if (message.role === 'assistant' && typeof message.content === 'string') {
        // Use first few words of assistant response as summary
        const firstFewWords = message.content.split(' ').slice(0, 8).join(' ');
        updatedSummary = firstFewWords.length < 50 
          ? firstFewWords + '...' 
          : firstFewWords.substring(0, 47) + '...';
      }
      
      // Check if message has images
      const messageHasImages = typeof message.content !== 'string' && 
        message.content.some(item => item.type === 'image_url');
      
      const hasImages = history.hasImages || messageHasImages;
      
      return await this.updateChatHistory(historyId, { 
        messages: updatedMessages,
        summary: updatedSummary,
        hasImages
      });
    } catch (error) {
      console.error(`Error adding message to chat history ${historyId}:`, error);
      return false;
    }
  }
  
  /**
   * Delete a chat history
   */
  async deleteChatHistory(historyId: string): Promise<boolean> {
    try {
      return await databaseService.delete(STORE_NAMES.CHAT_HISTORIES, historyId);
    } catch (error) {
      console.error(`Error deleting chat history ${historyId}:`, error);
      return false;
    }
  }
  
  /**
   * Toggle starred status of a chat history
   */
  async toggleStarred(historyId: string): Promise<boolean> {
    try {
      const history = await this.getChatHistory(historyId);
      if (!history) {
        throw new Error(`Chat history ${historyId} not found`);
      }
      
      return await this.updateChatHistory(historyId, {
        isStarred: !history.isStarred
      });
    } catch (error) {
      console.error(`Error toggling starred status for chat history ${historyId}:`, error);
      return false;
    }
  }
  
  /**
   * Search chat histories by content
   */
  async searchChatHistories(searchTerm: string): Promise<ChatHistory[]> {
    try {
      const allHistories = await this.getAllChatHistories();
      const searchTermLower = searchTerm.toLowerCase();
      
      return allHistories.filter(history => {
        // Check title
        if (history.title.toLowerCase().includes(searchTermLower)) {
          return true;
        }
        
        // Check messages content
        return history.messages.some(message => {
          if (typeof message.content === 'string') {
            return message.content.toLowerCase().includes(searchTermLower);
          } else if (Array.isArray(message.content)) {
            return message.content.some(item => 
              item.type === 'text' && item.text.toLowerCase().includes(searchTermLower)
            );
          }
          return false;
        });
      });
    } catch (error) {
      console.error('Error searching chat histories:', error);
      return [];
    }
  }
  
  /**
   * Export chat history as JSON
   */
  exportChatHistoryAsJson(history: ChatHistory): string {
    return JSON.stringify(history, null, 2);
  }
  
  /**
   * Import chat history from JSON
   */
  async importChatHistoryFromJson(jsonText: string): Promise<string | null> {
    try {
      const history = JSON.parse(jsonText) as ChatHistory;
      
      // Validate basic structure
      if (!history.id || !history.messages || !Array.isArray(history.messages)) {
        throw new Error('Invalid chat history format');
      }
      
      // Generate a new ID to avoid conflicts
      const newId = `hist-${uuidv4()}`;
      
      // Create a new history based on the imported one
      const importedHistory: ChatHistory = {
        ...history,
        id: newId,
        createdAt: new Date(),
        updatedAt: new Date(),
        title: `${history.title} (Imported)`,
        isStarred: false // Reset starred status
      };
      
      await databaseService.add(STORE_NAMES.CHAT_HISTORIES, importedHistory);
      return newId;
    } catch (error) {
      console.error('Error importing chat history:', error);
      return null;
    }
  }
}

// Export a singleton instance
const chatHistoryService = new ChatHistoryService();
export default chatHistoryService;
