
import { Note, IndexedFile, ContentItemType } from '@/lib/types';
import { ContentItem } from './types';

export function toContentItem(item: Note | IndexedFile): ContentItem {
  if ('folderId' in item) {
    return {
      id: item.id,
      title: item.title,
      content: item.content,
      folderId: item.folderId
    };
  } else {
    return {
      id: item.id,
      title: item.filename,
      content: item.content || item.filename,
      // IndexedFiles don't have a folderId
    };
  }
}

export function calculateSimilarity(text1: string, text2: string): number {
  const normalize = (text: string) => text.toLowerCase().trim();
  const normalizedText1 = normalize(text1);
  const normalizedText2 = normalize(text2);
  
  const words1 = new Set(normalizedText1.split(/\s+/).filter(word => word.length > 2));
  const words2 = new Set(normalizedText2.split(/\s+/).filter(word => word.length > 2));
  
  let commonWords = 0;
  for (const word of words1) {
    if (words2.has(word)) {
      commonWords++;
    }
  }
  
  const unionSize = words1.size + words2.size - commonWords;
  return unionSize > 0 ? commonWords / unionSize : 0;
}
