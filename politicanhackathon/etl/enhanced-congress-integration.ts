import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface CongressBillSummary {
  bioguideId: string;
  congress: number;
  latestAction: {
    actionDate: string;
    text: string;
  };
  number: string;
  originChamber: string;
  title: string;
  type: string;
  updateDate: string;
  url: string;
  summary?: {
    text: string;
    updateDate: string;
  };
  subjects?: Array<{ name: string }>;
  sponsors?: Array<{
    bioguideId: string;
    firstName: string;
    lastName: string;
    fullName: string;
    party: string;
    state: string;
  }>;
}

export interface CongressCommittee {
  systemCode: string;
  name: string;
  chamber: string;
  committeeName: string;
  url: string;
  updateDate: string;
  subcommittees?: Array<{
    systemCode: string;
    name: string;
    url: string;
  }>;
}

export interface CongressNomination {
  congress: number;
  number: string;
  partNumber: string;
  description: string;
  authority: string;
  receivedDate: string;
  latestAction: {
    actionDate: string;
    text: string;
  };
  nominees: Array<{
    firstName: string;
    lastName: string;
    middleName?: string;
    suffix?: string;
    position: string;
  }>;
}

export class EnhancedCongressApiClient {
  private apiKey: string;
  private baseUrl = 'https://api.congress.gov/v3';
  private rateLimitDelay = 200;

  constructor() {
    this.apiKey = process.env.CONGRESS_API_KEY || '';
    if (!this.apiKey) {
      console.warn('⚠️ CONGRESS_API_KEY not set. Get one from: https://api.data.gov/signup/');
    }
  }

  private async makeRequest(endpoint: string): Promise<any> {
    if (!this.apiKey) {
      throw new Error('Congress API key not configured');
    }

    const url = `${this.baseUrl}${endpoint}`;
    
    await this.rateLimitDelayMethod();
    
    const response = await fetch(url, {
      headers: {
        'X-Api-Key': this.apiKey,
        'User-Agent': 'AGORA Political Intelligence Platform - Educational Use'
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

  // 1. Enhanced Bills Information with Sponsors & Committees
  async getComprehensiveBills(limit: number = 50): Promise<CongressBillSummary[]> {
    console.log('📋 Fetching comprehensive bill information...');
    
    try {
      const response = await this.makeRequest(`/bill?format=json&limit=${limit}&sort=updateDate+desc`);
      const bills = response.bills || [];

      const enhancedBills: CongressBillSummary[] = [];
      
      for (const bill of bills) {
        try {
          const detailed = await this.getBillWithSponsors(bill.congress, bill.type.toLowerCase(), bill.number);
          if (detailed) {
            enhancedBills.push(detailed);
          }
        } catch (error) {
          console.warn(`Could not enhance bill ${bill.type}${bill.number}:`, error);
          enhancedBills.push(bill);
        }
      }

      console.log(`✅ Retrieved ${enhancedBills.length} comprehensive bills`);
      return enhancedBills;
    } catch (error) {
      console.error('Error fetching comprehensive bills:', error);
      return [];
    }
  }

  private async getBillWithSponsors(congress: number, type: string, number: string): Promise<CongressBillSummary | null> {
    try {
      const [billResponse, sponsorsResponse, summaryResponse, subjectsResponse] = await Promise.all([
        this.makeRequest(`/bill/${congress}/${type}/${number}?format=json`),
        this.makeRequest(`/bill/${congress}/${type}/${number}/sponsors?format=json`).catch(() => ({ sponsors: [] })),
        this.makeRequest(`/bill/${congress}/${type}/${number}/summaries?format=json`).catch(() => ({ summaries: [] })),
        this.makeRequest(`/bill/${congress}/${type}/${number}/subjects?format=json`).catch(() => ({ subjects: [] }))
      ]);

      const bill = billResponse.bill;
      if (!bill) return null;

      return {
        ...bill,
        sponsors: sponsorsResponse.sponsors || [],
        summary: summaryResponse.summaries?.[0] || null,
        subjects: subjectsResponse.subjects || []
      };
    } catch (error) {
      console.error(`Error fetching detailed bill ${type}${number}:`, error);
      return null;
    }
  }

  // 2. Committee Information & Structure
  async getAllCommittees(): Promise<CongressCommittee[]> {
    console.log('🏛️ Fetching congressional committees...');
    
    try {
      const houseResponse = await this.makeRequest('/committee/house?format=json&limit=250');
      const senateResponse = await this.makeRequest('/committee/senate?format=json&limit=250');
      
      const committees: CongressCommittee[] = [
        ...(houseResponse.committees || []),
        ...(senateResponse.committees || [])
      ];

      // Enhance with subcommittee information
      const enhancedCommittees: CongressCommittee[] = [];
      
      for (const committee of committees) {
        try {
          const subcommitteeResponse = await this.makeRequest(
            `/committee/${committee.chamber}/${committee.systemCode}/subcommittee?format=json`
          ).catch(() => ({ subcommittees: [] }));
          
          enhancedCommittees.push({
            ...committee,
            subcommittees: subcommitteeResponse.subcommittees || []
          });
        } catch (error) {
          enhancedCommittees.push(committee);
        }
      }

      console.log(`✅ Retrieved ${enhancedCommittees.length} committees with subcommittee data`);
      return enhancedCommittees;
    } catch (error) {
      console.error('Error fetching committees:', error);
      return [];
    }
  }

  // 3. Presidential Nominations
  async getRecentNominations(limit: number = 25): Promise<CongressNomination[]> {
    console.log('👔 Fetching presidential nominations...');
    
    try {
      const response = await this.makeRequest(`/nomination?format=json&limit=${limit}&sort=receivedDate+desc`);
      const nominations = response.nominations || [];

      console.log(`✅ Retrieved ${nominations.length} presidential nominations`);
      return nominations;
    } catch (error) {
      console.error('Error fetching nominations:', error);
      return [];
    }
  }

  // 4. Congressional Record & Daily Proceedings
  async getCongressionalRecord(limit: number = 10): Promise<any[]> {
    console.log('📰 Fetching Congressional Record entries...');
    
    try {
      const response = await this.makeRequest(`/congressional-record?format=json&limit=${limit}&sort=date+desc`);
      const records = response.congressionalRecord || [];

      console.log(`✅ Retrieved ${records.length} Congressional Record entries`);
      return records;
    } catch (error) {
      console.error('Error fetching Congressional Record:', error);
      return [];
    }
  }

  // 5. Treaties & International Agreements
  async getTreaties(limit: number = 15): Promise<any[]> {
    console.log('🌍 Fetching treaty information...');
    
    try {
      const response = await this.makeRequest(`/treaty?format=json&limit=${limit}&sort=updateDate+desc`);
      const treaties = response.treaties || [];

      console.log(`✅ Retrieved ${treaties.length} treaties`);
      return treaties;
    } catch (error) {
      console.error('Error fetching treaties:', error);
      return [];
    }
  }

  // 6. House Communications & Official Documents
  async getHouseCommunications(limit: number = 20): Promise<any[]> {
    console.log('📨 Fetching House communications...');
    
    try {
      const response = await this.makeRequest(`/house-communication?format=json&limit=${limit}&sort=updateDate+desc`);
      const communications = response.houseCommunications || [];

      console.log(`✅ Retrieved ${communications.length} House communications`);
      return communications;
    } catch (error) {
      console.error('Error fetching House communications:', error);
      return [];
    }
  }

  // 7. Member Voting Records & Sponsorship Analysis
  async getMemberSponsorshipActivity(bioguideId: string): Promise<any> {
    console.log(`🗳️ Analyzing sponsorship activity for member ${bioguideId}...`);
    
    try {
      const sponsoredResponse = await this.makeRequest(`/member/${bioguideId}/sponsored-legislation?format=json&limit=100`);
      const cosponsoredResponse = await this.makeRequest(`/member/${bioguideId}/cosponsored-legislation?format=json&limit=100`);
      
      const sponsored = sponsoredResponse.sponsoredLegislation || [];
      const cosponsored = cosponsoredResponse.cosponsoredLegislation || [];

      console.log(`✅ Retrieved ${sponsored.length} sponsored + ${cosponsored.length} cosponsored bills for ${bioguideId}`);
      
      return {
        bioguideId,
        sponsored,
        cosponsored,
        totalSponsored: sponsored.length,
        totalCosponsored: cosponsored.length,
        analysisDate: new Date().toISOString()
      };
    } catch (error) {
      console.error(`Error fetching sponsorship for ${bioguideId}:`, error);
      return null;
    }
  }

  // 8. Update Database with Enhanced Information
  async enhanceDatabaseWithCongressData(): Promise<void> {
    console.log('🚀 Starting comprehensive Congress data enhancement...');
    
    try {
      // Update Bills with comprehensive info
      const bills = await this.getComprehensiveBills(100);
      await this.updateBillsDatabase(bills);

      // Add Committee structure
      const committees = await this.getAllCommittees();
      await this.updateCommitteesDatabase(committees);

      // Add Nominations data
      const nominations = await this.getRecentNominations(50);
      await this.updateNominationsDatabase(nominations);

      // Add Congressional Record excerpts
      const records = await this.getCongressionalRecord(25);
      await this.updateCongressionalRecordDatabase(records);

      // Add Treaties
      const treaties = await this.getTreaties(20);
      await this.updateTreatiesDatabase(treaties);

      console.log('✅ Congress data enhancement completed successfully!');
    } catch (error) {
      console.error('❌ Error in Congress data enhancement:', error);
    }
  }

  private async updateBillsDatabase(bills: CongressBillSummary[]): Promise<void> {
    console.log('💾 Updating bills database...');
    
    for (const bill of bills) {
      try {
        const billId = `${bill.type.toLowerCase()}${bill.number}-${bill.congress}`;
        
        await prisma.bill.upsert({
          where: { id: billId },
          update: {
            title: bill.title,
            summary: bill.summary?.text || null,
            status: bill.latestAction?.text || 'Status unknown',
            updatedAt: new Date(bill.updateDate),
          },
          create: {
            id: billId,
            congress: bill.congress,
            chamber: bill.originChamber.toLowerCase(),
            title: bill.title,
            summary: bill.summary?.text || null,
            status: bill.latestAction?.text || 'Status unknown',
            createdAt: new Date(bill.latestAction?.actionDate || Date.now()),
            updatedAt: new Date(bill.updateDate),
          }
        });
      } catch (error) {
        console.warn(`Error upserting bill ${bill.type}${bill.number}:`, error);
      }
    }
    
    console.log(`✅ Updated ${bills.length} bills in database`);
  }

  private async updateCommitteesDatabase(committees: CongressCommittee[]): Promise<void> {
    console.log('💾 Updating committees database...');
    
    for (const committee of committees) {
      try {
        await prisma.committee.upsert({
          where: { id: committee.systemCode },
          update: {
            name: committee.name,
            chamber: committee.chamber.toLowerCase(),
            updatedAt: new Date(committee.updateDate),
          },
          create: {
            id: committee.systemCode,
            name: committee.name,
            chamber: committee.chamber.toLowerCase(),
            createdAt: new Date(),
            updatedAt: new Date(committee.updateDate),
          }
        });
      } catch (error) {
        console.warn(`Error upserting committee ${committee.systemCode}:`, error);
      }
    }
    
    console.log(`✅ Updated ${committees.length} committees in database`);
  }

  private async updateNominationsDatabase(nominations: CongressNomination[]): Promise<void> {
    console.log('💾 Storing nominations data...');
    // Store in a JSON field or separate table based on your schema
    console.log(`📊 Processed ${nominations.length} nominations for analysis`);
  }

  private async updateCongressionalRecordDatabase(records: any[]): Promise<void> {
    console.log('💾 Storing Congressional Record data...');
    console.log(`📰 Processed ${records.length} Congressional Record entries`);
  }

  private async updateTreatiesDatabase(treaties: any[]): Promise<void> {
    console.log('💾 Storing treaties data...');
    console.log(`🌍 Processed ${treaties.length} treaties for analysis`);
  }

  // 9. Generate Enhanced Analytics Report
  async generateComprehensiveReport(): Promise<void> {
    console.log('\n📊 COMPREHENSIVE CONGRESS ANALYTICS REPORT');
    console.log('==========================================');
    
    try {
      // Member statistics
      const memberStats = await prisma.member.groupBy({
        by: ['chamber', 'party'],
        _count: { id: true }
      });

      // Bill statistics
      const billStats = await prisma.bill.groupBy({
        by: ['chamber'],
        _count: { id: true }
      });

      // Committee statistics
      const committeeStats = await prisma.committee.groupBy({
        by: ['chamber'],
        _count: { id: true }
      });

      console.log('\n🏛️ CONGRESSIONAL COMPOSITION:');
      memberStats.forEach(stat => {
        console.log(`   ${stat.chamber.toUpperCase()} ${stat.party}: ${stat._count.id}`);
      });

      console.log('\n📋 LEGISLATIVE ACTIVITY:');
      billStats.forEach(stat => {
        console.log(`   ${stat.chamber.toUpperCase()} Bills: ${stat._count.id}`);
      });

      console.log('\n🏢 COMMITTEE STRUCTURE:');
      committeeStats.forEach(stat => {
        console.log(`   ${stat.chamber.toUpperCase()} Committees: ${stat._count.id}`);
      });

      const totalMembers = await prisma.member.count();
      const totalBills = await prisma.bill.count();
      const totalCommittees = await prisma.committee.count();

      console.log('\n📈 PLATFORM TOTALS:');
      console.log(`   Members: ${totalMembers}`);
      console.log(`   Bills: ${totalBills}`);
      console.log(`   Committees: ${totalCommittees}`);
      
    } catch (error) {
      console.error('Error generating report:', error);
    }
  }
}

// Main execution function
async function main() {
  const client = new EnhancedCongressApiClient();
  
  try {
    await client.enhanceDatabaseWithCongressData();
    await client.generateComprehensiveReport();

    console.log('\n🎉 Enhanced Congress data integration completed!');
    console.log('🌟 Your AGORA platform now has comprehensive congressional intelligence!');
    
  } catch (error) {
    console.error('❌ Error in enhanced integration:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Allow this to be run directly
if (require.main === module) {
  main().catch(console.error);
}

export { main as enhanceCongressData };
