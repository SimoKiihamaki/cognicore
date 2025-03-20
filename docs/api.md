# API Documentation

## LM Studio Integration

### API Client
```typescript
interface LMStudioConfig {
  baseUrl: string;
  apiKey?: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

interface LMStudioResponse {
  text: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: string;
}
```

### API Endpoints

#### Chat Completion
```typescript
POST /v1/chat/completions
Request:
{
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  model: string;
  temperature?: number;
  max_tokens?: number;
}

Response:
{
  id: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}
```

#### Model Information
```typescript
GET /v1/models
Response:
{
  data: Array<{
    id: string;
    object: string;
    owned_by: string;
    permission: Array<{
      id: string;
      object: string;
      created: number;
      allow_create_engine: boolean;
      allow_sampling: boolean;
      allow_logprobs: boolean;
      allow_search_indices: boolean;
      allow_view: boolean;
      allow_fine_tuning: boolean;
      organization: string;
      group: string | null;
      is_blocking: boolean;
    }>;
    root: string;
    parent: string | null;
  }>;
}
```

## File System API

### File System Access
```typescript
interface FileSystemHandle {
  kind: 'file' | 'directory';
  name: string;
  getFile(): Promise<File>;
  createWritable(): Promise<FileSystemWritableFileStream>;
}

interface FileSystemDirectoryHandle extends FileSystemHandle {
  kind: 'directory';
  getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<FileSystemDirectoryHandle>;
  getFileHandle(name: string, options?: { create?: boolean }): Promise<FileSystemFileHandle>;
  removeEntry(name: string): Promise<void>;
  resolve(possibleDescendant: FileSystemHandle): Promise<string[] | null>;
}
```

### File Operations
```typescript
interface FileOperations {
  readFile(handle: FileSystemFileHandle): Promise<string>;
  writeFile(handle: FileSystemFileHandle, content: string): Promise<void>;
  deleteFile(handle: FileSystemFileHandle): Promise<void>;
  listDirectory(handle: FileSystemDirectoryHandle): Promise<FileSystemHandle[]>;
}
```

## IndexedDB API

### Database Operations
```typescript
interface DatabaseOperations {
  // Notes
  createNote(note: Note): Promise<string>;
  getNote(id: string): Promise<Note | null>;
  updateNote(id: string, note: Partial<Note>): Promise<void>;
  deleteNote(id: string): Promise<void>;
  listNotes(folderId?: string): Promise<Note[]>;
  
  // Folders
  createFolder(folder: Folder): Promise<string>;
  getFolder(id: string): Promise<Folder | null>;
  updateFolder(id: string, folder: Partial<Folder>): Promise<void>;
  deleteFolder(id: string): Promise<void>;
  listFolders(parentId?: string): Promise<Folder[]>;
  
  // Embeddings
  createEmbedding(embedding: Embedding): Promise<string>;
  getEmbedding(id: string): Promise<Embedding | null>;
  getEmbeddingsByNote(noteId: string): Promise<Embedding[]>;
  deleteEmbedding(id: string): Promise<void>;
  
  // Files
  createFile(file: File): Promise<string>;
  getFile(id: string): Promise<File | null>;
  updateFile(id: string, file: Partial<File>): Promise<void>;
  deleteFile(id: string): Promise<void>;
  listFiles(path?: string): Promise<File[]>;
}
```

## API Flow Diagrams

### LM Studio Integration Flow
```mermaid
sequenceDiagram
    participant UI
    participant ChatInterface
    participant LMStudioAPI
    participant LMStudio
    
    UI->>ChatInterface: Send Message
    ChatInterface->>LMStudioAPI: Prepare Request
    LMStudioAPI->>LMStudio: Send Request
    LMStudio-->>LMStudioAPI: Stream Response
    LMStudioAPI-->>ChatInterface: Process Response
    ChatInterface-->>UI: Update Chat
```

### File System Operations Flow
```mermaid
sequenceDiagram
    participant UI
    participant FileSystem
    participant IndexedDB
    participant FileMonitor
    
    UI->>FileSystem: Request Access
    FileSystem-->>UI: Directory Handle
    
    UI->>FileSystem: Read File
    FileSystem->>IndexedDB: Store File Info
    FileSystem->>FileMonitor: Watch File
    
    FileMonitor->>UI: File Changed
    UI->>FileSystem: Update File
    FileSystem->>IndexedDB: Update File Info
```

### Database Operations Flow
```mermaid
sequenceDiagram
    participant UI
    participant Service
    participant IndexedDB
    participant Cache
    
    UI->>Service: Request Data
    Service->>Cache: Check Cache
    alt Cache Hit
        Cache-->>Service: Return Cached Data
    else Cache Miss
        Service->>IndexedDB: Query Data
        IndexedDB-->>Service: Return Data
        Service->>Cache: Update Cache
    end
    Service-->>UI: Return Data
```

## Error Handling

### API Error Types
```typescript
interface APIError {
  code: string;
  message: string;
  details?: any;
}

enum ErrorCodes {
  // LM Studio Errors
  LM_STUDIO_CONNECTION_ERROR = 'LM_STUDIO_CONNECTION_ERROR',
  LM_STUDIO_TIMEOUT = 'LM_STUDIO_TIMEOUT',
  LM_STUDIO_RATE_LIMIT = 'LM_STUDIO_RATE_LIMIT',
  
  // File System Errors
  FILE_SYSTEM_ACCESS_DENIED = 'FILE_SYSTEM_ACCESS_DENIED',
  FILE_SYSTEM_NOT_SUPPORTED = 'FILE_SYSTEM_NOT_SUPPORTED',
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  
  // Database Errors
  DATABASE_CONNECTION_ERROR = 'DATABASE_CONNECTION_ERROR',
  DATABASE_QUOTA_EXCEEDED = 'DATABASE_QUOTA_EXCEEDED',
  RECORD_NOT_FOUND = 'RECORD_NOT_FOUND',
  
  // General Errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}
```

### Error Handling Flow
```mermaid
graph TD
    A[API Call] --> B{Success?}
    B -->|Yes| C[Process Response]
    B -->|No| D[Error Type]
    
    D --> E[Network Error]
    D --> F[Validation Error]
    D --> G[System Error]
    
    E --> H[Retry Logic]
    F --> I[User Feedback]
    G --> J[System Recovery]
    
    H --> K[Max Retries?]
    K -->|Yes| I
    K -->|No| A
    
    I --> L[Error UI]
    J --> M[Recovery Action]
```

## Rate Limiting

### Rate Limit Configuration
```typescript
interface RateLimitConfig {
  maxRequests: number;
  timeWindow: number; // milliseconds
  backoffStrategy: 'linear' | 'exponential';
  maxRetries: number;
}
```

### Rate Limit Implementation
```typescript
class RateLimiter {
  private requests: number[] = [];
  private config: RateLimitConfig;
  
  constructor(config: RateLimitConfig) {
    this.config = config;
  }
  
  async checkLimit(): Promise<boolean> {
    const now = Date.now();
    this.requests = this.requests.filter(
      time => now - time < this.config.timeWindow
    );
    
    if (this.requests.length >= this.config.maxRequests) {
      return false;
    }
    
    this.requests.push(now);
    return true;
  }
}
```

## API Security

### Security Measures
1. **API Key Management**
   - Secure storage of API keys
   - Key rotation mechanism
   - Access control

2. **Request Validation**
   - Input sanitization
   - Schema validation
   - Size limits

3. **Response Security**
   - Data encryption
   - CORS configuration
   - Content security policy

### Security Flow
```mermaid
graph TD
    A[Request] --> B[Security Check]
    B --> C{Valid?}
    
    C -->|Yes| D[Process Request]
    C -->|No| E[Security Error]
    
    D --> F[Validate Input]
    F --> G{Valid?}
    
    G -->|Yes| H[Process Data]
    G -->|No| I[Validation Error]
    
    H --> J[Encrypt Response]
    J --> K[Send Response]
    
    E --> L[Security UI]
    I --> L
```

## Performance Optimization

### Caching Strategy
```typescript
interface CacheConfig {
  ttl: number; // Time to live in milliseconds
  maxSize: number;
  strategy: 'lru' | 'fifo';
}

class APICache {
  private cache: Map<string, {
    data: any;
    timestamp: number;
  }> = new Map();
  private config: CacheConfig;
  
  constructor(config: CacheConfig) {
    this.config = config;
  }
  
  async get(key: string): Promise<any | null> {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() - item.timestamp > this.config.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }
  
  set(key: string, data: any): void {
    if (this.cache.size >= this.config.maxSize) {
      this.evict();
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }
  
  private evict(): void {
    if (this.config.strategy === 'lru') {
      // Implement LRU eviction
    } else {
      // Implement FIFO eviction
    }
  }
}
```

### Performance Monitoring
```typescript
interface PerformanceMetrics {
  requestCount: number;
  averageResponseTime: number;
  errorRate: number;
  cacheHitRate: number;
}

class APIMonitor {
  private metrics: PerformanceMetrics = {
    requestCount: 0,
    averageResponseTime: 0,
    errorRate: 0,
    cacheHitRate: 0
  };
  
  trackRequest(duration: number, success: boolean): void {
    this.metrics.requestCount++;
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime * (this.metrics.requestCount - 1) + duration) 
      / this.metrics.requestCount;
    
    if (!success) {
      this.metrics.errorRate = 
        (this.metrics.errorRate * (this.metrics.requestCount - 1) + 1) 
        / this.metrics.requestCount;
    }
  }
  
  trackCacheHit(hit: boolean): void {
    this.metrics.cacheHitRate = 
      (this.metrics.cacheHitRate * (this.metrics.requestCount - 1) + (hit ? 1 : 0)) 
      / this.metrics.requestCount;
  }
}
``` 