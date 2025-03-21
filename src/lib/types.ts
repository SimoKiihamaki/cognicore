export interface Note {
  id: string;
  title: string;
  content: string;
  folderId: string;
  embeddings?: number[];
  createdAt: Date;
  updatedAt: Date;
  tags?: string[];
}

export interface IndexedFile {
  id: string;
  filename: string;
  filepath: string;
  content?: string;
  filetype: string;
  lastModified: Date;
  size: number;
  embeddings?: number[];
  isDeleted?: boolean;
}

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isError?: boolean;
  referencedContexts?: string[];
}

export interface ChatHistory {
  id: string;
  title: string;
  summary: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
  modelUsed: string;
  tags?: string[];
  isStarred?: boolean;
  hasImages?: boolean;
}

export interface LMStudioConfig {
  baseUrl: string;
  apiKey: string;
  primaryModelName: string;
  secondaryModelName: string;
  embeddingModelName: string;
  connectionMode: 'local' | 'api';
  temperature: number;
  topP: number;
  topK: number;
  maxTokens: number;
  useVision: boolean;
}

export interface ModelPreset {
  name: string;
  modelName: string;
  contextLength: number;
  description: string;
  category: 'open' | 'proprietary';
  tags: string[];
  recommendedSettings?: {
    temperature?: number;
    topP?: number;
    topK?: number;
    maxTokens?: number;
  };
}

export interface Settings {
  lmStudioBaseUrl: string;
  lmStudioApiKey: string;
  primaryModelName: string;
  secondaryModelName: string;
  folderPaths: string[];
  similarityThreshold: number;
  autoOrganizeNotes: boolean;
  embeddingModelName: string;
  lmStudioConfig?: LMStudioConfig;
}

export interface GraphNode {
  id: string;
  label: string;
  data: Note;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  similarity: number;
}

export type ContentItemType = "note" | "file";

export interface MonitoredFolder {
  id: string;
  path: string;
  handle: FileSystemDirectoryHandle;
  isActive: boolean;
}

export interface MonitoringStats {
  totalFiles: number;
  filesMonitored: number;
  filesProcessed: number;
  activeMonitors: number;
  lastScanTime: Date | null;
  fileTypes: {
    [key: string]: number;
  };
}

export interface SimilarityResult {
  id: string;
  title: string;
  type: ContentItemType;
  similarity: number;
}

export interface Embedding {
  id: string;
  noteId: string;
  vector: number[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Tag {
  id: string;
  name: string;
  color?: string;
  createdAt: Date;
  updatedAt: Date;
}
