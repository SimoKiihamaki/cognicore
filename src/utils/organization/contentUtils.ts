
import { Note, IndexedFile, ContentItemType } from '@/lib/types';
import { ContentItem } from './types';
import { calculateCosineSimilarity } from '@/utils/embeddings';

/**
 * Convert a Note or IndexedFile to a normalized ContentItem
 */
export function toContentItem(item: Note | IndexedFile): ContentItem {
  if ('folderId' in item) {
    return {
      id: item.id,
      title: item.title,
      content: item.content,
      folderId: item.folderId,
      embeddings: item.embeddings
    };
  } else {
    return {
      id: item.id,
      title: item.filename,
      content: item.content || item.filename,
      embeddings: item.embeddings
      // IndexedFiles don't have a folderId
    };
  }
}

/**
 * Calculate content similarity between two texts or items
 * Uses embedding-based similarity if embeddings are available, falls back to text-based similarity
 */
export function calculateSimilarity(
  text1OrItem1: string | ContentItem | Note | IndexedFile,
  text2OrItem2: string | ContentItem | Note | IndexedFile
): number {
  // Handle different input types
  const item1 = typeof text1OrItem1 === 'string' ? { content: text1OrItem1 } : text1OrItem1;
  const item2 = typeof text2OrItem2 === 'string' ? { content: text2OrItem2 } : text2OrItem2;
  
  // If both items have embeddings, use cosine similarity
  if (
    'embeddings' in item1 && 
    'embeddings' in item2 && 
    item1.embeddings && 
    item2.embeddings && 
    item1.embeddings.length > 0 && 
    item2.embeddings.length > 0
  ) {
    return calculateCosineSimilarity(item1.embeddings, item2.embeddings);
  }
  
  // Fall back to text-based similarity for items without embeddings
  const content1 = 'content' in item1 ? item1.content : String(item1);
  const content2 = 'content' in item2 ? item2.content : String(item2);
  
  return calculateTextSimilarity(content1, content2);
}

/**
 * Calculate text-based similarity as a fallback when embeddings aren't available
 * Uses Jaccard similarity on word sets
 */
export function calculateTextSimilarity(text1: string, text2: string): number {
  const normalize = (text: string) => text.toLowerCase().trim();
  const normalizedText1 = normalize(text1);
  const normalizedText2 = normalize(text2);
  
  // Extract meaningful words (length > 2)
  const words1 = new Set(normalizedText1.split(/\s+/).filter(word => word.length > 2));
  const words2 = new Set(normalizedText2.split(/\s+/).filter(word => word.length > 2));
  
  // Early return for empty texts
  if (words1.size === 0 || words2.size === 0) return 0;
  
  // Count common words
  let commonWords = 0;
  for (const word of words1) {
    if (words2.has(word)) {
      commonWords++;
    }
  }
  
  // Calculate Jaccard similarity (intersection size / union size)
  const unionSize = words1.size + words2.size - commonWords;
  return unionSize > 0 ? commonWords / unionSize : 0;
}

/**
 * Extract key terms from text for quick matching
 */
export function extractKeyTerms(text: string, maxTerms: number = 10): string[] {
  // Skip very short texts
  if (!text || text.length < 10) return [];
  
  const normalized = text.toLowerCase().trim();
  
  // Simple tokenization and stopword filtering
  const stopWords = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'of', 'to', 'in', 'on', 'at', 'for', 'with', 
    'by', 'about', 'as', 'into', 'like', 'through', 'after', 'over', 'between', 'out',
    'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 
    'does', 'did', 'can', 'could', 'will', 'would', 'should', 'may', 'might', 'must',
    'this', 'that', 'these', 'those', 'it', 'they', 'them', 'their'
  ]);
  
  const words = normalized
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.has(word))
    .map(word => word.replace(/[^\w]/g, ''));
  
  // Count occurrences
  const wordCount = new Map<string, number>();
  for (const word of words) {
    wordCount.set(word, (wordCount.get(word) || 0) + 1);
  }
  
  // Sort by frequency and take top terms
  return Array.from(wordCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxTerms)
    .map(entry => entry[0]);
}
