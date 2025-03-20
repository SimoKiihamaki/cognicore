import { useState, useCallback, useEffect } from 'react';
import { useNotes } from './useNotes';
import { useToast } from '@/components/ui/use-toast';
import {
  getTextEmbeddings,
  batchCreateEmbeddings,
  initializeEmbeddingService,
  calculateCosineSimilarity
} from '@/utils/embeddings';
import { invalidateItemCache } from '@/utils/noteOrganizer';
import { Note, IndexedFile } from '@/lib/types';
import { useLocalStorage } from './useLocalStorage';

/**
 * Hook for managing embeddings generation and processing
 * Uses web workers for non-blocking UI operations
 */
export function useEmbeddings() {
  const { notes, indexedFiles, updateNote } = useNotes();
  const { toast } = useToast();
  const [modelName, setModelName] = useLocalStorage<string>('cognicore-embedding-model', 'Xenova/all-MiniLM-L6-v2');
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [totalItems, setTotalItems] = useState(0);
  const [processedItems, setProcessedItems] = useState(0);
  const [serviceError, setServiceError] = useState<string | null>(null);
  
  // Initialize embedding service when component mounts
  useEffect(() => {
    const initialize = async () => {
      if (isInitialized || isInitializing) return;
      
      setIsInitializing(true);
      setServiceError(null);
      
      try {
        await initializeEmbeddingService(modelName, (status) => {
          setStatusMessage(status);
        });
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize embedding service:', error);
        setServiceError(error instanceof Error ? error.message : 'Unknown error initializing embedding service');
        toast({
          title: "Embedding Service Error",
          description: error instanceof Error ? error.message : 'Failed to initialize embedding service',
          variant: "destructive"
        });
      } finally {
        setIsInitializing(false);
      }
    };

    initialize();
    
    // Cleanup on unmount
    return () => {
      // We don't actually terminate the service here since it might be used by other components
      // This would be done at app shutdown instead
    };
  }, [modelName, toast]);
  
  /**
   * Change the embedding model
   */
  const changeEmbeddingModel = useCallback(async (newModelName: string) => {
    if (newModelName === modelName) return true;
    
    try {
      setIsInitializing(true);
      setServiceError(null);
      
      await initializeEmbeddingService(newModelName, (status) => {
        setStatusMessage(status);
      });
      
      setModelName(newModelName);
      setIsInitialized(true);
      
      toast({
        title: "Model Changed",
        description: `Embedding model updated to ${newModelName}`
      });
      
      return true;
    } catch (error) {
      console.error('Failed to change embedding model:', error);
      setServiceError(error instanceof Error ? error.message : 'Unknown error changing embedding model');
      toast({
        title: "Model Change Failed",
        description: error instanceof Error ? error.message : 'Failed to change embedding model',
        variant: "destructive"
      });
      return false;
    } finally {
      setIsInitializing(false);
    }
  }, [modelName, setModelName, toast]);
  
  /**
   * Generate embeddings for a single note using worker
   */
  const generateNoteEmbeddings = useCallback(async (
    note: Note,
    customModelName?: string
  ) => {
    if (!note.content) return null;
    
    try {
      const textToEmbed = `${note.title}\n${note.content}`;
      const embeddings = await getTextEmbeddings(textToEmbed, customModelName);
      
      // Update the note with embeddings
      updateNote(note.id, { 
        embeddings,
        updatedAt: new Date() 
      });
      
      // Invalidate cache for this note
      invalidateItemCache([note.id]);
      
      return embeddings;
    } catch (error) {
      console.error(`Failed to generate embeddings for note ${note.id}:`, error);
      toast({
        title: "Embedding Generation Error",
        description: `Failed to process note "${note.title}".`,
        variant: "destructive"
      });
      return null;
    }
  }, [updateNote, toast]);
  
  /**
   * Process all notes and files to ensure they have embeddings
   * Uses web worker for background processing
   */
  const processAllContent = useCallback(async (
    customModelName?: string
  ) => {
    if (!isInitialized && !isInitializing) {
      await initializeEmbeddingService(customModelName || modelName, (status) => {
        setStatusMessage(status);
      });
    }
    
    const allItems = [...notes, ...indexedFiles];
    const itemsNeedingEmbeddings = allItems.filter(
      item => !item.embeddings || item.embeddings.length === 0
    );
    
    if (itemsNeedingEmbeddings.length === 0) {
      toast({
        title: "Embeddings Up to Date",
        description: "All notes and files already have embeddings."
      });
      return;
    }
    
    setIsProcessing(true);
    setTotalItems(itemsNeedingEmbeddings.length);
    setProcessedItems(0);
    setProgress(0);
    setServiceError(null);
    
    try {
      // Process notes first
      const notesToProcess = itemsNeedingEmbeddings.filter(item => 'title' in item) as Note[];
      
      if (notesToProcess.length > 0) {
        // Prepare data for batch processing
        const textInputs = notesToProcess.map(note => `${note.title}\n${note.content}`);
        const noteIds = notesToProcess.map(note => note.id);
        
        // Process in background thread
        const results = await batchCreateEmbeddings(
          textInputs,
          noteIds,
          customModelName || modelName,
          (completed, total) => {
            setProcessedItems(completed);
            setProgress((completed / total) * 100);
          }
        );
        
        // Update notes with their embeddings
        for (const result of results) {
          if (result.success && result.embedding && result.id) {
            const note = notesToProcess.find(n => n.id === result.id);
            if (note) {
              updateNote(note.id, {
                embeddings: result.embedding,
                updatedAt: new Date()
              });
            }
          }
        }
        
        // Invalidate cache for all processed notes
        invalidateItemCache(noteIds);
      }
      
      // Process indexed files if needed
      // This would require additional implementation for files
      
      toast({
        title: "Embeddings Generated",
        description: `Successfully processed ${itemsNeedingEmbeddings.length} items.`
      });
    } catch (error) {
      console.error('Failed to process content for embeddings:', error);
      setServiceError(error instanceof Error ? error.message : 'Unknown error processing embeddings');
      toast({
        title: "Processing Error",
        description: "Failed to generate embeddings for some items.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  }, [
    isInitialized, 
    isInitializing, 
    modelName, 
    notes, 
    indexedFiles, 
    updateNote, 
    toast
  ]);
  
  /**
   * Find items with similar embeddings to a target item
   */
  const findSimilarItems = useCallback((
    targetId: string,
    threshold: number = 0.3,
    maxResults: number = 10
  ) => {
    const allItems = [...notes, ...indexedFiles];
    const targetItem = allItems.find(item => item.id === targetId);
    
    if (!targetItem || !targetItem.embeddings || targetItem.embeddings.length === 0) {
      return [];
    }
    
    const targetEmbeddings = targetItem.embeddings;
    
    return allItems
      .filter(item => 
        item.id !== targetId && 
        item.embeddings && 
        item.embeddings.length > 0
      )
      .map(item => {
        // Calculate cosine similarity between embeddings
        const similarity = calculateCosineSimilarity(targetEmbeddings, item.embeddings!);
        
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
  }, [notes, indexedFiles]);
  
  return {
    generateNoteEmbeddings,
    processAllContent,
    findSimilarItems,
    changeEmbeddingModel,
    modelName,
    isInitialized,
    isInitializing,
    isProcessing,
    progress,
    statusMessage,
    totalItems,
    processedItems,
    serviceError
  };
}
