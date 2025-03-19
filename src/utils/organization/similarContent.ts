
import { Note, IndexedFile, ContentItemType } from '@/lib/types';
import { toContentItem } from './contentUtils';
import { calculateSimilarity } from './contentUtils';

export function findSimilarContent(
  itemId: string,
  allItems: (Note | IndexedFile)[],
  similarityThreshold: number = 0.3
): { id: string; type: ContentItemType; similarity: number }[] {
  const targetItem = allItems.find(item => 'id' in item && item.id === itemId);
  if (!targetItem) return [];
  
  const targetContent = toContentItem(targetItem);
  
  const similarities = allItems
    .filter(item => 'id' in item && item.id !== itemId)
    .map(item => {
      const contentItem = toContentItem(item);
      const similarity = calculateSimilarity(targetContent.content, contentItem.content);
      return {
        id: contentItem.id,
        type: ('folderId' in item ? 'note' : 'file') as ContentItemType,
        similarity
      };
    })
    .filter(result => result.similarity >= similarityThreshold)
    .sort((a, b) => b.similarity - a.similarity);
  
  return similarities;
}
