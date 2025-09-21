import { GoogleGenerativeAI } from '@google/generative-ai';

export class EmbeddingService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is required for embedding service');
    }
    
    this.genAI = new GoogleGenerativeAI(apiKey);
    // Use text-embedding model for embeddings
    this.model = this.genAI.getGenerativeModel({ model: "text-embedding-004" });
  }

  /**
   * Generate embeddings for a text chunk using Gemini's embedding API
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const result = await this.model.embedContent(text);
      const embedding = result.embedding;
      
      if (!embedding || !embedding.values) {
        throw new Error('No embedding values returned from Gemini API');
      }
      
      return embedding.values;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate embeddings for multiple text chunks in batch
   */
  async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];
    
    // Process in smaller batches to avoid rate limits
    const batchSize = 5;
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const batchPromises = batch.map(text => this.generateEmbedding(text));
      
      try {
        const batchResults = await Promise.all(batchPromises);
        embeddings.push(...batchResults);
        
        // Add small delay between batches to respect rate limits
        if (i + batchSize < texts.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.error(`Error processing batch ${i}-${i + batchSize}:`, error);
        throw error;
      }
    }
    
    return embeddings;
  }

  /**
   * Calculate cosine similarity between two embedding vectors
   */
  static cosineSimilarity(vectorA: number[], vectorB: number[]): number {
    if (vectorA.length !== vectorB.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vectorA.length; i++) {
      dotProduct += vectorA[i] * vectorB[i];
      normA += vectorA[i] * vectorA[i];
      normB += vectorB[i] * vectorB[i];
    }

    const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    return similarity;
  }

  /**
   * Convert embedding array to string for SQLite storage
   */
  static embeddingToString(embedding: number[]): string {
    return embedding.join(',');
  }

  /**
   * Convert string back to embedding array from SQLite
   */
  static stringToEmbedding(embeddingString: string): number[] {
    return embeddingString.split(',').map(Number);
  }

  /**
   * Find most similar chunks based on query embedding
   */
  static findSimilarChunks(
    queryEmbedding: number[],
    chunks: Array<{ embedding: string; text: string; sourceUrl: string; sourceTitle?: string; politicianId?: string }>,
    topK: number = 5,
    threshold: number = 0.7
  ): Array<{ text: string; sourceUrl: string; sourceTitle?: string; similarity: number; politicianId?: string }> {
    const similarities = chunks.map(chunk => {
      const chunkEmbedding = this.stringToEmbedding(chunk.embedding);
      const similarity = this.cosineSimilarity(queryEmbedding, chunkEmbedding);
      
      return {
        text: chunk.text,
        sourceUrl: chunk.sourceUrl,
        sourceTitle: chunk.sourceTitle,
        similarity,
        politicianId: chunk.politicianId
      };
    });

    // Filter by threshold and sort by similarity
    return similarities
      .filter(item => item.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }
}

export default EmbeddingService;
