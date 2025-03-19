
export interface Note {
  id: string;
  title: string;
  content: string;
  folderId: string;
  embeddings?: number[];
  createdAt: Date;
  updatedAt: Date;
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
}

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
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
