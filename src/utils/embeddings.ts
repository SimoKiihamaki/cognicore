/**
 * Embeddings Utility Functions
 * 
 * Contains utilities for generating, storing, and manipulating text embeddings,
 * along with similarity calculations.
 */

import embeddingWorkerService from '@/services/embeddingWorkerService';

/**
 * Calculate cosine similarity between two embedding vectors
 * 
 * @param embedding1 First embedding vector
 * @param embedding2 Second embedding vector
 * @returns Cosine similarity score (0-1)
 */
export function calculateCosineSimilarity(embedding1: number[], embedding2: number[]): number {
  if (!embedding1 || !embedding2 || embedding1.length !== embedding2.length) {
    return 0;
  }

  let dotProduct = 0;
  let magnitude1 = 0;
  let magnitude2 = 0;

  // Calculate dot product and magnitudes
  for (let i = 0; i < embedding1.length; i++) {
    dotProduct += embedding1[i] * embedding2[i];
    magnitude1 += embedding1[i] * embedding1[i];
    magnitude2 += embedding2[i] * embedding2[i];
  }

  magnitude1 = Math.sqrt(magnitude1);
  magnitude2 = Math.sqrt(magnitude2);

  // Check to avoid division by zero
  if (magnitude1 === 0 || magnitude2 === 0) {
    return 0;
  }

  // Calculate and return cosine similarity
  return dotProduct / (magnitude1 * magnitude2);
}

/**
 * Generate embeddings for a text string using the worker service
 * 
 * @param text Text to generate embeddings for
 * @param modelName Optional model name (defaults to service default)
 * @returns Embedding vector array
 */
export async function getTextEmbeddings(
  text: string,
  modelName?: string
): Promise<number[]> {
  try {
    // Change model if specified
    if (modelName) {
      await embeddingWorkerService.changeModel(modelName);
    }
    
    // Generate embedding
    return await embeddingWorkerService.generateEmbedding(text);
  } catch (error) {
    console.error('Failed to generate text embeddings:', error);
    throw error;
  }
}

/**
 * Batch create embeddings for multiple texts
 * 
 * @param texts Array of text strings to process
 * @param itemIds Optional array of IDs corresponding to each text
 * @param modelName Optional model name (defaults to service default)
 * @param progressCallback Optional callback for progress updates
 * @returns Array of results with embeddings
 */
export async function batchCreateEmbeddings(
  texts: string[],
  itemIds?: string[],
  modelName?: string,
  progressCallback?: (completed: number, total: number) => void
): Promise<{
  embedding: number[] | null;
  success: boolean;
  error?: string;
  id: string | null;
  index: number;
}[]> {
  try {
    // Set progress callback if provided
    if (progressCallback) {
      embeddingWorkerService.setBatchProgressCallback(progressCallback);
    }
    
    // Change model if specified
    if (modelName) {
      await embeddingWorkerService.changeModel(modelName);
    }
    
    // Generate batch embeddings
    return await embeddingWorkerService.generateBatchEmbeddings(texts, itemIds);
  } catch (error) {
    console.error('Failed to batch create embeddings:', error);
    throw error;
  } finally {
    // Clear the progress callback
    if (progressCallback) {
      embeddingWorkerService.setBatchProgressCallback(null);
    }
  }
}

/**
 * Check if the embedding service is initialized
 * 
 * @param modelName Optional model name to initialize with
 * @returns Promise resolving to true if initialized successfully
 */
export async function initializeEmbeddingService(
  modelName?: string,
  statusCallback?: (status: string) => void
): Promise<boolean> {
  try {
    // Set status callback if provided
    if (statusCallback) {
      embeddingWorkerService.setProgressCallback(statusCallback);
    }
    
    // Initialize service
    return await embeddingWorkerService.initialize(modelName);
  } catch (error) {
    console.error('Failed to initialize embedding service:', error);
    throw error;
  } finally {
    // Clear the status callback
    if (statusCallback) {
      embeddingWorkerService.setProgressCallback(null);
    }
  }
}

/**
 * Cleanup the embedding service (should be called on app shutdown)
 */
export function terminateEmbeddingService(): void {
  embeddingWorkerService.terminate();
}
