
// In MCPKnowledgeIntegration.tsx, around line 130:
// Fix the targetFolderId type issue by ensuring it's a string:

setImportOptions(prev => ({
  targetFolderId: selectedFolderId || '', // Ensure this is a string, not void
  importAsNotes: true,
  includeMetadata: true,
  similarityThreshold: 0.7,
  maxResults: 20,
  autoIntegrate: false
}));
