import { Note, Folder, IndexedFile, ContentItemType } from '@/lib/types';

interface ContentItem {
  id: string;
  title: string;
  content: string;
  folderId?: string;
}

interface OrganizationSuggestion {
  itemId: string;
  itemType: 'note' | 'file';
  suggestedFolderId: string;
  confidence: number;
  reason: string;
}

function toContentItem(item: Note | IndexedFile): ContentItem {
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

export async function suggestOrganization(
  items: (Note | IndexedFile)[],
  folders: Folder[],
  embeddingModelName: string,
  similarityThreshold: number
): Promise<OrganizationSuggestion[]> {
  const contentItems = items.map(toContentItem);
  
  const suggestions: OrganizationSuggestion[] = [];
  
  for (const item of contentItems) {
    if (!item.content.trim()) continue;
    
    if (item.folderId) {
      continue;
    }
    
    let bestMatch: { folderId: string; score: number; reason: string } | null = null;
    
    for (const folder of folders) {
      if (folder.id === 'root') continue;
      
      if (item.folderId === folder.id) continue;
      
      const folderNameLower = folder.name.toLowerCase();
      const contentLower = item.content.toLowerCase();
      const titleLower = item.title.toLowerCase();
      
      let score = 0;
      let reason = "";
      
      if (titleLower.includes(folderNameLower)) {
        score += 0.5;
        reason = `Folder name "${folder.name}" appears in ${item.folderId ? 'note' : 'file'} title`;
      }
      
      if (contentLower.includes(folderNameLower)) {
        score += 0.3;
        reason += reason ? " and content" : `Folder name "${folder.name}" appears in ${item.folderId ? 'note' : 'file'} content`;
      }
      
      const textSimilarity = calculateSimilarity(folder.name, item.content);
      if (textSimilarity > 0.1) {
        score += textSimilarity * 0.4;
        reason += reason ? " and has semantic similarity" : `Has semantic similarity with folder "${folder.name}"`;
      }
      
      if (score > 0 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { folderId: folder.id, score, reason };
      }
    }
    
    if (bestMatch && bestMatch.score >= similarityThreshold) {
      suggestions.push({
        itemId: item.id,
        itemType: item.folderId !== undefined ? 'note' : 'file',
        suggestedFolderId: bestMatch.folderId,
        confidence: bestMatch.score,
        reason: bestMatch.reason
      });
    }
  }
  
  return suggestions.sort((a, b) => b.confidence - a.confidence);
}

export async function organizeNotes(
  notes: Note[],
  indexedFiles: IndexedFile[] = [],
  folders: Folder[],
  updateNoteFolder: (noteId: string, folderId: string) => void,
  embeddingModelName: string,
  similarityThreshold: number,
  autoOrganize: boolean = false
): Promise<{appliedCount: number, suggestions: OrganizationSuggestion[]}> {
  const allItems = [...notes, ...indexedFiles];
  
  const suggestions = await suggestOrganization(allItems, folders, embeddingModelName, similarityThreshold);
  
  let appliedCount = 0;
  if (autoOrganize) {
    for (const suggestion of suggestions) {
      if (suggestion.confidence > 0.8 && suggestion.itemType === 'note') {
        updateNoteFolder(suggestion.itemId, suggestion.suggestedFolderId);
        appliedCount++;
      }
    }
  }
  
  return { appliedCount, suggestions };
}

function calculateSimilarity(text1: string, text2: string): number {
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
        type: 'folderId' in item ? 'note' as ContentItemType : 'file' as ContentItemType,
        similarity
      };
    })
    .filter(result => result.similarity >= similarityThreshold)
    .sort((a, b) => b.similarity - a.similarity);
  
  return similarities;
}
