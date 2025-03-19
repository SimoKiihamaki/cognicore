
import { Note, Folder } from '@/lib/types';

interface OrganizationSuggestion {
  noteId: string;
  suggestedFolderId: string;
  confidence: number;
  reason: string;
}

export async function suggestOrganization(
  notes: Note[],
  folders: Folder[],
  embeddingModelName: string,
  similarityThreshold: number
): Promise<OrganizationSuggestion[]> {
  // For now, this is a placeholder implementation
  // In a real implementation, this would:
  // 1. Use the embedding model to generate embeddings for note content
  // 2. Compare note content to folder names and existing notes in folders
  // 3. Calculate similarity scores and suggest appropriate folders
  
  const suggestions: OrganizationSuggestion[] = [];
  
  // Simple content-based suggestion algorithm (simulated)
  for (const note of notes) {
    // Skip notes that don't have content
    if (!note.content.trim()) continue;
    
    // Find the most relevant folder based on keyword matching (simplified demonstration)
    let bestMatch: { folderId: string; score: number; reason: string } | null = null;
    
    for (const folder of folders) {
      // Skip root folder
      if (folder.id === 'root') continue;
      
      // Skip if note is already in this folder
      if (note.folderId === folder.id) continue;
      
      // Calculate a simple relevance score based on keyword occurrences
      const folderNameLower = folder.name.toLowerCase();
      const noteContentLower = note.content.toLowerCase();
      const noteTitleLower = note.title.toLowerCase();
      
      // Check if folder name appears in note title or content
      const nameInTitle = noteTitleLower.includes(folderNameLower);
      const nameInContent = noteContentLower.includes(folderNameLower);
      
      // Create a basic score based on these factors
      let score = 0;
      let reason = "";
      
      if (nameInTitle) {
        score += 0.5;
        reason = `Folder name "${folder.name}" appears in note title`;
      }
      
      if (nameInContent) {
        score += 0.3;
        reason += reason ? " and content" : `Folder name "${folder.name}" appears in note content`;
      }
      
      // In a real implementation, we would use the embedding model to calculate semantic similarity
      
      // Update best match if this folder has a higher score
      if (score > 0 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { folderId: folder.id, score, reason };
      }
    }
    
    // Add suggestion if we found a match with score above threshold
    if (bestMatch && bestMatch.score >= similarityThreshold) {
      suggestions.push({
        noteId: note.id,
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
  folders: Folder[],
  updateNoteFolder: (noteId: string, folderId: string) => void,
  embeddingModelName: string,
  similarityThreshold: number,
  autoOrganize: boolean = false
): Promise<{appliedCount: number, suggestions: OrganizationSuggestion[]}> {
  const suggestions = await suggestOrganization(notes, folders, embeddingModelName, similarityThreshold);
  
  // Apply suggestions automatically if autoOrganize is true
  let appliedCount = 0;
  if (autoOrganize) {
    for (const suggestion of suggestions) {
      if (suggestion.confidence > 0.8) {
        updateNoteFolder(suggestion.noteId, suggestion.suggestedFolderId);
        appliedCount++;
      }
    }
  }
  
  return { appliedCount, suggestions };
}

// Helper function to calculate text similarity (simplified for demo)
function calculateSimilarity(text1: string, text2: string): number {
  // Normalize texts
  const normalize = (text: string) => text.toLowerCase().trim();
  const normalizedText1 = normalize(text1);
  const normalizedText2 = normalize(text2);
  
  // Split into words
  const words1 = new Set(normalizedText1.split(/\s+/));
  const words2 = new Set(normalizedText2.split(/\s+/));
  
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
