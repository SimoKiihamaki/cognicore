# Component Documentation

## Core Components

### NoteEditor
**Location**: `src/components/NoteEditor.tsx`
**Purpose**: Rich text editor for note creation and editing
**Features**:
- Markdown support
- Real-time updates
- Auto-save functionality
- Integration with graph visualization

```mermaid
graph TD
    A[NoteEditor] --> B[Markdown Editor]
    A --> C[Auto-save]
    A --> D[Graph Integration]
    B --> E[Preview Mode]
    B --> F[Edit Mode]
    C --> G[Local Storage]
    C --> H[Cache Service]
    D --> I[Update Graph]
```

### GraphVisualization
**Location**: `src/components/GraphVisualization.tsx`
**Purpose**: Interactive visualization of note relationships
**Features**:
- Force-directed graph layout
- Node and edge interactions
- Zoom and pan controls
- Real-time updates

```mermaid
graph TD
    A[GraphVisualization] --> B[Cytoscape]
    A --> C[Layout Engine]
    A --> D[Interaction Handler]
    B --> E[Node Rendering]
    B --> F[Edge Rendering]
    C --> G[Force Layout]
    C --> H[Cola Layout]
    D --> I[Click Events]
    D --> J[Drag Events]
```

### ChatInterface
**Location**: `src/components/chat/EnhancedChatInterface.tsx`
**Purpose**: AI interaction interface with LM Studio integration
**Features**:
- Real-time chat with streaming
- Multi-model support
- Message history management
- Code highlighting
- Vision capabilities (optional)

```mermaid
graph TD
    A[EnhancedChatInterface] --> B[MessageList]
    A --> C[InputArea]
    A --> D[ModelSelector]
    B --> E[MessageRenderer]
    C --> F[StreamProcessor]
    D --> G[ModelConfig]
```

### Sidebar
**Location**: `src/components/Sidebar.tsx`
**Purpose**: Navigation and folder management
**Features**:
- Folder tree view
- Quick actions
- Search functionality
- Section navigation

```mermaid
graph TD
    A[Sidebar] --> B[FolderTree]
    A --> C[SearchBar]
    A --> D[Navigation]
    B --> E[Tree View]
    B --> F[Folder Actions]
    C --> G[Search Results]
    D --> H[Section Links]
```

### ServerConfig
**Location**: `src/components/settings/ServerConfig.tsx`
**Purpose**: LM Studio and MCP server configuration
**Features**:
- Server management
- Model configuration
- Connection testing
- API key management

```mermaid
graph TD
    A[ServerConfig] --> B[LMStudioConfig]
    A --> C[MCPConfig]
    B --> D[ModelPresets]
    B --> E[ConnectionTest]
    C --> F[ServerList]
    C --> G[ServerEditor]
```

### MainLayout
**Location**: `src/components/layout/MainLayout.tsx`
**Purpose**: Primary application layout
**Features**:
- Responsive layout
- Sidebar integration
- Chat interface
- Section navigation

```mermaid
graph TD
    A[MainLayout] --> B[Sidebar]
    A --> C[Header]
    A --> D[Content]
    A --> E[ChatPanel]
    B --> F[Navigation]
    C --> G[Actions]
    D --> H[Routes]
```

### ModelSettings
**Location**: `src/components/settings/ModelSettings.tsx`
**Purpose**: Model configuration and management
**Features**:
- Model selection
- Parameter configuration
- Preset management
- Connection status

```mermaid
graph TD
    A[ModelSettings] --> B[ModelSelector]
    A --> C[ParameterConfig]
    A --> D[PresetManager]
    B --> E[ModelList]
    C --> F[Settings]
    D --> G[Presets]
```

## UI Components

### Button
**Location**: `src/components/ui/button.tsx`
**Purpose**: Reusable button component
**Variants**:
- Primary
- Secondary
- Destructive
- Outline
- Ghost

### Input
**Location**: `src/components/ui/input.tsx`
**Purpose**: Form input component
**Features**:
- Validation support
- Error states
- Disabled states
- Custom styling

### Dialog
**Location**: `src/components/ui/dialog.tsx`
**Purpose**: Modal dialog component
**Features**:
- Accessibility
- Animation
- Backdrop
- Focus management

## Component Relationships

```mermaid
graph TD
    A[App] --> B[MainLayout]
    B --> C[Sidebar]
    B --> D[Header]
    B --> E[Content]
    B --> F[ChatPanel]
    
    C --> G[Navigation]
    C --> H[FolderTree]
    
    D --> I[Actions]
    D --> J[UserMenu]
    
    E --> K[Routes]
    E --> L[ErrorBoundary]
    
    F --> M[EnhancedChat]
    F --> N[ModelSettings]
```

## Component State Management

```mermaid
graph TD
    A[Component State] --> B[Local State]
    A --> C[Context State]
    A --> D[Query State]
    
    B --> E[useState]
    B --> F[useLocalStorage]
    
    C --> G[ServiceContext]
    C --> H[ConfigContext]
    
    D --> I[ChatQueries]
    D --> J[ModelQueries]
```

## Component Lifecycle

```mermaid
sequenceDiagram
    participant Component
    participant Hooks
    participant Services
    participant API
    
    Component->>Hooks: Mount
    Hooks->>Services: Initialize
    Services->>API: Connect
    API-->>Component: Update
    
    loop User Interaction
        Component->>Services: Request
        Services->>API: Process
        API-->>Services: Response
        Services-->>Component: Update
    end
    
    Component->>Hooks: Unmount
    Hooks->>Services: Cleanup
```

## Component Styling

```mermaid
graph TD
    A[Component Styling] --> B[Tailwind CSS]
    A --> C[shadcn/ui]
    A --> D[Custom Styles]
    
    B --> E[Utility Classes]
    B --> F[Responsive Design]
    
    C --> G[Base Components]
    C --> H[Theme System]
    
    D --> I[Component-specific]
    D --> J[Animations]
```

## Best Practices

1. **Component Structure**
   - Use functional components
   - Implement TypeScript types
   - Follow shadcn/ui patterns
   - Maintain error boundaries

2. **State Management**
   - Use appropriate hooks
   - Implement proper caching
   - Handle loading states
   - Manage side effects

3. **Performance**
   - Implement memoization
   - Optimize re-renders
   - Handle async operations
   - Manage resources

4. **Error Handling**
   - Use error boundaries
   - Provide feedback
   - Handle edge cases
   - Log errors properly

5. **Accessibility**
   - Follow ARIA patterns
   - Support keyboard
   - Manage focus
   - Test with tools

6. **Testing**
   - Write unit tests for logic
   - Implement integration tests
   - Test edge cases
   - Maintain test coverage 