import { Note, Folder, IndexedFile, ContentItemType } from '@/lib/types';

export interface ContentItem {
  id: string;
  title: string;
  content: string;
  folderId?: string;
  embeddings?: number[];
  keyTerms?: string[];
}

export interface OrganizationSuggestion {
  itemId: string;
  itemType: 'note' | 'file';
  suggestedFolderId: string;
  confidence: number;
  reason: string;
}

export interface OrganizationResult {
  appliedCount: number;
  suggestions: OrganizationSuggestion[];
}

export interface SimilarityResult {
  id: string;
  type: ContentItemType;
  similarity: number;
  title?: string;
  content?: string;
}

export interface EmbeddingJobResult {
  id: string;
  embeddings: number[];
  success: boolean;
  error?: string;
}
