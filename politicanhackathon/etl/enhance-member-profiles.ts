import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface DetailedMemberData {
  bioguideId: string;
  birthYear?: string;
  directOrderName: string;
  firstName: string;
  lastName: string;
  honorificName?: string;
  invertedOrderName: string;
  state: string;
  partyHistory: Array<{
    partyAbbreviation: string;
    partyName: string;
    startYear: number;
    endYear?: number;
  }>;
  terms: Array<{
    chamber: string;
    congress: number;
    startYear: number;
    endYear: number;
    memberType: string;
    stateCode: string;
    stateName: string;
  }>;
  leadership?: Array<{
    congress: number;
    type: string;
  }>;
  depiction?: {
    imageUrl: string;
    attribution: string;
  };
  sponsoredLegislation: {
    count: number;
    url: string;
  };
  cosponsoredLegislation: {
    count: number;
    url: string;
  };
  updateDate: string;
}

export interface SponsoredLegislation {
  congress: number;
  introducedDate: string;
  latestAction: {
    actionDate: string;
    text: string;
  };
  number: string;
  policyArea?: {
    name: string;
  };
  title: string;
  type: string;
  url: string;
}

export class MemberProfileEnhancer {
  private apiKey: string;
  private baseUrl = 'https://api.congress.gov/v3';
  private rateLimitDelay = 250; // Be conservative with member detail requests

  constructor() {
    this.apiKey = process.env.CONGRESS_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('CONGRESS_API_KEY is required for member profile enhancement');
    }
  }

  private async makeRequest(endpoint: string): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    
    await this.rateLimitDelayMethod();
    
    const response = await fetch(url, {
      headers: {
        'X-Api-Key': this.apiKey,
        'User-Agent': 'AGORA Political Intelligence - Member Profile Enhancement'
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

  async getDetailedMemberInfo(bioguideId: string): Promise<DetailedMemberData | null> {
    try {
      console.log(`📋 Fetching detailed info for member ${bioguideId}...`);
      
      const response = await this.makeRequest(`/member/${bioguideId}?format=json`);
      const member = response.member;
      
      if (!member) {
        console.warn(`No detailed data found for member ${bioguideId}`);
        return null;
      }

      return member as DetailedMemberData;
    } catch (error) {
      console.error(`Error fetching member details for ${bioguideId}:`, error);
      return null;
    }
  }

  async getSponsoredLegislation(bioguideId: string, limit: number = 20): Promise<SponsoredLegislation[]> {
    try {
      console.log(`📜 Fetching sponsored legislation for ${bioguideId}...`);
      
      const response = await this.makeRequest(`/member/${bioguideId}/sponsored-legislation?format=json&limit=${limit}&sort=introducedDate+desc`);
      
      return response.sponsoredLegislation || [];
    } catch (error) {
      console.error(`Error fetching sponsored legislation for ${bioguideId}:`, error);
      return [];
    }
  }

  async getCosponsoredLegislation(bioguideId: string, limit: number = 20): Promise<SponsoredLegislation[]> {
    try {
      console.log(`📝 Fetching cosponsored legislation for ${bioguideId}...`);
      
      const response = await this.makeRequest(`/member/${bioguideId}/cosponsored-legislation?format=json&limit=${limit}&sort=introducedDate+desc`);
      
      return response.cosponsoredLegislation || [];
    } catch (error) {
      console.error(`Error fetching cosponsored legislation for ${bioguideId}:`, error);
      return [];
    }
  }

  async enhanceAllMemberProfiles(): Promise<void> {
    console.log('🚀 Starting comprehensive member profile enhancement...');
    
    // Get all members from database
    const members = await prisma.member.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true
      }
    });

    console.log(`📊 Found ${members.length} members to enhance`);
    
    let processed = 0;
    let enhanced = 0;
    
    for (const member of members) {
      try {
        console.log(`\n🔍 Processing member ${processed + 1}/${members.length}: ${member.firstName} ${member.lastName} (${member.id})`);
        
        // Get detailed member information
        const detailedInfo = await this.getDetailedMemberInfo(member.id);
        
        if (!detailedInfo) {
          console.warn(`⚠️ No detailed info available for ${member.id}`);
          processed++;
          continue;
        }

        // Get recent legislative activity
        const [sponsoredBills, cosponsoredBills] = await Promise.all([
          this.getSponsoredLegislation(member.id, 10),
          this.getCosponsoredLegislation(member.id, 10)
        ]);

        // Generate comprehensive profile data
        const profileData = this.generateProfileData(detailedInfo, sponsoredBills, cosponsoredBills);
        
        // Update member record
        await this.updateMemberProfile(member.id, profileData);
        
        enhanced++;
        console.log(`✅ Enhanced profile for ${detailedInfo.directOrderName}`);
        
      } catch (error) {
        console.error(`❌ Error processing member ${member.id}:`, error);
      }
      
      processed++;
      
      // Progress update every 10 members
      if (processed % 10 === 0) {
        console.log(`\n📈 Progress: ${processed}/${members.length} processed, ${enhanced} enhanced`);
      }
    }

    console.log(`\n🎉 Member profile enhancement completed!`);
    console.log(`📊 Final stats: ${processed} processed, ${enhanced} enhanced`);
  }

  private generateProfileData(
    memberInfo: DetailedMemberData, 
    sponsored: SponsoredLegislation[], 
    cosponsored: SponsoredLegislation[]
  ) {
    // Generate bio from official data
    const bio = this.generateBiography(memberInfo);
    
    // Generate political background
    const politicalBackground = this.generatePoliticalBackground(memberInfo);
    
    // Generate key positions from recent legislation
    const keyPositions = this.generateKeyPositions(sponsored, cosponsored);
    
    // Generate recent bills summary
    const recentBills = this.generateRecentBillsSummary(sponsored, cosponsored);
    
    // Generate voting record summary
    const votingRecord = this.generateVotingRecordSummary(memberInfo, sponsored, cosponsored);
    
    // Generate contact info
    const contactInfo = this.generateContactInfo(memberInfo);

    return {
      bio,
      politicalBackground,
      keyPositions: JSON.stringify(keyPositions),
      recentBills: JSON.stringify(recentBills),
      votingRecord: JSON.stringify(votingRecord),
      contactInfo: JSON.stringify(contactInfo)
    };
  }

  private generateBiography(memberInfo: DetailedMemberData): string {
    const currentTerm = memberInfo.terms[memberInfo.terms.length - 1];
    const currentParty = memberInfo.partyHistory[memberInfo.partyHistory.length - 1];
    
    let bio = `${memberInfo.directOrderName} serves as a ${currentParty.partyName} ${currentTerm.memberType} representing ${memberInfo.state}.`;
    
    if (memberInfo.birthYear) {
      bio += ` Born in ${memberInfo.birthYear}.`;
    }
    
    // Add leadership roles
    if (memberInfo.leadership && memberInfo.leadership.length > 0) {
      const currentLeadership = memberInfo.leadership[memberInfo.leadership.length - 1];
      bio += ` Currently serves as ${currentLeadership.type}.`;
    }
    
    // Add legislative activity
    bio += ` Has sponsored ${memberInfo.sponsoredLegislation.count} bills and cosponsored ${memberInfo.cosponsoredLegislation.count} pieces of legislation.`;
    
    // Add service duration
    const firstTerm = memberInfo.terms[0];
    const yearsOfService = currentTerm.endYear - firstTerm.startYear;
    bio += ` Has served in Congress for ${yearsOfService} years, beginning in ${firstTerm.startYear}.`;

    return bio;
  }

  private generatePoliticalBackground(memberInfo: DetailedMemberData): string {
    const currentTerm = memberInfo.terms[memberInfo.terms.length - 1];
    const allTerms = memberInfo.terms;
    
    let background = `Elected to the ${currentTerm.chamber} in ${currentTerm.startYear}.`;
    
    // Party history
    if (memberInfo.partyHistory.length > 1) {
      background += ` Party affiliations: `;
      memberInfo.partyHistory.forEach((party, index) => {
        if (index > 0) background += ', ';
        background += `${party.partyName} (${party.startYear}${party.endYear ? `-${party.endYear}` : '-present'})`;
      });
      background += '.';
    } else {
      const party = memberInfo.partyHistory[0];
      background += ` ${party.partyName} party member since ${party.startYear}.`;
    }
    
    // Leadership positions
    if (memberInfo.leadership && memberInfo.leadership.length > 0) {
      background += ` Leadership positions held: `;
      memberInfo.leadership.forEach((leadership, index) => {
        if (index > 0) background += ', ';
        background += `${leadership.type} (${leadership.congress}th Congress)`;
      });
      background += '.';
    }
    
    // Chamber changes
    const chambers = [...new Set(allTerms.map(term => term.chamber))];
    if (chambers.length > 1) {
      background += ` Has served in both the House of Representatives and the Senate.`;
    }

    return background;
  }

  private generateKeyPositions(sponsored: SponsoredLegislation[], cosponsored: SponsoredLegislation[]): any {
    const policyAreas: Record<string, number> = {};
    
    // Analyze policy areas from sponsored legislation
    sponsored.forEach(bill => {
      if (bill.policyArea?.name) {
        policyAreas[bill.policyArea.name] = (policyAreas[bill.policyArea.name] || 0) + 2; // Weight sponsored higher
      }
    });
    
    // Analyze policy areas from cosponsored legislation
    cosponsored.forEach(bill => {
      if (bill.policyArea?.name) {
        policyAreas[bill.policyArea.name] = (policyAreas[bill.policyArea.name] || 0) + 1;
      }
    });
    
    // Get top policy areas
    const topAreas = Object.entries(policyAreas)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([area, count]) => ({ area, billCount: count }));

    return {
      topPolicyAreas: topAreas,
      totalSponsoredBills: sponsored.length,
      totalCosponsoredBills: cosponsored.length,
      mostRecentActivity: sponsored[0]?.introducedDate || cosponsored[0]?.introducedDate
    };
  }

  private generateRecentBillsSummary(sponsored: SponsoredLegislation[], cosponsored: SponsoredLegislation[]): any {
    return {
      recentSponsored: sponsored.slice(0, 5).map(bill => ({
        title: bill.title,
        type: bill.type,
        number: bill.number,
        introducedDate: bill.introducedDate,
        latestAction: bill.latestAction.text,
        policyArea: bill.policyArea?.name
      })),
      recentCosponsored: cosponsored.slice(0, 5).map(bill => ({
        title: bill.title,
        type: bill.type,
        number: bill.number,
        introducedDate: bill.introducedDate,
        latestAction: bill.latestAction.text,
        policyArea: bill.policyArea?.name
      }))
    };
  }

  private generateVotingRecordSummary(
    memberInfo: DetailedMemberData, 
    sponsored: SponsoredLegislation[], 
    cosponsored: SponsoredLegislation[]
  ): any {
    return {
      legislativeProductivity: {
        sponsoredCount: memberInfo.sponsoredLegislation.count,
        cosponsoredCount: memberInfo.cosponsoredLegislation.count,
        productivity: memberInfo.sponsoredLegislation.count + (memberInfo.cosponsoredLegislation.count * 0.1)
      },
      recentActivity: {
        lastSponsoredBill: sponsored[0]?.introducedDate,
        lastCosponsoredBill: cosponsored[0]?.introducedDate
      },
      focus: this.getMemberFocus(sponsored, cosponsored)
    };
  }

  private getMemberFocus(sponsored: SponsoredLegislation[], cosponsored: SponsoredLegislation[]): string {
    const allBills = [...sponsored, ...cosponsored];
    const policyAreas: Record<string, number> = {};
    
    allBills.forEach(bill => {
      if (bill.policyArea?.name) {
        policyAreas[bill.policyArea.name] = (policyAreas[bill.policyArea.name] || 0) + 1;
      }
    });
    
    const topArea = Object.entries(policyAreas)
      .sort(([,a], [,b]) => b - a)[0];
    
    return topArea ? topArea[0] : 'General Legislation';
  }

  private generateContactInfo(memberInfo: DetailedMemberData): any {
    return {
      state: memberInfo.state,
      directOrderName: memberInfo.directOrderName,
      honorificName: memberInfo.honorificName,
      imageUrl: memberInfo.depiction?.imageUrl,
      imageAttribution: memberInfo.depiction?.attribution,
      chamber: memberInfo.terms[memberInfo.terms.length - 1].chamber,
      party: memberInfo.partyHistory[memberInfo.partyHistory.length - 1].partyName
    };
  }

  private async updateMemberProfile(bioguideId: string, profileData: any): Promise<void> {
    try {
      await prisma.member.update({
        where: { id: bioguideId },
        data: profileData
      });
    } catch (error) {
      console.error(`Error updating profile for ${bioguideId}:`, error);
      throw error;
    }
  }

  async enhanceSpecificMembers(bioguideIds: string[]): Promise<void> {
    console.log(`🎯 Enhancing specific members: ${bioguideIds.join(', ')}`);
    
    for (const bioguideId of bioguideIds) {
      try {
        const member = await prisma.member.findUnique({
          where: { id: bioguideId },
          select: { firstName: true, lastName: true }
        });
        
        if (!member) {
          console.warn(`Member ${bioguideId} not found in database`);
          continue;
        }
        
        console.log(`\n🔍 Enhancing ${member.firstName} ${member.lastName} (${bioguideId})`);
        
        const detailedInfo = await this.getDetailedMemberInfo(bioguideId);
        if (!detailedInfo) continue;
        
        const [sponsoredBills, cosponsoredBills] = await Promise.all([
          this.getSponsoredLegislation(bioguideId, 15),
          this.getCosponsoredLegislation(bioguideId, 15)
        ]);
        
        const profileData = this.generateProfileData(detailedInfo, sponsoredBills, cosponsoredBills);
        await this.updateMemberProfile(bioguideId, profileData);
        
        console.log(`✅ Enhanced profile for ${detailedInfo.directOrderName}`);
        
      } catch (error) {
        console.error(`❌ Error enhancing member ${bioguideId}:`, error);
      }
    }
  }
}

// Main execution function
async function main() {
  const enhancer = new MemberProfileEnhancer();
  
  try {
    // Check command line arguments for specific members
    const args = process.argv.slice(2);
    
    if (args.length > 0) {
      // Enhance specific members
      await enhancer.enhanceSpecificMembers(args);
    } else {
      // Enhance all members (this will take a while!)
      console.log('⚠️ This will enhance ALL member profiles and may take 30+ minutes due to API rate limits');
      console.log('💡 To enhance specific members, pass bioguide IDs as arguments');
      console.log('📝 Example: npm run etl:enhance-members L000174 S000033');
      
      await enhancer.enhanceAllMemberProfiles();
    }

    console.log('\n🎉 Member profile enhancement completed successfully!');
    
  } catch (error) {
    console.error('❌ Error in member enhancement process:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Allow this to be run directly
if (require.main === module) {
  main().catch(console.error);
}

export { main as enhanceMemberProfiles };
