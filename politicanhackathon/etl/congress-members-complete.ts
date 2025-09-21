import { PrismaClient } from '@prisma/client';
import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';

const prisma = new PrismaClient();

export interface CongressMemberData {
  bioguideId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  party: string;
  state: string;
  district?: string;
  chamber: 'house' | 'senate';
  imageUrl?: string;
  officialWebsite?: string;
  committees?: string[];
}

export class CongressMembersScraper {
  private browser: puppeteer.Browser | null = null;
  private apiKey: string;
  private baseUrl = 'https://api.congress.gov/v3';
  private rateLimitDelay = 150; // Be conservative with API calls

  constructor() {
    this.apiKey = process.env.CONGRESS_API_KEY || '';
    if (!this.apiKey) {
      console.warn('⚠️ CONGRESS_API_KEY not set. Will use web scraping only.');
    }
  }

  async initialize(): Promise<void> {
    console.log('🚀 Initializing Congress Members Scraper...');
    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security'
      ]
    });
  }

  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
    await prisma.$disconnect();
  }

  private async makeApiRequest(endpoint: string): Promise<any> {
    if (!this.apiKey) {
      throw new Error('Congress API key not configured');
    }

    const separator = endpoint.includes('?') ? '&' : '?';
    const url = `${this.baseUrl}${endpoint}${separator}format=json`;
    
    await this.rateLimitDelayMethod();
    
    const response = await fetch(url, {
      headers: {
        'X-Api-Key': this.apiKey,
        'User-Agent': 'Political Hackathon - Educational Congressional Data'
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

  async getAllMembersFromAPI(): Promise<CongressMemberData[]> {
    if (!this.apiKey) {
      console.log('📡 No API key - skipping API fetch');
      return [];
    }

    console.log('📡 Fetching all members from Congress.gov API...');
    const members: CongressMemberData[] = [];

    try {
      // Get current members from 119th Congress
      const response = await this.makeApiRequest('/member?limit=1000&currentMember=true');
      const apiMembers = response.members || [];

      console.log(`✅ Found ${apiMembers.length} members from API`);

      // Process each member for detailed info
      for (const member of apiMembers) {
        try {
          const detailed = await this.getMemberDetails(member.bioguideId);
          if (detailed) {
            members.push(detailed);
          }
        } catch (error) {
          console.warn(`Could not get details for ${member.bioguideId}:`, error);
          // Use basic member info as fallback
          members.push(this.convertBasicMemberData(member));
        }
      }

      return members;
    } catch (error) {
      console.error('Error fetching members from Congress API:', error);
      return [];
    }
  }

  async getMemberDetails(bioguideId: string): Promise<CongressMemberData | null> {
    try {
      const response = await this.makeApiRequest(`/member/${bioguideId}`);
      const member = response.member;

      if (!member) return null;

      const currentTerm = member.terms?.[member.terms.length - 1];
      if (!currentTerm) return null;

      return {
        bioguideId: member.bioguideId,
        firstName: member.firstName || '',
        lastName: member.lastName || '',
        fullName: `${member.firstName || ''} ${member.lastName || ''}`.trim(),
        party: currentTerm.party || 'Unknown',
        state: currentTerm.state || '',
        district: currentTerm.district?.toString() || undefined,
        chamber: currentTerm.chamber === 'House of Representatives' ? 'house' : 'senate',
        imageUrl: member.depiction?.imageUrl || undefined,
        officialWebsite: member.officialWebsiteUrl || undefined,
      };
    } catch (error) {
      console.error(`Error fetching details for ${bioguideId}:`, error);
      return null;
    }
  }

  private convertBasicMemberData(member: any): CongressMemberData {
    return {
      bioguideId: member.bioguideId || '',
      firstName: member.firstName || '',
      lastName: member.lastName || '',
      fullName: `${member.firstName || ''} ${member.lastName || ''}`.trim(),
      party: member.party || 'Unknown',
      state: member.state || '',
      district: member.district?.toString() || undefined,
      chamber: member.chamber === 'House of Representatives' ? 'house' : 'senate',
    };
  }

  async scrapeCongressWebsite(): Promise<CongressMemberData[]> {
    if (!this.browser) {
      throw new Error('Browser not initialized');
    }

    console.log('🌐 Scraping congress.gov members page...');
    const members: CongressMemberData[] = [];

    try {
      const page = await this.browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

      // Scrape House members
      console.log('🏛️ Scraping House Representatives...');
      await page.goto('https://www.congress.gov/members?q={%22congress%22:119,%22chamber%22:%22House%22}', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      await page.waitForSelector('.results-list', { timeout: 10000 });
      const houseHtml = await page.content();
      const houseMembers = this.parseMembers(houseHtml, 'house');
      members.push(...houseMembers);

      console.log(`✅ Found ${houseMembers.length} House representatives`);

      // Scrape Senate members
      console.log('🏛️ Scraping Senators...');
      await page.goto('https://www.congress.gov/members?q={%22congress%22:119,%22chamber%22:%22Senate%22}', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      await page.waitForSelector('.results-list', { timeout: 10000 });
      const senateHtml = await page.content();
      const senateMembers = this.parseMembers(senateHtml, 'senate');
      members.push(...senateMembers);

      console.log(`✅ Found ${senateMembers.length} Senators`);

      await page.close();
      return members;

    } catch (error) {
      console.error('Error scraping congress.gov:', error);
      return [];
    }
  }

  private parseMembers(html: string, chamber: 'house' | 'senate'): CongressMemberData[] {
    const $ = cheerio.load(html);
    const members: CongressMemberData[] = [];

    $('.results-list .expanded').each((index, element) => {
      try {
        const $member = $(element);
        
        // Extract name and basic info
        const nameText = $member.find('h3 a').text().trim();
        const fullName = nameText.replace(/,.*$/, '').trim(); // Remove title suffixes
        
        // Parse name parts
        const nameParts = fullName.split(' ');
        const lastName = nameParts[nameParts.length - 1];
        const firstName = nameParts.slice(0, -1).join(' ');

        // Extract party and state
        const detailsText = $member.find('.member-details').text();
        const partyMatch = detailsText.match(/\[([DRI])\]/);
        const party = partyMatch ? partyMatch[1] : 'Unknown';

        const stateMatch = detailsText.match(/([A-Z]{2})/);
        const state = stateMatch ? stateMatch[1] : '';

        // Extract district for House members
        let district: string | undefined;
        if (chamber === 'house') {
          const districtMatch = detailsText.match(/District (\d+)/);
          district = districtMatch ? districtMatch[1] : undefined;
        }

        // Generate bioguide ID (simplified approach)
        const bioguideId = this.generateBioguideId(firstName, lastName, state);

        const member: CongressMemberData = {
          bioguideId,
          firstName,
          lastName,
          fullName,
          party,
          state,
          district,
          chamber,
        };

        members.push(member);
      } catch (error) {
        console.warn('Error parsing member:', error);
      }
    });

    return members;
  }

  private generateBioguideId(firstName: string, lastName: string, state: string): string {
    // Simple bioguide ID generation for database consistency
    const firstLetter = lastName.charAt(0).toUpperCase();
    const lastNamePart = lastName.substring(1, 7).toUpperCase();
    const firstNamePart = firstName.charAt(0).toUpperCase();
    const statePart = state.substring(0, 2);
    
    return `${firstLetter}${lastNamePart}${firstNamePart}${statePart}${Math.random().toString(36).substring(2, 4).toUpperCase()}`;
  }

  async getAllMembers(): Promise<CongressMemberData[]> {
    console.log('🎯 Starting comprehensive Congress members collection...');
    
    let members: CongressMemberData[] = [];

    // Try API first if available
    if (this.apiKey) {
      try {
        const apiMembers = await this.getAllMembersFromAPI();
        if (apiMembers.length > 0) {
          console.log(`✅ Got ${apiMembers.length} members from API`);
          members = apiMembers;
        }
      } catch (error) {
        console.warn('API failed, falling back to web scraping:', error);
      }
    }

    // Fallback to web scraping if API didn't work or returned insufficient data
    if (members.length < 500) { // Expect ~535 members
      console.log('🌐 API insufficient, using web scraping...');
      const scrapedMembers = await this.scrapeCongressWebsite();
      
      if (scrapedMembers.length > members.length) {
        members = scrapedMembers;
      }
    }

    console.log(`📊 Total members collected: ${members.length}`);
    return members;
  }

  async updateDatabase(members: CongressMemberData[]): Promise<void> {
    console.log('💾 Updating database with congress members...');

    // Clear existing members
    console.log('🗑️ Clearing existing member data...');
    await prisma.committee.deleteMany({});
    await prisma.member.deleteMany({});

    console.log('📝 Inserting new member data...');
    
    for (const member of members) {
      try {
        await prisma.member.create({
          data: {
            id: member.bioguideId,
            firstName: member.firstName,
            lastName: member.lastName,
            chamber: member.chamber,
            state: member.state,
            district: member.district,
            party: member.party,
            // Add any additional fields as needed
          }
        });
      } catch (error) {
        console.warn(`Error inserting member ${member.fullName}:`, error);
      }
    }

    console.log('✅ Database updated successfully');
  }

  async generateStats(): Promise<void> {
    const stats = await prisma.member.groupBy({
      by: ['chamber', 'party'],
      _count: {
        id: true
      }
    });

    console.log('\n📊 CONGRESS COMPOSITION STATS:');
    console.log('================================');
    
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
    console.log(`\n📈 Total Members: ${totalMembers}/535`);
  }
}

// Main execution function
async function main() {
  const scraper = new CongressMembersScraper();
  
  try {
    await scraper.initialize();
    
    const members = await scraper.getAllMembers();
    
    if (members.length === 0) {
      console.error('❌ No members found! Check API key and network connection.');
      return;
    }

    await scraper.updateDatabase(members);
    await scraper.generateStats();

    console.log('\n🎉 Congress members update completed successfully!');
    
  } catch (error) {
    console.error('❌ Error in main process:', error);
  } finally {
    await scraper.cleanup();
  }
}

// Allow this to be run directly
if (require.main === module) {
  main().catch(console.error);
}

export { main as updateCongressMembers };
