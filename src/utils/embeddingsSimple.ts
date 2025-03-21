/**
 * Simple Embeddings Utility
 * 
 * A lightweight, dependency-free implementation of embeddings functionality
 * that works entirely in the main thread with no external resources.
 * This is used as a fallback when worker-based embeddings fail.
 */

import { Note } from '@/lib/types';

export interface SimpleEmbeddingResult {
  similarity: number;
  note: Note;
  index?: number;
  id?: string;
  embedding?: number[];
}

// Simple embedding generator using hashing for deterministic outputs
export function generateSimpleEmbedding(text: string, dimension: number = 384): number[] {
  // Create a hash from the text
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Use hash as seed for pseudo-random number generator
  const rng = (seed: number): number => {
    let x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  };
  
  // Generate the embedding
  const embedding: number[] = [];
  let magnitude = 0;
  
  // First pass: generate raw values
  for (let i = 0; i < dimension; i++) {
    const val = rng(hash + i) * 2 - 1; // Value between -1 and 1
    embedding.push(val);
    magnitude += val * val;
  }
  
  // Normalize the vector to unit length
  magnitude = Math.sqrt(magnitude);
  if (magnitude > 0) {
    for (let i = 0; i < dimension; i++) {
      embedding[i] = embedding[i] / magnitude;
    }
  }
  
  return embedding;
}

/**
 * Calculate cosine similarity between two vectors
 */
export function calculateSimpleSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    return 0;
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    magnitudeA += a[i] * a[i];
    magnitudeB += b[i] * b[i];
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Find similar notes using simple embeddings
 */
export function findSimilarNotesSimple(
  query: string,
  notes: Note[],
  threshold: number = 0.5
): SimpleEmbeddingResult[] {
  // Generate embedding for query
  const queryEmbedding = generateSimpleEmbedding(query);
  
  // Calculate similarity for each note
  const results: SimpleEmbeddingResult[] = [];
  
  for (const note of notes) {
    if (!note.content) continue;
    
    // Generate embedding for this note if it doesn't have one
    const noteEmbedding = note.embeddings && note.embeddings.length > 0
      ? note.embeddings
      : generateSimpleEmbedding(note.content);
    
    // Calculate similarity
    const similarity = calculateSimpleSimilarity(queryEmbedding, noteEmbedding);
    
    // Add to results if above threshold
    if (similarity >= threshold) {
      results.push({
        similarity,
        note,
        embedding: noteEmbedding
      });
    }
  }
  
  // Sort by similarity (highest first)
  return results.sort((a, b) => b.similarity - a.similarity);
}

/**
 * Simple embeddings service
 */
export const simpleEmbeddingService = {
  /**
   * Generate an embedding for text
   */
  embedText: (text: string): number[] => {
    return generateSimpleEmbedding(text);
  },
  
  /**
   * Find similar notes to a query
   */
  findSimilarNotes: (query: string, notes: Note[], threshold: number = 0.5): SimpleEmbeddingResult[] => {
    return findSimilarNotesSimple(query, notes, threshold);
  },
  
  /**
   * Find similar notes to a reference note
   */
  findSimilarToNote: (referenceNote: Note, notes: Note[], threshold: number = 0.5): SimpleEmbeddingResult[] => {
    if (!referenceNote.content) return [];
    
    // Use the reference note's content as the query
    return findSimilarNotesSimple(referenceNote.content, notes, threshold);
  }
};

export default simpleEmbeddingService;
