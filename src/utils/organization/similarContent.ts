
import { Note, IndexedFile, ContentItemType } from '@/lib/types';
import { ContentItem } from './types';
import { cosineSimilarity } from '@/utils/embeddings';
import { toContentItem } from './contentUtils';

/**
 * Finds content items similar to the provided item.
 * 
 * @param itemId ID of the item to find similar content for
 * @param allItems All available content items
 * @param threshold Similarity threshold (0-1)
 * @param maxResults Maximum number of results to return
 * @returns Array of similar items with similarity scores
 */
export function findSimilarContent(
  itemId: string,
  allItems: (Note | IndexedFile)[],
  threshold: number = 0.3,
  maxResults?: number
) {
  // Find the source item
  const sourceItem = allItems.find(item => item.id === itemId);
  if (!sourceItem || !sourceItem.embeddings || sourceItem.embeddings.length === 0) {
    return [];
  }
  
  // Convert items to a common format for processing
  const targetItems = allItems
    .filter(item => item.id !== itemId && item.embeddings && item.embeddings.length > 0)
    .map(toContentItem);
  
  // Calculate similarity for each item
  const similarities = targetItems.map(item => {
    if (!item.embeddings || item.embeddings.length === 0) {
      return { id: item.id, type: getItemType(item), similarity: 0 };
    }
    
    // Calculate embedding similarity
    const similarity = cosineSimilarity(sourceItem.embeddings!, item.embeddings);
    
    // Calculate text similarity
    let textSimilarity = 0;
    if (sourceItem.content && item.content) {
      const sourceText = getItemText(sourceItem).toLowerCase();
      const targetText = item.content.toLowerCase();
      
      // Simple text similarity heuristic
      if (sourceText && targetText) {
        // Check for direct inclusion of title
        if (item.title && sourceText.includes(item.title.toLowerCase())) {
          textSimilarity += 0.2;
        }
        
        // Check for presence of key terms (could be expanded)
        const sourceParts = sourceText.split(/\s+/).filter(part => part.length > 5);
        const targetParts = targetText.split(/\s+/).filter(part => part.length > 5);
        
        // Count overlap of significant words
        const overlap = sourceParts.filter(part => targetParts.includes(part)).length;
        if (overlap > 0) {
          textSimilarity += Math.min(0.3, overlap * 0.05);
        }
      }
    }
    
    // Combine similarities with embedding similarity given more weight
    const combinedSimilarity = similarity * 0.8 + textSimilarity * 0.2;
    
    return {
      id: item.id,
      type: getItemType(item),
      similarity: combinedSimilarity
    };
  });
  
  // Filter by threshold and sort by similarity
  const result = similarities
    .filter(item => item.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity);
  
  // Limit results if requested
  return maxResults ? result.slice(0, maxResults) : result;
}

/**
 * Determines the type of a content item
 */
function getItemType(item: ContentItem | Note | IndexedFile): ContentItemType {
  // Check if it's a Note (has content property)
  if ('content' in item && 'title' in item) {
    return 'note';
  }
  // Check if it's an IndexedFile (has filename property)
  if ('filename' in item) {
    return 'file';
  }
  // Fallback
  return 'note';
}

/**
 * Gets text representation of an item for text similarity comparison
 */
function getItemText(item: Note | IndexedFile): string {
  if ('content' in item && item.content) {
    return item.title ? `${item.title} ${item.content}` : item.content;
  }
  if ('filename' in item) {
    return item.filename || '';
  }
  return '';
}
