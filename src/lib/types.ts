
export interface Note {
  id: string;
  title: string;
  content: string;
  embeddings?: number[];
  createdAt: Date;
  updatedAt: Date;
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
