import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface CongressApiMember {
  bioguideId: string;
  name: string;
  partyName: string;
  state: string;
  district?: number | null;
  depiction?: {
    imageUrl?: string;
    attribution?: string;
  };
  terms: {
    item: Array<{
      chamber: string;
      startYear: number;
      endYear?: number | null;
    }>;
  };
  updateDate: string;
  url: string;
}

export interface CongressApiResponse {
  members: CongressApiMember[];
  pagination?: {
    count: number;
    next?: string;
  };
}

export class CongressApiMembersClient {
  private apiKey: string;
  private baseUrl = 'https://api.congress.gov/v3';
  private rateLimitDelay = 200; // Be conservative with API calls

  constructor() {
    this.apiKey = process.env.CONGRESS_API_KEY || '';
    if (!this.apiKey) {
      console.warn('⚠️ CONGRESS_API_KEY not set. Get one from: https://api.data.gov/signup/');
      console.warn('⚠️ The API is required for accurate member data.');
    }
  }

  private async makeRequest(endpoint: string): Promise<any> {
    if (!this.apiKey) {
      throw new Error('Congress API key not configured. Get one from: https://api.data.gov/signup/');
    }

    const url = `${this.baseUrl}${endpoint}`;
    
    await this.rateLimitDelayMethod();
    
    const response = await fetch(url, {
      headers: {
        'X-Api-Key': this.apiKey,
        'User-Agent': 'AGORA Political Platform - Educational Use'
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

  async getAllCurrentMembers(): Promise<CongressApiMember[]> {
    console.log('📡 Fetching all current congressional members from Congress.gov API...');
    
    const allMembers: CongressApiMember[] = [];
    let offset = 0;
    const limit = 250; // API's max limit

    try {
      while (true) {
        console.log(`📥 Fetching members ${offset + 1}-${offset + limit}...`);
        
        const response: CongressApiResponse = await this.makeRequest(
          `/member?format=json&limit=${limit}&offset=${offset}&currentMember=true`
        );

        if (!response.members || response.members.length === 0) {
          break;
        }

        allMembers.push(...response.members);
        console.log(`✅ Retrieved ${response.members.length} members (total: ${allMembers.length})`);

        // Check if there are more pages
        if (response.members.length < limit) {
          break;
        }

        offset += limit;
      }

      console.log(`🎉 Successfully fetched ${allMembers.length} total congressional members`);
      return allMembers;

    } catch (error) {
      console.error('❌ Error fetching members from Congress API:', error);
      throw error;
    }
  }

  convertToPrismaFormat(apiMember: CongressApiMember): any {
    // Parse the name - it's usually in "Last, First" format
    const [lastName, firstName] = apiMember.name.includes(',') 
      ? apiMember.name.split(',').map(s => s.trim())
      : [apiMember.name.trim(), ''];

    // Get the current term (most recent)
    const currentTerm = apiMember.terms.item[apiMember.terms.item.length - 1];
    
    // Determine chamber
    const chamber = currentTerm.chamber.toLowerCase().includes('house') ? 'house' : 'senate';
    
    // Map party names to single letters
    const partyMapping: Record<string, string> = {
      'Democratic': 'D',
      'Republican': 'R',
      'Independent': 'I'
    };
    
    const party = partyMapping[apiMember.partyName] || apiMember.partyName.charAt(0).toUpperCase();

    return {
      id: apiMember.bioguideId,
      firstName: firstName || '',
      lastName: lastName || apiMember.name,
      chamber,
      state: this.convertStateName(apiMember.state),
      district: apiMember.district?.toString() || undefined,
      party,
      bioguideId: apiMember.bioguideId,
      imageUrl: apiMember.depiction?.imageUrl || undefined,
      updatedAt: new Date(apiMember.updateDate),
    };
  }

  private convertStateName(stateName: string): string {
    // Convert full state names to abbreviations
    const stateAbbreviations: Record<string, string> = {
      'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA',
      'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'Florida': 'FL', 'Georgia': 'GA',
      'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
      'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
      'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS', 'Missouri': 'MO',
      'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
      'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH',
      'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
      'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT',
      'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY'
    };

    return stateAbbreviations[stateName] || stateName;
  }

  async updateDatabase(members: CongressApiMember[]): Promise<void> {
    console.log('💾 Updating database with congressional members from Congress.gov API...');

    // Clear existing data
    console.log('🗑️ Clearing existing member data...');
    await prisma.committee.deleteMany({});
    await prisma.member.deleteMany({});

    console.log('📝 Inserting new member data...');
    
    const prismaMembersData = members.map(member => this.convertToPrismaFormat(member));
    
    for (const memberData of prismaMembersData) {
      try {
        await prisma.member.create({
          data: {
            id: memberData.id,
            firstName: memberData.firstName,
            lastName: memberData.lastName,
            chamber: memberData.chamber,
            state: memberData.state,
            district: memberData.district,
            party: memberData.party,
          }
        });
      } catch (error) {
        console.warn(`Error inserting member ${memberData.firstName} ${memberData.lastName}:`, error);
      }
    }

    console.log('✅ Database updated successfully with official Congress.gov data');
  }

  async generateStats(): Promise<void> {
    const stats = await prisma.member.groupBy({
      by: ['chamber', 'party'],
      _count: {
        id: true
      }
    });

    console.log('\n📊 OFFICIAL CONGRESS COMPOSITION (from Congress.gov API):');
    console.log('=========================================================');
    
    const houseStats = stats.filter(s => s.chamber === 'house');
    const senateStats = stats.filter(s => s.chamber === 'senate');
    
    console.log('\n🏛️ House of Representatives:');
    houseStats.forEach(stat => {
      console.log(`   ${stat.party}: ${stat._count.id}`);
    });
    
    console.log('\n🏛️ Senate:');
    senateStats.forEach(stat => {
      console.log(`   ${stat.party}: ${stat._count.id}`);
    });

    const totalMembers = await prisma.member.count();
    const houseTotal = houseStats.reduce((sum, stat) => sum + stat._count.id, 0);
    const senateTotal = senateStats.reduce((sum, stat) => sum + stat._count.id, 0);
    
    console.log(`\n📈 Summary:`);
    console.log(`   House: ${houseTotal}/435`);
    console.log(`   Senate: ${senateTotal}/100`);
    console.log(`   Total: ${totalMembers}/535`);

    // Show breakdown by state
    const stateStats = await prisma.member.groupBy({
      by: ['state'],
      _count: {
        id: true
      },
      orderBy: {
        state: 'asc'
      }
    });

    console.log('\n🗺️ Members by State:');
    stateStats.forEach(stat => {
      console.log(`   ${stat.state}: ${stat._count.id}`);
    });
  }
}

// Main execution function
async function main() {
  const client = new CongressApiMembersClient();
  
  try {
    const members = await client.getAllCurrentMembers();
    
    if (members.length === 0) {
      console.error('❌ No members found! Check API key and network connection.');
      return;
    }

    await client.updateDatabase(members);
    await client.generateStats();

    console.log('\n🎉 Congressional members updated successfully with official Congress.gov data!');
    
  } catch (error) {
    console.error('❌ Error in main process:', error);
    
    if (error instanceof Error && error.message.includes('API key not configured')) {
      console.log('\n💡 To get a Congress.gov API key:');
      console.log('   1. Visit: https://api.data.gov/signup/');
      console.log('   2. Fill out the form with your details');
      console.log('   3. Add the key to your .env file:');
      console.log('      CONGRESS_API_KEY=your_api_key_here');
      console.log('   4. Restart your application');
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Allow this to be run directly
if (require.main === module) {
  main().catch(console.error);
}

export { main as updateCongressMembersAPI };
