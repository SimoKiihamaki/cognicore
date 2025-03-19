
import { Note, Folder, IndexedFile, ContentItemType } from '@/lib/types';

export interface ContentItem {
  id: string;
  title: string;
  content: string;
  folderId?: string;
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
