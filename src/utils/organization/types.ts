
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
  itemType: ContentItemType;
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

// This function helps invalidate the cache for items that have been modified
export function invalidateItemCache(id: string): void {
  // Implementation would clear any cached data for the specified item
  console.log(`Cache invalidated for item: ${id}`);
}
