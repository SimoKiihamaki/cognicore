/**
 * Utilities for handling embeddings and similarity search
 */

import { Note } from '@/lib/types';
import { encode } from 'gpt-tokenizer';

// Global state for worker management
let embeddingWorker: Worker | null = null;
let isWorkerInitialized = false;
let isInitializing = false;
const pendingTasks = new Map<string, { resolve: (value: any) => void; reject: (reason: any) => void }>();

export interface EmbeddingResult {
  similarity: number;
  note: Note;
  index?: number;
  success?: boolean;
  id?: string;
  embedding?: number[];
}

export interface Embedding {
  vector: number[];
  text: string;
  tokens: number;
}

// Worker communication
export interface EmbeddingWorkerMessage {
  type: 'process' | 'result' | 'ready' | 'init_complete' | 'embedding_complete' | 'batch_complete' | 'model_changed' | 'error' | 'progress' | 'batch_progress';
  data: {
    id?: string;
    success?: boolean;
    embedding?: number[];
    error?: string;
    results?: EmbeddingResult[];
    status?: string;
  };
}

export interface EmbeddingCluster {
  centroid: number[];
  notes: Note[];
}

// Flag to indicate if we're using fallback (non-worker) embeddings
let usingFallback = false;

/**
 * Initialize the embedding service
 */
export async function initializeEmbeddingService(modelName: string = 'Xenova/all-MiniLM-L6-v2'): Promise<void> {
  if (isWorkerInitialized || isInitializing) {
    return;
  }

  console.log('Initializing embedding service...');
  isInitializing = true;

  try {
    // Determine worker path - try both options with inline as fallback
    const workerPaths = ['/embedding-worker-inline.js', '/embedding-worker.js'];
    let workerLoadSuccess = false;
    
    // Try each worker path
    for (const workerPath of workerPaths) {
      try {
        console.log(`Trying to load embedding worker from ${workerPath}...`);
        // Create the worker
        embeddingWorker = new Worker(workerPath);
        
        // Set up message handler
        embeddingWorker.onmessage = handleWorkerMessage;
        
        // Wait for worker to be ready with a short timeout
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error(`Timeout waiting for embedding worker to be ready from ${workerPath}`));
          }, 3000);
          
          const messageHandler = (e: MessageEvent) => {
            if (e.data.type === 'ready') {
              clearTimeout(timeout);
              embeddingWorker?.removeEventListener('message', messageHandler);
              resolve();
            }
          };
          
          embeddingWorker?.addEventListener('message', messageHandler);
        });
        
        // If we get here, the worker loaded successfully
        console.log(`Successfully loaded embedding worker from ${workerPath}`);
        workerLoadSuccess = true;
        break;
      } catch (workerError) {
        console.error(`Failed to load embedding worker from ${workerPath}:`, workerError);
        
        // Clean up the worker if it was created
        if (embeddingWorker) {
          embeddingWorker.terminate();
          embeddingWorker = null;
        }
      }
    }
    
    // If we couldn't load any worker, use fallback mode
    if (!workerLoadSuccess) {
      console.warn('Could not load any embedding worker, using fallback mode');
      usingFallback = true;
      isWorkerInitialized = true;
      isInitializing = false;
      return;
    }
    
    // Initialize the model
    const initId = crypto.randomUUID();
    
    const initPromise = new Promise<void>((resolve, reject) => {
      // Set a timeout to avoid hanging forever
      const timeout = setTimeout(() => {
        pendingTasks.delete(initId);
        console.warn('Timeout waiting for embedding model initialization, using fallback mode');
        usingFallback = true;
        resolve();
      }, 5000);
      
      pendingTasks.set(initId, { 
        resolve: () => {
          clearTimeout(timeout);
          resolve();
        },
        reject: (err) => {
          clearTimeout(timeout);
          reject(err);
        }
      });
    });
    
    embeddingWorker.postMessage({
      type: 'init',
      data: { modelName },
      id: initId
    });
    
    await initPromise;
    isWorkerInitialized = true;
    isInitializing = false;
    console.log('Embedding service initialized successfully');
  } catch (error) {
    console.error('Failed to initialize embedding service, using fallback mode:', error);
    usingFallback = true;
    isWorkerInitialized = true;
    isInitializing = false;
  }
}

/**
 * Terminate the embedding service
 */
export function terminateEmbeddingService(): void {
  console.log('Terminating embedding service...');
  
  if (embeddingWorker) {
    embeddingWorker.terminate();
    embeddingWorker = null;
  }
  
  // Reject any pending tasks
  for (const [id, { reject }] of pendingTasks.entries()) {
    reject(new Error('Embedding service terminated'));
    pendingTasks.delete(id);
  }
  
  isWorkerInitialized = false;
  isInitializing = false;
}

/**
 * Handle messages from the embedding worker
 */
function handleWorkerMessage(event: MessageEvent): void {
  const { type, id, success, error, embedding, results } = event.data;
  
  // Handle progress updates separately
  if (type === 'progress' || type === 'batch_progress') {
    console.log('Embedding progress:', event.data.status || event.data);
    return;
  }
  
  // Find the pending task for this message
  const task = pendingTasks.get(id);
  if (!task) {
    console.warn('Received response for unknown task ID:', id);
    return;
  }
  
  // Handle the result based on message type
  switch (type) {
    case 'init_complete':
      if (success) {
        task.resolve(undefined);
      } else {
        task.reject(new Error(error || 'Failed to initialize embedding model'));
      }
      break;
      
    case 'embedding_complete':
      if (success) {
        task.resolve(embedding);
      } else {
        task.reject(new Error(error || 'Failed to generate embedding'));
      }
      break;
      
    case 'batch_complete':
      if (success) {
        task.resolve(results);
      } else {
        task.reject(new Error(error || 'Failed to generate batch embeddings'));
      }
      break;
      
    case 'model_changed':
      if (success) {
        task.resolve(undefined);
      } else {
        task.reject(new Error(error || 'Failed to change embedding model'));
      }
      break;
      
    case 'error':
      task.reject(new Error(error || 'Unknown error in embedding worker'));
      break;
      
    default:
      console.warn('Unknown message type from embedding worker:', type);
      task.reject(new Error(`Unknown message type: ${type}`));
  }
  
  // Clean up the pending task
  pendingTasks.delete(id);
}

// Import the simple fallback
import simpleEmbeddingService, { 
  generateSimpleEmbedding, 
  SimpleEmbeddingResult 
} from './embeddingsSimple';

/**
 * Get the embedding service
 */
export function getEmbeddingService() {
  return {
    /**
     * Generate an embedding for a single text
     */
    embedText: async (text: string): Promise<number[]> => {
      // Make sure service is initialized
      if (!isWorkerInitialized && !usingFallback) {
        try {
          await initializeEmbeddingService();
        } catch (error) {
          console.error('Failed to initialize embedding service:', error);
          usingFallback = true;
        }
      }
      
      // Use fallback if needed
      if (usingFallback || !embeddingWorker) {
        console.log('Using fallback for embedText');
        return generateSimpleEmbedding(text);
      }
      
      console.log('Generating embedding for text', text.substring(0, 20) + '...');
      
      try {
        const taskId = crypto.randomUUID();
        
        const embedding = await new Promise<number[]>((resolve, reject) => {
          // Add timeout to avoid hanging
          const timeout = setTimeout(() => {
            pendingTasks.delete(taskId);
            console.warn('Timeout in embedText, using fallback');
            resolve(generateSimpleEmbedding(text));
          }, 5000);
          
          pendingTasks.set(taskId, { 
            resolve: (result) => {
              clearTimeout(timeout);
              resolve(result);
            }, 
            reject: (error) => {
              clearTimeout(timeout);
              reject(error);
            } 
          });
          
          embeddingWorker!.postMessage({
            type: 'generate_embedding',
            data: { text },
            id: taskId
          });
        });
        
        return embedding;
      } catch (error) {
        console.error('Error in embedText, using fallback:', error);
        return generateSimpleEmbedding(text);
      }
    },
    
    /**
     * Generate embeddings for multiple texts
     */
    embedTexts: async (texts: string[], itemIds?: string[]): Promise<EmbeddingResult[]> => {
      // Make sure service is initialized
      if (!isWorkerInitialized && !usingFallback) {
        try {
          await initializeEmbeddingService();
        } catch (error) {
          console.error('Failed to initialize embedding service:', error);
          usingFallback = true;
        }
      }
      
      // Return empty array for empty input
      if (texts.length === 0) {
        return [];
      }
      
      // Use fallback if needed
      if (usingFallback || !embeddingWorker) {
        console.log('Using fallback for embedTexts');
        return texts.map((text, index) => {
          const id = itemIds ? itemIds[index] : `item-${index}`;
          const embedding = generateSimpleEmbedding(text);
          
          return {
            similarity: 1.0,
            note: { id, content: text },
            index,
            id,
            embedding,
            success: true
          };
        });
      }
      
      console.log(`Generating embeddings for ${texts.length} texts`);
      
      try {
        const taskId = crypto.randomUUID();
        
        const results = await new Promise<EmbeddingResult[]>((resolve, reject) => {
          // Add timeout to avoid hanging
          const timeout = setTimeout(() => {
            pendingTasks.delete(taskId);
            console.warn('Timeout in embedTexts, using fallback');
            // Generate fallback results
            const fallbackResults = texts.map((text, index) => {
              const id = itemIds ? itemIds[index] : `item-${index}`;
              const embedding = generateSimpleEmbedding(text);
              
              return {
                similarity: 1.0,
                note: { id, content: text },
                index,
                id,
                embedding,
                success: true
              };
            });
            resolve(fallbackResults);
          }, 10000); // Longer timeout for batch processing
          
          pendingTasks.set(taskId, { 
            resolve: (result) => {
              clearTimeout(timeout);
              resolve(result);
            }, 
            reject: (error) => {
              clearTimeout(timeout);
              reject(error);
            } 
          });
          
          embeddingWorker!.postMessage({
            type: 'batch_generate',
            data: { texts, itemIds },
            id: taskId
          });
        });
        
        return results;
      } catch (error) {
        console.error('Error in embedTexts, using fallback:', error);
        // Generate fallback results
        return texts.map((text, index) => {
          const id = itemIds ? itemIds[index] : `item-${index}`;
          const embedding = generateSimpleEmbedding(text);
          
          return {
            similarity: 1.0,
            note: { id, content: text },
            index,
            id,
            embedding,
            success: true
          };
        });
      }
    },
    
    /**
     * Change the embedding model
     */
    changeModel: async (modelName: string): Promise<void> => {
      // Make sure service is initialized
      if (!isWorkerInitialized && !usingFallback) {
        try {
          await initializeEmbeddingService(modelName);
          return;
        } catch (error) {
          console.error('Failed to initialize embedding service:', error);
          usingFallback = true;
          return;
        }
      }
      
      // No-op for fallback mode
      if (usingFallback || !embeddingWorker) {
        console.log(`Using fallback - ignoring model change to ${modelName}`);
        return;
      }
      
      try {
        const taskId = crypto.randomUUID();
        
        await new Promise<void>((resolve, reject) => {
          // Add timeout to avoid hanging
          const timeout = setTimeout(() => {
            pendingTasks.delete(taskId);
            console.warn('Timeout in changeModel, continuing without change');
            resolve();
          }, 5000);
          
          pendingTasks.set(taskId, { 
            resolve: () => {
              clearTimeout(timeout);
              resolve();
            }, 
            reject: (error) => {
              clearTimeout(timeout);
              reject(error);
            } 
          });
          
          embeddingWorker!.postMessage({
            type: 'change_model',
            data: { modelName },
            id: taskId
          });
        });
        
        console.log(`Embedding model changed to ${modelName}`);
      } catch (error) {
        console.error('Error changing model, continuing with current model:', error);
      }
    }
  };
}

/**
 * Calculate cosine similarity between two vectors
 */
export function calculateCosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }

  const dotProduct = a.reduce((sum, value, i) => sum + value * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, value) => sum + value * value, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, value) => sum + value * value, 0));

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return dotProduct / (magnitudeA * magnitudeB);
}

// Alias for calculateCosineSimilarity
export const cosineSimilarity = calculateCosineSimilarity;

/**
 * Find notes similar to a query or a reference note
 */
export async function findSimilarNotes(
  targetEmbedding: number[],
  notes: Note[],
  threshold: number = 0.7
): Promise<EmbeddingResult[]> {
  const results: EmbeddingResult[] = [];

  for (const note of notes) {
    if (note.embeddings && note.embeddings.length > 0) {
      const similarity = calculateCosineSimilarity(targetEmbedding, note.embeddings);
      if (similarity >= threshold) {
        results.push({ similarity, note });
      }
    }
  }

  return results.sort((a, b) => b.similarity - a.similarity);
}

/**
 * Find text chunks similar to a query
 */
export async function findSimilarTextChunks(
  query: string,
  chunks: Array<{ id: string; text: string; embedding?: number[] }>,
  similarityThreshold: number = 0.7,
  maxResults: number = 10
): Promise<Array<{ id: string; text: string; similarity: number }>> {
  if (chunks.length === 0) return [];
  
  // Generate embedding for query
  const embeddingService = getEmbeddingService();
  const queryEmbedding = await embeddingService.embedText(query);
  
  // Filter chunks with embeddings
  const chunksWithEmbeddings = chunks.filter(chunk => chunk.embedding && chunk.embedding.length > 0);
  
  // If some chunks don't have embeddings, generate them
  const chunksNeedingEmbeddings = chunks.filter(chunk => !chunk.embedding);
  
  if (chunksNeedingEmbeddings.length > 0) {
    const texts = chunksNeedingEmbeddings.map(chunk => chunk.text);
    const ids = chunksNeedingEmbeddings.map(chunk => chunk.id);
    
    const embeddings = await embeddingService.embedTexts(texts, ids);
    
    // Add embeddings to chunks
    embeddings.forEach(result => {
      if (result.note && result.embedding) {
        const chunkIndex = chunks.findIndex(chunk => chunk.id === result.note.id);
        if (chunkIndex >= 0) {
          chunks[chunkIndex].embedding = result.embedding;
        }
      }
    });
  }
  
  // Calculate similarity for each chunk
  const chunksWithSimilarity = chunksWithEmbeddings.map(chunk => ({
    id: chunk.id,
    text: chunk.text,
    similarity: calculateCosineSimilarity(queryEmbedding, chunk.embedding!)
  }));
  
  // Filter by threshold and sort by similarity
  return chunksWithSimilarity
    .filter(item => item.similarity >= similarityThreshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, maxResults);
}

/**
 * Normalize a vector to unit length
 */
export function normalizeVector(vec: number[]): number[] {
  if (!vec || vec.length === 0) {
    return [];
  }
  
  const magnitude = Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0));
  
  if (magnitude === 0) return vec.map(() => 0);
  
  return vec.map(val => val / magnitude);
}

/**
 * Generate a placeholder embedding for testing
 */
export function generatePlaceholderEmbedding(dimension: number = 384): number[] {
  return normalizeVector(new Array(dimension).fill(0).map(() => Math.random() - 0.5));
}

/**
 * Chunk text for embedding
 */
export function chunkText(
  text: string, 
  maxChunkSize: number = 512, 
  overlapSize: number = 100
): string[] {
  if (!text) return [];
  
  // Simple chunking by sentences
  const sentences = text.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let currentChunk = '';
  
  for (const sentence of sentences) {
    // If adding this sentence would make the chunk too large, 
    // finalize the current chunk and start a new one
    if (currentChunk.length + sentence.length > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk);
      
      // Start new chunk with overlap if possible
      const words = currentChunk.split(' ');
      if (words.length > overlapSize / 5) { // Approximate words to include in overlap
        currentChunk = words.slice(-Math.floor(overlapSize / 5)).join(' ') + ' ';
      } else {
        currentChunk = '';
      }
    }
    
    currentChunk += sentence + ' ';
  }
  
  // Add the last chunk if it's not empty
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

/**
 * Calculate the centroid of multiple embeddings
 */
export function calculateCentroid(embeddings: number[][]): number[] {
  if (embeddings.length === 0) {
    return [];
  }
  
  if (embeddings.length === 1) {
    return [...embeddings[0]];
  }
  
  const dimension = embeddings[0].length;
  const centroid = new Array(dimension).fill(0);
  
  for (const embedding of embeddings) {
    for (let i = 0; i < dimension; i++) {
      centroid[i] += embedding[i] / embeddings.length;
    }
  }
  
  return normalizeVector(centroid);
}

/**
 * Find optimum number of clusters using the elbow method
 */
export function findOptimumClusters(
  embeddings: number[][], 
  maxClusters: number = 10
): number {
  if (embeddings.length <= 2) return 1;
  if (embeddings.length <= 5) return 2;
  
  // For larger datasets, use heuristic
  return Math.min(Math.max(2, Math.floor(Math.sqrt(embeddings.length / 2))), maxClusters);
}

export async function generateEmbeddingsForFile(content: string): Promise<Embedding> {
  // For now, we'll use a simple tokenization approach
  // In a production environment, you would want to use a proper embedding model
  const tokens = content.split(/\s+/).length; // Simple word count as token count
  
  // Create a simple vector representation
  // This is a placeholder - in production use a proper embedding model
  const vector = new Array(128).fill(0).map(() => Math.random());
  
  return {
    vector,
    text: content,
    tokens
  };
}

export function clusterNotes(
  notes: Note[],
  maxClusters: number = 10
): EmbeddingCluster[] {
  const embeddings = notes
    .filter(note => note.embeddings && note.embeddings.length > 0)
    .map(note => ({ note, embedding: note.embeddings }));

  if (embeddings.length === 0) {
    return [];
  }

  const k = calculateOptimalK(embeddings, maxClusters);
  return kMeansClustering(embeddings, k);
}

function calculateOptimalK(
  embeddings: { note: Note; embedding: number[] }[],
  maxClusters: number
): number {
  return Math.min(Math.max(2, Math.floor(Math.sqrt(embeddings.length / 2))), maxClusters);
}

function kMeansClustering(
  embeddings: { note: Note; embedding: number[] }[],
  k: number
): EmbeddingCluster[] {
  // Initialize centroids randomly
  const centroids = Array.from({ length: k }, () => {
    const randomIndex = Math.floor(Math.random() * embeddings.length);
    return [...embeddings[randomIndex].embedding];
  });

  const clusters: EmbeddingCluster[] = Array.from({ length: k }, () => ({
    centroid: [],
    notes: []
  }));

  // Run k-means iterations
  for (let iteration = 0; iteration < 10; iteration++) {
    // Reset clusters
    clusters.forEach(cluster => {
      cluster.notes = [];
    });

    // Assign points to nearest centroid
    for (const { note, embedding } of embeddings) {
      let nearestClusterIndex = 0;
      let minDistance = Infinity;

      for (let i = 0; i < k; i++) {
        const distance = calculateDistance(embedding, centroids[i]);
        if (distance < minDistance) {
          minDistance = distance;
          nearestClusterIndex = i;
        }
      }

      clusters[nearestClusterIndex].notes.push(note);
    }

    // Update centroids
    let centroidsChanged = false;
    for (let i = 0; i < k; i++) {
      const newCentroid = calculateCentroid(
        clusters[i].notes.map(note => note.embeddings!)
      );
      
      if (newCentroid.length > 0) {
        if (!arraysEqual(centroids[i], newCentroid)) {
          centroids[i] = newCentroid;
          clusters[i].centroid = newCentroid;
          centroidsChanged = true;
        }
      }
    }

    if (!centroidsChanged) {
      break;
    }
  }

  return clusters.filter(cluster => cluster.notes.length > 0);
}

function calculateDistance(a: number[], b: number[]): number {
  return Math.sqrt(
    a.reduce((sum, value, i) => sum + Math.pow(value - b[i], 2), 0)
  );
}

function arraysEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  return a.every((value, index) => Math.abs(value - b[index]) < 1e-10);
}
