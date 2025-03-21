/**
 * CORS Proxy for API Requests
 * 
 * This module provides a proxy to help with CORS issues when communicating
 * with local API servers like LM Studio that may not have proper CORS headers.
 */

/**
 * Interface for proxy fetch options
 */
export interface ProxyFetchOptions extends RequestInit {
  timeout?: number;  // Timeout in milliseconds
}

/**
 * ProxyError class for handling specific proxy errors
 */
export class ProxyError extends Error {
  status?: number;
  statusText?: string;
  type: 'timeout' | 'cors' | 'network' | 'parse' | 'unknown';

  constructor(
    message: string, 
    type: 'timeout' | 'cors' | 'network' | 'parse' | 'unknown' = 'unknown',
    status?: number,
    statusText?: string
  ) {
    super(message);
    this.name = 'ProxyError';
    this.type = type;
    this.status = status;
    this.statusText = statusText;
  }
}

/**
 * Makes a fetch request with a built-in timeout and better error handling
 */
export async function proxyFetch(
  url: string,
  options: ProxyFetchOptions = {}
): Promise<Response> {
  // Extract timeout from options (default to 30 seconds)
  const { timeout = 30000, ...fetchOptions } = options;
  
  // Setup abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    // Try direct fetch first with CORS mode
    const directOptions = {
      ...fetchOptions,
      signal: controller.signal,
      mode: 'cors' as RequestMode,
    };
    
    console.log(`Making ${fetchOptions.method || 'GET'} request to ${url}`);
    
    const response = await fetch(url, directOptions);
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.warn(`Request failed with status ${response.status}: ${response.statusText}`);
      
      // For 4xx/5xx responses, extract more details
      let errorDetails: any;
      try {
        errorDetails = await response.clone().json();
      } catch {
        try {
          errorDetails = await response.clone().text();
        } catch {
          errorDetails = 'Unable to extract error details';
        }
      }
      
      // Create a more descriptive error
      throw new ProxyError(
        `API request failed: ${response.status} ${response.statusText}`,
        'network',
        response.status,
        response.statusText
      );
    }
    
    return response;
  } catch (error) {
    // Clean up timeout
    clearTimeout(timeoutId);
    
    // Handle specific error types
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ProxyError(
        `Request to ${url} timed out after ${timeout}ms`,
        'timeout'
      );
    }
    
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      // This is likely a CORS or network error
      console.error('CORS or network error:', error);
      throw new ProxyError(
        `Network error when connecting to ${url}. This could be due to CORS restrictions or the server being unavailable.`,
        'cors'
      );
    }
    
    if (error instanceof ProxyError) {
      throw error;
    }
    
    // Generic error case
    console.error('Unhandled error during request:', error);
    throw new ProxyError(
      `Request to ${url} failed: ${error instanceof Error ? error.message : String(error)}`,
      'unknown'
    );
  }
}

/**
 * Makes a JSON request and parses the response
 */
export async function proxyFetchJson<T = any>(
  url: string,
  options: ProxyFetchOptions = {}
): Promise<T> {
  try {
    // Ensure headers include Content-Type: application/json
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };
    
    const response = await proxyFetch(url, {
      ...options,
      headers
    });
    
    try {
      return await response.json();
    } catch (parseError) {
      throw new ProxyError(
        `Failed to parse response as JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
        'parse'
      );
    }
  } catch (error) {
    // Re-throw ProxyError instances
    if (error instanceof ProxyError) {
      throw error;
    }
    
    // Convert other errors to ProxyError
    throw new ProxyError(
      `JSON request to ${url} failed: ${error instanceof Error ? error.message : String(error)}`,
      'unknown'
    );
  }
}
