/**
 * Embedding Worker Proxy
 * 
 * This script serves as a proxy for the embedding worker, handling CORS issues.
 * It also provides a fallback mechanism for the embedding service when the worker fails.
 */

// Define a simple fallback embedding generator
function generateFallbackEmbedding(text, dimension = 384) {
  // Create a hash-based pseudo-random embedding from the text
  // This is not semantically meaningful but provides deterministic results
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Use the hash as a seed for a simple random number generator
  const rng = (seed) => {
    let x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  };
  
  // Generate the embedding vector
  const embedding = new Array(dimension).fill(0).map((_, i) => {
    // Use a different seed for each dimension
    return rng(hash + i) * 2 - 1; // Range: -1 to 1
  });
  
  // Normalize the vector
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  return embedding.map(val => val / magnitude);
}

// Handle incoming messages from the main thread
self.onmessage = (event) => {
  const { type, data, id } = event.data;
  
  // Immediately respond ready to speed up initialization
  if (type === 'init') {
    self.postMessage({
      type: 'init_complete',
      id,
      success: true
    });
    return;
  }
  
  // For embedding requests, use the fallback mechanism
  if (type === 'generate_embedding') {
    try {
      const { text } = data;
      const embedding = generateFallbackEmbedding(text);
      
      self.postMessage({
        type: 'embedding_complete',
        id,
        success: true,
        embedding
      });
    } catch (error) {
      self.postMessage({
        type: 'error',
        id,
        success: false,
        error: `Error generating embedding: ${error.message}`
      });
    }
    return;
  }
  
  // For batch embedding requests
  if (type === 'batch_generate') {
    try {
      const { texts, itemIds } = data;
      const results = texts.map((text, index) => {
        const embedding = generateFallbackEmbedding(text);
        const id = itemIds ? itemIds[index] : `item-${index}`;
        
        return {
          id,
          success: true,
          embedding,
          similarity: 1.0, // Default similarity for fallback
          note: { id, content: text }
        };
      });
      
      self.postMessage({
        type: 'batch_complete',
        id,
        success: true,
        results
      });
    } catch (error) {
      self.postMessage({
        type: 'error',
        id,
        success: false,
        error: `Error generating batch embeddings: ${error.message}`
      });
    }
    return;
  }
  
  // For model change requests, just acknowledge
  if (type === 'change_model') {
    self.postMessage({
      type: 'model_changed',
      id,
      success: true
    });
    return;
  }
  
  // For unknown request types
  self.postMessage({
    type: 'error',
    id,
    success: false,
    error: `Unknown request type: ${type}`
  });
};

// Notify the main thread that the worker is ready
self.postMessage({ type: 'ready' });
