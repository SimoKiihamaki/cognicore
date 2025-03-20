
import { Note, IndexedFile, ContentItemType } from '@/lib/types';
import { SimilarityResult } from './types';
import { invalidateItemCache } from './types';
import { calculateCosineSimilarity } from '@/utils/embeddings';

/**
 * Find similar content items based on embeddings
 * @param itemId ID of the item to find similarities for
 * @param items Array of content items to search
 * @param threshold Minimum similarity score (0-1)
 * @param limit Maximum number of results to return
 * @returns Array of similarity results
 */
export function findSimilarContent(
  itemId: string,
  items: (Note | IndexedFile)[],
  threshold: number = 0.3,
  limit: number = 5
): SimilarityResult[] {
  // Find the source item
  const sourceItem = items.find(item => item.id === itemId);
  if (!sourceItem || !sourceItem.embeddings || sourceItem.embeddings.length === 0) {
    return [];
  }

  const results: SimilarityResult[] = items
    // Filter out the source item itself and items without embeddings
    .filter(item => 
      item.id !== itemId && 
      item.embeddings && 
      item.embeddings.length > 0 &&
      !('isDeleted' in item && item.isDeleted)
    )
    // Calculate similarity between source and each item
    .map(item => {
      const similarity = calculateCosineSimilarity(
        sourceItem.embeddings as number[], 
        item.embeddings as number[]
      );
      
      // Determine the item type
      const type: ContentItemType = 'content' in item ? 'note' : 'file';
      
      // Handle title based on item type
      const title = 'title' in item 
        ? item.title
        : item.filename || 'Untitled File';
        
      // Get content snippet if available
      const content = 'content' in item 
        ? item.content 
        : item.content || '';
      
      return {
        id: item.id,
        type,
        similarity,
        title,
        content
      };
    })
    // Filter by threshold
    .filter(result => result.similarity >= threshold)
    // Sort by similarity (highest first)
    .sort((a, b) => b.similarity - a.similarity)
    // Limit the number of results
    .slice(0, limit);

  return results;
}

/**
 * Compare two items directly for similarity
 * @param item1 First item
 * @param item2 Second item
 * @returns Similarity score between 0 and 1
 */
export function compareItems(
  item1: Note | IndexedFile,
  item2: Note | IndexedFile
): number {
  if (
    !item1.embeddings || 
    !item2.embeddings || 
    item1.embeddings.length === 0 || 
    item2.embeddings.length === 0
  ) {
    return 0;
  }

  return calculateCosineSimilarity(item1.embeddings, item2.embeddings);
}

/**
 * Get a title that works for both Note and IndexedFile types
 */
export function getItemTitle(item: Note | IndexedFile): string {
  if ('title' in item) {
    return item.title;
  } else {
    return item.filename || 'Untitled File';
  }
}

/**
 * Get a content string that works for both Note and IndexedFile types
 */
export function getItemContent(item: Note | IndexedFile): string {
  if ('content' in item && item.content) {
    return item.content;
  } else if ('content' in item && typeof item.content === 'string') {
    return item.content;
  }
  return '';
}
