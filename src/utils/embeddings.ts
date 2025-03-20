
// Corrected embeddings utility functions
import { Note } from '@/lib/types';

// Interface for embedding worker service
export interface EmbeddingWorkerService {
  loadModel(): Promise<void>;
  terminate(): void;
  embedText(text: string): Promise<number[]>;
  embedTexts(texts: string[]): Promise<number[][]>;
}

// Empty worker service for tests or fallback
export const createEmptyWorkerService = (): EmbeddingWorkerService => ({
  loadModel: async () => { console.log('Empty embedding service: loadModel called'); },
  terminate: () => { console.log('Empty embedding service: terminate called'); },
  embedText: async (text: string) => { 
    console.log('Empty embedding service: embedText called'); 
    return new Array(384).fill(0);
  },
  embedTexts: async (texts: string[]) => {
    console.log('Empty embedding service: embedTexts called'); 
    return texts.map(() => new Array(384).fill(0));
  }
});

// Interface for embedding results
export interface EmbeddingResult {
  id: string;
  embedding: number[];
  success: boolean;
}

// Global worker service instance
let embeddingService: EmbeddingWorkerService | null = null;

// Initialize the embedding service
export async function initializeEmbeddingService(): Promise<EmbeddingWorkerService> {
  if (embeddingService) {
    return embeddingService;
  }

  try {
    // In a production environment, create and initialize the worker
    if (typeof window !== 'undefined' && 'Worker' in window) {
      console.log('Initializing embedding service with worker');
      const workerUrl = '/embedding-worker.js'; 
      
      const service: EmbeddingWorkerService = {
        async loadModel() {
          // Implementation of model loading would go here
          console.log('Embedding model loaded');
        },
        
        terminate() {
          // Implementation of worker termination would go here
          console.log('Embedding worker terminated');
        },
        
        async embedText(text: string): Promise<number[]> {
          // Mock implementation
          console.log('Embedding text:', text.substring(0, 30) + '...');
          return new Array(384).fill(0).map(() => Math.random() - 0.5);
        },
        
        async embedTexts(texts: string[]): Promise<number[][]> {
          // Mock implementation
          console.log('Embedding multiple texts:', texts.length);
          return texts.map(() => new Array(384).fill(0).map(() => Math.random() - 0.5));
        }
      };
      
      embeddingService = service;
      await service.loadModel();
      console.log('Embedding service initialized');
      return service;
    } else {
      console.log('Web Workers not supported, using empty embedding service');
      embeddingService = createEmptyWorkerService();
      return embeddingService;
    }
  } catch (error) {
    console.error('Failed to initialize embedding service:', error);
    embeddingService = createEmptyWorkerService();
    return embeddingService;
  }
}

// Terminate the embedding service
export function terminateEmbeddingService(): void {
  if (embeddingService) {
    embeddingService.terminate();
    embeddingService = null;
  }
}

// Get the embedding service
export function getEmbeddingService(): EmbeddingWorkerService {
  if (!embeddingService) {
    console.warn('Embedding service not initialized, creating empty service');
    embeddingService = createEmptyWorkerService();
  }
  return embeddingService;
}

// Calculate similarity between two embeddings using cosine similarity
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same dimensionality');
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  if (normA === 0 || normB === 0) {
    return 0;
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Find similar notes based on embeddings
export function findSimilarNotes(
  query: string,
  notes: Note[],
  queryEmbedding: number[],
  threshold: number = 0.7,
  maxResults: number = 10
): Note[] {
  // Filter notes that have embeddings
  const notesWithEmbeddings = notes.filter(note => note.embeddings && note.embeddings.length > 0);
  
  // Calculate similarity scores
  const scored = notesWithEmbeddings.map(note => {
    const similarity = cosineSimilarity(queryEmbedding, note.embeddings as number[]);
    return { note, similarity };
  });
  
  // Sort by similarity and filter by threshold
  return scored
    .filter(item => item.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, maxResults)
    .map(item => item.note);
}
