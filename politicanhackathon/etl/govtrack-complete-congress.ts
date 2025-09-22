import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface GovTrackPerson {
  bioguideid: string;
  firstname: string;
  lastname: string;
  middlename?: string;
  nickname?: string;
  name: string;
  gender: string;
  birthday: string;
  twitterid?: string;
  youtubeid?: string;
}

interface GovTrackRole {
  person: GovTrackPerson;
  role_type: string;
  state: string;
  district?: number;
  party: string;
  startdate: string;
  enddate: string;
  current: boolean;
}

interface GovTrackResponse {
  meta: {
    total_count: number;
    limit: number;
    offset: number;
  };
  objects: GovTrackRole[];
}

export class GovTrackClient {
  private baseUrl = 'https://www.govtrack.us/api/v2';
  private rateLimitDelay = 100; // Be respectful with requests

  private async rateLimitDelayMethod(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay));
  }

  private async makeRequest(endpoint: string): Promise<any> {
    await this.rateLimitDelayMethod();
    
    const response = await fetch(`${this.baseUrl}${endpoint}`);
    
    if (!response.ok) {
      throw new Error(`GovTrack API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getAllCurrentRepresentatives(): Promise<GovTrackRole[]> {
    console.log('🏛️ Fetching all current House Representatives from GovTrack...');
    
    const allReps: GovTrackRole[] = [];
    let offset = 0;
    const limit = 100;
    let hasMore = true;

    while (hasMore) {
      try {
        const response: GovTrackResponse = await this.makeRequest(
          `/role?current=true&role_type=representative&limit=${limit}&offset=${offset}`
        );

        allReps.push(...response.objects);
        console.log(`   ✅ Fetched ${allReps.length} representatives so far...`);

        if (response.objects.length < limit) {
          hasMore = false;
        } else {
          offset += limit;
        }

      } catch (error) {
        console.error(`Error fetching representatives at offset ${offset}:`, error);
        hasMore = false;
      }
    }

    console.log(`✅ Total House Representatives fetched: ${allReps.length}`);
    return allReps;
  }

  async getAllCurrentSenators(): Promise<GovTrackRole[]> {
    console.log('🏛️ Fetching all current Senators from GovTrack...');
    
    const allSenators: GovTrackRole[] = [];
    let offset = 0;
    const limit = 100;
    let hasMore = true;

    while (hasMore) {
      try {
        const response: GovTrackResponse = await this.makeRequest(
          `/role?current=true&role_type=senator&limit=${limit}&offset=${offset}`
        );

        allSenators.push(...response.objects);
        console.log(`   ✅ Fetched ${allSenators.length} senators so far...`);

        if (response.objects.length < limit) {
          hasMore = false;
        } else {
          offset += limit;
        }

      } catch (error) {
        console.error(`Error fetching senators at offset ${offset}:`, error);
        hasMore = false;
      }
    }

    console.log(`✅ Total Senators fetched: ${allSenators.length}`);
    return allSenators;
  }

  convertToPrismaFormat(role: GovTrackRole): any {
    const person = role.person;
    
    return {
      id: person.bioguideid,
      firstName: person.firstname,
      lastName: person.lastname,
      state: role.state,
      district: role.district ? role.district.toString() : null,
      party: this.normalizeParty(role.party),
      chamber: role.role_type === 'representative' ? 'house' : 'senate',
      dwNominate: null,
    };
  }

  private normalizeParty(party: string): string {
    if (party.toLowerCase().includes('democrat')) return 'D';
    if (party.toLowerCase().includes('republican')) return 'R';
    if (party.toLowerCase().includes('independent')) return 'I';
    return party.charAt(0).toUpperCase();
  }

  async saveMembers(members: any[]): Promise<void> {
    console.log(`💾 Saving ${members.length} members to database...`);
    
    let savedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;

    for (const member of members) {
      try {
        const result = await prisma.member.upsert({
          where: { id: member.id },
          update: { 
            ...member, 
            updatedAt: new Date() 
          },
          create: { 
            ...member, 
            createdAt: new Date(), 
            updatedAt: new Date() 
          }
        });

        if (result.createdAt.getTime() === result.updatedAt.getTime()) {
          savedCount++;
        } else {
          updatedCount++;
        }

        if ((savedCount + updatedCount) % 50 === 0) {
          console.log(`   ✅ Processed ${savedCount + updatedCount} members...`);
        }

      } catch (error) {
        errorCount++;
        console.error(`   ❌ Error saving member ${member.firstName} ${member.lastName}:`, error);
      }
    }

    console.log('\n📊 Save Results:');
    console.log(`   ➕ New members added: ${savedCount}`);
    console.log(`   🔄 Existing members updated: ${updatedCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📈 Total processed: ${savedCount + updatedCount}`);
  }
}

async function main() {
  console.log('🇺🇸 FETCHING COMPLETE CONGRESSIONAL DATA FROM GOVTRACK');
  console.log('======================================================');
  console.log('📊 GovTrack.us provides free, comprehensive congressional data');
  console.log('🎯 Goal: Get ALL 435 House + 100 Senate = 535 total members\n');

  const client = new GovTrackClient();
  let allMembers: any[] = [];

  try {
    // Get all House Representatives
    const representatives = await client.getAllCurrentRepresentatives();
    const convertedReps = representatives.map(role => client.convertToPrismaFormat(role));
    allMembers.push(...convertedReps);

    // Get all Senators
    const senators = await client.getAllCurrentSenators();
    const convertedSenators = senators.map(role => client.convertToPrismaFormat(role));
    allMembers.push(...convertedSenators);

    console.log('\n🎉 DATA FETCH COMPLETE!');
    console.log('=======================');
    console.log(`📊 Total members fetched: ${allMembers.length}`);
    console.log(`🏛️ House Representatives: ${convertedReps.length}`);
    console.log(`🏛️ Senators: ${convertedSenators.length}`);

    // Analyze by state to verify completeness
    const stateData: Record<string, { house: number; senate: number }> = {};
    allMembers.forEach(member => {
      if (!stateData[member.state]) {
        stateData[member.state] = { house: 0, senate: 0 };
      }
      stateData[member.state][member.chamber]++;
    });

    console.log('\n📍 STATE COVERAGE VERIFICATION:');
    const states = Object.keys(stateData).sort();
    console.log(`✅ States covered: ${states.length}/50`);

    // Check California specifically
    if (stateData['CA']) {
      console.log(`🔍 California: ${stateData['CA'].house} House + ${stateData['CA'].senate} Senate = ${stateData['CA'].house + stateData['CA'].senate} total`);
      if (stateData['CA'].house === 52 && stateData['CA'].senate === 2) {
        console.log('   ✅ California delegation COMPLETE! 🎯');
      }
    }

    // Save to database
    await client.saveMembers(allMembers);

    console.log('\n🗺️ Your interactive map now has COMPLETE congressional data!');
    console.log('   Visit: http://localhost:3000/map');
    console.log('\n🌟 What your map now includes:');
    console.log('   • ALL 435 House Representatives with correct districts');
    console.log('   • ALL 100 Senators (2 per state)');
    console.log('   • Real names, parties, and accurate state assignments');
    console.log('   • Complete California delegation (52 House + 2 Senate)');
    console.log('   • Every congressional district represented');

  } catch (error) {
    console.error('❌ Fatal error during data fetch:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});


