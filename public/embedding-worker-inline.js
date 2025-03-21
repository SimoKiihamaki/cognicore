// Embedding Worker Inline Implementation
// This is a completely self-contained worker that doesn't depend on external resources

// Simple embedding generator using hashing for deterministic outputs
function generateEmbedding(text, dimension = 384) {
  // Create a hash from the text
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Use hash as seed for pseudo-random number generator
  const rng = (seed) => {
    let x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  };
  
  // Generate the embedding
  const embedding = [];
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

// Initialize immediately
self.postMessage({ type: 'ready' });

// Handle messages from main thread
self.onmessage = (event) => {
  const { type, id, data } = event.data;
  
  try {
    // Handle initialization
    if (type === 'init') {
      self.postMessage({
        type: 'init_complete',
        id,
        success: true
      });
      return;
    }
    
    // Handle single embedding request
    if (type === 'generate_embedding') {
      const { text } = data;
      const embedding = generateEmbedding(text);
      
      self.postMessage({
        type: 'embedding_complete',
        id,
        success: true,
        embedding
      });
      return;
    }
    
    // Handle batch embedding request
    if (type === 'batch_generate') {
      const { texts, itemIds } = data;
      const results = [];
      
      // Process each text
      for (let i = 0; i < texts.length; i++) {
        const text = texts[i];
        const itemId = itemIds ? itemIds[i] : `item-${i}`;
        const embedding = generateEmbedding(text);
        
        results.push({
          id: itemId,
          success: true,
          embedding,
          note: { id: itemId, content: text }
        });
        
        // Send progress updates for long batches
        if (texts.length > 5 && i % 5 === 0) {
          self.postMessage({
            type: 'batch_progress',
            status: `Processed ${i + 1} of ${texts.length} texts`
          });
        }
      }
      
      self.postMessage({
        type: 'batch_complete',
        id,
        success: true,
        results
      });
      return;
    }
    
    // Handle model change request
    if (type === 'change_model') {
      self.postMessage({
        type: 'model_changed',
        id,
        success: true
      });
      return;
    }
    
    // Unhandled message type
    self.postMessage({
      type: 'error',
      id,
      success: false,
      error: `Unknown request type: ${type}`
    });
    
  } catch (error) {
    // Handle any errors
    self.postMessage({
      type: 'error',
      id,
      success: false,
      error: error.message || 'Unknown error in embedding worker'
    });
  }
};
