import { PrismaClient } from '@prisma/client';
import { RagResult } from '@/types/citations';

const prisma = new PrismaClient();

export async function retrieve(query: string, k: number = 8): Promise<RagResult[]> {
  try {
    // Simple text search for SQLite (no full-text search available)
    const searchResults = await prisma.chunk.findMany({
      where: {
        text: {
          contains: query
        }
      },
      include: {
        Document: true
      },
      take: k * 2
    });

    // Enhanced scoring that prioritizes official sources
    const results: RagResult[] = searchResults.map((chunk) => {
      const text = chunk.text.toLowerCase();
      const queryLower = query.toLowerCase();
      const matches = (text.match(new RegExp(queryLower, 'g')) || []).length;
      let score = matches / text.length * 100; // Base frequency score
      
      // Boost score for official sources
      const sourceUrl = chunk.sourceUrl.toLowerCase();
      const publisher = chunk.Document.publisher.toLowerCase();
      
      if (sourceUrl.includes('govtrack.us') || publisher.includes('govtrack')) {
        score *= 1.5; // 50% boost for GovTrack
      }
      if (sourceUrl.includes('congress.gov') || publisher.includes('congress')) {
        score *= 1.4; // 40% boost for Congress.gov
      }
      if (sourceUrl.includes('house.gov') || sourceUrl.includes('senate.gov')) {
        score *= 1.3; // 30% boost for official government sites
      }
      if (sourceUrl.includes('voteview.com') || publisher.includes('voteview')) {
        score *= 1.2; // 20% boost for Voteview (academic source)
      }
      if (sourceUrl.includes('crsreports') || publisher.includes('congressional research service')) {
        score *= 1.1; // 10% boost for CRS reports
      }

      return {
        text: chunk.text,
        sourceUrl: chunk.sourceUrl,
        publisher: chunk.Document.publisher,
        retrievedAt: chunk.Document.retrievedAt.toISOString(),
        asOf: chunk.Document.asOf?.toISOString(),
        spanStart: chunk.spanStart,
        spanEnd: chunk.spanEnd,
        score: score,
      };
    });

    // Sort by score and return top k
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, k);
  } catch (error) {
    console.error('Error in retrieve:', error);
    return [];
  }
}

export async function chunkDocument(
  doc: { id: string; text: string; url: string; publisher: string },
  targetTokens: number = 500,
  overlap: number = 60
): Promise<void> {
  // Simple token-based chunking (approximate)
  const words = doc.text.split(/\s+/);
  const chunkSize = targetTokens;
  const overlapSize = overlap;

  for (let i = 0; i < words.length; i += chunkSize - overlapSize) {
    const chunkWords = words.slice(i, i + chunkSize);
    const chunkText = chunkWords.join(' ');
    const spanStart = doc.text.indexOf(chunkWords[0]);
    const spanEnd = spanStart + chunkText.length;

    // Generate embedding (placeholder - would use OpenAI in production)
    const embedding = JSON.stringify(new Array(1536).fill(0).map(() => Math.random()));

    await prisma.chunk.create({
      data: {
        id: `${doc.id}-chunk-${i}`,
        documentId: doc.id,
        text: chunkText,
        spanStart,
        spanEnd,
        embedding,
        sourceUrl: doc.url,
      },
    });
  }
}
