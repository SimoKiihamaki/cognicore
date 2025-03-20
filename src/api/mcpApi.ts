/**
 * MCP Server API Service
 * Handles communication with MCP (Model Control Protocol) servers
 */

export interface MCPServer {
  id: string;
  name: string;
  url: string;
  apiKey: string;
  isActive: boolean;
  requiresAuthentication?: boolean;
}

export interface MCPAuthResponse {
  success: boolean;
  token: string;
  refreshToken?: string;
  message?: string;
  expiresIn?: number; // In seconds
}

export interface MCPAuthError {
  code: string;
  message: string;
  details?: any;
}

export interface MCPQueryRequest {
  query: string;
  options?: {
    includeMetadata?: boolean;
    maxResults?: number;
    similarityThreshold?: number;
    [key: string]: any;
  };
}

export interface MCPQueryResult {
  id: string;
  title: string;
  content: string;
  similarity: number;
  metadata?: Record<string, any>;
  source?: string;
}

export interface MCPQueryResponse {
  results: MCPQueryResult[];
  metadata?: {
    totalResults: number;
    queryTime: number;
    [key: string]: any;
  };
}

/**
 * MCP Server API service for interacting with knowledge base servers
 */
export class MCPService {
  private server: MCPServer;
  private authToken: string | null = null;
  
  constructor(server: MCPServer) {
    this.server = server;
  }

  /**
   * Update the service configuration
   */
  updateServer(server: MCPServer): void {
    this.server = server;
  }

  /**
   * Set the authentication token for API requests
   */
  setAuthToken(token: string | null): void {
    this.authToken = token;
  }

  /**
   * Get the full API endpoint URL for a specific endpoint
   */
  private getApiUrl(endpoint: string): string {
    return `${this.server.url.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`;
  }

  /**
   * Create the headers for API requests
   */
  private createHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Use auth token if available, otherwise fall back to API key
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    } else if (this.server.apiKey) {
      headers['Authorization'] = `Bearer ${this.server.apiKey}`;
    }

    return headers;
  }

  /**
   * Authenticate with the MCP server using username and password
   */
  async authenticate(username: string, password: string): Promise<MCPAuthResponse> {
    try {
      const response = await fetch(this.getApiUrl('auth/login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorInfo: MCPAuthError;
        
        try {
          errorInfo = JSON.parse(errorText);
        } catch {
          errorInfo = {
            code: 'AUTH_ERROR',
            message: errorText || `Authentication failed (${response.status})`,
          };
        }
        
        return {
          success: false,
          token: '',
          message: errorInfo.message,
        };
      }

      const authData = await response.json();
      
      // Store the token for future requests
      if (authData.token) {
        this.setAuthToken(authData.token);
      }
      
      return {
        success: true,
        token: authData.token,
        refreshToken: authData.refreshToken,
        expiresIn: authData.expiresIn,
        message: 'Authentication successful',
      };
    } catch (error) {
      console.error(`Authentication failed for "${this.server.name}":`, error);
      return {
        success: false,
        token: '',
        message: error instanceof Error ? error.message : 'Unknown authentication error',
      };
    }
  }

  /**
   * Refresh an authentication token using a refresh token
   */
  async refreshToken(refreshToken: string): Promise<MCPAuthResponse> {
    try {
      const response = await fetch(this.getApiUrl('auth/refresh'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          token: '',
          message: `Token refresh failed: ${errorText}`,
        };
      }

      const refreshData = await response.json();
      
      // Store the new token
      if (refreshData.token) {
        this.setAuthToken(refreshData.token);
      }
      
      return {
        success: true,
        token: refreshData.token,
        refreshToken: refreshData.refreshToken || refreshToken, // Keep old refresh token if not provided
        expiresIn: refreshData.expiresIn,
        message: 'Token refreshed successfully',
      };
    } catch (error) {
      console.error(`Token refresh failed for "${this.server.name}":`, error);
      return {
        success: false,
        token: '',
        message: error instanceof Error ? error.message : 'Unknown error refreshing token',
      };
    }
  }

  /**
   * Log out and invalidate the current token
   */
  async logout(): Promise<boolean> {
    if (!this.authToken) {
      // Already logged out
      return true;
    }
    
    try {
      const response = await fetch(this.getApiUrl('auth/logout'), {
        method: 'POST',
        headers: this.createHeaders(),
      });
      
      // Clear the token regardless of the response
      this.setAuthToken(null);
      
      return response.ok;
    } catch (error) {
      console.error(`Logout failed for "${this.server.name}":`, error);
      // Still clear the token on error
      this.setAuthToken(null);
      return false;
    }
  }

  /**
   * Test the connection to the MCP server
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(this.getApiUrl('health'), {
        method: 'GET',
        headers: this.createHeaders(),
      });
      
      return response.ok;
    } catch (error) {
      console.error(`MCP server "${this.server.name}" connection test failed:`, error);
      return false;
    }
  }

  /**
   * Send a query to the MCP server to find relevant content
   */
  async queryKnowledge(
    query: string, 
    options: MCPQueryRequest['options'] = {}
  ): Promise<MCPQueryResponse> {
    const requestData: MCPQueryRequest = {
      query,
      options: {
        includeMetadata: true,
        maxResults: 10,
        similarityThreshold: 0.3,
        ...options
      }
    };

    try {
      const response = await fetch(this.getApiUrl('query'), {
        method: 'POST',
        headers: this.createHeaders(),
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        // Check for authentication errors
        if (response.status === 401) {
          throw new Error('Authentication required or token expired');
        }
        
        const errorText = await response.text();
        throw new Error(`MCP API error (${response.status}): ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Failed to query MCP server "${this.server.name}":`, error);
      throw error;
    }
  }

  /**
   * Get server information and capabilities
   */
  async getServerInfo(): Promise<any> {
    try {
      const response = await fetch(this.getApiUrl('info'), {
        method: 'GET',
        headers: this.createHeaders(),
      });

      if (!response.ok) {
        // Check for authentication errors
        if (response.status === 401) {
          throw new Error('Authentication required or token expired');
        }
        
        const errorText = await response.text();
        throw new Error(`MCP API error (${response.status}): ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Failed to get info from MCP server "${this.server.name}":`, error);
      throw error;
    }
  }
}

// Store for active MCP services
const mcpServices: Record<string, MCPService> = {};

/**
 * Get or create an MCP service for a specific server
 */
export function getMCPService(server: MCPServer): MCPService {
  if (!mcpServices[server.id]) {
    mcpServices[server.id] = new MCPService(server);
  } else {
    mcpServices[server.id].updateServer(server);
  }
  
  return mcpServices[server.id];
}

/**
 * Get the active MCP service from a list of servers
 */
export function getActiveMCPService(servers: MCPServer[]): MCPService | null {
  const activeServer = servers.find(server => server.isActive);
  
  if (!activeServer) {
    return null;
  }
  
  return getMCPService(activeServer);
}
