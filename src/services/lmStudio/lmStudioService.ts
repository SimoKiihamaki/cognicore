/**
 * LM Studio Service
 * 
 * Provides a high-level interface for interacting with LM Studio, 
 * including model management, context inclusion, and integration
 * with the application's state and services.
 */

import { 
  LMStudioConfig, 
  ChatMessage, 
  SimilarityResult, 
  Settings 
} from '@/lib/types';
import { 
  initializeLMStudioService, 
  getLMStudioService, 
  LMStudioError,
  LMStudioErrorType,
  LMStudioService as LMStudioAPIClient 
} from '@/api/lmStudioApi';
import { v4 as uuidv4 } from 'uuid';
import cacheService from '../cacheService';
import embeddingService from '../embedding/embeddingService';

// Cache keys
const CONFIG_CACHE_KEY = 'lmStudio-config';
const CONNECTION_STATUS_KEY = 'lmStudio-connection-status';

class LMStudioService {
  private config: LMStudioConfig;
  private apiClient: LMStudioAPIClient | null = null;
  private connectionStatus: 'connected' | 'disconnected' | 'unknown' = 'unknown';
  private initialized: boolean = false;
  
  constructor() {
    // Load cached config if available, otherwise use defaults
    const cachedConfig = cacheService.get<LMStudioConfig>(CONFIG_CACHE_KEY);
    this.config = cachedConfig || {
      baseUrl: 'http://localhost:1234',
      apiKey: '',
      primaryModelName: 'Meta-Llama-3-8B-Instruct',
      secondaryModelName: 'Phi-3-mini-4k-instruct',
      embeddingModelName: 'Xenova/all-MiniLM-L6-v2',
      connectionMode: 'local',
      temperature: 0.7,
      topP: 0.9,
      topK: 40,
      maxTokens: 1024,
      useVision: true
    };
    
    const cachedStatus = cacheService.get<'connected' | 'disconnected' | 'unknown'>(CONNECTION_STATUS_KEY);
    if (cachedStatus) {
      this.connectionStatus = cachedStatus;
    }
  }

  /**
   * Initialize the service
   */
  public async initialize(): Promise<boolean> {
    if (this.initialized) {
      return true;
    }
    
    try {
      // Initialize the API client with current config
      this.apiClient = initializeLMStudioService({
        baseUrl: this.config.baseUrl,
        apiKey: this.config.apiKey,
        primaryModelName: this.config.primaryModelName,
        secondaryModelName: this.config.secondaryModelName
      });
      
      this.initialized = true;
      
      // Test connection if status is unknown
      if (this.connectionStatus === 'unknown') {
        try {
          const connected = await this.testConnection();
          this.connectionStatus = connected ? 'connected' : 'disconnected';
          cacheService.set(CONNECTION_STATUS_KEY, this.connectionStatus);
        } catch (error) {
          console.warn('Failed to test connection during initialization:', error);
          this.connectionStatus = 'disconnected';
          cacheService.set(CONNECTION_STATUS_KEY, this.connectionStatus);
        }
      }
      
      return true;
    } catch (error) {
      console.error('Failed to initialize LM Studio service:', error);
      this.initialized = false;
      return false;
    }
  }

  /**
   * Test the connection to LM Studio
   */
  public async testConnection(): Promise<boolean> {
    try {
      if (!this.apiClient) {
        await this.initialize();
      }
      
      const connected = await this.apiClient!.testConnection();
      this.connectionStatus = connected ? 'connected' : 'disconnected';
      cacheService.set(CONNECTION_STATUS_KEY, this.connectionStatus);
      return connected;
    } catch (error) {
      console.error('Connection test failed:', error);
      this.connectionStatus = 'disconnected';
      cacheService.set(CONNECTION_STATUS_KEY, this.connectionStatus);
      return false;
    }
  }
  
  /**
   * Get the current connection status
   */
  public getConnectionStatus(): 'connected' | 'disconnected' | 'unknown' {
    return this.connectionStatus;
  }

  /**
   * Update the service configuration
   */
  public updateConfig(config: Partial<LMStudioConfig>): void {
    this.config = { ...this.config, ...config };
    cacheService.set(CONFIG_CACHE_KEY, this.config);
    
    // Update the API client if it exists
    if (this.apiClient) {
      this.apiClient.updateConfig({
        baseUrl: this.config.baseUrl,
        apiKey: this.config.apiKey,
        primaryModelName: this.config.primaryModelName,
        secondaryModelName: this.config.secondaryModelName
      });
    }
    
    // Reset connection status to trigger a new test
    this.connectionStatus = 'unknown';
  }

  /**
   * Get the current config
   */
  public getConfig(): LMStudioConfig {
    return { ...this.config };
  }

  /**
   * Import configuration from Settings object
   */
  public importFromSettings(settings: Settings): void {
    // If we have a complete LMStudioConfig in settings, use that
    if (settings.lmStudioConfig) {
      this.updateConfig(settings.lmStudioConfig);
      return;
    }
    
    // Otherwise, extract relevant fields from settings
    const config: Partial<LMStudioConfig> = {
      baseUrl: settings.lmStudioBaseUrl,
      apiKey: settings.lmStudioApiKey,
      primaryModelName: settings.primaryModelName,
      secondaryModelName: settings.secondaryModelName,
      embeddingModelName: settings.embeddingModelName
    };
    
    this.updateConfig(config);
  }

  /**
   * Find relevant contexts for a query using similarity search
   * 
   * @param query The user's query
   * @param maxResults Maximum number of results to include
   * @param similarityThreshold Minimum similarity threshold (0-1)
   * @returns Array of relevant text contexts
   */
  public async findRelevantContexts(
    query: string, 
    maxResults: number = 3,
    similarityThreshold: number = 0.7
  ): Promise<string[]> {
    try {
      // Check if embedding service is available
      if (!embeddingService.isInitialized()) {
        console.warn('Embedding service not initialized, cannot find relevant contexts');
        return [];
      }
      
      // Find similar content using embedding service
      const similarResults = await embeddingService.findSimilarContent(
        query, 
        maxResults,
        similarityThreshold
      );
      
      // Extract text content from results
      return similarResults.map(result => {
        if (result.type === 'note') {
          return `Note "${result.title}" (${result.similarity.toFixed(2)} similarity):\n${result.content}`;
        } else {
          return `File "${result.title}" (${result.similarity.toFixed(2)} similarity):\n${result.content}`;
        }
      });
    } catch (error) {
      console.error('Failed to find relevant contexts:', error);
      return [];
    }
  }

  /**
   * Create a system message with relevant contexts
   * 
   * @param contexts Array of relevant context strings
   * @returns System message with formatted contexts
   */
  private createContextSystemMessage(contexts: string[]): ChatMessage {
    // Skip if no contexts
    if (!contexts || contexts.length === 0) {
      return {
        id: uuidv4(),
        role: 'system',
        content: 'You are a helpful AI assistant that helps users with their notes and documents.',
        timestamp: new Date(),
      };
    }
    
    // Create a system message with contexts
    return {
      id: uuidv4(),
      role: 'system',
      content: `You are a helpful AI assistant that helps users with their notes and documents.
      
Here is some relevant information from the user's notes that may help you provide a better response:

${contexts.join('\n\n')}

Use this context to inform your response when relevant, but focus on answering the user's query directly.`,
      timestamp: new Date(),
      referencedContexts: contexts
    };
  }

  /**
   * Send a chat message and get a response
   * 
   * @param messages The conversation history
   * @param useDetailedModel Whether to use the primary (detailed) model or secondary (quick) model
   * @param includeContext Whether to include relevant context in the prompt
   * @returns The assistant's response as a ChatMessage
   */
  public async sendChatMessage(
    messages: ChatMessage[],
    useDetailedModel: boolean = true,
    includeContext: boolean = true
  ): Promise<ChatMessage> {
    try {
      if (!this.apiClient) {
        await this.initialize();
      }
      
      if (this.connectionStatus !== 'connected') {
        const isConnected = await this.testConnection();
        if (!isConnected) {
          throw new LMStudioError(
            'Not connected to LM Studio',
            LMStudioErrorType.CONNECTION
          );
        }
      }
      
      // Format messages for the API
      const formattedMessages = [...messages];
      
      // Add context if requested
      if (includeContext) {
        const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
        if (lastUserMessage) {
          const contexts = await this.findRelevantContexts(lastUserMessage.content);
          if (contexts.length > 0) {
            // Add system message with context after existing system messages
            const lastSystemIdx = formattedMessages.findIndex(m => m.role === 'system');
            if (lastSystemIdx !== -1) {
              // Replace existing system message
              formattedMessages[lastSystemIdx] = this.createContextSystemMessage(contexts);
            } else {
              // Add new system message at the beginning
              formattedMessages.unshift(this.createContextSystemMessage(contexts));
            }
          }
        }
      }
      
      // Call API
      const responseContent = await this.apiClient!.sendChatRequest(
        formattedMessages,
        useDetailedModel
      );
      
      // Format as ChatMessage
      return {
        id: uuidv4(),
        role: 'assistant',
        content: responseContent,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Failed to send chat message:', error);
      
      // Create error message
      return {
        id: uuidv4(),
        role: 'assistant',
        content: error instanceof LMStudioError
          ? error.getUserMessage()
          : 'Failed to communicate with LM Studio. Please check your connection settings.',
        timestamp: new Date(),
        isError: true
      };
    }
  }
}

// Create and export a singleton instance
const lmStudioService = new LMStudioService();
export default lmStudioService;
