import { PrismaClient } from '@prisma/client';
import EmbeddingService from './embeddings';

const prisma = new PrismaClient();

export interface RetrievedContext {
  text: string;
  sourceUrl: string;
  sourceTitle?: string;
  similarity: number;
  politicianId?: string;
  documentType?: string;
  date?: Date;
}

export interface ContextQuery {
  query: string;
  politicianIds: string[];
  documentTypes?: string[];
  topK?: number;
  similarityThreshold?: number;
  dateRange?: {
    from?: Date;
    to?: Date;
  };
}

export class RAGSystem {
  private embeddingService: EmbeddingService;

  constructor() {
    this.embeddingService = new EmbeddingService();
  }

  /**
   * Retrieve relevant context chunks for a query about specific politicians
   */
  async retrieveContext(query: ContextQuery): Promise<RetrievedContext[]> {
    try {
      // Generate embedding for the query
      console.log(`🔍 Generating embedding for query: "${query.query.substring(0, 100)}..."`);
      const queryEmbedding = await this.embeddingService.generateEmbedding(query.query);

      // Build database query filters
      const whereClause: any = {
        politicianId: {
          in: query.politicianIds
        }
      };

      if (query.documentTypes && query.documentTypes.length > 0) {
        whereClause.documentType = {
          in: query.documentTypes
        };
      }

      if (query.dateRange) {
        whereClause.date = {};
        if (query.dateRange.from) {
          whereClause.date.gte = query.dateRange.from;
        }
        if (query.dateRange.to) {
          whereClause.date.lte = query.dateRange.to;
        }
      }

      // Retrieve chunks from database
      console.log(`📊 Retrieving chunks for politicians: ${query.politicianIds.join(', ')}`);
      
      // Get chunks through document relationship since politicianId might not be available
      const chunks = await prisma.chunk.findMany({
        where: {
          Document: {
            politicianId: {
              in: query.politicianIds
            }
          }
        },
        select: {
          text: true,
          embedding: true,
          sourceUrl: true,
          sourceTitle: true,
          Document: {
            select: {
              politicianId: true,
              documentType: true,
              date: true
            }
          }
        },
        take: 100, // Limit to avoid performance issues
        orderBy: {
          Document: {
            date: 'desc'
          }
        }
      });

      if (chunks.length === 0) {
        console.warn(`⚠️ No chunks found for politicians: ${query.politicianIds.join(', ')}`);
        return [];
      }

      console.log(`📝 Found ${chunks.length} chunks, calculating similarities...`);

      // Transform chunks to the format expected by similarity calculation
      const transformedChunks = chunks.map(chunk => ({
        text: chunk.text,
        embedding: chunk.embedding,
        sourceUrl: chunk.sourceUrl,
        sourceTitle: chunk.sourceTitle,
        politicianId: chunk.Document?.politicianId || null
      }));

      // Calculate similarities and return top matches
      const topK = query.topK || 5;
      const threshold = query.similarityThreshold || 0.3; // Lowered to 0.3 for better matching with biographical content

      const similarChunks = EmbeddingService.findSimilarChunks(
        queryEmbedding,
        transformedChunks,
        topK,
        threshold
      );

      // Add additional metadata
      const contextWithMetadata: RetrievedContext[] = similarChunks.map(chunk => {
        const originalChunk = chunks.find(c => c.text === chunk.text);
        return {
          ...chunk,
          documentType: originalChunk?.Document?.documentType,
          date: originalChunk?.Document?.date
        };
      });

      console.log(`✅ Retrieved ${contextWithMetadata.length} relevant context chunks`);
      return contextWithMetadata;

    } catch (error) {
      console.error('Error retrieving context:', error);
      throw new Error(`Failed to retrieve context: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create a formatted context string for AI prompts
   */
  formatContextForPrompt(contexts: RetrievedContext[], politicianId?: string): string {
    if (contexts.length === 0) {
      return 'No relevant context found in official records.';
    }

    const filteredContexts = politicianId 
      ? contexts.filter(ctx => ctx.politicianId === politicianId)
      : contexts;

    if (filteredContexts.length === 0) {
      return `No relevant context found in official records for the specified politician.`;
    }

    const formattedContext = filteredContexts
      .map((ctx, index) => {
        const dateStr = ctx.date ? ` (${ctx.date.toLocaleDateString()})` : '';
        const typeStr = ctx.documentType ? ` [${ctx.documentType}]` : '';
        return `[${index + 1}] ${ctx.text}${dateStr}${typeStr}
Source: ${ctx.sourceTitle || ctx.sourceUrl}`;
      })
      .join('\n\n');

    return formattedContext;
  }

  /**
   * Generate citations from context
   */
  generateCitations(contexts: RetrievedContext[]): string[] {
    return contexts.map((ctx, index) => {
      const title = ctx.sourceTitle || 'Official Document';
      const url = ctx.sourceUrl;
      const dateStr = ctx.date ? ` (${ctx.date.toLocaleDateString()})` : '';
      return `[${index + 1}] ${title}${dateStr} - ${url}`;
    });
  }

  /**
   * Check if we have sufficient context to answer a query
   */
  hasSufficientContext(contexts: RetrievedContext[], minimumChunks: number = 1): boolean {
    return contexts.length >= minimumChunks && 
           contexts.some(ctx => ctx.similarity > 0.3);
  }

  /**
   * Get politician information for context
   */
  async getPoliticianInfo(politicianIds: string[]): Promise<Array<{id: string, name: string, party: string, state: string, chamber: string}>> {
    const politicians = await prisma.member.findMany({
      where: {
        id: {
          in: politicianIds
        }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        party: true,
        state: true,
        chamber: true
      }
    });

    return politicians.map(p => ({
      id: p.id,
      name: `${p.firstName} ${p.lastName}`,
      party: p.party,
      state: p.state,
      chamber: p.chamber
    }));
  }
}

export default RAGSystem;
