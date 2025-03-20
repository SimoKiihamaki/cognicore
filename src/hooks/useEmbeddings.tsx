
import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { useNotes } from './useNotes';
import { Note } from '@/lib/types';
import { initializeEmbeddingService, getEmbeddingService, cosineSimilarity, findSimilarNotes, EmbeddingResult } from '@/utils/embeddings';

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
  const [modelName, setModelName] = useState('');
  const [embeddingQueue, setEmbeddingQueue] = useState<string[]>([]);
  
  // Initialize embedding service
  useEffect(() => {
    const initializeEmbeddings = async () => {
      if (isEmbeddingInitialized || isEmbeddingInitializing) return;
      
      setIsEmbeddingInitializing(true);
      try {
        await initializeEmbeddingService();
        setIsEmbeddingInitialized(true);
        console.log('Embedding service initialized successfully');
      } catch (error) {
        console.error('Failed to initialize embedding service:', error);
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
  
  return {
    isEmbeddingInitialized,
    isEmbeddingInitializing,
    isGenerating,
    generateEmbedding,
    generateEmbeddings,
    generateEmbeddingsForNotes,
    findSimilar,
    modelName
  };
}
