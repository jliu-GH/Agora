import { PrismaClient } from '@prisma/client';
import EmbeddingService from '../src/lib/embeddings';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

interface OfficialDataSource {
  url: string;
  title: string;
  content: string;
  politicianId: string;
  documentType: 'voting_record' | 'bill_sponsorship' | 'press_release' | 'committee_transcript';
  date?: Date;
  metadata?: any;
}

export class RAGDataIngestion {
  private embeddingService: EmbeddingService;

  constructor() {
    this.embeddingService = new EmbeddingService();
  }

  /**
   * Main ingestion pipeline
   */
  async ingestAllData(): Promise<void> {
    console.log('🚀 Starting RAG data ingestion pipeline...');
    
    try {
      // Step 1: Ingest voting records
      console.log('📊 Ingesting voting records...');
      await this.ingestVotingRecords();
      
      // Step 2: Ingest bill sponsorships
      console.log('📋 Ingesting bill sponsorships...');
      await this.ingestBillSponsorships();
      
      // Step 3: Ingest press releases (simulated from existing data)
      console.log('📰 Ingesting press releases...');
      await this.ingestPressReleases();
      
      console.log('✅ RAG data ingestion completed successfully!');
      
    } catch (error) {
      console.error('❌ Error in RAG data ingestion:', error);
      throw error;
    }
  }

  /**
   * Ingest voting records from existing database
   */
  private async ingestVotingRecords(): Promise<void> {
    // Get all members with vote positions
    const membersWithVotes = await prisma.member.findMany({
      include: {
        votePositions: {
          include: {
            RollCall: {
              include: {
                Bill: true
              }
            }
          },
          take: 20 // Limit for performance
        }
      },
      take: 100 // Increased to 100 for more politicians
    });

    for (const member of membersWithVotes) {
      if (member.votePositions.length === 0) continue;

      // Create voting record document
      const votingRecordText = this.generateVotingRecordText(member);
      
      const documentData: OfficialDataSource = {
        url: `https://congress.gov/member/${member.id}/voting-record`,
        title: `Voting Record - ${member.firstName} ${member.lastName}`,
        content: votingRecordText,
        politicianId: member.id,
        documentType: 'voting_record',
        date: new Date(),
        metadata: {
          totalVotes: member.votePositions.length,
          chamber: member.chamber
        }
      };

      await this.processDocument(documentData);
    }
  }

  /**
   * Ingest bill sponsorships from existing database
   */
  private async ingestBillSponsorships(): Promise<void> {
    // Get members with sponsored bills
    const membersWithBills = await prisma.member.findMany({
      include: {
        bills: {
          take: 15 // Limit for performance
        }
      },
      take: 100 // Increased to 100 for more politicians
    });

    for (const member of membersWithBills) {
      if (member.bills.length === 0) continue;

      // Create bill sponsorship document
      const sponsorshipText = this.generateSponsorshipText(member);
      
      const documentData: OfficialDataSource = {
        url: `https://congress.gov/member/${member.id}/sponsored-legislation`,
        title: `Sponsored Legislation - ${member.firstName} ${member.lastName}`,
        content: sponsorshipText,
        politicianId: member.id,
        documentType: 'bill_sponsorship',
        date: new Date(),
        metadata: {
          billsSponsored: member.bills.length,
          chamber: member.chamber
        }
      };

      await this.processDocument(documentData);
    }
  }

  /**
   * Create simulated press releases from member bio data
   */
  private async ingestPressReleases(): Promise<void> {
    const membersWithBio = await prisma.member.findMany({
      where: {
        bio: {
          not: null
        }
      },
      take: 100 // Increased to 100 for more politicians
    });

    for (const member of membersWithBio) {
      if (!member.bio) continue;

      const documentData: OfficialDataSource = {
        url: `https://www.${member.chamber === 'house' ? 'house' : 'senate'}.gov/${member.id}/press-releases`,
        title: `Official Biography - ${member.firstName} ${member.lastName}`,
        content: member.bio,
        politicianId: member.id,
        documentType: 'press_release',
        date: member.updatedAt,
        metadata: {
          source: 'official_biography',
          chamber: member.chamber
        }
      };

      await this.processDocument(documentData);
    }
  }

  /**
   * Process a single document through the RAG pipeline
   */
  private async processDocument(data: OfficialDataSource): Promise<void> {
    try {
      // Create document record
      const document = await prisma.document.create({
        data: {
          id: uuidv4(),
          url: data.url,
          publisher: 'Congress.gov',
          documentType: data.documentType,
          politicianId: data.politicianId,
          title: data.title,
          date: data.date,
          retrievedAt: new Date(),
          text: data.content,
          metadata: data.metadata ? JSON.stringify(data.metadata) : null
        }
      });

      // Chunk the content
      const chunks = this.chunkContent(data.content);
      
      if (chunks.length === 0) {
        console.warn(`⚠️ No chunks generated for document: ${data.title}`);
        return;
      }

      // Generate embeddings for chunks
      console.log(`🔗 Generating embeddings for ${chunks.length} chunks...`);
      const embeddings = await this.embeddingService.generateBatchEmbeddings(chunks);

      // Store chunks with embeddings
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const embedding = embeddings[i];

        await prisma.chunk.create({
          data: {
            id: uuidv4(),
            documentId: document.id,
            politicianId: data.politicianId,
            text: chunk,
            spanStart: i * 500, // Approximate
            spanEnd: (i + 1) * 500,
            embedding: EmbeddingService.embeddingToString(embedding),
            sourceUrl: data.url,
            sourceTitle: data.title,
            documentType: data.documentType,
            date: data.date
          }
        });
      }

      console.log(`✅ Processed document: ${data.title} (${chunks.length} chunks)`);

    } catch (error) {
      console.error(`❌ Error processing document ${data.title}:`, error);
      throw error;
    }
  }

  /**
   * Split content into manageable chunks
   */
  private chunkContent(content: string): string[] {
    const maxChunkSize = 500;
    const chunks: string[] = [];
    
    // Split by sentences first
    const sentences = content.match(/[^\.!?]+[\.!?]+/g) || [content];
    
    let currentChunk = '';
    
    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > maxChunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk += ' ' + sentence;
      }
    }
    
    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks.filter(chunk => chunk.length > 50); // Filter very short chunks
  }

  /**
   * Generate voting record text from member data
   */
  private generateVotingRecordText(member: any): string {
    const votesByBill = member.votePositions.reduce((acc: any, vote: any) => {
      const billTitle = vote.RollCall?.Bill?.title || 'Unknown Bill';
      const billId = vote.RollCall?.Bill?.id || 'unknown';
      
      if (!acc[billId]) {
        acc[billId] = {
          title: billTitle,
          votes: []
        };
      }
      
      acc[billId].votes.push({
        position: vote.position,
        date: vote.RollCall?.date,
        result: vote.RollCall?.result
      });
      
      return acc;
    }, {});

    let votingText = `Official voting record for ${member.firstName} ${member.lastName} (${member.party}-${member.state}):\n\n`;
    
    Object.entries(votesByBill).forEach(([billId, data]: [string, any]) => {
      votingText += `Bill: ${data.title}\n`;
      data.votes.forEach((vote: any) => {
        const dateStr = vote.date ? new Date(vote.date).toLocaleDateString() : 'Unknown Date';
        votingText += `- Voted ${vote.position} on ${dateStr}. Result: ${vote.result}\n`;
      });
      votingText += '\n';
    });

    return votingText;
  }

  /**
   * Generate sponsorship text from member data
   */
  private generateSponsorshipText(member: any): string {
    let sponsorshipText = `Legislative sponsorship record for ${member.firstName} ${member.lastName} (${member.party}-${member.state}):\n\n`;
    
    member.bills.forEach((bill: any) => {
      sponsorshipText += `Sponsored: ${bill.title}\n`;
      sponsorshipText += `Status: ${bill.status}\n`;
      sponsorshipText += `Congress: ${bill.congress}\n`;
      if (bill.summary) {
        sponsorshipText += `Summary: ${bill.summary.substring(0, 200)}...\n`;
      }
      sponsorshipText += '\n';
    });

    return sponsorshipText;
  }
}

export async function main() {
  const ingestion = new RAGDataIngestion();
  
  try {
    await ingestion.ingestAllData();
    
    // Show statistics
    const documentCount = await prisma.document.count();
    const chunkCount = await prisma.chunk.count();
    
    console.log('\n📊 INGESTION STATISTICS:');
    console.log('========================');
    console.log(`Documents created: ${documentCount}`);
    console.log(`Chunks created: ${chunkCount}`);
    console.log('✅ RAG system ready for use!');
    
  } catch (error) {
    console.error('❌ Ingestion failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}
