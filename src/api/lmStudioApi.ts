import { ChatMessage } from '@/lib/types';

export interface LMStudioConfig {
  baseUrl: string;
  apiKey?: string;
  primaryModelName: string;
  secondaryModelName: string;
}

export interface LMStudioChatRequest {
  messages: {
    role: 'user' | 'assistant' | 'system';
    content: string;
  }[];
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
   * Get the full API endpoint URL
   */
  private getApiUrl(): string {
    return `${this.config.baseUrl.replace(/\/$/, '')}/v1/chat/completions`;
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
      // First try a lightweight OPTIONS request
      const optionsResponse = await fetch(this.getApiUrl(), {
        method: 'OPTIONS',
        headers: this.createHeaders(),
      });
      
      if (optionsResponse.ok) {
        return true;
      }
      
      // If OPTIONS fails, try a minimal POST request to more reliably test the API
      const testRequest: LMStudioChatRequest = {
        messages: [{ role: 'user', content: 'test' }],
        model: this.config.primaryModelName,
        max_tokens: 1
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout for test
      
      try {
        const response = await fetch(this.getApiUrl(), {
          method: 'POST',
          headers: this.createHeaders(),
          body: JSON.stringify(testRequest),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        // Check for common error scenarios
        if (!response.ok) {
          console.error('LM Studio test request failed:', {
            status: response.status,
            statusText: response.statusText
          });
          return false;
        }
        
        return true;
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError instanceof DOMException && fetchError.name === 'AbortError') {
          console.error('LM Studio test request timed out');
        } else {
          console.error('LM Studio test request failed:', fetchError);
        }
        return false;
      }
    } catch (error) {
      console.error('LM Studio connection test failed:', error);
      return false;
    }
  }

  /**
   * Convert application chat messages to LM Studio API format
   */
  private formatChatMessages(messages: ChatMessage[]): LMStudioChatRequest['messages'] {
    return messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
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

    // Set up request with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);

    try {
      const response = await fetch(this.getApiUrl(), {
        method: 'POST',
        headers: this.createHeaders(),
        body: JSON.stringify(requestData),
        signal: controller.signal
      });

      // Clear the timeout
      clearTimeout(timeoutId);

      // Handle error responses
      if (!response.ok) {
        let errorDetails: any;
        try {
          // Try to parse error as JSON
          errorDetails = await response.json();
        } catch {
          // If not JSON, get as text
          errorDetails = await response.text();
        }
        
        // Determine error type based on status code
        let errorType: LMStudioErrorType;
        switch (response.status) {
          case 401:
          case 403:
            errorType = LMStudioErrorType.AUTHENTICATION;
            break;
          case 404:
            errorType = LMStudioErrorType.MODEL;
            break;
          case 400:
            errorType = LMStudioErrorType.REQUEST;
            break;
          case 500:
          case 502:
          case 503:
            errorType = LMStudioErrorType.SERVER;
            break;
          default:
            errorType = LMStudioErrorType.UNKNOWN;
        }
        
        throw new LMStudioError(
          `LM Studio API error (${response.status}): ${response.statusText}`,
          errorType,
          response.status,
          errorDetails
        );
      }

      let data: LMStudioChatResponse;
      try {
        data = await response.json();
      } catch (parseError) {
        throw new LMStudioError(
          'Failed to parse LM Studio response as JSON',
          LMStudioErrorType.RESPONSE,
          response.status,
          parseError
        );
      }
      
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
      // Clear the timeout if it's still active
      clearTimeout(timeoutId);
      
      // Handle specific error types
      if (error instanceof LMStudioError) {
        // Re-throw LMStudioError instances
        throw error;
      } else if (error instanceof DOMException && error.name === 'AbortError') {
        // Request was aborted due to timeout
        throw new LMStudioError(
          'Request to LM Studio timed out',
          LMStudioErrorType.TIMEOUT
        );
      } else if (error instanceof TypeError && error.message.includes('fetch')) {
        // Network error or CORS issue
        throw new LMStudioError(
          'Failed to connect to LM Studio server',
          LMStudioErrorType.CONNECTION,
          undefined,
          error
        );
      }
      
      // Generic error case
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
  if (!lmStudioService) {
    lmStudioService = new LMStudioService(config);
  } else {
    lmStudioService.updateConfig(config);
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
