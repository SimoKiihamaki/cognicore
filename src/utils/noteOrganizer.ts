/**
 * Note Organization Utilities
 * 
 * Provides functions for organizing notes based on content similarity,
 * suggesting folder organization, and finding similar content.
 */

import { Note, IndexedFile, Folder } from '@/lib/types';
import { calculateCosineSimilarity } from '@/utils/embeddings';
import cacheService, { CacheNamespaces } from '@/services/cacheService';

// Cache TTL settings (in milliseconds)
const SIMILARITY_CACHE_TTL = 1000 * 60 * 30; // 30 minutes
const ORGANIZATION_CACHE_TTL = 1000 * 60 * 10; // 10 minutes

interface SimilarityPair {
  itemId1: string;
  itemId2: string;
  similarity: number;
}

interface OrganizationSuggestion {
  itemId: string;
  suggestedFolderId: string;
  confidence: number;
  reason: string;
}

/**
 * Find similar content based on embeddings
 * Uses cache for performance when available
 * 
 * @param itemId ID of the item to find similar content for
 * @param items Array of notes and files to search
 * @param threshold Minimum similarity score (0-1)
 * @param maxResults Maximum number of results to return
 * @returns Array of similar items with their similarity scores
 */
export function findSimilarContent(
  itemId: string,
  items: (Note | IndexedFile)[],
  threshold: number = 0.3,
  maxResults: number = 10
): {
  id: string;
  title: string;
  type: 'note' | 'file';
  similarity: number;
}[] {
  // Check if result is cached
  const cacheKey = `${itemId}:${threshold}:${maxResults}`;
  const cachedResult = cacheService.get<{
    id: string;
    title: string;
    type: 'note' | 'file';
    similarity: number;
  }[]>(CacheNamespaces.SIMILAR_NOTES, cacheKey);
  
  if (cachedResult) {
    return cachedResult;
  }
  
  // Find the target item
  const targetItem = items.find(item => item.id === itemId);
  
  if (!targetItem || !targetItem.embeddings || targetItem.embeddings.length === 0) {
    return [];
  }
  
  const targetEmbeddings = targetItem.embeddings;
  
  // Calculate similarities with caching for individual pairs
  const result = items
    .filter(item => 
      item.id !== itemId && 
      item.embeddings && 
      item.embeddings.length > 0
    )
    .map(item => {
      // Check if this similarity pair is cached
      const pairCacheKey = `${itemId}:${item.id}`;
      let similarity = cacheService.get<number>(CacheNamespaces.SIMILAR_NOTES, pairCacheKey);
      
      if (similarity === undefined) {
        // Calculate similarity and cache it
        similarity = calculateCosineSimilarity(targetEmbeddings, item.embeddings!);
        cacheService.set(CacheNamespaces.SIMILAR_NOTES, pairCacheKey, similarity, {
          ttl: SIMILARITY_CACHE_TTL,
          persist: false
        });
      }
      
      return {
        id: item.id,
        title: 'title' in item ? item.title : item.filename,
        type: 'title' in item ? 'note' : 'file',
        similarity
      };
    })
    .filter(result => result.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, maxResults);
    
  // Cache the final result
  cacheService.set(CacheNamespaces.SIMILAR_NOTES, cacheKey, result, {
    ttl: SIMILARITY_CACHE_TTL,
    persist: false
  });
  
  return result;
}

/**
 * Suggest organization for items based on content similarity
 * 
 * @param items Array of notes and files to organize
 * @param folders Available folders
 * @param embeddingModelName Model name to use for embeddings
 * @param similarityThreshold Minimum similarity threshold
 * @returns Array of organization suggestions
 */
export async function suggestOrganization(
  items: (Note | IndexedFile)[],
  folders: Folder[],
  embeddingModelName: string = 'default',
  similarityThreshold: number = 0.3
): Promise<OrganizationSuggestion[]> {
  // Create cache key based on inputs
  const itemsHash = items.length.toString(); // Simple hash for now
  const foldersHash = folders.length.toString();
  const cacheKey = `${itemsHash}:${foldersHash}:${embeddingModelName}:${similarityThreshold}`;
  
  // Check if result is cached
  const cachedResult = cacheService.get<OrganizationSuggestion[]>(
    CacheNamespaces.GRAPH_DATA, 
    cacheKey
  );
  
  if (cachedResult) {
    return cachedResult;
  }
  
  // Items without embeddings can't be organized
  const itemsWithEmbeddings = items.filter(
    item => item.embeddings && item.embeddings.length > 0
  );
  
  if (itemsWithEmbeddings.length === 0 || folders.length === 0) {
    return [];
  }
  
  // Group items by folder
  const itemsByFolder: Record<string, (Note | IndexedFile)[]> = {};
  
  folders.forEach(folder => {
    // Get notes in this folder
    const notesInFolder = itemsWithEmbeddings.filter(item => 
      'folderId' in item && item.folderId === folder.id
    );
    
    itemsByFolder[folder.id] = notesInFolder;
  });
  
  // Calculate folder embeddings (average of item embeddings in each folder)
  const folderEmbeddings: Record<string, number[]> = {};
  
  Object.entries(itemsByFolder).forEach(([folderId, folderItems]) => {
    if (folderItems.length === 0) {
      return; // Skip empty folders
    }
    
    // Calculate average embedding for the folder
    const dimensions = folderItems[0].embeddings!.length;
    const folderEmbedding = new Array(dimensions).fill(0);
    
    folderItems.forEach(item => {
      for (let i = 0; i < dimensions; i++) {
        folderEmbedding[i] += item.embeddings![i];
      }
    });
    
    // Normalize
    for (let i = 0; i < dimensions; i++) {
      folderEmbedding[i] /= folderItems.length;
    }
    
    folderEmbeddings[folderId] = folderEmbedding;
  });
  
  // Create suggestions for items not in a folder or in small folders
  const suggestions: OrganizationSuggestion[] = [];
  
  // Find unorganized items
  const unorganizedItems = itemsWithEmbeddings.filter(item => 
    !('folderId' in item) || !item.folderId
  );
  
  // Find best folder for each unorganized item
  unorganizedItems.forEach(item => {
    let bestFolderId = '';
    let bestSimilarity = -1;
    
    // Compare with each folder embedding
    Object.entries(folderEmbeddings).forEach(([folderId, folderEmbedding]) => {
      const similarity = calculateCosineSimilarity(item.embeddings!, folderEmbedding);
      
      if (similarity > bestSimilarity && similarity >= similarityThreshold) {
        bestSimilarity = similarity;
        bestFolderId = folderId;
      }
    });
    
    if (bestFolderId) {
      suggestions.push({
        itemId: item.id,
        suggestedFolderId: bestFolderId,
        confidence: bestSimilarity,
        reason: `Content similar to other items in folder (${Math.round(bestSimilarity * 100)}% match)`
      });
    }
  });
  
  // Also look for misplaced items in existing folders
  const organizedItems = itemsWithEmbeddings.filter(item => 
    'folderId' in item && item.folderId
  );
  
  organizedItems.forEach(item => {
    const currentFolderId = (item as Note).folderId;
    let bestFolderId = '';
    let bestSimilarity = -1;
    
    // Compare with each folder embedding except current
    Object.entries(folderEmbeddings).forEach(([folderId, folderEmbedding]) => {
      if (folderId === currentFolderId) return;
      
      const similarity = calculateCosineSimilarity(item.embeddings!, folderEmbedding);
      
      if (similarity > bestSimilarity && 
          similarity >= similarityThreshold &&
          similarity > 0.6) { // Higher threshold for suggesting moving
        bestSimilarity = similarity;
        bestFolderId = folderId;
      }
    });
    
    if (bestFolderId) {
      suggestions.push({
        itemId: item.id,
        suggestedFolderId: bestFolderId,
        confidence: bestSimilarity,
        reason: `May fit better in another folder (${Math.round(bestSimilarity * 100)}% match)`
      });
    }
  });
  
  // Cache the result
  cacheService.set(CacheNamespaces.GRAPH_DATA, cacheKey, suggestions, {
    ttl: ORGANIZATION_CACHE_TTL,
    persist: false
  });
  
  return suggestions;
}

/**
 * Build graph data for visualization based on content similarity
 * 
 * @param items Array of notes and files
 * @param similarityThreshold Minimum similarity threshold
 * @returns Graph data with nodes and edges
 */
export function buildGraphData(
  items: (Note | IndexedFile)[],
  similarityThreshold: number = 0.25
): {
  nodes: {
    id: string;
    label: string;
    type: 'note' | 'file';
    data: Note | IndexedFile;
  }[];
  edges: {
    id: string;
    source: string;
    target: string;
    weight: number;
  }[];
} {
  // Create cache key
  const itemsHash = items.length.toString(); // Simple hash for now
  const cacheKey = `graph-data:${itemsHash}:${similarityThreshold}`;
  
  // Check cache
  const cachedData = cacheService.get<{
    nodes: any[];
    edges: any[];
  }>(CacheNamespaces.GRAPH_DATA, cacheKey);
  
  if (cachedData) {
    return cachedData;
  }
  
  // Filter items with embeddings
  const itemsWithEmbeddings = items.filter(
    item => item.embeddings && item.embeddings.length > 0
  );
  
  // Create nodes
  const nodes = itemsWithEmbeddings.map(item => ({
    id: item.id,
    label: 'title' in item ? item.title : item.filename,
    type: 'title' in item ? 'note' : 'file',
    data: item
  }));
  
  // Create edges based on similarity
  const edges: {
    id: string;
    source: string;
    target: string;
    weight: number;
  }[] = [];
  
  // Calculate similarity between each pair of items
  for (let i = 0; i < itemsWithEmbeddings.length; i++) {
    const item1 = itemsWithEmbeddings[i];
    
    for (let j = i + 1; j < itemsWithEmbeddings.length; j++) {
      const item2 = itemsWithEmbeddings[j];
      
      // Check if this similarity pair is cached
      const pairCacheKey = `${item1.id}:${item2.id}`;
      let similarity = cacheService.get<number>(CacheNamespaces.SIMILAR_NOTES, pairCacheKey);
      
      if (similarity === undefined) {
        // Calculate similarity and cache it
        similarity = calculateCosineSimilarity(item1.embeddings!, item2.embeddings!);
        cacheService.set(CacheNamespaces.SIMILAR_NOTES, pairCacheKey, similarity, {
          ttl: SIMILARITY_CACHE_TTL,
          persist: false
        });
      }
      
      // Add edge if similarity exceeds threshold
      if (similarity >= similarityThreshold) {
        edges.push({
          id: `${item1.id}-${item2.id}`,
          source: item1.id,
          target: item2.id,
          weight: similarity
        });
      }
    }
  }
  
  const result = { nodes, edges };
  
  // Cache the result
  cacheService.set(CacheNamespaces.GRAPH_DATA, cacheKey, result, {
    ttl: SIMILARITY_CACHE_TTL, // Cache graph data for longer
    persist: false
  });
  
  return result;
}

/**
 * Invalidate cache for specific items
 * Call this when items are updated, to ensure cache stays fresh
 * 
 * @param itemIds Array of item IDs to invalidate
 */
export function invalidateItemCache(itemIds: string[]): void {
  // Loop through each item ID
  itemIds.forEach(itemId => {
    // Get all similarity cache keys for this item
    const similarityKeys = cacheService.getKeys(CacheNamespaces.SIMILAR_NOTES)
      .filter(key => key.includes(itemId));
    
    // Remove each key
    similarityKeys.forEach(key => {
      cacheService.remove(CacheNamespaces.SIMILAR_NOTES, key);
    });
  });
  
  // Also invalidate organization and graph data caches
  // since they depend on the items
  cacheService.clearNamespace(CacheNamespaces.GRAPH_DATA);
}
