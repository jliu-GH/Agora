import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface CongressApiBill {
  congress: number;
  latestAction: {
    actionDate: string;
    text: string;
  };
  number: string;
  originChamber: string;
  title: string;
  type: string;
  url: string;
  updateDate: string;
  sponsors?: Array<{
    firstName: string;
    lastName: string;
    fullName: string;
    bioguideId: string;
  }>;
  summary?: {
    text: string;
    updateDate: string;
  };
  actions?: Array<{
    actionDate: string;
    text: string;
    type: string;
    chamber?: string;
  }>;
  subjects?: Array<{
    name: string;
  }>;
}

export class CongressApiClient {
  private apiKey: string;
  private baseUrl = 'https://api.congress.gov/v3';
  private rateLimitDelay = 100; // Congress.gov API allows 5000 requests/hour

  constructor() {
    this.apiKey = process.env.CONGRESS_API_KEY || '';
    if (!this.apiKey) {
      console.warn('⚠️ CONGRESS_API_KEY not set. Get one from: https://api.congress.gov/sign-up/');
    }
  }

  private async makeRequest(endpoint: string): Promise<any> {
    if (!this.apiKey) {
      throw new Error('Congress API key not configured');
    }

    // Use the format that works - add format=json to the endpoint
    const separator = endpoint.includes('?') ? '&' : '?';
    const url = `${this.baseUrl}${endpoint}${separator}format=json`;
    
    await this.rateLimitDelayMethod();
    
    const response = await fetch(url, {
      headers: {
        'X-Api-Key': this.apiKey,
        'User-Agent': 'Political Hackathon Project - Educational Use'
      }
    });

    if (!response.ok) {
      throw new Error(`Congress API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  private async rateLimitDelayMethod(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay));
  }

  async getRecentBills(congress: number = 119, limit: number = 20): Promise<CongressApiBill[]> {
    console.log(`🏛️ Fetching ${limit} recent bills from ${congress}th Congress via official API...`);
    
    try {
      // Get recent bills sorted by update date
      const response = await this.makeRequest(`/bill?limit=${limit}&sort=updateDate+desc`);
      const bills = response.bills || [];

      console.log(`✅ Found ${bills.length} recent bills`);

      // Enhance with detailed information (process a few at a time to avoid rate limits)
      const enhancedBills: CongressApiBill[] = [];
      
      for (const bill of bills.slice(0, Math.min(limit, 50))) { // Allow up to 50 bills
        try {
          const detailed = await this.getBillDetails(bill.congress, bill.type.toLowerCase(), bill.number);
          if (detailed) {
            enhancedBills.push(detailed);
          }
        } catch (error) {
          console.warn(`Could not get details for ${bill.type}${bill.number}:`, error);
          // Use basic bill info as fallback
          enhancedBills.push(bill as CongressApiBill);
        }
      }

      return enhancedBills;
    } catch (error) {
      console.error('Error fetching bills from Congress API:', error);
      return [];
    }
  }

  async getBillDetails(congress: number, type: string, number: string): Promise<CongressApiBill | null> {
    try {
      // Get basic bill info
      const billResponse = await this.makeRequest(`/bill/${congress}/${type}/${number}`);
      const bill = billResponse.bill;

      if (!bill) return null;

      // Get additional details in parallel
      const [actionsResponse, summaryResponse, subjectsResponse] = await Promise.all([
        this.makeRequest(`/bill/${congress}/${type}/${number}/actions`).catch(() => ({ actions: [] })),
        this.makeRequest(`/bill/${congress}/${type}/${number}/summaries`).catch(() => ({ summaries: [] })),
        this.makeRequest(`/bill/${congress}/${type}/${number}/subjects`).catch(() => ({ subjects: [] }))
      ]);

      return {
        ...bill,
        actions: actionsResponse.actions || [],
        summary: summaryResponse.summaries?.[0] || null,
        subjects: subjectsResponse.subjects || []
      };
    } catch (error) {
      console.error(`Error fetching details for ${type}${number}:`, error);
      return null;
    }
  }

  convertToPrismaFormat(apiBill: CongressApiBill): any {
    const billId = `${apiBill.type.toLowerCase()}${apiBill.number}-${apiBill.congress}`;
    
    return {
      id: billId,
      congress: apiBill.congress,
      chamber: apiBill.originChamber.toLowerCase(),
      title: apiBill.title,
      summary: apiBill.summary?.text || null,
      status: apiBill.latestAction?.text || 'Status unknown',
      createdAt: new Date(apiBill.latestAction?.actionDate || Date.now()),
      updatedAt: new Date(apiBill.updateDate),
      actions: {
        create: (apiBill.actions || []).map(action => ({
          date: new Date(action.actionDate),
          stage: this.determineStage(action.text),
          text: action.text,
          sourceUrl: apiBill.url,
          chamber: action.chamber?.toLowerCase() || apiBill.originChamber.toLowerCase(),
        }))
      }
    };
  }

  private determineStage(actionText: string): string {
    const text = actionText.toLowerCase();
    
    if (text.includes('became public law')) return 'enacted';
    if (text.includes('passed house') && text.includes('passed senate')) return 'enrolled';
    if (text.includes('passed')) return 'floor';
    if (text.includes('committee')) return 'committee';
    if (text.includes('introduced')) return 'introduced';
    
    return 'other';
  }
}

export async function fetchBillsFromCongressAPI(limit: number = 20): Promise<any[]> {
  const client = new CongressApiClient();
  
  try {
    const apiBills = await client.getRecentBills(119, limit);
    
    const prismaBills = apiBills.map(bill => client.convertToPrismaFormat(bill));
    
    console.log(`✅ Successfully fetched ${prismaBills.length} bills from Congress.gov API`);
    return prismaBills;
  } catch (error) {
    console.error('Error in fetchBillsFromCongressAPI:', error);
    return [];
  }
}
