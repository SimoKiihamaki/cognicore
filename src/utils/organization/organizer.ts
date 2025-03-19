
import { Note, Folder, IndexedFile } from '@/lib/types';
import { OrganizationSuggestion, OrganizationResult } from './types';
import { suggestOrganization } from './suggestionEngine';

export async function organizeNotes(
  notes: Note[],
  indexedFiles: IndexedFile[] = [],
  folders: Folder[],
  updateNoteFolder: (noteId: string, folderId: string) => void,
  embeddingModelName: string,
  similarityThreshold: number,
  autoOrganize: boolean = false
): Promise<OrganizationResult> {
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
