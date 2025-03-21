# API Documentation

## LM Studio API

### Overview
The LM Studio API provides integration with local AI models through LM Studio's server.

```typescript
interface LMStudioConfig {
  baseUrl: string;
  apiKey: string;
  primaryModelName: string;
  secondaryModelName: string;
  temperature: number;
  maxTokens: number;
  useVision: boolean;
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  id: string;
  timestamp: number;
  metadata?: {
    model?: string;
    images?: string[];
  };
}

interface ChatResponse {
  message: ChatMessage;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}
```

### Endpoints

#### Chat Completion
```typescript
POST /v1/chat/completions
Content-Type: application/json

{
  "messages": ChatMessage[],
  "model": string,
  "temperature": number,
  "max_tokens": number,
  "stream": boolean
}

Response: {
  "message": ChatMessage,
  "usage": {
    "prompt_tokens": number,
    "completion_tokens": number,
    "total_tokens": number
  }
}
```

#### Vision
```typescript
POST /v1/vision
Content-Type: multipart/form-data

{
  "image": File,
  "prompt": string,
  "model": string,
  "temperature": number,
  "max_tokens": number
}

Response: {
  "message": ChatMessage,
  "usage": {
    "prompt_tokens": number,
    "completion_tokens": number,
    "total_tokens": number
  }
}
```

#### Model Information
```typescript
GET /v1/models

Response: {
  "models": [
    {
      "id": string,
      "name": string,
      "capabilities": string[],
      "parameters": number,
      "contextLength": number
    }
  ]
}
```

## MCP API

### Overview
The Model Control Protocol (MCP) API enables communication with remote model servers.

```typescript
interface MCPServer {
  id: string;
  name: string;
  url: string;
  apiKey: string;
  isActive: boolean;
  requiresAuthentication: boolean;
}

interface MCPRequest {
  serverId: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  headers?: Record<string, string>;
}

interface MCPResponse<T> {
  data: T;
  status: number;
  headers: Record<string, string>;
}
```

### Endpoints

#### Server Health
```typescript
GET /health
Authorization: Bearer <apiKey>

Response: {
  "status": "healthy" | "degraded" | "unhealthy",
  "message": string,
  "timestamp": number,
  "metrics": {
    "requestsPerMinute": number,
    "averageLatency": number,
    "errorRate": number
  }
}
```

#### Model Management
```typescript
GET /models
Authorization: Bearer <apiKey>

Response: {
  "models": [
    {
      "id": string,
      "name": string,
      "status": "loaded" | "loading" | "unloaded",
      "metadata": Record<string, any>
    }
  ]
}
```

## Embedding Service API

### Overview
Local embedding service for semantic search and similarity matching.

```typescript
interface EmbeddingRequest {
  text: string;
  model: string;
  options?: {
    normalize?: boolean;
    pooling?: 'mean' | 'max' | 'min';
    truncate?: number;
  };
}

interface EmbeddingResponse {
  embedding: number[];
  metadata: {
    model: string;
    dimensions: number;
    truncated: boolean;
  };
}

interface SimilarityRequest {
  query: string;
  documents: string[];
  threshold?: number;
  topK?: number;
}

interface SimilarityResult {
  document: string;
  score: number;
  index: number;
}
```

### Methods

#### Generate Embedding
```typescript
POST /api/embeddings
Content-Type: application/json

{
  "text": string,
  "model": string,
  "options": {
    "normalize": boolean,
    "pooling": "mean" | "max" | "min",
    "truncate": number
  }
}

Response: {
  "embedding": number[],
  "metadata": {
    "model": string,
    "dimensions": number,
    "truncated": boolean
  }
}
```

#### Batch Embedding
```typescript
POST /api/embeddings/batch
Content-Type: application/json

{
  "texts": string[],
  "model": string,
  "options": {
    "normalize": boolean,
    "pooling": "mean" | "max" | "min",
    "truncate": number
  }
}

Response: {
  "embeddings": Array<{
    "embedding": number[],
    "metadata": {
      "model": string,
      "dimensions": number,
      "truncated": boolean
    }
  }>
}
```

## Error Handling

### Error Types
```typescript
enum ErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
  MODEL_ERROR = 'MODEL_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR'
}

interface APIError {
  type: ErrorType;
  message: string;
  code: number;
  details?: Record<string, any>;
  timestamp: number;
}
```

### Error Responses
```typescript
// Authentication Error
{
  "type": "AUTHENTICATION_ERROR",
  "message": "Invalid API key",
  "code": 401,
  "timestamp": 1647123456789
}

// Validation Error
{
  "type": "VALIDATION_ERROR",
  "message": "Invalid request parameters",
  "code": 400,
  "details": {
    "field": "temperature",
    "error": "Must be between 0 and 1"
  },
  "timestamp": 1647123456789
}

// Rate Limit Error
{
  "type": "RATE_LIMIT_ERROR",
  "message": "Rate limit exceeded",
  "code": 429,
  "details": {
    "retryAfter": 60,
    "limit": 100,
    "remaining": 0
  },
  "timestamp": 1647123456789
}
```

## Authentication

### API Key Authentication
```typescript
// Request Header
Authorization: Bearer <apiKey>

// Error Response
{
  "type": "AUTHENTICATION_ERROR",
  "message": "Invalid API key",
  "code": 401,
  "timestamp": 1647123456789
}
```

### Session Authentication
```typescript
// Login Request
POST /auth/login
Content-Type: application/json

{
  "username": string,
  "password": string
}

// Login Response
{
  "token": string,
  "expiresIn": number,
  "refreshToken": string
}

// Refresh Token
POST /auth/refresh
Authorization: Bearer <refreshToken>

{
  "token": string,
  "expiresIn": number,
  "refreshToken": string
}
```

## Rate Limiting

### Rate Limit Headers
```typescript
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1647123456789
```

### Rate Limit Response
```typescript
{
  "type": "RATE_LIMIT_ERROR",
  "message": "Rate limit exceeded",
  "code": 429,
  "details": {
    "retryAfter": 60,
    "limit": 100,
    "remaining": 0
  },
  "timestamp": 1647123456789
}
```

## Versioning

### Version Headers
```typescript
Accept-Version: v1
X-API-Version: v1
```

### Version Response
```typescript
{
  "version": "1.0.0",
  "deprecated": false,
  "sunset": null,
  "documentation": "https://api.docs/v1"
}
``` 