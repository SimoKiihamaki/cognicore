
import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { useNotes } from './useNotes';
import { Note } from '@/lib/types';
import { initializeEmbeddingService, getEmbeddingService, findSimilarNotes, EmbeddingResult } from '@/utils/embeddings';

interface UseEmbeddingsOptions {
  autoEmbed?: boolean;
  autoEmbedDelay?: number;
  similarityThreshold?: number;
  maxResults?: number;
}

export function useEmbeddings(options: UseEmbeddingsOptions = {}) {
  const { 
    autoEmbed = true, 
    autoEmbedDelay = 1000,
    similarityThreshold = 0.7,
    maxResults = 10
  } = options;
  
  const { toast } = useToast();
  const { notes, updateNote } = useNotes();
  
  const [isEmbeddingInitialized, setIsEmbeddingInitialized] = useState(false);
  const [isEmbeddingInitializing, setIsEmbeddingInitializing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [modelName, setModelName] = useState('');
  const [embeddingQueue, setEmbeddingQueue] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [totalItems, setTotalItems] = useState(0);
  const [processedItems, setProcessedItems] = useState(0);
  const [serviceError, setServiceError] = useState<string | null>(null);
  
  // Initialize embedding service
  useEffect(() => {
    const initializeEmbeddings = async () => {
      if (isEmbeddingInitialized || isEmbeddingInitializing) return;
      
      setIsEmbeddingInitializing(true);
      try {
        await initializeEmbeddingService();
        setIsEmbeddingInitialized(true);
        setStatusMessage('Embedding service initialized successfully');
        console.log('Embedding service initialized successfully');
      } catch (error) {
        console.error('Failed to initialize embedding service:', error);
        setServiceError(error instanceof Error ? error.message : 'Unknown error');
        toast({
          title: 'Embedding Error',
          description: 'Failed to initialize embedding service. Some features may be limited.',
          variant: 'destructive',
        });
      } finally {
        setIsEmbeddingInitializing(false);
      }
    };
    
    initializeEmbeddings();
  }, [toast]);
  
  // Generate embeddings for a single text
  const generateEmbedding = useCallback(async (text: string): Promise<number[] | null> => {
    if (!isEmbeddingInitialized) {
      console.warn('Embedding service not initialized');
      return null;
    }
    
    try {
      const embeddingService = getEmbeddingService();
      return await embeddingService.embedText(text);
    } catch (error) {
      console.error('Error generating embedding:', error);
      return null;
    }
  }, [isEmbeddingInitialized]);
  
  // Generate embeddings for multiple texts in batch
  const generateEmbeddings = useCallback(async (texts: string[]): Promise<EmbeddingResult[]> => {
    if (!isEmbeddingInitialized) {
      console.warn('Embedding service not initialized');
      return texts.map((_, i) => ({ id: i.toString(), embedding: [], success: false }));
    }
    
    if (texts.length === 0) return [];
    
    setIsGenerating(true);
    const results: EmbeddingResult[] = [];
    
    try {
      const embeddingService = getEmbeddingService();
      const embeddings = await embeddingService.embedTexts(texts);
      
      // Create results with success status
      for (let i = 0; i < texts.length; i++) {
        results.push({
          id: i.toString(), // Replace with actual note id in real usage
          embedding: embeddings[i],
          success: true
        });
      }
    } catch (error) {
      console.error('Error generating batch embeddings:', error);
      
      // Add failed results
      for (let i = 0; i < texts.length; i++) {
        if (!results.some(r => r.id === i.toString())) {
          results.push({
            id: i.toString(),
            embedding: [],
            success: false
          });
        }
      }
    } finally {
      setIsGenerating(false);
    }
    
    return results;
  }, [isEmbeddingInitialized]);
  
  // Generate embeddings for notes that don't have them
  const generateEmbeddingsForNotes = useCallback(async (noteIds: string[] = []): Promise<void> => {
    if (!isEmbeddingInitialized) {
      console.warn('Embedding service not initialized');
      return;
    }
    
    // Get notes that need embeddings
    const notesToEmbed = noteIds.length > 0
      ? notes.filter(note => noteIds.includes(note.id) && note.content)
      : notes.filter(note => !note.embeddings && note.content);
    
    if (notesToEmbed.length === 0) return;
    
    setIsGenerating(true);
    
    try {
      // Extract content from notes
      const noteTexts = notesToEmbed.map(note => note.content);
      
      // Generate embeddings in batch
      const embeddingService = getEmbeddingService();
      const embeddings = await embeddingService.embedTexts(noteTexts);
      
      // Update notes with embeddings
      for (let i = 0; i < notesToEmbed.length; i++) {
        const noteId = notesToEmbed[i].id;
        await updateNote(noteId, { embeddings: embeddings[i] });
      }
      
      console.log(`Generated embeddings for ${notesToEmbed.length} notes`);
    } catch (error) {
      console.error('Error generating embeddings for notes:', error);
      toast({
        title: 'Embedding Error',
        description: 'Failed to generate embeddings for some notes.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  }, [isEmbeddingInitialized, notes, updateNote, toast]);
  
  // Generate embeddings for a specific note
  const generateNoteEmbeddings = useCallback(async (noteId: string): Promise<void> => {
    await generateEmbeddingsForNotes([noteId]);
  }, [generateEmbeddingsForNotes]);
  
  // Find similar notes based on a query
  const findSimilar = useCallback(async (
    query: string,
    options: {
      threshold?: number;
      maxResults?: number;
      noteIds?: string[];
    } = {}
  ): Promise<Note[]> => {
    const { 
      threshold = similarityThreshold, 
      maxResults: maxResultsOption = maxResults,
      noteIds
    } = options;
    
    if (!isEmbeddingInitialized) {
      console.warn('Embedding service not initialized');
      return [];
    }
    
    try {
      // Generate embedding for query
      const queryEmbedding = await generateEmbedding(query);
      if (!queryEmbedding) return [];
      
      // Filter notes if noteIds provided
      const candidateNotes = noteIds 
        ? notes.filter(note => noteIds.includes(note.id))
        : notes;
      
      // Find similar notes
      return findSimilarNotes(
        query,
        candidateNotes,
        queryEmbedding,
        threshold,
        maxResultsOption
      );
    } catch (error) {
      console.error('Error finding similar notes:', error);
      return [];
    }
  }, [isEmbeddingInitialized, generateEmbedding, notes, similarityThreshold, maxResults]);
  
  // Process all content (notes, files, etc.)
  const processAllContent = useCallback(async (): Promise<void> => {
    if (!isEmbeddingInitialized) {
      console.warn('Embedding service not initialized');
      return;
    }
    
    setIsProcessing(true);
    setProgress(0);
    setStatusMessage('Processing content...');
    setTotalItems(notes.length);
    setProcessedItems(0);
    
    try {
      // Process all notes first
      await generateEmbeddingsForNotes();
      
      // Update progress
      setProgress(100);
      setProcessedItems(notes.length);
      setStatusMessage('Content processing complete');
    } catch (error) {
      console.error('Error processing content:', error);
      setServiceError(error instanceof Error ? error.message : 'Unknown error');
      setStatusMessage('Error processing content');
    } finally {
      setIsProcessing(false);
    }
  }, [isEmbeddingInitialized, notes, generateEmbeddingsForNotes]);
  
  // Change the embedding model
  const changeEmbeddingModel = useCallback(async (newModelName: string): Promise<boolean> => {
    if (newModelName === modelName) return true;
    
    setIsEmbeddingInitializing(true);
    setStatusMessage(`Changing model to ${newModelName}...`);
    
    try {
      // Reset existing embedding service
      setIsEmbeddingInitialized(false);
      
      // Initialize with new model
      await initializeEmbeddingService();
      
      setModelName(newModelName);
      setIsEmbeddingInitialized(true);
      setStatusMessage(`Model changed to ${newModelName}`);
      
      return true;
    } catch (error) {
      console.error('Error changing embedding model:', error);
      setServiceError(error instanceof Error ? error.message : 'Unknown error');
      setStatusMessage('Error changing model');
      return false;
    } finally {
      setIsEmbeddingInitializing(false);
    }
  }, [modelName]);
  
  return {
    isEmbeddingInitialized,
    isEmbeddingInitializing,
    isGenerating,
    generateEmbedding,
    generateEmbeddings,
    generateEmbeddingsForNotes,
    generateNoteEmbeddings,
    findSimilar,
    modelName,
    // Added properties
    isProcessing,
    processAllContent,
    progress,
    statusMessage,
    totalItems,
    processedItems,
    serviceError,
    changeEmbeddingModel,
    // Alias properties for backward compatibility
    isInitialized: isEmbeddingInitialized,
    isInitializing: isEmbeddingInitializing
  };
}
