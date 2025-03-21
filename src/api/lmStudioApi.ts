import { ChatMessage } from '@/lib/types';
import { proxyFetch, proxyFetchJson, ProxyError } from './corsProxy';

export interface LMStudioConfig {
  baseUrl: string;
  apiKey?: string;
  primaryModelName: string;
  secondaryModelName: string;
  supportsVision?: boolean;
}

export type ContentItem = 
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

export interface LMStudioChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | ContentItem[];
}

export interface LMStudioChatRequest {
  messages: LMStudioChatMessage[];
  model: string;
  temperature?: number;
  max_tokens?: number;
  context?: string[];
}

export interface LMStudioChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Error types for LM Studio API
 */
export enum LMStudioErrorType {
  CONNECTION = 'connection',
  AUTHENTICATION = 'authentication',
  MODEL = 'model',
  REQUEST = 'request',
  RESPONSE = 'response',
  TIMEOUT = 'timeout',
  SERVER = 'server',
  UNKNOWN = 'unknown'
}

/**
 * Custom error class for LM Studio API
 */
export class LMStudioError extends Error {
  type: LMStudioErrorType;
  status?: number;
  details?: any;

  constructor(message: string, type: LMStudioErrorType, status?: number, details?: any) {
    super(message);
    this.name = 'LMStudioError';
    this.type = type;
    this.status = status;
    this.details = details;
  }

  /**
   * Get a user-friendly error message
   */
  getUserMessage(): string {
    switch (this.type) {
      case LMStudioErrorType.CONNECTION:
        return 'Failed to connect to LM Studio. Please check if it\'s running and accessible.';
      case LMStudioErrorType.AUTHENTICATION:
        return 'Authentication failed. Please check your API key.';
      case LMStudioErrorType.MODEL:
        return 'Model error. The specified model may not be available in your LM Studio instance.';
      case LMStudioErrorType.REQUEST:
        return 'Request error. There was a problem with the request format.';
      case LMStudioErrorType.RESPONSE:
        return 'Response error. Failed to process the response from LM Studio.';
      case LMStudioErrorType.TIMEOUT:
        return 'Request timed out. This could be due to a large prompt or slow model.';
      case LMStudioErrorType.SERVER:
        return 'Server error. The LM Studio server encountered an internal error.';
      default:
        return this.message || 'Unknown error occurred while communicating with LM Studio.';
    }
  }
}

/**
 * LM Studio API service for interacting with locally running LLM instances
 */
export class LMStudioService {
  private config: LMStudioConfig;
  private requestTimeout: number = 60000; // Default timeout: 60 seconds
  
  constructor(config: LMStudioConfig) {
    this.config = config;
  }

  /**
   * Update the service configuration
   */
  updateConfig(config: Partial<LMStudioConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Check if a model supports vision capabilities
   * This uses a simple heuristic based on model name and should be improved
   * with more reliable detection methods as they become available
   */
  modelSupportsVision(modelName: string): boolean {
    // Common multimodal models that support vision
    const knownVisionModels = [
      'gemma-3', 'gemma3',
      'llava', 
      'bakllava',
      'obsidian',
      'claude-3', 'claude3',
      'qwen-vl', 'qwen-vision',
      'cogvlm',
      'deepseek-vl',
      'phi-3-vision', 'phi3-vision',
      'fuyu'
    ];
    
    // Check if model name contains any known vision model identifiers
    return knownVisionModels.some(visionModel => 
      modelName.toLowerCase().includes(visionModel.toLowerCase())
    );
  }

  /**
   * Get the full API endpoint URL
   */
  private getApiUrl(): string {
    // Ensure URL is properly formed with http(s) prefix
    let baseUrl = this.config.baseUrl.trim();
    
    // Add protocol if missing
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      baseUrl = `http://${baseUrl}`;
    }
    
    // Remove trailing slashes
    baseUrl = baseUrl.replace(/\/+$/, '');
    
    // Always append the completions endpoint
    return `${baseUrl}/v1/chat/completions`;
  }

  /**
   * Send a vision request to the LM Studio API
   * @param prompt The text prompt describing what to do with the image
   * @param imageFiles Array of image files to process
   * @param useDetailedModel Whether to use the primary (detailed) model or secondary (quick) model
   * @returns The assistant's response content
   * @throws LMStudioError on failure
   */
  async sendVisionRequest(
    prompt: string,
    imageFiles: File[],
    useDetailedModel: boolean = true
  ): Promise<string> {
    // Check if vision is supported
    if (!this.config.supportsVision) {
      throw new LMStudioError(
        'Vision capabilities not supported by the selected model',
        LMStudioErrorType.MODEL
      );
    }

    // Determine which model to use
    const model = useDetailedModel 
      ? this.config.primaryModelName 
      : this.config.secondaryModelName;
    
    if (!model) {
      throw new LMStudioError(
        'Model name not specified',
        LMStudioErrorType.MODEL
      );
    }

    try {
      // Create multimodal content with text and images
      const multimodalContent = await this.createMultimodalMessage(prompt, imageFiles);
      
      // Format the request data
      const requestData: LMStudioChatRequest = {
        messages: [
          {
            role: 'user',
            content: multimodalContent
          }
        ],
        model,
        temperature: 0.7,
        max_tokens: 2000
      };

      try {
        // Use our proxy fetch with better CORS and error handling
        const data = await proxyFetchJson<LMStudioChatResponse>(this.getApiUrl(), {
          method: 'POST',
          headers: this.createHeaders(),
          body: JSON.stringify(requestData),
          timeout: this.requestTimeout
        });
        
        // Extract the assistant's response content
        if (data.choices && data.choices.length > 0 && data.choices[0].message) {
          return data.choices[0].message.content;
        }
        
        throw new LMStudioError(
          'No response content received from LM Studio',
          LMStudioErrorType.RESPONSE,
          response.status,
          data
        );
      } catch (error) {
        // Map proxy errors to LM Studio errors
        if (error instanceof ProxyError) {
          let errorType: LMStudioErrorType;
          
          switch (error.type) {
            case 'timeout':
              errorType = LMStudioErrorType.TIMEOUT;
              break;
            case 'cors':
            case 'network':
              errorType = LMStudioErrorType.CONNECTION;
              break;
            case 'parse':
              errorType = LMStudioErrorType.RESPONSE;
              break;
            default:
              errorType = LMStudioErrorType.UNKNOWN;
          }
          
          throw new LMStudioError(
            error.message,
            errorType,
            error.status,
            error
          );
        }
        
        // Handle other errors
        console.error('Failed to communicate with LM Studio:', error);
        throw new LMStudioError(
          error instanceof Error ? error.message : String(error),
          LMStudioErrorType.UNKNOWN,
          undefined,
          error
        );
      }
    } catch (error) {
      // Handle image processing errors
      if (!(error instanceof LMStudioError)) {
        console.error('Error in vision request:', error);
        throw new LMStudioError(
          `Vision request failed: ${error instanceof Error ? error.message : String(error)}`,
          LMStudioErrorType.REQUEST,
          undefined,
          error
        );
      }
      throw error;
    }
  }

  /**
   * Create the headers for API requests
   */
  private createHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    return headers;
  }

  /**
   * Set request timeout in milliseconds
   */
  setRequestTimeout(timeoutMs: number): void {
    this.requestTimeout = timeoutMs;
  }

  /**
   * Test the connection to the LM Studio server
   * @returns true if connection successful, false otherwise
   */
  async testConnection(): Promise<boolean> {
    try {
      console.log('Testing LM Studio connection to:', this.getApiUrl());
      
      // First, try a more lightweight GET request to check if the server is reachable
      // Many LLM servers support a simpler health check endpoint
      try {
        // Extract base URL without the completions endpoint
        const baseUrl = this.getApiUrl().replace(/\/v1\/chat\/completions$/, '');
        const healthUrl = `${baseUrl}/health`;
        
        console.log('Trying health check endpoint:', healthUrl);
        const healthResponse = await fetch(healthUrl, {
          method: 'GET',
          headers: this.createHeaders(),
          // Using a short timeout for health check
          signal: AbortSignal.timeout(2000)
        });
        
        if (healthResponse.ok) {
          console.log('LM Studio health check successful');
          return true;
        }
      } catch (healthError) {
        console.log('LM Studio health check failed, trying main endpoint');
        // Continue to try the main endpoint
      }
      
      // If the health check fails, try a minimal chat request
      const testRequest: LMStudioChatRequest = {
        messages: [{ role: 'user', content: 'test' }],
        model: this.config.primaryModelName || 'default',
        max_tokens: 1
      };
      
      // Use our enhanced proxy fetch with 5 second timeout
      const response = await proxyFetch(this.getApiUrl(), {
        method: 'POST',
        headers: this.createHeaders(),
        body: JSON.stringify(testRequest),
        timeout: 5000 // 5 second timeout for test
      });
      
      // If we get here, the connection was successful
      return true;
    } catch (error) {
      if (error instanceof ProxyError) {
        // For 404 errors, the endpoint might be different - provide more helpful message
        if (error.status === 404) {
          console.error('LM Studio API endpoint not found. Please check your server configuration and ensure LM Studio is running.');
        } else {
          console.error(`LM Studio test connection failed (${error.type}): ${error.message}`);
        }
      } else {
        console.error('LM Studio connection test failed:', error);
      }
      
      // Return false rather than throwing to allow graceful degradation
      return false;
    }
  }

  /**
   * Convert application chat messages to LM Studio API format
   */
  private formatChatMessages(messages: ChatMessage[]): LMStudioChatMessage[] {
    return messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
  }

  /**
   * Convert an image to base64 format
   * @param file The image file to convert
   * @returns Promise resolving to the base64 data URL
   */
  async imageToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result);
        };
        reader.onerror = (error) => {
          reject(error);
        };
        reader.readAsDataURL(file);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Create a multimodal message with text and images
   * @param text The text prompt
   * @param imageFiles Array of image files to include
   * @returns Promise resolving to a formatted message with text and images
   */
  async createMultimodalMessage(
    text: string,
    imageFiles: File[]
  ): Promise<ContentItem[]> {
    if (!this.config.supportsVision) {
      throw new LMStudioError(
        'Vision capabilities not supported by the selected model',
        LMStudioErrorType.MODEL
      );
    }

    // Start with the text content
    const content: ContentItem[] = [
      { type: 'text', text }
    ];

    // Process each image file
    for (const file of imageFiles) {
      try {
        // Convert image to base64
        const base64Url = await this.imageToBase64(file);
        
        // Add image to content
        content.push({
          type: 'image_url',
          image_url: { url: base64Url }
        });
      } catch (error) {
        console.error('Error processing image:', error);
        throw new LMStudioError(
          `Failed to process image: ${error instanceof Error ? error.message : String(error)}`,
          LMStudioErrorType.REQUEST
        );
      }
    }

    return content;
  }

  /**
   * Send a chat request to the LM Studio API
   * @param messages The conversation history
   * @param useDetailedModel Whether to use the primary (detailed) model or secondary (quick) model
   * @param similarContexts Optional array of related note contents to include as context
   * @returns The assistant's response content
   * @throws LMStudioError on failure
   */
  async sendChatRequest(
    messages: ChatMessage[],
    useDetailedModel: boolean = true,
    similarContexts: string[] = []
  ): Promise<string> {
    // Determine which model to use
    const model = useDetailedModel 
      ? this.config.primaryModelName 
      : this.config.secondaryModelName;
    
    if (!model) {
      throw new LMStudioError(
        'Model name not specified',
        LMStudioErrorType.MODEL
      );
    }
    
    // Format the request data
    const requestData: LMStudioChatRequest = {
      messages: this.formatChatMessages(messages),
      model,
      temperature: 0.7,
      max_tokens: 2000
    };

    // Add similar contexts if available
    if (similarContexts.length > 0) {
      requestData.context = similarContexts;
    }

    try {
      // Use our proxy fetch with better CORS and error handling
      const data = await proxyFetchJson<LMStudioChatResponse>(this.getApiUrl(), {
        method: 'POST',
        headers: this.createHeaders(),
        body: JSON.stringify(requestData),
        timeout: this.requestTimeout
      });
      
      // Extract the assistant's response content
      if (data.choices && data.choices.length > 0 && data.choices[0].message) {
        return data.choices[0].message.content;
      }
      
      throw new LMStudioError(
        'No response content received from LM Studio',
        LMStudioErrorType.RESPONSE,
        response.status,
        data
      );
    } catch (error) {
      // Map proxy errors to LM Studio errors
      if (error instanceof ProxyError) {
        let errorType: LMStudioErrorType;
        
        switch (error.type) {
          case 'timeout':
            errorType = LMStudioErrorType.TIMEOUT;
            break;
          case 'cors':
          case 'network':
            errorType = LMStudioErrorType.CONNECTION;
            break;
          case 'parse':
            errorType = LMStudioErrorType.RESPONSE;
            break;
          default:
            errorType = LMStudioErrorType.UNKNOWN;
        }
        
        throw new LMStudioError(
          error.message,
          errorType,
          error.status,
          error
        );
      }
      
      // Handle other errors
      console.error('Failed to communicate with LM Studio:', error);
      throw new LMStudioError(
        error instanceof Error ? error.message : String(error),
        LMStudioErrorType.UNKNOWN,
        undefined,
        error
      );
    }
  }
}

// Create a singleton instance
let lmStudioService: LMStudioService | null = null;

/**
 * Initialize the LM Studio service with configuration
 */
export function initializeLMStudioService(config: LMStudioConfig): LMStudioService {
  // Check if primary or secondary model supports vision
  const checkVisionSupport = (service: LMStudioService, config: LMStudioConfig) => {
    // Determine if either primary or secondary model supports vision
    const primarySupportsVision = config.primaryModelName 
      ? service.modelSupportsVision(config.primaryModelName) 
      : false;
      
    const secondarySupportsVision = config.secondaryModelName 
      ? service.modelSupportsVision(config.secondaryModelName) 
      : false;
      
    return {
      ...config,
      supportsVision: primarySupportsVision || secondarySupportsVision
    };
  };

  if (!lmStudioService) {
    // Create new service with vision support check
    const configWithVisionCheck = checkVisionSupport(new LMStudioService(config), config);
    lmStudioService = new LMStudioService(configWithVisionCheck);
  } else {
    // Update existing service with vision support check
    const updatedConfig = checkVisionSupport(lmStudioService, config);
    lmStudioService.updateConfig(updatedConfig);
  }
  
  return lmStudioService;
}

/**
 * Get the current LM Studio service instance
 */
export function getLMStudioService(): LMStudioService {
  if (!lmStudioService) {
    throw new Error('LM Studio service not initialized. Call initializeLMStudioService first.');
  }
  
  return lmStudioService;
}
