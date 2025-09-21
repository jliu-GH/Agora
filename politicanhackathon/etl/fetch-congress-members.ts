import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface ProPublicaMember {
  id: string;
  title: string;
  short_title: string;
  api_uri: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  suffix?: string;
  date_of_birth: string;
  gender: string;
  party: string;
  leadership_role?: string;
  twitter_account?: string;
  facebook_account?: string;
  youtube_account?: string;
  website?: string;
  contact_form?: string;
  in_office: boolean;
  cook_pvi?: string;
  dw_nominate?: number;
  ideal_point?: number;
  seniority: string;
  next_election: string;
  total_votes: number;
  missed_votes: number;
  total_present: number;
  last_updated: string;
  ocd_id: string;
  office?: string;
  phone?: string;
  fax?: string;
  state: string;
  district?: string;
  at_large?: boolean;
  geoid?: string;
  missed_votes_pct: number;
  votes_with_party_pct: number;
  votes_against_party_pct: number;
}

export interface CongressApiMember {
  bioguideId: string;
  district?: number;
  firstName: string;
  lastName: string;
  middleName?: string;
  nameSuffix?: string;
  nickname?: string;
  officialWebsiteUrl?: string;
  partyName: string;
  state: string;
  updateDate: string;
  terms: Array<{
    chamber: string;
    congress: number;
    endYear: number;
    startYear: number;
    stateCode: string;
    district?: number;
  }>;
}

export class MemberDataClient {
  private propublicaApiKey: string;
  private congressApiKey: string;
  private rateLimitDelay = 250; // Be conservative with rate limiting

  constructor() {
    this.propublicaApiKey = process.env.PROPUBLICA_API_KEY || '';
    this.congressApiKey = process.env.CONGRESS_API_KEY || '';
    
    if (!this.propublicaApiKey) {
      console.warn('⚠️ PROPUBLICA_API_KEY not set. Get one from: https://www.propublica.org/datastore/api/propublica-congress-api');
    }
    if (!this.congressApiKey) {
      console.warn('⚠️ CONGRESS_API_KEY not set. Get one from: https://api.congress.gov/sign-up/');
    }
  }

  private async rateLimitDelayMethod(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay));
  }

  // ProPublica API methods
  async fetchFromProPublica(congress: number = 119): Promise<ProPublicaMember[]> {
    if (!this.propublicaApiKey) {
      throw new Error('ProPublica API key not configured');
    }

    console.log(`📊 Fetching members from ${congress}th Congress via ProPublica API...`);
    
    const members: ProPublicaMember[] = [];

    try {
      // Fetch House members
      await this.rateLimitDelayMethod();
      const houseResponse = await fetch(`https://api.propublica.org/congress/v1/${congress}/house/members.json`, {
        headers: {
          'X-API-Key': this.propublicaApiKey,
          'User-Agent': 'Political Hackathon Project - Educational Use'
        }
      });

      if (houseResponse.ok) {
        const houseData = await houseResponse.json();
        members.push(...(houseData.results?.[0]?.members || []));
        console.log(`✅ Fetched ${houseData.results?.[0]?.members?.length || 0} House members`);
      }

      // Fetch Senate members
      await this.rateLimitDelayMethod();
      const senateResponse = await fetch(`https://api.propublica.org/congress/v1/${congress}/senate/members.json`, {
        headers: {
          'X-API-Key': this.propublicaApiKey,
          'User-Agent': 'Political Hackathon Project - Educational Use'
        }
      });

      if (senateResponse.ok) {
        const senateData = await senateResponse.json();
        members.push(...(senateData.results?.[0]?.members || []));
        console.log(`✅ Fetched ${senateData.results?.[0]?.members?.length || 0} Senate members`);
      }

    } catch (error) {
      console.error('Error fetching from ProPublica API:', error);
    }

    return members;
  }

  // Congress.gov API methods
  async fetchFromCongressAPI(): Promise<CongressApiMember[]> {
    if (!this.congressApiKey) {
      throw new Error('Congress API key not configured');
    }

    console.log(`🏛️ Fetching members from Congress.gov API...`);
    
    const members: CongressApiMember[] = [];

    try {
      await this.rateLimitDelayMethod();
      const response = await fetch(`https://api.congress.gov/v3/member?format=json&limit=250`, {
        headers: {
          'X-Api-Key': this.congressApiKey,
          'User-Agent': 'Political Hackathon Project - Educational Use'
        }
      });

      if (response.ok) {
        const data = await response.json();
        members.push(...(data.members || []));
        console.log(`✅ Fetched ${data.members?.length || 0} members from Congress.gov`);
      }

    } catch (error) {
      console.error('Error fetching from Congress.gov API:', error);
    }

    return members;
  }

  // Convert ProPublica member to Prisma format
  convertProPublicaToPrisma(member: ProPublicaMember): any {
    return {
      id: member.id,
      bioguideId: member.id,
      firstName: member.first_name,
      middleName: member.middle_name || null,
      lastName: member.last_name,
      nameSuffix: member.suffix || null,
      nickname: null,
      officialWebsiteUrl: member.website || null,
      party: member.party,
      state: member.state,
      chamber: member.title.toLowerCase().includes('sen') ? 'senate' : 'house',
      district: member.district ? parseInt(member.district) : null,
      phoneNumber: member.office ? this.extractPhoneFromOffice(member.office) : null,
      email: null, // ProPublica doesn't provide email
      officeAddress: member.office || null,
      dateOfBirth: member.date_of_birth ? new Date(member.date_of_birth) : null,
      gender: member.gender,
      twitter: member.twitter_account || null,
      facebook: member.facebook_account || null,
      youtube: member.youtube_account || null,
      contactForm: member.contact_form || null,
      inOffice: member.in_office,
      nextElection: member.next_election ? new Date(member.next_election) : null,
      seniorityYears: member.seniority ? parseInt(member.seniority) : null,
      missedVotesPct: member.missed_votes_pct || null,
      partyVotesPct: member.votes_with_party_pct || null,
    };
  }

  // Convert Congress.gov member to Prisma format
  convertCongressAPItoPrisma(member: CongressApiMember): any {
    const currentTerm = member.terms?.[member.terms.length - 1];
    
    // Validate required fields
    if (!member.firstName || !member.lastName) {
      console.warn(`⚠️ Skipping member ${member.bioguideId}: missing name data`);
      return null;
    }
    
    return {
      id: member.bioguideId,
      bioguideId: member.bioguideId,
      firstName: member.firstName,
      middleName: member.middleName || null,
      lastName: member.lastName,
      nameSuffix: member.nameSuffix || null,
      nickname: member.nickname || null,
      officialWebsiteUrl: member.officialWebsiteUrl || null,
      party: this.normalizeParty(member.partyName),
      state: member.state,
      chamber: currentTerm?.chamber?.toLowerCase() || 'house', // Default to house instead of unknown
      district: member.district || currentTerm?.district || null,
      phoneNumber: null,
      email: null,
      officeAddress: null,
      dateOfBirth: null,
      gender: null,
      twitter: null,
      facebook: null,
      youtube: null,
      contactForm: null,
      inOffice: true, // Assume current if in API
      nextElection: null,
      seniorityYears: null,
      missedVotesPct: null,
      partyVotesPct: null,
    };
  }

  private normalizeParty(partyName: string): string {
    if (partyName.toLowerCase().includes('democrat')) return 'D';
    if (partyName.toLowerCase().includes('republican')) return 'R';
    if (partyName.toLowerCase().includes('independent')) return 'I';
    return partyName.charAt(0).toUpperCase();
  }

  private extractPhoneFromOffice(office: string): string | null {
    const phoneMatch = office.match(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
    return phoneMatch ? phoneMatch[0] : null;
  }

  // Save members to database
  async saveMembers(members: any[]): Promise<void> {
    console.log(`💾 Saving ${members.length} members to database...`);
    
    let savedCount = 0;
    let errorCount = 0;

    for (const member of members) {
      try {
        await prisma.member.upsert({
          where: { id: member.id },
          update: { ...member, updatedAt: new Date() },
          create: { ...member, createdAt: new Date(), updatedAt: new Date() }
        });
        savedCount++;
        
        if (savedCount % 50 === 0) {
          console.log(`   ✅ Saved ${savedCount} members...`);
        }
      } catch (error) {
        errorCount++;
        console.error(`   ❌ Error saving member ${member.id}:`, error);
      }
    }

    console.log(`\n📊 Save complete: ${savedCount} saved, ${errorCount} errors`);
  }
}

async function main() {
  console.log('👥 CONGRESSIONAL MEMBERS DATA FETCHER');
  console.log('=====================================\n');

  const client = new MemberDataClient();
  let allMembers: any[] = [];

  // Try ProPublica API first (most comprehensive)
  try {
    const ppMembers = await client.fetchFromProPublica(119);
    const convertedPPMembers = ppMembers.map(m => client.convertProPublicaToPrisma(m));
    allMembers.push(...convertedPPMembers);
    console.log(`✅ ProPublica: ${convertedPPMembers.length} members`);
  } catch (error) {
    console.log(`⚠️ ProPublica API failed: ${error}`);
  }

  // Try Congress.gov API as backup/supplement
  try {
    const congressMembers = await client.fetchFromCongressAPI();
    const convertedCongressMembers = congressMembers
      .map(m => client.convertCongressAPItoPrisma(m))
      .filter(m => m !== null); // Filter out null entries
    
    // Merge with existing, preferring ProPublica data
    const existingIds = new Set(allMembers.map(m => m.id));
    const newMembers = convertedCongressMembers.filter(m => !existingIds.has(m.id));
    
    allMembers.push(...newMembers);
    console.log(`✅ Congress.gov: ${newMembers.length} additional members`);
  } catch (error) {
    console.log(`⚠️ Congress.gov API failed: ${error}`);
  }

  if (allMembers.length > 0) {
    await client.saveMembers(allMembers);
    
    console.log('\n🎉 MEMBER DATA FETCH COMPLETE!');
    console.log('==============================');
    console.log(`📊 Total members: ${allMembers.length}`);
    console.log(`🏛️ House: ${allMembers.filter(m => m.chamber === 'house').length}`);
    console.log(`🏛️ Senate: ${allMembers.filter(m => m.chamber === 'senate').length}`);
    console.log(`🔵 Democrats: ${allMembers.filter(m => m.party === 'D').length}`);
    console.log(`🔴 Republicans: ${allMembers.filter(m => m.party === 'R').length}`);
    console.log(`🟣 Independents: ${allMembers.filter(m => m.party === 'I').length}`);
    console.log('\n🗺️ Your map now has comprehensive member data!');
    console.log('   Visit: http://localhost:3000/map');
  } else {
    console.log('\n❌ No member data was fetched. Check your API keys.');
    console.log('\n🔑 Get API keys from:');
    console.log('   • ProPublica: https://www.propublica.org/datastore/api/propublica-congress-api');
    console.log('   • Congress.gov: https://api.congress.gov/sign-up/');
  }

  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
