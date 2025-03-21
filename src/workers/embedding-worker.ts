/**
 * Embedding Worker
 * 
 * This worker runs embedding operations in a separate thread to avoid blocking the main UI.
 * It loads and initializes the embedding model using @xenova/transformers and provides methods
 * for generating embeddings for text chunks.
 */

// Import required libraries from @xenova/transformers
import { pipeline, env } from '@xenova/transformers';

// Modify the environment settings to optimize for worker usage
env.allowLocalModels = false;
env.useBrowserCache = true;

// Define types for messages sent to/from the worker
interface WorkerMessage {
  id: string;
  action: 'initialize' | 'generate' | 'batch' | 'terminate';
  payload?: any;
}

interface WorkerResponse {
  id: string;
  success: boolean;
  embedding?: number[];
  embeddings?: number[][];
  error?: string;
}

interface ProgressUpdate {
  type: 'progress';
  status: string;
  progress?: number;
}

// Worker state
let embeddingModel: any = null;
let modelName = 'Xenova/all-MiniLM-L6-v2'; // Default model
let isInitializing = false;
let pendingTasks: WorkerMessage[] = [];

// Handle messages from the main thread
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { id, action, payload } = event.data;
  
  try {
    switch (action) {
      case 'initialize':
        // Set model name if provided in payload
        if (payload?.modelName) {
          modelName = payload.modelName;
        }
        
        await initializeModel();
        self.postMessage({ id, success: true } as WorkerResponse);
        break;
      
      case 'generate':
        if (!embeddingModel && !isInitializing) {
          // Queue task and initialize model
          pendingTasks.push({ id, action, payload });
          await initializeModel();
        } else if (!embeddingModel && isInitializing) {
          // Queue task while model is initializing
          pendingTasks.push({ id, action, payload });
        } else {
          // Model is ready, process immediately
          const embedding = await generateEmbedding(payload.text);
          self.postMessage({ id, success: true, embedding } as WorkerResponse);
        }
        break;
      
      case 'batch':
        if (!embeddingModel && !isInitializing) {
          // Queue task and initialize model
          pendingTasks.push({ id, action, payload });
          await initializeModel();
        } else if (!embeddingModel && isInitializing) {
          // Queue task while model is initializing
          pendingTasks.push({ id, action, payload });
        } else {
          // Model is ready, process immediately
          const embeddings = await generateBatchEmbeddings(payload.texts);
          self.postMessage({ id, success: true, embeddings } as WorkerResponse);
        }
        break;
      
      case 'terminate':
        // Clean up resources before termination
        embeddingModel = null;
        self.postMessage({ id, success: true } as WorkerResponse);
        break;
      
      default:
        self.postMessage({
          id,
          success: false,
          error: `Unknown action: ${action}`
        } as WorkerResponse);
    }
  } catch (error) {
    self.postMessage({
      id,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    } as WorkerResponse);
  }
};

/**
 * Initialize the embedding model
 */
async function initializeModel(): Promise<void> {
  if (embeddingModel || isInitializing) {
    return;
  }
  
  try {
    isInitializing = true;
    
    // Send progress update
    self.postMessage({
      type: 'progress',
      status: `Initializing embedding model: ${modelName}...`
    } as ProgressUpdate);
    
    // Initialize the feature extraction pipeline
    embeddingModel = await pipeline('feature-extraction', modelName);
    
    // Process any pending tasks
    while (pendingTasks.length > 0) {
      const task = pendingTasks.shift();
      if (task) {
        self.onmessage(new MessageEvent('message', { data: task }));
      }
    }
    
    // Send completion update
    self.postMessage({
      type: 'progress',
      status: 'Embedding model initialized successfully'
    } as ProgressUpdate);
  } catch (error) {
    self.postMessage({
      type: 'progress',
      status: 'Failed to initialize embedding model',
      error: error instanceof Error ? error.message : 'Unknown error'
    } as ProgressUpdate);
    
    // Fail all pending tasks
    while (pendingTasks.length > 0) {
      const task = pendingTasks.shift();
      if (task) {
        self.postMessage({
          id: task.id,
          success: false,
          error: 'Failed to initialize embedding model'
        } as WorkerResponse);
      }
    }
  } finally {
    isInitializing = false;
  }
}

/**
 * Generate embedding for a single text
 */
async function generateEmbedding(text: string): Promise<number[]> {
  if (!embeddingModel) {
    throw new Error('Embedding model not initialized');
  }
  
  try {
    // Generate embedding
    const result = await embeddingModel(text, {
      pooling: 'mean',
      normalize: true
    });
    
    // Convert to array and return
    return Array.from(result.data);
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

/**
 * Generate embeddings for multiple texts
 */
async function generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
  if (!embeddingModel) {
    throw new Error('Embedding model not initialized');
  }
  
  const embeddings: number[][] = [];
  let processed = 0;
  
  for (const text of texts) {
    try {
      const embedding = await generateEmbedding(text);
      embeddings.push(embedding);
      
      // Send progress update
      processed++;
      self.postMessage({
        type: 'progress',
        status: `Generated embeddings for ${processed}/${texts.length} texts`,
        progress: processed / texts.length
      } as ProgressUpdate);
    } catch (error) {
      console.error(`Error processing text: ${text.substring(0, 50)}...`, error);
      // Push empty embedding to maintain order
      embeddings.push([]);
    }
  }
  
  return embeddings;
}
