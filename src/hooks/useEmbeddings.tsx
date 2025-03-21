/**
 * Custom hook for using the embedding service
 */

import { useState, useCallback, useEffect } from 'react';
import embeddingService, { SimilarityResult } from '@/services/embedding/embeddingService';
import { useToast } from './use-toast';

export interface EmbeddingProgress {
  current: number;
  total: number;
  percentage: number;
  message: string;
}

export function useEmbeddings() {
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [isInitializing, setIsInitializing] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<EmbeddingProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const { toast } = useToast();

  // Initialize embedding service
  const initialize = useCallback(async (modelName?: string) => {
    try {
      setIsInitializing(true);
      setError(null);
      
      const successInfo = await embeddingService.initialize(modelName, (update) => {
        setProgress({
          current: 0,
          total: 1,
          percentage: 0,
          message: update.status
        });
      });
      
      setIsInitialized(successInfo);
      
      if (!successInfo) {
        setError('Failed to initialize embedding service');
        toast({
          title: 'Initialization Failed',
          description: 'Failed to initialize embedding service',
          variant: 'destructive'
        });
      }
      
      return successInfo;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      toast({
        title: 'Initialization Error',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive'
      });
      return false;
    } finally {
      setIsInitializing(false);
      setProgress(null);
    }
  }, [toast]);

  // Generate embeddings for a single note
  const generateEmbeddingForNote = useCallback(async (noteId: string) => {
    try {
      setIsProcessing(true);
      setError(null);
      return await embeddingService.generateEmbeddingsForNote(noteId, (progress) => {
        setProgress({
          current: progress,
          total: 100,
          percentage: progress,
          message: `Generating embeddings: ${progress}%`
        });
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      setIsProcessing(false);
      setProgress(null);
    }
  }, []);

  // Generate embeddings for multiple notes
  const generateEmbeddingsForNotes = useCallback(async (noteIds: string[]) => {
    try {
      setIsProcessing(true);
      setError(null);
      return await embeddingService.generateEmbeddingsForNotes(noteIds, (progress) => {
        setProgress({
          current: progress,
          total: 100,
          percentage: progress,
          message: `Generating embeddings: ${progress}%`
        });
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return { success: false, processed: 0, failed: noteIds.length };
    } finally {
      setIsProcessing(false);
      setProgress(null);
    }
  }, []);

  // Generate embeddings for a file
  const generateEmbeddingsForFile = useCallback(async (fileId: string) => {
    try {
      setIsProcessing(true);
      setError(null);
      
      const success = await embeddingService.generateEmbeddingsForFile(fileId, (p) => {
        setProgress({
          current: Math.round(p * 100),
          total: 100,
          percentage: p,
          message: `Generating embeddings: ${Math.round(p * 100)}%`
        });
      });
      
      if (!success) {
        setError('Failed to generate embeddings');
        toast({
          title: 'Embedding Generation Failed',
          description: 'Failed to generate embeddings for the file',
          variant: 'destructive'
        });
      }
      
      return success;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
      toast({
        title: 'Embedding Error',
        description: errorMsg,
        variant: 'destructive'
      });
      return false;
    } finally {
      setIsProcessing(false);
      setProgress(null);
    }
  }, [toast]);

  // Find similar content
  const findSimilarContent = useCallback(async (
    sourceId: string,
    similarityThreshold: number = 0.7,
    limit: number = 5
  ): Promise<SimilarityResult[]> => {
    try {
      setIsProcessing(true);
      setError(null);
      
      const results = await embeddingService.findSimilarContent(
        sourceId,
        similarityThreshold,
        limit
      );
      
      return results;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
      return [];
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // Semantic search
  const semanticSearch = useCallback(async (
    query: string,
    similarityThreshold: number = 0.6,
    limit: number = 10
  ): Promise<SimilarityResult[]> => {
    try {
      setIsProcessing(true);
      setError(null);
      
      const results = await embeddingService.semanticSearch(
        query,
        similarityThreshold,
        limit
      );
      
      return results;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
      return [];
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // Delete embeddings for a source
  const deleteEmbeddings = useCallback(async (
    sourceId: string,
    sourceType: 'note' | 'file'
  ): Promise<boolean> => {
    try {
      setIsProcessing(true);
      setError(null);
      
      const success = await embeddingService.deleteEmbeddingsForSource(sourceId, sourceType);
      
      if (!success) {
        setError('Failed to delete embeddings');
        toast({
          title: 'Deletion Failed',
          description: 'Failed to delete embeddings',
          variant: 'destructive'
        });
      }
      
      return success;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
      toast({
        title: 'Deletion Error',
        description: errorMsg,
        variant: 'destructive'
      });
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [toast]);

  return {
    isInitialized,
    isInitializing,
    isProcessing,
    progress,
    error,
    initialize,
    generateEmbeddingForNote,
    generateEmbeddingsForNotes,
    generateEmbeddingsForFile,
    findSimilarContent,
    semanticSearch,
    deleteEmbeddings
  };
}
