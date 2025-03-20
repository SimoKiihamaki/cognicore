
/**
 * Embeddings utility functions for text similarity
 */

/**
 * Calculate cosine similarity between two vectors
 * 
 * @param vecA First vector
 * @param vecB Second vector
 * @returns Cosine similarity value (between -1 and 1)
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have the same dimensions');
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  if (normA === 0 || normB === 0) {
    return 0;
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
  return cosineSimilarity(vecA, vecB);
}

// Interface for batch processing results
export interface EmbeddingResult {
  id: string;
  embedding: number[];
  success: boolean;
  error?: string;
}

/**
 * Generate text embeddings using the worker service
 * 
 * @param text Text to generate embeddings for
 * @returns Promise that resolves to the embedding vector
 */
export async function getTextEmbeddings(text: string): Promise<number[]> {
  // For simplicity, return a dummy embedding vector
  // In a real implementation, this would call an actual embedding service
  
  // Generate a simple hash-based vector (just for demo, not a real embedding)
  const vector = new Array(128).fill(0);
  let hash = 0;
  
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash = hash & hash;
    vector[hash % 128] = hash % 100 / 100;
  }
  
  return vector;
}

/**
 * Create embeddings for a batch of texts
 * 
 * @param texts Array of texts to generate embeddings for
 * @param ids Array of IDs corresponding to each text
 * @param progressCallback Optional callback for reporting progress
 * @returns Promise that resolves to an array of embedding results
 */
export async function batchCreateEmbeddings(
  texts: string[], 
  ids?: string[],
  progressCallback?: (completed: number, total: number) => void
): Promise<EmbeddingResult[]> {
  const results: EmbeddingResult[] = [];
  const total = texts.length;
  
  for (let i = 0; i < texts.length; i++) {
    try {
      const embedding = await getTextEmbeddings(texts[i]);
      results.push({
        id: ids ? ids[i] : `item-${i}`,
        embedding,
        success: true
      });
    } catch (error) {
      results.push({
        id: ids ? ids[i] : `item-${i}`,
        embedding: [],
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
    
    // Call progress callback if provided
    if (progressCallback) {
      progressCallback(i + 1, total);
    }
  }
  
  return results;
}

/**
 * Initialize the embedding service
 */
export function initializeEmbeddingService(): void {
  console.log('Embedding service initialized');
}

/**
 * Terminate the embedding service
 */
export function terminateEmbeddingService(): void {
  console.log('Embedding service terminated');
}
