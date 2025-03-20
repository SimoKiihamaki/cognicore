
import { Note, Folder, IndexedFile, ContentItemType } from '@/lib/types';
import { ContentItem, OrganizationSuggestion } from './types';
import { toContentItem, calculateSimilarity } from './contentUtils';

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
        reason = `Folder name "${folder.name}" appears in item title`;
      }
      
      if (contentLower.includes(folderNameLower)) {
        score += 0.3;
        reason += reason ? " and content" : `Folder name "${folder.name}" appears in item content`;
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
        itemType: item.folderId !== undefined ? 'note' as ContentItemType : 'file' as ContentItemType,
        suggestedFolderId: bestMatch.folderId,
        confidence: bestMatch.score,
        reason: bestMatch.reason
      });
    }
  }
  
  return suggestions.sort((a, b) => b.confidence - a.confidence);
}
