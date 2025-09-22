/**
 * Congress.gov Bill Scraper
 * Scrapes the most recent bills from congress.gov and formats them for the database
 */

import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface ScrapedBill {
  id: string;
  congress: number;
  chamber: string;
  title: string;
  summary: string;
  status: string;
  sponsorId?: string;
  sponsorName?: string;
  introducedDate: string;
  lastAction: string;
  lastActionText: string;
  sourceUrl: string;
  propublicaUrl?: string;
  currentStage: string;
  timeline: Array<{
    date: string;
    action: string;
    chamber: string;
  }>;
  votes: Array<{
    date: string;
    chamber: string;
    yeas: number;
    nays: number;
    result: string;
  }>;
  cosponsors: number;
  subjects: string[];
}

export class CongressBillScraper {
  private browser: puppeteer.Browser | null = null;
  private rateLimitDelay = 2000; // 2 seconds between requests
  private maxRetries = 3;
  private requestCount = 0;
  private lastRequestTime = 0;

  async initializeBrowser(): Promise<void> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      });
    }
  }

  async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  private async rateLimitDelayMethod(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.rateLimitDelay) {
      await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay - timeSinceLastRequest));
    }
    this.lastRequestTime = Date.now();
    this.requestCount++;
  }

  async scrapeRecentBills(limit: number = 50): Promise<ScrapedBill[]> {
    console.log(`Starting congress.gov scrape for ${limit} recent bills...`);
    
    try {
      await this.initializeBrowser();
      if (!this.browser) throw new Error('Browser failed to initialize');

      const bills: ScrapedBill[] = [];
      
      // Scrape both House and Senate bills
      const houseBills = await this.scrapeChamberBills('house', Math.ceil(limit / 2));
      const senateBills = await this.scrapeChamberBills('senate', Math.floor(limit / 2));
      
      bills.push(...houseBills, ...senateBills);
      
      // Sort by introduced date (most recent first)
      bills.sort((a, b) => new Date(b.introducedDate).getTime() - new Date(a.introducedDate).getTime());
      
      return bills.slice(0, limit);
    } catch (error) {
      console.error('Error scraping congress.gov:', error);
      return [];
    } finally {
      await this.closeBrowser();
    }
  }

  private async scrapeChamberBills(chamber: 'house' | 'senate', limit: number): Promise<ScrapedBill[]> {
    const bills: ScrapedBill[] = [];
    
    try {
      await this.rateLimitDelayMethod();
      
      if (!this.browser) throw new Error('Browser not initialized');
      const page = await this.browser.newPage();
      
      // Set user agent
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      // Navigate to the recent bills page for the chamber
      const congress = 119; // Current congress
      const chamberParam = chamber === 'house' ? 'house-bill' : 'senate-bill';
      const url = `https://www.congress.gov/search?q=%7B%22source%22%3A%22legislation%22%2C%22type%22%3A%22bills%22%2C%22congress%22%3A%22${congress}%22%2C%22bill-type%22%3A%22${chamberParam}%22%7D&pageSort=latestAction%3Adesc`;
      
      console.log(`Scraping ${chamber} bills from: ${url}`);
      
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      
      // Wait for the search results to load
      await page.waitForSelector('.results-item', { timeout: 10000 });
      
      const content = await page.content();
      const $ = cheerio.load(content);
      
      // Parse bill list
      $('.results-item').each((index, element) => {
        if (bills.length >= limit) return false; // Stop when we have enough
        
        try {
          const bill = this.parseBillFromSearchResult($, element, chamber, congress);
          if (bill) {
            bills.push(bill);
          }
        } catch (error) {
          console.error(`Error parsing bill ${index}:`, error);
        }
      });
      
      await page.close();
      
      // Get detailed information for each bill
      for (let i = 0; i < Math.min(bills.length, limit); i++) {
        try {
          const detailedBill = await this.getBillDetails(bills[i]);
          if (detailedBill) {
            bills[i] = detailedBill;
          }
        } catch (error) {
          console.error(`Error getting details for bill ${bills[i].id}:`, error);
        }
      }
      
      return bills;
    } catch (error) {
      console.error(`Error scraping ${chamber} bills:`, error);
      return bills;
    }
  }

  private parseBillFromSearchResult($: cheerio.CheerioAPI, element: cheerio.Element, chamber: string, congress: number): ScrapedBill | null {
    try {
      const $el = $(element);
      
      // Extract bill number and title
      const titleLink = $el.find('.result-heading a').first();
      const fullTitle = titleLink.text().trim();
      const billUrl = 'https://www.congress.gov' + titleLink.attr('href');
      
      // Parse bill number (e.g., "H.R.1" or "S.2")
      const billNumberMatch = fullTitle.match(/^(H\.R\.|S\.)(\d+)/);
      if (!billNumberMatch) return null;
      
      const billNumber = billNumberMatch[2];
      const billType = billNumberMatch[1] === 'H.R.' ? 'hr' : 's';
      const billId = `${billType}${billNumber}-${congress}`;
      
      // Extract title (remove bill number prefix)
      const title = fullTitle.replace(/^(H\.R\.|S\.)\d+\s*-?\s*/, '').trim();
      
      // Extract sponsor
      const sponsorText = $el.find('.result-item').text();
      const sponsorMatch = sponsorText.match(/Sponsor:\s*([^,\n]+)/);
      const sponsorName = sponsorMatch ? sponsorMatch[1].trim() : undefined;
      
      // Extract introduced date
      const introducedMatch = sponsorText.match(/Introduced:\s*(\d{2}\/\d{2}\/\d{4})/);
      const introducedDate = introducedMatch ? 
        new Date(introducedMatch[1]).toISOString().split('T')[0] : 
        new Date().toISOString().split('T')[0];
      
      // Extract latest action
      const latestActionMatch = sponsorText.match(/Latest Action:\s*(\d{2}\/\d{2}\/\d{4})\s*([^\.]+)/);
      const lastAction = latestActionMatch ? 
        new Date(latestActionMatch[1]).toISOString().split('T')[0] : 
        introducedDate;
      const lastActionText = latestActionMatch ? latestActionMatch[2].trim() : 'Introduced';
      
      return {
        id: billId,
        congress,
        chamber,
        title,
        summary: '', // Will be filled in getBillDetails
        status: this.determineStatus(lastActionText),
        sponsorName,
        introducedDate,
        lastAction,
        lastActionText,
        sourceUrl: billUrl,
        propublicaUrl: `https://projects.propublica.org/represent/bills/${congress}/${billType}${billNumber}`,
        currentStage: this.determineCurrentStage(lastActionText),
        timeline: [], // Will be filled in getBillDetails
        votes: [], // Will be filled in getBillDetails
        cosponsors: 0, // Will be filled in getBillDetails
        subjects: [] // Will be filled in getBillDetails
      };
    } catch (error) {
      console.error('Error parsing bill from search result:', error);
      return null;
    }
  }

  private async getBillDetails(bill: ScrapedBill): Promise<ScrapedBill | null> {
    try {
      await this.rateLimitDelayMethod();
      
      if (!this.browser) throw new Error('Browser not initialized');
      const page = await this.browser.newPage();
      
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      console.log(`Getting details for ${bill.id} from ${bill.sourceUrl}`);
      
      await page.goto(bill.sourceUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      
      const content = await page.content();
      const $ = cheerio.load(content);
      
      // Extract summary
      const summary = $('.standard_box .overview p').first().text().trim() || 
                     $('.bill-summary p').first().text().trim() || 
                     'Summary not available';
      
      // Extract subjects/topics
      const subjects: string[] = [];
      $('.bill-topics li, .subjects li').each((_, el) => {
        const subject = $(el).text().trim();
        if (subject && !subjects.includes(subject)) {
          subjects.push(subject);
        }
      });
      
      // Extract cosponsors count
      const cosponsorMatch = content.match(/(\d+)\s*cosponsor/i);
      const cosponsors = cosponsorMatch ? parseInt(cosponsorMatch[1]) : 0;
      
      // Extract timeline from actions tab
      const timeline = await this.extractTimeline(page, $);
      
      await page.close();
      
      return {
        ...bill,
        summary: summary.substring(0, 500), // Limit summary length
        subjects: subjects.slice(0, 6), // Limit subjects
        cosponsors,
        timeline
      };
    } catch (error) {
      console.error(`Error getting details for bill ${bill.id}:`, error);
      return bill; // Return original bill if details fail
    }
  }

  private async extractTimeline(page: puppeteer.Page, $: cheerio.CheerioAPI): Promise<Array<{date: string, action: string, chamber: string}>> {
    const timeline: Array<{date: string, action: string, chamber: string}> = [];
    
    try {
      // Look for actions section
      $('.actions-list tr, .bill-actions tr').each((_, row) => {
        const $row = $(row);
        const dateText = $row.find('td').first().text().trim();
        const actionText = $row.find('td').eq(1).text().trim();
        
        if (dateText && actionText) {
          const dateMatch = dateText.match(/(\d{2}\/\d{2}\/\d{4})/);
          if (dateMatch) {
            const date = new Date(dateMatch[1]).toISOString().split('T')[0];
            const chamber = actionText.toLowerCase().includes('senate') ? 'senate' : 'house';
            
            timeline.push({
              date,
              action: actionText.substring(0, 200), // Limit action text
              chamber
            });
          }
        }
      });
      
      // Sort by date (oldest first)
      timeline.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      return timeline.slice(0, 10); // Limit to 10 most recent actions
    } catch (error) {
      console.error('Error extracting timeline:', error);
      return [];
    }
  }

  private determineStatus(lastActionText: string): string {
    const text = lastActionText.toLowerCase();
    
    if (text.includes('became public law') || text.includes('enacted')) return 'Enacted';
    if (text.includes('passed house') && text.includes('passed senate')) return 'Passed Both Chambers';
    if (text.includes('passed house')) return 'Passed House';
    if (text.includes('passed senate')) return 'Passed Senate';
    if (text.includes('failed') || text.includes('rejected')) return 'Failed';
    if (text.includes('committee')) return 'In Committee';
    if (text.includes('floor')) return 'On Floor';
    if (text.includes('introduced')) return 'Introduced';
    
    return 'In Progress';
  }

  private determineCurrentStage(lastActionText: string): string {
    const text = lastActionText.toLowerCase();
    
    if (text.includes('became public law')) return 'Enacted into Law';
    if (text.includes('passed house') && text.includes('passed senate')) return 'Awaiting President';
    if (text.includes('passed house')) return 'Senate Committee';
    if (text.includes('passed senate')) return 'House Committee';
    if (text.includes('committee')) return 'Committee Review';
    if (text.includes('floor')) return 'Floor Consideration';
    if (text.includes('introduced')) return 'Recently Introduced';
    
    return 'Legislative Process';
  }

  async saveBillsToDatabase(bills: ScrapedBill[]): Promise<void> {
    console.log(`Saving ${bills.length} bills to database...`);
    
    for (const bill of bills) {
      try {
        // Try to find existing member by name
        let sponsorId = bill.sponsorId;
        if (!sponsorId && bill.sponsorName) {
          const member = await this.findMemberByName(bill.sponsorName);
          sponsorId = member?.id;
        }
        
        // Upsert bill
        await prisma.bill.upsert({
          where: { id: bill.id },
          update: {
            title: bill.title,
            summary: bill.summary,
            status: bill.status,
            sponsorId,
            updatedAt: new Date()
          },
          create: {
            id: bill.id,
            congress: bill.congress,
            chamber: bill.chamber,
            title: bill.title,
            summary: bill.summary,
            status: bill.status,
            sponsorId
          }
        });
        
        // Save timeline as bill actions
        for (const action of bill.timeline) {
          await prisma.billAction.upsert({
            where: { id: `${bill.id}-${action.date}-${action.action.substring(0, 50)}` },
            update: {
              date: new Date(action.date),
              chamber: action.chamber,
              stage: this.determineStage(action.action),
              text: action.action,
              sourceUrl: bill.sourceUrl
            },
            create: {
              id: `${bill.id}-${action.date}-${action.action.substring(0, 50)}`,
              billId: bill.id,
              date: new Date(action.date),
              chamber: action.chamber,
              stage: this.determineStage(action.action),
              text: action.action,
              sourceUrl: bill.sourceUrl
            }
          });
        }
        
        console.log(`✅ Saved bill: ${bill.id} - ${bill.title}`);
      } catch (error) {
        console.error(`❌ Error saving bill ${bill.id}:`, error);
      }
    }
  }

  private async findMemberByName(sponsorName: string): Promise<{id: string} | null> {
    try {
      // Clean up sponsor name
      const cleanName = sponsorName.replace(/^(Rep\.|Sen\.|Mr\.|Ms\.|Mrs\.)\s*/i, '').trim();
      const [lastName, firstName] = cleanName.split(',').map(s => s.trim());
      
      if (!firstName || !lastName) {
        // Try different format
        const parts = cleanName.split(' ');
        if (parts.length >= 2) {
          const member = await prisma.member.findFirst({
            where: {
              OR: [
                {
                  firstName: { contains: parts[0], mode: 'insensitive' },
                  lastName: { contains: parts[parts.length - 1], mode: 'insensitive' }
                },
                {
                  firstName: { contains: parts[parts.length - 1], mode: 'insensitive' },
                  lastName: { contains: parts[0], mode: 'insensitive' }
                }
              ]
            },
            select: { id: true }
          });
          return member;
        }
        return null;
      }
      
      const member = await prisma.member.findFirst({
        where: {
          firstName: { contains: firstName, mode: 'insensitive' },
          lastName: { contains: lastName, mode: 'insensitive' }
        },
        select: { id: true }
      });
      
      return member;
    } catch (error) {
      console.error('Error finding member by name:', error);
      return null;
    }
  }

  private determineStage(actionText: string): string {
    const text = actionText.toLowerCase();
    
    if (text.includes('introduced')) return 'introduced';
    if (text.includes('committee')) return 'committee';
    if (text.includes('floor') || text.includes('passed')) return 'floor';
    if (text.includes('enacted') || text.includes('became law')) return 'enacted';
    
    return 'other';
  }
}

// CLI function to run the scraper
export async function scrapeBillsFromCongress(limit: number = 50): Promise<ScrapedBill[]> {
  const scraper = new CongressBillScraper();
  
  try {
    const bills = await scraper.scrapeRecentBills(limit);
    console.log(`Successfully scraped ${bills.length} bills from congress.gov`);
    
    if (bills.length > 0) {
      await scraper.saveBillsToDatabase(bills);
      console.log('Bills saved to database successfully!');
    }
    
    return bills;
  } catch (error) {
    console.error('Error in bill scraping process:', error);
    return [];
  } finally {
    await scraper.closeBrowser();
  }
}

// CongressBillScraper is already exported above
