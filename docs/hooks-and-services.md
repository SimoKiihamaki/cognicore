# Hooks and Services Documentation

## Custom Hooks

### useNotes
**Location**: `src/hooks/useNotes.tsx`
**Purpose**: Manage note state and operations
**Features**:
- Note CRUD operations
- Note relationships
- Note search
- Note synchronization

```mermaid
graph TD
    A[useNotes] --> B[Note Operations]
    A --> C[State Management]
    A --> D[Cache Integration]
    
    B --> E[Create Note]
    B --> F[Update Note]
    B --> G[Delete Note]
    B --> H[Search Notes]
    
    C --> I[Notes State]
    C --> J[Loading State]
    C --> K[Error State]
    
    D --> L[Cache Service]
    D --> M[Sync Service]
```

### useFolders
**Location**: `src/hooks/useFolders.tsx`
**Purpose**: Manage folder structure and hierarchy
**Features**:
- Folder CRUD operations
- Tree structure management
- Folder navigation
- Folder permissions

```mermaid
graph TD
    A[useFolders] --> B[Folder Operations]
    A --> C[Tree Management]
    A --> D[State Management]
    
    B --> E[Create Folder]
    B --> F[Move Folder]
    B --> G[Delete Folder]
    
    C --> H[Tree Structure]
    C --> I[Tree Traversal]
    C --> J[Tree Updates]
    
    D --> K[Folder State]
    D --> L[Selection State]
    D --> M[Expansion State]
```

### useEmbeddings
**Location**: `src/hooks/useEmbeddings.tsx`
**Purpose**: Handle AI embeddings and semantic search
**Features**:
- Text embedding generation
- Semantic search
- Similarity calculations
- Cache management

```mermaid
graph TD
    A[useEmbeddings] --> B[Embedding Service]
    A --> C[Search Service]
    A --> D[Cache Service]
    
    B --> E[Text Processing]
    B --> F[Vector Generation]
    B --> G[Model Integration]
    
    C --> H[Query Processing]
    C --> I[Similarity Search]
    C --> J[Result Ranking]
    
    D --> K[Cache Storage]
    D --> L[Cache Invalidation]
    D --> M[Cache Updates]
```

### useOfflineStatus
**Location**: `src/hooks/useOfflineStatus.tsx`
**Purpose**: Manage offline functionality
**Features**:
- Connection status monitoring
- Offline queue management
- Sync status tracking
- Error handling

```mermaid
graph TD
    A[useOfflineStatus] --> B[Connection Monitor]
    A --> C[Queue Manager]
    A --> D[Sync Manager]
    
    B --> E[Status Detection]
    B --> F[Event Handling]
    B --> G[Status Updates]
    
    C --> H[Queue Operations]
    C --> I[Queue Processing]
    C --> J[Queue Storage]
    
    D --> K[Sync Operations]
    D --> L[Conflict Resolution]
    D --> M[Sync Status]
```

## Services

### cacheService
**Location**: `src/services/cacheService.ts`
**Purpose**: Manage application caching
**Features**:
- Cache initialization
- Cache operations
- Cache invalidation
- Cache persistence

```mermaid
graph TD
    A[cacheService] --> B[Cache Operations]
    A --> C[Storage Management]
    A --> D[Cache Policy]
    
    B --> E[Get]
    B --> F[Set]
    B --> G[Delete]
    B --> H[Clear]
    
    C --> I[Local Storage]
    S --> J[Memory Cache]
    S --> K[IndexedDB]
    
    D --> L[Size Limits]
    D --> M[Expiration]
    D --> N[Priority]
```

### fileMonitor
**Location**: `src/services/fileMonitor.ts`
**Purpose**: Monitor file system changes
**Features**:
- File watching
- Change detection
- Event handling
- Sync management

```mermaid
graph TD
    A[fileMonitor] --> B[File Watching]
    A --> C[Change Detection]
    A --> D[Event System]
    
    B --> E[Watch Paths]
    B --> F[Watch Options]
    B --> G[Watch Events]
    
    C --> H[Change Types]
    C --> I[Change Filtering]
    C --> J[Change Processing]
    
    D --> K[Event Emitter]
    D --> L[Event Handlers]
    D --> M[Event Queue]
```

### embeddingWorkerService
**Location**: `src/services/embeddingWorkerService.ts`
**Purpose**: Handle AI embedding operations
**Features**:
- Worker management
- Task processing
- Result handling
- Error management

```mermaid
graph TD
    A[embeddingWorkerService] --> B[Worker Management]
    A --> C[Task Processing]
    A --> D[Result Handling]
    
    B --> E[Worker Creation]
    B --> F[Worker Lifecycle]
    B --> G[Worker Communication]
    
    C --> H[Task Queue]
    C --> I[Task Execution]
    C --> J[Task Monitoring]
    
    D --> K[Result Processing]
    D --> L[Error Handling]
    D --> M[Result Storage]
```

## Service Interactions

```mermaid
sequenceDiagram
    participant App
    participant Hooks
    participant Services
    participant Storage
    
    App->>Hooks: Initialize
    Hooks->>Services: Setup
    Services->>Storage: Initialize
    
    loop Application Lifecycle
        App->>Hooks: User Action
        Hooks->>Services: Process
        Services->>Storage: Update
        Storage-->>App: Update UI
    end
    
    App->>Hooks: Cleanup
    Hooks->>Services: Shutdown
    Services->>Storage: Finalize
```

## Data Flow

```mermaid
graph TD
    A[User Action] --> B[React Component]
    B --> C[Custom Hook]
    C --> D[Service Layer]
    D --> E[Storage Layer]
    E --> F[Cache Layer]
    
    C --> G[State Updates]
    G --> B
    
    D --> H[Background Tasks]
    H --> I[Worker Threads]
    I --> D
    
    F --> J[Persistence]
    J --> K[File System]
    K --> F
```

## Error Handling

```mermaid
graph TD
    A[Error] --> B[Error Boundary]
    B --> C[Error Type]
    
    C --> D[Network Error]
    C --> E[Storage Error]
    C --> F[Worker Error]
    
    D --> G[Retry Logic]
    D --> H[Fallback UI]
    
    E --> I[Recovery Logic]
    E --> J[Data Backup]
    
    F --> K[Worker Restart]
    F --> L[Task Requeue]
```

## Performance Considerations

1. **Caching Strategy**
   - Implement proper cache invalidation
   - Use appropriate cache size limits
   - Monitor cache hit rates
   - Optimize cache storage

2. **Worker Management**
   - Control worker pool size
   - Implement task prioritization
   - Handle worker failures
   - Monitor worker performance

3. **State Management**
   - Minimize unnecessary updates
   - Implement proper memoization
   - Use appropriate data structures
   - Optimize state updates

4. **Resource Management**
   - Clean up resources properly
   - Implement proper error handling
   - Monitor memory usage
   - Handle edge cases 