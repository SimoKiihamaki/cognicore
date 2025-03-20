
/**
 * Utilities for handling embeddings and similarity search
 */

import { Note } from '@/lib/types';

export interface EmbeddingResult {
  id: string | null;
  embedding: number[];
  success: boolean;
  error?: string;
  index?: number;
}

/**
 * Initialize the embedding service
 */
export async function initializeEmbeddingService(): Promise<void> {
  console.log('Initializing embedding service...');
  // Implementation would call into the embedding worker service
  // This is a placeholder
  return new Promise(resolve => setTimeout(resolve, 500));
}

/**
 * Terminate the embedding service
 */
export function terminateEmbeddingService(): void {
  console.log('Terminating embedding service...');
  // Implementation would terminate the embedding worker
}

/**
 * Get the embedding service
 */
export function getEmbeddingService() {
  return {
    embedText: async (text: string): Promise<number[]> => {
      console.log('Generating embedding for text', text.substring(0, 20) + '...');
      // This is a placeholder implementation
      return new Array(384).fill(0).map(() => Math.random() - 0.5);
    },
    embedTexts: async (texts: string[]): Promise<number[][]> => {
      console.log(`Generating embeddings for ${texts.length} texts`);
      // This is a placeholder implementation
      return texts.map(() => new Array(384).fill(0).map(() => Math.random() - 0.5));
    }
  };
}

/**
 * Calculate cosine similarity between two vectors
 */
export function calculateCosineSimilarity(vec1: number[], vec2: number[]): number {
  if (vec1.length !== vec2.length) {
    console.warn('Vectors must have the same length');
    return 0;
  }
  
  let dotProduct = 0;
  let mag1 = 0;
  let mag2 = 0;
  
  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    mag1 += vec1[i] * vec1[i];
    mag2 += vec2[i] * vec2[i];
  }
  
  mag1 = Math.sqrt(mag1);
  mag2 = Math.sqrt(mag2);
  
  if (mag1 === 0 || mag2 === 0) return 0;
  
  return dotProduct / (mag1 * mag2);
}

// Alias for calculateCosineSimilarity
export const cosineSimilarity = calculateCosineSimilarity;

/**
 * Find notes similar to the query
 */
export function findSimilarNotes(
  query: string, 
  notes: Note[], 
  queryEmbedding: number[], 
  similarityThreshold: number = 0.7,
  maxResults: number = 10
): Note[] {
  // Filter notes with embeddings
  const notesWithEmbeddings = notes.filter(note => 
    note.embeddings && note.embeddings.length > 0
  );
  
  if (notesWithEmbeddings.length === 0) return [];
  
  // Calculate similarity for each note
  const notesWithSimilarity = notesWithEmbeddings.map(note => ({
    note,
    similarity: calculateCosineSimilarity(queryEmbedding, note.embeddings!)
  }));
  
  // Filter by threshold and sort by similarity
  return notesWithSimilarity
    .filter(item => item.similarity >= similarityThreshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, maxResults)
    .map(item => item.note);
}

/**
 * Normalize a vector to unit length
 */
export function normalizeVector(vec: number[]): number[] {
  const magnitude = Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0));
  
  if (magnitude === 0) return vec.map(() => 0);
  
  return vec.map(val => val / magnitude);
}

/**
 * Generate a placeholder embedding for testing
 */
export function generatePlaceholderEmbedding(dimension: number = 384): number[] {
  return new Array(dimension).fill(0).map(() => Math.random() - 0.5);
}

/**
 * Find optimum number of clusters using the elbow method
 */
export function findOptimumClusters(
  embeddings: number[][], 
  maxClusters: number = 10
): number {
  // This is a placeholder implementation
  return Math.min(Math.max(2, Math.floor(embeddings.length / 10)), maxClusters);
}
