
import { Note, Folder, IndexedFile } from '@/lib/types';

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

// Convert Note or IndexedFile to generic ContentItem
function toContentItem(item: Note | IndexedFile): ContentItem {
  if ('folderId' in item) {
    // It's a Note
    return {
      id: item.id,
      title: item.title,
      content: item.content,
      folderId: item.folderId
    };
  } else {
    // It's an IndexedFile
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
  // Convert all items to a common format
  const contentItems = items.map(toContentItem);
  
  const suggestions: OrganizationSuggestion[] = [];
  
  // Process each content item
  for (const item of contentItems) {
    // Skip items that don't have content
    if (!item.content.trim()) continue;
    
    // Skip items that are already in the target folder (for notes only)
    if (item.folderId) {
      // Skip further processing for this item if it's already in a folder
      // Note: For IndexedFiles we always want to suggest a folder since they don't have folderId
    }
    
    // Find the most relevant folder based on keyword matching
    let bestMatch: { folderId: string; score: number; reason: string } | null = null;
    
    for (const folder of folders) {
      // Skip root folder
      if (folder.id === 'root') continue;
      
      // Skip if item is already in this folder (for notes only)
      if (item.folderId === folder.id) continue;
      
      // Calculate relevance score based on keyword occurrences
      const folderNameLower = folder.name.toLowerCase();
      const contentLower = item.content.toLowerCase();
      const titleLower = item.title.toLowerCase();
      
      // Check if folder name appears in item title or content
      const nameInTitle = titleLower.includes(folderNameLower);
      const nameInContent = contentLower.includes(folderNameLower);
      
      // Create a score based on these factors
      let score = 0;
      let reason = "";
      
      if (nameInTitle) {
        score += 0.5;
        reason = `Folder name "${folder.name}" appears in ${item.folderId ? 'note' : 'file'} title`;
      }
      
      if (nameInContent) {
        score += 0.3;
        reason += reason ? " and content" : `Folder name "${folder.name}" appears in ${item.folderId ? 'note' : 'file'} content`;
      }
      
      // For more complex content, calculate similarity using our helper function
      const textSimilarity = calculateSimilarity(folder.name, item.content);
      if (textSimilarity > 0.1) {  // Minimum threshold for text similarity
        score += textSimilarity * 0.4;  // Weight the similarity score
        reason += reason ? " and has semantic similarity" : `Has semantic similarity with folder "${folder.name}"`;
      }
      
      // Update best match if this folder has a higher score
      if (score > 0 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { folderId: folder.id, score, reason };
      }
    }
    
    // Add suggestion if we found a match with score above threshold
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
  
  // Sort suggestions by confidence (highest first)
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
  // Combine notes and indexed files
  const allItems = [...notes, ...indexedFiles];
  
  const suggestions = await suggestOrganization(allItems, folders, embeddingModelName, similarityThreshold);
  
  // Apply suggestions automatically if autoOrganize is true (only for notes, not files)
  let appliedCount = 0;
  if (autoOrganize) {
    for (const suggestion of suggestions) {
      if (suggestion.confidence > 0.8 && suggestion.itemType === 'note') {
        updateNoteFolder(suggestion.itemId, suggestion.suggestedFolderId);
        appliedCount++;
      }
      // We don't automatically organize files, as per requirements
    }
  }
  
  return { appliedCount, suggestions };
}

// Helper function to calculate text similarity (improved version)
function calculateSimilarity(text1: string, text2: string): number {
  // Normalize texts
  const normalize = (text: string) => text.toLowerCase().trim();
  const normalizedText1 = normalize(text1);
  const normalizedText2 = normalize(text2);
  
  // Split into words
  const words1 = new Set(normalizedText1.split(/\s+/).filter(word => word.length > 2));
  const words2 = new Set(normalizedText2.split(/\s+/).filter(word => word.length > 2));
  
  // Count common words
  let commonWords = 0;
  for (const word of words1) {
    if (words2.has(word)) {
      commonWords++;
    }
  }
  
  // Calculate Jaccard similarity
  const unionSize = words1.size + words2.size - commonWords;
  return unionSize > 0 ? commonWords / unionSize : 0;
}

export function findSimilarContent(
  itemId: string,
  allItems: (Note | IndexedFile)[],
  similarityThreshold: number = 0.3
): { id: string; type: 'note' | 'file'; similarity: number }[] {
  // Find the target item
  const targetItem = allItems.find(item => 'id' in item && item.id === itemId);
  if (!targetItem) return [];
  
  // Convert to content item
  const targetContent = toContentItem(targetItem);
  
  // Compare with all other items
  const similarities = allItems
    .filter(item => 'id' in item && item.id !== itemId) // Exclude the target item itself
    .map(item => {
      const contentItem = toContentItem(item);
      const similarity = calculateSimilarity(targetContent.content, contentItem.content);
      return {
        id: contentItem.id,
        type: 'folderId' in item ? 'note' : 'file',
        similarity
      };
    })
    .filter(result => result.similarity >= similarityThreshold)
    .sort((a, b) => b.similarity - a.similarity);
  
  return similarities;
}
