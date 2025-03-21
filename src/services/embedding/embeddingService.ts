/**
 * Embedding Service
 * 
 * High-level service for generating and managing embeddings.
 * It handles text chunking, embedding generation, and similarity calculations.
 */

import embeddingWorkerService from './embeddingWorkerService';
import databaseService from '../database/databaseService';
import { STORE_NAMES } from '../database/databaseService';
import { Note, IndexedFile } from '@/lib/types';

// Interface for text chunks
interface TextChunk {
  text: string;
  start: number;
  end: number;
}

// Interface for embedding objects stored in the database
interface Embedding {
  id: string;
  sourceId: string;
  sourceType: 'note' | 'file';
  chunkId: string;
  vector: number[];
  model: string;
  createdAt: Date;
  metadata: {
    textChunk: string;
    startPosition: number;
    endPosition: number;
  };
}

// Interface for similarity results
export interface SimilarityResult {
  id: string;
  title: string;
  type: 'note' | 'file';
  similarity: number;
  chunkText?: string;
  chunkId?: string;
}

class EmbeddingService {
  private modelName: string = 'Xenova/all-MiniLM-L6-v2';
  private maxSequenceLength: number = 512;
  private chunkOverlap: number = 50;
  private isInitialized: boolean = false;
  
  /**
   * Initialize the embedding service
   */
  public async initialize(
    modelName?: string,
    progressCallback?: (update: any) => void
  ): Promise<boolean> {
    try {
      if (this.isInitialized) {
        return true;
      }
      
      // Set model name if provided
      if (modelName) {
        this.modelName = modelName;
      }
      
      // Initialize the worker service
      const initialized = await embeddingWorkerService.initialize(
        this.modelName,
        progressCallback
      );
      
      this.isInitialized = initialized;
      return initialized;
    } catch (error) {
      console.error('Error initializing embedding service:', error);
      return false;
    }
  }
  
  /**
   * Generate embeddings for a note
   */
  public async generateEmbeddingsForNote(
    noteId: string,
    progressCallback?: (progress: number) => void
  ): Promise<boolean> {
    try {
      // Ensure service is initialized
      if (!this.isInitialized) {
        await this.initialize();
      }
      
      // Get the note
      const note = await databaseService.get<Note>(STORE_NAMES.NOTES, noteId);
      if (!note) {
        throw new Error(`Note with ID ${noteId} not found`);
      }
      
      // Delete existing embeddings for this note
      await this.deleteEmbeddingsForSource(noteId, 'note');
      
      // Split the note content into chunks
      const chunks = this.chunkText(note.content);
      let processedChunks = 0;
      
      // Generate embeddings for each chunk
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        
        // Generate embedding
        const vector = await embeddingWorkerService.generateEmbedding(chunk.text);
        
        // Create embedding object
        const embedding: Embedding = {
          id: `emb-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
          sourceId: noteId,
          sourceType: 'note',
          chunkId: `${noteId}-chunk-${i}`,
          vector,
          model: this.modelName,
          createdAt: new Date(),
          metadata: {
            textChunk: chunk.text,
            startPosition: chunk.start,
            endPosition: chunk.end
          }
        };
        
        // Store embedding in database
        await databaseService.add(STORE_NAMES.EMBEDDINGS, embedding);
        
        // Update progress
        processedChunks++;
        if (progressCallback) {
          progressCallback(processedChunks / chunks.length);
        }
      }
      
      return true;
    } catch (error) {
      console.error(`Error generating embeddings for note ${noteId}:`, error);
      return false;
    }
  }
  
  /**
   * Generate embeddings for a file
   */
  public async generateEmbeddingsForFile(
    fileId: string,
    progressCallback?: (progress: number) => void
  ): Promise<boolean> {
    try {
      // Ensure service is initialized
      if (!this.isInitialized) {
        await this.initialize();
      }
      
      // Get the file
      const file = await databaseService.get<IndexedFile>(STORE_NAMES.FILES, fileId);
      if (!file) {
        throw new Error(`File with ID ${fileId} not found`);
      }
      
      // Skip if file has no content
      if (!file.content) {
        return false;
      }
      
      // Delete existing embeddings for this file
      await this.deleteEmbeddingsForSource(fileId, 'file');
      
      // Split the file content into chunks
      const chunks = this.chunkText(file.content);
      let processedChunks = 0;
      
      // Generate embeddings for each chunk
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        
        // Generate embedding
        const vector = await embeddingWorkerService.generateEmbedding(chunk.text);
        
        // Create embedding object
        const embedding: Embedding = {
          id: `emb-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
          sourceId: fileId,
          sourceType: 'file',
          chunkId: `${fileId}-chunk-${i}`,
          vector,
          model: this.modelName,
          createdAt: new Date(),
          metadata: {
            textChunk: chunk.text,
            startPosition: chunk.start,
            endPosition: chunk.end
          }
        };
        
        // Store embedding in database
        await databaseService.add(STORE_NAMES.EMBEDDINGS, embedding);
        
        // Update progress
        processedChunks++;
        if (progressCallback) {
          progressCallback(processedChunks / chunks.length);
        }
      }
      
      return true;
    } catch (error) {
      console.error(`Error generating embeddings for file ${fileId}:`, error);
      return false;
    }
  }
  
  /**
   * Generate embeddings for a batch of notes
   */
  public async generateEmbeddingsForNotes(
    noteIds: string[],
    progressCallback?: (progress: number) => void
  ): Promise<{ success: boolean; processed: number; failed: number }> {
    let processed = 0;
    let failed = 0;
    
    for (let i = 0; i < noteIds.length; i++) {
      try {
        const success = await this.generateEmbeddingsForNote(noteIds[i]);
        
        if (success) {
          processed++;
        } else {
          failed++;
        }
        
        // Update overall progress
        if (progressCallback) {
          progressCallback((i + 1) / noteIds.length);
        }
      } catch (error) {
        console.error(`Error generating embeddings for note ${noteIds[i]}:`, error);
        failed++;
      }
    }
    
    return {
      success: failed === 0,
      processed,
      failed
    };
  }
  
  /**
   * Delete embeddings for a source (note or file)
   */
  public async deleteEmbeddingsForSource(
    sourceId: string,
    sourceType: 'note' | 'file'
  ): Promise<boolean> {
    try {
      // Get all embeddings for the source
      const allEmbeddings = await databaseService.getAll(STORE_NAMES.EMBEDDINGS);
      const sourceEmbeddings = allEmbeddings.filter(
        (emb: Embedding) => emb.sourceId === sourceId && emb.sourceType === sourceType
      );
      
      // Delete each embedding
      for (const embedding of sourceEmbeddings) {
        await databaseService.delete(STORE_NAMES.EMBEDDINGS, embedding.id);
      }
      
      return true;
    } catch (error) {
      console.error(`Error deleting embeddings for ${sourceType} ${sourceId}:`, error);
      return false;
    }
  }
  
  /**
   * Find similar content for a given source
   */
  public async findSimilarContent(
    sourceId: string,
    similarityThreshold: number = 0.7,
    limit: number = 5
  ): Promise<SimilarityResult[]> {
    try {
      // Ensure service is initialized
      if (!this.isInitialized) {
        await this.initialize();
      }
      
      // Get all embeddings
      const allEmbeddings = await databaseService.getAll<Embedding>(STORE_NAMES.EMBEDDINGS);
      
      // Get source embeddings
      const sourceEmbeddings = allEmbeddings.filter(emb => emb.sourceId === sourceId);
      
      if (sourceEmbeddings.length === 0) {
        return [];
      }
      
      // Get target embeddings (excluding source)
      const targetEmbeddings = allEmbeddings.filter(emb => emb.sourceId !== sourceId);
      
      // Calculate similarities
      const similarities: Record<string, { sum: number; count: number; chunks: Set<string> }> = {};
      
      for (const sourceEmb of sourceEmbeddings) {
        for (const targetEmb of targetEmbeddings) {
          // Calculate cosine similarity
          const similarity = this.calculateCosineSimilarity(sourceEmb.vector, targetEmb.vector);
          
          // Skip if below threshold
          if (similarity < similarityThreshold) {
            continue;
          }
          
          // Update similarities record
          if (!similarities[targetEmb.sourceId]) {
            similarities[targetEmb.sourceId] = { 
              sum: 0, 
              count: 0,
              chunks: new Set()
            };
          }
          
          similarities[targetEmb.sourceId].sum += similarity;
          similarities[targetEmb.sourceId].count++;
          similarities[targetEmb.sourceId].chunks.add(targetEmb.chunkId);
        }
      }
      
      // Get notes and files information
      const notes = await databaseService.getAll<Note>(STORE_NAMES.NOTES);
      const files = await databaseService.getAll<IndexedFile>(STORE_NAMES.FILES);
      
      // Create results array
      const results: SimilarityResult[] = [];
      
      for (const [id, { sum, count, chunks }] of Object.entries(similarities)) {
        // Calculate average similarity
        const avgSimilarity = sum / count;
        
        // Find source information
        const note = notes.find(n => n.id === id);
        const file = files.find(f => f.id === id);
        
        if (note) {
          results.push({
            id,
            title: note.title,
            type: 'note',
            similarity: avgSimilarity
          });
        } else if (file) {
          results.push({
            id,
            title: file.filename,
            type: 'file',
            similarity: avgSimilarity
          });
        }
      }
      
      // Sort by similarity (descending) and limit results
      return results
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);
    } catch (error) {
      console.error(`Error finding similar content for ${sourceId}:`, error);
      return [];
    }
  }
  
  /**
   * Perform semantic search
   */
  public async semanticSearch(
    query: string,
    similarityThreshold: number = 0.6,
    limit: number = 10
  ): Promise<SimilarityResult[]> {
    try {
      // Ensure service is initialized
      if (!this.isInitialized) {
        await this.initialize();
      }
      
      // Generate embedding for query
      const queryEmbedding = await embeddingWorkerService.generateEmbedding(query);
      
      // Get all embeddings
      const allEmbeddings = await databaseService.getAll<Embedding>(STORE_NAMES.EMBEDDINGS);
      
      // Calculate similarity for each embedding
      const chunkSimilarities: {
        sourceId: string;
        sourceType: 'note' | 'file';
        chunkId: string;
        similarity: number;
        textChunk: string;
      }[] = [];
      
      for (const embedding of allEmbeddings) {
        // Calculate cosine similarity
        const similarity = this.calculateCosineSimilarity(queryEmbedding, embedding.vector);
        
        // Skip if below threshold
        if (similarity < similarityThreshold) {
          continue;
        }
        
        chunkSimilarities.push({
          sourceId: embedding.sourceId,
          sourceType: embedding.sourceType,
          chunkId: embedding.chunkId,
          similarity,
          textChunk: embedding.metadata.textChunk
        });
      }
      
      // Sort by similarity (descending)
      chunkSimilarities.sort((a, b) => b.similarity - a.similarity);
      
      // Get unique source IDs, preserving order
      const uniqueSourceIds = Array.from(
        new Set(chunkSimilarities.map(item => item.sourceId))
      );
      
      // Get notes and files information
      const notes = await databaseService.getAll<Note>(STORE_NAMES.NOTES);
      const files = await databaseService.getAll<IndexedFile>(STORE_NAMES.FILES);
      
      // Create results array with best chunk for each source
      const results: SimilarityResult[] = [];
      
      for (const sourceId of uniqueSourceIds) {
        // Get chunks for this source
        const sourceChunks = chunkSimilarities.filter(item => item.sourceId === sourceId);
        
        if (sourceChunks.length === 0) {
          continue;
        }
        
        // Get best chunk
        const bestChunk = sourceChunks[0];
        
        // Find source information
        if (bestChunk.sourceType === 'note') {
          const note = notes.find(n => n.id === sourceId);
          if (note) {
            results.push({
              id: sourceId,
              title: note.title,
              type: 'note',
              similarity: bestChunk.similarity,
              chunkText: bestChunk.textChunk,
              chunkId: bestChunk.chunkId
            });
          }
        } else {
          const file = files.find(f => f.id === sourceId);
          if (file) {
            results.push({
              id: sourceId,
              title: file.filename,
              type: 'file',
              similarity: bestChunk.similarity,
              chunkText: bestChunk.textChunk,
              chunkId: bestChunk.chunkId
            });
          }
        }
      }
      
      // Limit results
      return results.slice(0, limit);
    } catch (error) {
      console.error(`Error performing semantic search for "${query}":`, error);
      return [];
    }
  }
  
  /**
   * Calculate cosine similarity between two vectors
   */
  private calculateCosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length');
    }
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    const normProduct = Math.sqrt(normA) * Math.sqrt(normB);
    
    // Handle zero vectors
    if (normProduct === 0) {
      return 0;
    }
    
    return dotProduct / normProduct;
  }
  
  /**
   * Chunk text into smaller pieces for embedding
   */
  private chunkText(text: string): TextChunk[] {
    const chunks: TextChunk[] = [];
    
    // Simple chunking by splitting on paragraphs first
    let paragraphs = text.split(/\n\s*\n/);
    
    // For each paragraph, further chunk if necessary
    for (const paragraph of paragraphs) {
      if (paragraph.trim().length === 0) {
        continue;
      }
      
      // If paragraph is short enough, add as a chunk
      if (paragraph.length <= this.maxSequenceLength) {
        const start = text.indexOf(paragraph);
        chunks.push({
          text: paragraph,
          start,
          end: start + paragraph.length
        });
        continue;
      }
      
      // Otherwise, split into sentences
      const sentences = paragraph.split(/(?<=[.!?])\s+/);
      let currentChunk = '';
      let chunkStart = text.indexOf(paragraph);
      
      for (const sentence of sentences) {
        // If adding this sentence would make the chunk too long, store the current chunk
        if (currentChunk.length + sentence.length > this.maxSequenceLength) {
          if (currentChunk.length > 0) {
            chunks.push({
              text: currentChunk,
              start: chunkStart,
              end: chunkStart + currentChunk.length
            });
            
            // Start a new chunk with overlap
            const words = currentChunk.split(/\s+/);
            
            // Calculate how many words to overlap (but not more than the chunk)
            const wordsToOverlap = Math.min(
              Math.ceil(this.chunkOverlap / (currentChunk.length / words.length)),
              words.length
            );
            
            if (wordsToOverlap > 0) {
              const overlapText = words.slice(-wordsToOverlap).join(' ');
              currentChunk = overlapText + ' ';
              chunkStart = text.indexOf(overlapText, chunkStart);
            } else {
              currentChunk = '';
              chunkStart = text.indexOf(sentence, chunkStart + currentChunk.length);
            }
          } else {
            // If the current chunk is empty, force add at least this sentence
            currentChunk = sentence + ' ';
            chunkStart = text.indexOf(sentence, chunkStart);
          }
        } else {
          // Add sentence to current chunk
          currentChunk += sentence + ' ';
        }
      }
      
      // Add the last chunk if it has content
      if (currentChunk.trim().length > 0) {
        chunks.push({
          text: currentChunk.trim(),
          start: chunkStart,
          end: chunkStart + currentChunk.length
        });
      }
    }
    
    return chunks;
  }
}

// Export singleton instance
const embeddingService = new EmbeddingService();
export default embeddingService;
