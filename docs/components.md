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
**Location**: `src/components/ChatInterface.tsx`
**Purpose**: AI interaction interface
**Features**:
- Real-time chat
- Message history
- Context awareness
- Code highlighting

```mermaid
graph TD
    A[ChatInterface] --> B[Message List]
    A --> C[Input Area]
    A --> D[Context Manager]
    B --> E[Message Rendering]
    C --> F[Input Validation]
    D --> G[Context Gathering]
    D --> H[History Management]
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
    A[App] --> B[Index]
    B --> C[Sidebar]
    B --> D[Header]
    B --> E[Main Content]
    E --> F[NoteEditor]
    E --> G[GraphVisualization]
    E --> H[ChatInterface]
    E --> I[SettingsPanel]
    
    C --> J[FolderTree]
    C --> K[SearchBar]
    
    D --> L[ThemeSwitcher]
    D --> M[UserMenu]
    
    F --> N[MarkdownEditor]
    F --> O[Preview]
    
    G --> P[CytoscapeGraph]
    G --> Q[LayoutControls]
    
    H --> R[MessageList]
    H --> S[InputArea]
```

## Component State Management

```mermaid
graph TD
    A[Component State] --> B[Local State]
    A --> C[Context State]
    A --> D[Query State]
    
    B --> E[useState]
    B --> F[useReducer]
    
    C --> G[FoldersContext]
    C --> H[ThemeContext]
    
    D --> I[Notes Query]
    D --> J[Settings Query]
```

## Component Lifecycle

```mermaid
sequenceDiagram
    participant Component
    participant Hooks
    participant Services
    participant Storage
    
    Component->>Hooks: Mount
    Hooks->>Services: Initialize
    Services->>Storage: Load Data
    Storage-->>Component: Update
    
    loop User Interaction
        Component->>Hooks: Update State
        Hooks->>Services: Process
        Services->>Storage: Save
        Storage-->>Component: Refresh
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
   - Keep components focused and single-responsibility
   - Use TypeScript interfaces for props
   - Implement proper error boundaries
   - Follow React hooks best practices

2. **Performance**
   - Use React.memo for expensive renders
   - Implement proper key props
   - Lazy load when appropriate
   - Optimize re-renders

3. **Accessibility**
   - Use semantic HTML
   - Implement ARIA attributes
   - Ensure keyboard navigation
   - Maintain color contrast

4. **Testing**
   - Write unit tests for logic
   - Implement integration tests
   - Test edge cases
   - Maintain test coverage 