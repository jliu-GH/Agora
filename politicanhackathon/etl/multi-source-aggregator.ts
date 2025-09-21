import { PrismaClient } from '@prisma/client';
import { fetchBillsFromCongressAPI } from './congress-api';
import { fetchBillsFromProPublicaAPI } from './propublica-api';

const prisma = new PrismaClient();

export interface AggregatedBillSource {
  source: 'congress.gov' | 'propublica' | 'web_scraping';
  count: number;
  success: boolean;
  error?: string;
}

export class MultiSourceBillAggregator {
  private sources: AggregatedBillSource[] = [];

  async fetchFromAllSources(limit: number = 50): Promise<any[]> {
    console.log('🔄 Starting multi-source bill aggregation...');
    const allBills: any[] = [];

    // Source 1: Official Congress.gov API (Priority 1)
    try {
      console.log('\n📡 Source 1: Congress.gov Official API...');
      const congressBills = await fetchBillsFromCongressAPI(Math.ceil(limit * 0.6)); // 60% from official API
      allBills.push(...congressBills);
      
      this.sources.push({
        source: 'congress.gov',
        count: congressBills.length,
        success: true
      });
      
      console.log(`✅ Congress.gov API: ${congressBills.length} bills`);
    } catch (error) {
      console.error('❌ Congress.gov API failed:', error);
      this.sources.push({
        source: 'congress.gov',
        count: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Source 2: ProPublica API (Priority 2)
    try {
      console.log('\n📰 Source 2: ProPublica Congress API...');
      const ppBills = await fetchBillsFromProPublicaAPI(Math.ceil(limit * 0.3)); // 30% from ProPublica
      
      // Deduplicate against existing bills
      const existingIds = new Set(allBills.map(bill => bill.id));
      const uniquePpBills = ppBills.filter(bill => !existingIds.has(bill.id));
      
      allBills.push(...uniquePpBills);
      
      this.sources.push({
        source: 'propublica',
        count: uniquePpBills.length,
        success: true
      });
      
      console.log(`✅ ProPublica API: ${uniquePpBills.length} bills (${ppBills.length - uniquePpBills.length} duplicates filtered)`);
    } catch (error) {
      console.error('❌ ProPublica API failed:', error);
      this.sources.push({
        source: 'propublica',
        count: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Source 3: Web Scraping (Fallback)
    if (allBills.length < limit * 0.5) { // Only if we have less than 50% coverage
      try {
        console.log('\n🕷️ Source 3: Web Scraping (Fallback)...');
        // Import dynamically to avoid issues if scraping modules have problems
        const { scrapeBillsFromCongress } = await import('./congress-bills');
        const scrapedBills = await scrapeBillsFromCongress(limit - allBills.length);
        
        // Convert scraped bills to Prisma format
        const convertedBills = scrapedBills.map(bill => ({
          id: bill.id,
          congress: bill.congress,
          chamber: bill.chamber,
          title: bill.title,
          summary: bill.summary,
          status: bill.status,
          createdAt: bill.introducedDate || new Date(),
          updatedAt: new Date(),
          actions: {
            create: bill.actions.map(action => ({
              date: action.date,
              stage: action.stage,
              text: action.text,
              sourceUrl: bill.sourceUrl,
              chamber: action.chamber || bill.chamber,
            }))
          }
        }));

        // Deduplicate against existing bills
        const existingIds = new Set(allBills.map(bill => bill.id));
        const uniqueScrapedBills = convertedBills.filter(bill => !existingIds.has(bill.id));
        
        allBills.push(...uniqueScrapedBills);
        
        this.sources.push({
          source: 'web_scraping',
          count: uniqueScrapedBills.length,
          success: true
        });
        
        console.log(`✅ Web Scraping: ${uniqueScrapedBills.length} bills`);
      } catch (error) {
        console.error('❌ Web Scraping failed:', error);
        this.sources.push({
          source: 'web_scraping',
          count: 0,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Sort by most recent and limit
    const sortedBills = allBills
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, limit);

    console.log('\n📊 Aggregation Summary:');
    this.sources.forEach(source => {
      const status = source.success ? '✅' : '❌';
      console.log(`   ${status} ${source.source}: ${source.count} bills ${source.error ? `(${source.error})` : ''}`);
    });
    console.log(`\n🎯 Total unique bills: ${sortedBills.length}`);

    return sortedBills;
  }

  async saveBillsToDatabase(bills: any[]): Promise<void> {
    console.log(`\n💾 Saving ${bills.length} bills to database...`);
    
    for (const bill of bills) {
      try {
        await prisma.bill.upsert({
          where: { id: bill.id },
          update: {
            title: bill.title,
            summary: bill.summary,
            status: bill.status,
            updatedAt: new Date(),
            actions: {
              deleteMany: {},
              create: bill.actions?.create || []
            }
          },
          create: bill
        });
        console.log(`   ✅ ${bill.id}: ${bill.title.substring(0, 60)}...`);
      } catch (error) {
        console.error(`   ❌ ${bill.id}: ${error}`);
      }
    }
  }

  getSourcesSummary(): AggregatedBillSource[] {
    return this.sources;
  }
}

export async function aggregateBillsFromAllSources(limit: number = 50): Promise<{bills: any[], sources: AggregatedBillSource[]}> {
  const aggregator = new MultiSourceBillAggregator();
  
  try {
    const bills = await aggregator.fetchFromAllSources(limit);
    await aggregator.saveBillsToDatabase(bills);
    
    return {
      bills,
      sources: aggregator.getSourcesSummary()
    };
  } catch (error) {
    console.error('Error in multi-source aggregation:', error);
    return {
      bills: [],
      sources: aggregator.getSourcesSummary()
    };
  }
}


