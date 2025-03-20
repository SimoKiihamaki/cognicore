/**
 * Web Worker for generating embeddings
 * This worker runs embedding computations in a separate thread to prevent UI blocking
 */

// Import transformers from CDN for worker environment
importScripts('https://cdn.jsdelivr.net/npm/@xenova/transformers/dist/transformers.min.js');

// Flag to track initialization status
let modelInitialized = false;
let embeddingModel = null;
let modelName = 'Xenova/all-MiniLM-L6-v2'; // Default model

// Message handler
self.onmessage = async (event) => {
  try {
    const { type, data, id } = event.data;
    
    switch (type) {
      case 'init':
        // Initialize the model
        await initializeModel(data?.modelName || modelName);
        self.postMessage({ type: 'init_complete', success: true, id });
        break;
        
      case 'generate_embedding':
        // Generate embeddings for text
        if (!modelInitialized) {
          await initializeModel(modelName);
        }
        
        const { text } = data;
        if (!text) {
          throw new Error('No text provided for embedding generation');
        }
        
        const embedding = await generateEmbedding(text);
        self.postMessage({ 
          type: 'embedding_complete', 
          embedding, 
          success: true, 
          id 
        });
        break;
        
      case 'batch_generate':
        // Generate embeddings for a batch of texts
        if (!modelInitialized) {
          await initializeModel(modelName);
        }
        
        const { texts, itemIds } = data;
        if (!texts || !texts.length) {
          throw new Error('No texts provided for batch embedding generation');
        }
        
        const results = await generateBatchEmbeddings(texts, itemIds);
        self.postMessage({ 
          type: 'batch_complete', 
          results, 
          success: true, 
          id 
        });
        break;
        
      case 'change_model':
        // Change the embedding model
        const newModelName = data.modelName;
        if (!newModelName) {
          throw new Error('No model name provided');
        }
        
        await initializeModel(newModelName);
        self.postMessage({ 
          type: 'model_changed', 
          modelName: newModelName, 
          success: true, 
          id 
        });
        break;
        
      default:
        throw new Error(`Unknown command: ${type}`);
    }
  } catch (error) {
    console.error('Worker error:', error);
    self.postMessage({
      type: 'error',
      error: error.message || 'Unknown error in embedding worker',
      id: event.data.id
    });
  }
};

/**
 * Initialize the embedding model
 */
async function initializeModel(customModelName) {
  try {
    // Update progress
    self.postMessage({ type: 'progress', status: 'Initializing embedding model...' });
    
    // Allow override of the model name
    if (customModelName && customModelName !== modelName) {
      modelName = customModelName;
    }

    // Load the tokenizer and model
    const { pipeline } = await import('@xenova/transformers');
    
    // Update progress 
    self.postMessage({ type: 'progress', status: 'Loading sentence transformer...' });
    
    // Create feature extraction pipeline
    embeddingModel = await pipeline('feature-extraction', modelName);
    
    modelInitialized = true;
    
    // Signal that the model is ready
    self.postMessage({ 
      type: 'progress',
      status: 'Model initialized successfully',
      modelName 
    });
    
    return true;
  } catch (error) {
    modelInitialized = false;
    self.postMessage({ 
      type: 'error', 
      error: `Failed to initialize model: ${error.message}` 
    });
    throw error;
  }
}

/**
 * Generate embeddings for a single text
 */
async function generateEmbedding(text) {
  if (!modelInitialized || !embeddingModel) {
    throw new Error('Model not initialized');
  }
  
  try {
    // Truncate text if it's too long (models typically have token limits)
    const truncatedText = text.length > 8000 ? text.substring(0, 8000) : text;
    
    // Generate the embedding
    const result = await embeddingModel(truncatedText, {
      pooling: 'mean',
      normalize: true
    });
    
    // Extract and return the embedding vector
    return Array.from(result.data);
  } catch (error) {
    throw new Error(`Embedding generation failed: ${error.message}`);
  }
}

/**
 * Generate embeddings for multiple texts in batch
 */
async function generateBatchEmbeddings(texts, itemIds = []) {
  if (!modelInitialized || !embeddingModel) {
    throw new Error('Model not initialized');
  }
  
  try {
    const results = [];
    const batchSize = 5; // Process in small batches to provide progress updates
    
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const batchIds = itemIds.slice(i, i + batchSize);
      
      // Update progress
      self.postMessage({ 
        type: 'batch_progress', 
        completed: i,
        total: texts.length 
      });
      
      // Process each text in the current batch
      const batchPromises = batch.map(async (text, index) => {
        try {
          // Truncate text if needed
          const truncatedText = text.length > 8000 ? text.substring(0, 8000) : text;
          
          // Generate embedding
          const embedding = await embeddingModel(truncatedText, {
            pooling: 'mean',
            normalize: true
          });
          
          // Return result with ID if available
          return { 
            embedding: Array.from(embedding.data),
            success: true,
            id: batchIds[index] || null,
            index: i + index
          };
        } catch (error) {
          return { 
            embedding: null,
            success: false,
            error: error.message,
            id: batchIds[index] || null,
            index: i + index
          };
        }
      });
      
      // Wait for all embeddings in this batch
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }
    
    // Final progress update
    self.postMessage({ 
      type: 'batch_progress', 
      completed: texts.length,
      total: texts.length 
    });
    
    return results;
  } catch (error) {
    throw new Error(`Batch embedding generation failed: ${error.message}`);
  }
}

// Signal that the worker is ready
self.postMessage({ type: 'ready' });
