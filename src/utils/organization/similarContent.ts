import { Note, IndexedFile, ContentItemType } from '@/lib/types';
import { toContentItem, calculateSimilarity } from './contentUtils';
import { SimilarityResult } from './types';
import { getTextEmbeddings, calculateCosineSimilarity } from '@/utils/embeddings';

/**
 * Find content items similar to a target item
 * Uses embedding-based similarity when available, falls back to text-based
 */
export function findSimilarContent(
  itemId: string,
  allItems: (Note | IndexedFile)[],
  similarityThreshold: number = 0.3
): SimilarityResult[] {
  const targetItem = allItems.find(item => 'id' in item && item.id === itemId);
  if (!targetItem) return [];
  
  const targetContent = toContentItem(targetItem);
  
  const similarities = allItems
    .filter(item => 'id' in item && item.id !== itemId)
    .map(item => {
      const contentItem = toContentItem(item);
      const similarity = calculateSimilarity(targetContent, contentItem);
      
      return {
        id: contentItem.id,
        type: ('folderId' in item ? 'note' : 'file') as ContentItemType,
        similarity,
        title: contentItem.title
      };
    })
    .filter(result => result.similarity >= similarityThreshold)
    .sort((a, b) => b.similarity - a.similarity);
  
  return similarities;
}

/**
 * Find similar content using embeddings
 * More accurate than text-based similarity but requires pre-computed embeddings
 */
export function findSimilarByEmbeddings(
  targetEmbeddings: number[],
  allItems: (Note | IndexedFile)[],
  similarityThreshold: number = 0.3
): SimilarityResult[] {
  if (!targetEmbeddings || targetEmbeddings.length === 0) {
    return [];
  }
  
  return allItems
    .filter(item => item.embeddings && item.embeddings.length > 0)
    .map(item => {
      const similarity = calculateCosineSimilarity(targetEmbeddings, item.embeddings!);
      
      return {
        id: item.id,
        type: ('folderId' in item ? 'note' : 'file') as ContentItemType,
        similarity,
        title: 'title' in item ? item.title : item.filename
      };
    })
    .filter(result => result.similarity >= similarityThreshold)
    .sort((a, b) => b.similarity - a.similarity);
}

/**
 * Get embeddings for a content item if not already computed
 */
export async function ensureItemEmbeddings(
  item: Note | IndexedFile,
  modelName: string = 'Xenova/all-MiniLM-L6-v2'
): Promise<number[]> {
  // If item already has embeddings, return them
  if (item.embeddings && item.embeddings.length > 0) {
    return item.embeddings;
  }
  
  // Extract text to embed based on item type
  const textToEmbed = 'content' in item && item.content 
    ? `${item.title || ''}\n${item.content}` 
    : 'filename' in item 
      ? item.filename 
      : '';
  
  // Skip empty items
  if (!textToEmbed.trim()) {
    return [];
  }
  
  // Generate embeddings
  try {
    return await getTextEmbeddings(textToEmbed, modelName);
  } catch (error) {
    console.error(`Failed to generate embeddings for item ${item.id}:`, error);
    return [];
  }
}

/**
 * Process a batch of items to ensure they all have embeddings
 */
export async function batchEnsureEmbeddings(
  items: (Note | IndexedFile)[],
  modelName: string = 'Xenova/all-MiniLM-L6-v2'
): Promise<Map<string, number[]>> {
  const itemsNeedingEmbeddings = items.filter(item => !item.embeddings || item.embeddings.length === 0);
  const results = new Map<string, number[]>();
  
  // Process in smaller batches to avoid memory issues
  const batchSize = 5;
  for (let i = 0; i < itemsNeedingEmbeddings.length; i += batchSize) {
    const batch = itemsNeedingEmbeddings.slice(i, i + batchSize);
    const batchPromises = batch.map(item => ensureItemEmbeddings(item, modelName));
    
    const batchResults = await Promise.all(batchPromises);
    
    batch.forEach((item, index) => {
      results.set(item.id, batchResults[index]);
    });
  }
  
  return results;
}
