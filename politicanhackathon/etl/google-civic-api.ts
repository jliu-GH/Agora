import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Google Civic Information API Client
class GoogleCivicApiClient {
  private apiKey: string;
  private baseUrl = 'https://www.googleapis.com/civicinfo/v2';

  constructor() {
    this.apiKey = process.env.GOOGLE_CIVIC_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('Google Civic API key not found. Set GOOGLE_CIVIC_API_KEY environment variable.');
    }
  }

  async getRepresentatives(address?: string): Promise<any> {
    // Default to a national query if no specific address
    const queryAddress = address || 'United States';
    const url = `${this.baseUrl}/representatives?key=${this.apiKey}&address=${encodeURIComponent(queryAddress)}&levels=country&roles=legislatorLowerBody&roles=legislatorUpperBody`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Google Civic API error: ${response.status} ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching from Google Civic API:', error);
      throw error;
    }
  }

  async getRepresentativesByState(stateCode: string): Promise<any> {
    // Query by state to get state-specific representatives
    const address = `${stateCode}, United States`;
    return this.getRepresentatives(address);
  }

  async getAllCongressionalData(): Promise<any[]> {
    console.log('🌐 Fetching congressional data from Google Civic Information API...');
    
    const allMembers: any[] = [];
    const states = [
      'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
      'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
      'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
      'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
      'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
    ];

    for (const state of states) {
      try {
        console.log(`   🔍 Fetching data for ${state}...`);
        
        const data = await this.getRepresentativesByState(state);
        
        if (data.officials && data.offices) {
          const stateMembers = this.parseCongressionalMembers(data, state);
          allMembers.push(...stateMembers);
          
          console.log(`   ✅ ${state}: Found ${stateMembers.length} members`);
        } else {
          console.log(`   ⚠️ ${state}: No data returned`);
        }

        // Rate limiting - be respectful to the API
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`   ❌ Error fetching data for ${state}:`, error);
      }
    }

    console.log(`🎉 Total members found: ${allMembers.length}`);
    return allMembers;
  }

  parseCongressionalMembers(data: any, stateCode: string): any[] {
    const members: any[] = [];
    
    if (!data.offices || !data.officials) {
      return members;
    }

    // Find congressional offices (Senate and House)
    const congressionalOffices = data.offices.filter((office: any) => 
      office.name.includes('United States Senate') || 
      office.name.includes('United States House of Representatives') ||
      office.name.includes('U.S. Senate') ||
      office.name.includes('U.S. House')
    );

    for (const office of congressionalOffices) {
      if (!office.officialIndices) continue;

      const chamber = this.determineChamber(office.name);
      const district = this.extractDistrict(office.name);

      for (const index of office.officialIndices) {
        const official = data.officials[index];
        if (!official) continue;

        const member = {
          id: this.generateId(official, stateCode, chamber, district),
          firstName: this.extractFirstName(official.name),
          lastName: this.extractLastName(official.name),
          fullName: official.name,
          state: stateCode,
          district: chamber === 'senate' ? null : district,
          chamber: chamber,
          party: this.extractParty(official.party),
          photoUrl: official.photoUrl || null,
          urls: official.urls || [],
          phones: official.phones || [],
          emails: official.emails || [],
          address: official.address ? official.address[0] : null,
          channels: official.channels || [] // Social media
        };

        members.push(member);
      }
    }

    return members;
  }

  private determineChamber(officeName: string): 'senate' | 'house' {
    if (officeName.toLowerCase().includes('senate')) {
      return 'senate';
    } else if (officeName.toLowerCase().includes('house') || officeName.toLowerCase().includes('representative')) {
      return 'house';
    }
    return 'house'; // Default
  }

  private extractDistrict(officeName: string): string | null {
    // Extract district number from office name like "United States House of Representatives District 5"
    const match = officeName.match(/district\s+(\d+)/i);
    return match ? match[1] : null;
  }

  private extractFirstName(fullName: string): string {
    const parts = fullName.split(' ');
    return parts[0] || fullName;
  }

  private extractLastName(fullName: string): string {
    const parts = fullName.split(' ');
    return parts.length > 1 ? parts[parts.length - 1] : fullName;
  }

  private extractParty(party: string): string {
    if (!party) return 'Unknown';
    
    const p = party.toLowerCase();
    if (p.includes('democratic') || p.includes('democrat')) return 'D';
    if (p.includes('republican')) return 'R';
    if (p.includes('independent')) return 'I';
    if (p.includes('green')) return 'G';
    if (p.includes('libertarian')) return 'L';
    
    return party; // Return original if can't determine
  }

  private generateId(official: any, state: string, chamber: string, district: string | null): string {
    // Create a unique ID based on name, state, and position
    const lastName = this.extractLastName(official.name).toLowerCase();
    const districtPart = district ? `_${district}` : '';
    const chamberPrefix = chamber === 'senate' ? 'S' : 'H';
    
    return `${lastName}_${state}_${chamberPrefix}${districtPart}`.replace(/[^a-zA-Z0-9_]/g, '');
  }

  convertToPrismaFormat(member: any): any {
    return {
      id: member.id,
      firstName: member.firstName,
      lastName: member.lastName,
      state: member.state,
      district: member.district,
      party: member.party,
      chamber: member.chamber,
      // Additional fields from Google Civic API
      photoUrl: member.photoUrl,
      phones: member.phones.length > 0 ? member.phones[0] : null,
      emails: member.emails.length > 0 ? member.emails[0] : null,
      officialWebsiteUrl: member.urls.length > 0 ? member.urls[0] : null,
      // Social media
      twitter: this.extractSocialMedia(member.channels, 'Twitter'),
      facebook: this.extractSocialMedia(member.channels, 'Facebook'),
      youtube: this.extractSocialMedia(member.channels, 'YouTube'),
      // Address
      officeAddress: member.address ? this.formatAddress(member.address) : null,
      dwNominate: null,
    };
  }

  private extractSocialMedia(channels: any[], platform: string): string | null {
    const channel = channels.find(c => c.type === platform);
    return channel ? channel.id : null;
  }

  private formatAddress(address: any): string {
    if (!address) return '';
    
    const parts = [];
    if (address.line1) parts.push(address.line1);
    if (address.line2) parts.push(address.line2);
    if (address.city) parts.push(address.city);
    if (address.state) parts.push(address.state);
    if (address.zip) parts.push(address.zip);
    
    return parts.join(', ');
  }
}

async function fetchRealCongressionalData() {
  console.log('🌐 FETCHING REAL CONGRESSIONAL DATA FROM GOOGLE CIVIC API');
  console.log('========================================================');
  console.log('🔑 Using Google Civic Information API for authentic data');
  console.log('📊 This will replace generated data with real officials');
  console.log('🎯 All members will have real names, contact info, and photos\n');

  try {
    const client = new GoogleCivicApiClient();
    
    // Fetch all congressional data
    const allMembers = await client.getAllCongressionalData();
    
    if (allMembers.length === 0) {
      console.log('❌ No data retrieved from Google Civic API');
      return;
    }

    console.log('\n📊 Processing and saving to database...');
    
    // Clear existing data
    await prisma.member.deleteMany({});
    console.log('✅ Cleared existing data');

    let addedCount = 0;
    let errorCount = 0;

    // Convert and save each member
    for (const member of allMembers) {
      try {
        const prismaData = client.convertToPrismaFormat(member);
        
        await prisma.member.create({
          data: {
            ...prismaData,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
        
        addedCount++;
        
        if (addedCount % 50 === 0) {
          console.log(`   ⏳ Progress: ${addedCount} members saved...`);
        }
        
      } catch (error) {
        console.error(`   ❌ Error saving ${member.firstName} ${member.lastName}:`, error);
        errorCount++;
      }
    }

    // Final verification
    const finalTotal = await prisma.member.count();
    const finalHouse = await prisma.member.count({ where: { chamber: 'house' } });
    const finalSenate = await prisma.member.count({ where: { chamber: 'senate' } });

    console.log('\n🎉 GOOGLE CIVIC API DATA IMPORT COMPLETE!');
    console.log('=========================================');
    console.log(`✅ Total Members: ${finalTotal}`);
    console.log(`🏛️ House: ${finalHouse}`);
    console.log(`🏛️ Senate: ${finalSenate}`);
    console.log(`✅ Successfully added: ${addedCount}`);
    console.log(`❌ Errors: ${errorCount}`);

    // Sample some data
    const sampleMembers = await prisma.member.findMany({
      take: 5,
      select: {
        firstName: true,
        lastName: true,
        state: true,
        chamber: true,
        party: true,
        district: true
      }
    });

    console.log('\n🌟 SAMPLE REAL MEMBERS:');
    sampleMembers.forEach(member => {
      const district = member.district ? `-${member.district}` : '';
      console.log(`   ${member.firstName} ${member.lastName} (${member.party}-${member.state}${district}) - ${member.chamber}`);
    });

    console.log('\n🗺️ YOUR MAP NOW HAS REAL DATA!');
    console.log('🌐 Visit: http://localhost:3000/map');
    console.log('🎯 Click any state to see actual current representatives');
    console.log('✨ Real names, real parties, real contact information');
    console.log('📸 Many members include official photos');

  } catch (error) {
    console.error('❌ Fatal error:', error);
    
    if (error.message.includes('API key')) {
      console.log('\n💡 TO SET UP GOOGLE CIVIC API:');
      console.log('1. Visit: https://console.developers.google.com/');
      console.log('2. Create a new project or select existing');
      console.log('3. Enable "Google Civic Information API"');
      console.log('4. Create credentials (API Key)');
      console.log('5. Set environment variable: export GOOGLE_CIVIC_API_KEY="your_key_here"');
      console.log('6. Re-run this script');
    }
  } finally {
    await prisma.$disconnect();
  }
}

fetchRealCongressionalData().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
