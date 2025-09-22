import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface ProPublicaBill {
  bill_id: string;
  bill_type: string;
  number: string;
  bill_uri: string;
  title: string;
  sponsor_title: string;
  sponsor_id: string;
  sponsor_name: string;
  sponsor_state: string;
  sponsor_party: string;
  sponsor_uri: string;
  gpo_pdf_uri: string;
  congressdotgov_url: string;
  govtrack_url: string;
  introduced_date: string;
  active: boolean;
  house_passage: string;
  senate_passage: string;
  enacted: string;
  vetoed: string;
  cosponsors: number;
  cosponsors_by_party: {
    R: number;
    D: number;
    I: number;
  };
  committees: string;
  committee_codes: string[];
  subcommittee_codes: string[];
  primary_subject: string;
  summary: string;
  summary_short: string;
  latest_major_action_date: string;
  latest_major_action: string;
}

export class ProPublicaApiClient {
  private apiKey: string;
  private baseUrl = 'https://api.propublica.org/congress/v1';
  private rateLimitDelay = 200; // ProPublica allows ~5 requests/second

  constructor() {
    this.apiKey = process.env.PROPUBLICA_API_KEY || '';
    if (!this.apiKey) {
      console.warn('⚠️ PROPUBLICA_API_KEY not set. Get one from: https://www.propublica.org/datastore/api/propublica-congress-api');
    }
  }

  private async makeRequest(endpoint: string): Promise<any> {
    if (!this.apiKey) {
      throw new Error('ProPublica API key not configured');
    }

    const url = `${this.baseUrl}${endpoint}`;
    
    await this.rateLimitDelayMethod();
    
    const response = await fetch(url, {
      headers: {
        'X-API-Key': this.apiKey,
        'User-Agent': 'Political Hackathon Project - Educational Use'
      }
    });

    if (!response.ok) {
      throw new Error(`ProPublica API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.results?.[0] || data.results || data;
  }

  private async rateLimitDelayMethod(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay));
  }

  async getRecentBills(congress: number = 119, chamber: 'house' | 'senate' | 'both' = 'both'): Promise<ProPublicaBill[]> {
    console.log(`📰 Fetching recent bills from ${congress}th Congress via ProPublica API...`);
    
    try {
      const bills: ProPublicaBill[] = [];

      if (chamber === 'both' || chamber === 'house') {
        const houseResponse = await this.makeRequest(`/${congress}/house/bills/introduced.json`);
        bills.push(...(houseResponse.bills || []));
      }

      if (chamber === 'both' || chamber === 'senate') {
        const senateResponse = await this.makeRequest(`/${congress}/senate/bills/introduced.json`);
        bills.push(...(senateResponse.bills || []));
      }

      // Sort by latest action date
      return bills.sort((a, b) => 
        new Date(b.latest_major_action_date).getTime() - new Date(a.latest_major_action_date).getTime()
      );
    } catch (error) {
      console.error('Error fetching bills from ProPublica API:', error);
      return [];
    }
  }

  async getBillDetails(congress: number, billId: string): Promise<ProPublicaBill | null> {
    try {
      const response = await this.makeRequest(`/${congress}/bills/${billId}.json`);
      return response.bill || null;
    } catch (error) {
      console.error(`Error fetching bill details for ${billId}:`, error);
      return null;
    }
  }

  convertToPrismaFormat(ppBill: ProPublicaBill): any {
    const billId = `${ppBill.bill_type.toLowerCase()}${ppBill.number}-${ppBill.bill_id.split('-')[0]}`;
    
    return {
      id: billId,
      congress: parseInt(ppBill.bill_id.split('-')[0]),
      chamber: ppBill.bill_type.startsWith('s') ? 'senate' : 'house',
      title: ppBill.title,
      summary: ppBill.summary || ppBill.summary_short || null,
      status: ppBill.latest_major_action || 'Status unknown',
      createdAt: new Date(ppBill.introduced_date),
      updatedAt: new Date(ppBill.latest_major_action_date),
      actions: {
        create: [
          {
            date: new Date(ppBill.introduced_date),
            stage: 'introduced',
            text: 'Introduced in ' + (ppBill.bill_type.startsWith('s') ? 'Senate' : 'House'),
            sourceUrl: ppBill.congressdotgov_url,
            chamber: ppBill.bill_type.startsWith('s') ? 'senate' : 'house',
          },
          ...(ppBill.latest_major_action_date !== ppBill.introduced_date ? [{
            date: new Date(ppBill.latest_major_action_date),
            stage: this.determineStage(ppBill.latest_major_action),
            text: ppBill.latest_major_action,
            sourceUrl: ppBill.congressdotgov_url,
            chamber: ppBill.bill_type.startsWith('s') ? 'senate' : 'house',
          }] : [])
        ]
      }
    };
  }

  private determineStage(actionText: string): string {
    const text = actionText.toLowerCase();
    
    if (text.includes('became public law') || text.includes('enacted')) return 'enacted';
    if (text.includes('passed house') && text.includes('passed senate')) return 'enrolled';
    if (text.includes('passed')) return 'floor';
    if (text.includes('committee')) return 'committee';
    if (text.includes('introduced')) return 'introduced';
    
    return 'other';
  }
}

export async function fetchBillsFromProPublicaAPI(limit: number = 20): Promise<any[]> {
  const client = new ProPublicaApiClient();
  
  try {
    const apiBills = await client.getRecentBills(119, 'both');
    
    const prismaBills = apiBills
      .slice(0, limit)
      .map(bill => client.convertToPrismaFormat(bill));
    
    console.log(`✅ Successfully fetched ${prismaBills.length} bills from ProPublica API`);
    return prismaBills;
  } catch (error) {
    console.error('Error in fetchBillsFromProPublicaAPI:', error);
    return [];
  }
}


