/**
 * Complete Congress.gov Web Scraper v2
 * Production-ready scraper with multiple strategies and robust error handling
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

export class CongressScraperV2 {
  private browser: puppeteer.Browser | null = null;
  private rateLimitDelay = 3000; // 3 seconds between requests
  private maxRetries = 3;
  private requestCount = 0;
  private lastRequestTime = 0;
  private currentCongress = 119;

  async initializeBrowser(): Promise<void> {
    if (!this.browser) {
      console.log('🚀 Initializing browser...');
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor'
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
      const waitTime = this.rateLimitDelay - timeSinceLastRequest;
      console.log(`⏳ Rate limiting: waiting ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    this.lastRequestTime = Date.now();
    this.requestCount++;
  }

  /**
   * Main scraping method - tries multiple strategies
   */
  async scrapeRecentBills(limit: number = 50): Promise<ScrapedBill[]> {
    console.log(`🏛️ Starting comprehensive congress.gov scrape for ${limit} bills...`);
    
    try {
      await this.initializeBrowser();
      if (!this.browser) throw new Error('Browser failed to initialize');

      const bills: ScrapedBill[] = [];
      
      // Strategy 1: Try the advanced search approach
      console.log('📊 Strategy 1: Advanced search approach...');
      const advancedBills = await this.scrapeWithAdvancedSearch(limit);
      bills.push(...advancedBills);
      
      if (bills.length < limit) {
        // Strategy 2: Try the simple listing approach
        console.log('📊 Strategy 2: Simple listing approach...');
        const simpleBills = await this.scrapeWithSimpleListing(limit - bills.length);
        bills.push(...simpleBills);
      }
      
      if (bills.length < limit) {
        // Strategy 3: Try the RSS/XML approach
        console.log('📊 Strategy 3: RSS/XML approach...');
        const rssBills = await this.scrapeWithRSS(limit - bills.length);
        bills.push(...rssBills);
      }
      
      // Remove duplicates and sort by date
      const uniqueBills = this.deduplicateBills(bills);
      uniqueBills.sort((a, b) => new Date(b.lastAction).getTime() - new Date(a.lastAction).getTime());
      
      return uniqueBills.slice(0, limit);
    } catch (error) {
      console.error('❌ Error in main scraping process:', error);
      return [];
    } finally {
      await this.closeBrowser();
    }
  }

  /**
   * Main scraping method that keeps browser open for enhancement
   */
  async scrapeRecentBillsKeepBrowser(limit: number = 50): Promise<ScrapedBill[]> {
    console.log(`🏛️ Starting comprehensive congress.gov scrape for ${limit} bills...`);
    
    try {
      await this.initializeBrowser();
      if (!this.browser) throw new Error('Browser failed to initialize');

      const bills: ScrapedBill[] = [];
      
      // Strategy 1: Try the advanced search approach
      console.log('📊 Strategy 1: Advanced search approach...');
      const advancedBills = await this.scrapeWithAdvancedSearch(limit);
      bills.push(...advancedBills);
      
      if (bills.length < limit) {
        // Strategy 2: Try the simple listing approach
        console.log('📊 Strategy 2: Simple listing approach...');
        const simpleBills = await this.scrapeWithSimpleListing(limit - bills.length);
        bills.push(...simpleBills);
      }
      
      if (bills.length < limit) {
        // Strategy 3: Try the RSS/XML approach
        console.log('📊 Strategy 3: RSS/XML approach...');
        const rssBills = await this.scrapeWithRSS(limit - bills.length);
        bills.push(...rssBills);
      }
      
      // Remove duplicates and sort by date
      const uniqueBills = this.deduplicateBills(bills);
      uniqueBills.sort((a, b) => new Date(b.lastAction).getTime() - new Date(a.lastAction).getTime());
      
      return uniqueBills.slice(0, limit);
    } catch (error) {
      console.error('❌ Error in main scraping process:', error);
      return [];
    }
    // Note: Browser stays open for enhancement phase
  }

  /**
   * Strategy 1: Advanced search with multiple selectors
   */
  private async scrapeWithAdvancedSearch(limit: number): Promise<ScrapedBill[]> {
    const bills: ScrapedBill[] = [];
    
    try {
      if (!this.browser) throw new Error('Browser not initialized');
      
      // Try both House and Senate
      for (const chamber of ['house', 'senate'] as const) {
        const chamberBills = await this.scrapeAdvancedSearchChamber(chamber, Math.ceil(limit / 2));
        bills.push(...chamberBills);
        
        if (bills.length >= limit) break;
      }
      
      return bills;
    } catch (error) {
      console.error('❌ Advanced search strategy failed:', error);
      return bills;
    }
  }

  private async scrapeAdvancedSearchChamber(chamber: 'house' | 'senate', limit: number): Promise<ScrapedBill[]> {
    const bills: ScrapedBill[] = [];
    
    try {
      await this.rateLimitDelayMethod();
      
      if (!this.browser) throw new Error('Browser not initialized');
      const page = await this.browser.newPage();
      
      // Set comprehensive headers
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      await page.setExtraHTTPHeaders({
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      });
      
      // Multiple URL strategies
      const urls = this.generateSearchUrls(chamber);
      
      for (const url of urls) {
        try {
          console.log(`🔍 Trying ${chamber} URL: ${url.substring(0, 100)}...`);
          
          await page.goto(url, { 
            waitUntil: 'networkidle0', 
            timeout: 30000 
          });
          
          // Wait for content to load
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          const content = await page.content();
          const $ = cheerio.load(content);
          
          console.log(`📄 Page title: ${$('title').text()}`);
          
          // Try multiple selector strategies
          const foundBills = await this.parseWithMultipleSelectors($, chamber);
          
          if (foundBills.length > 0) {
            console.log(`✅ Found ${foundBills.length} bills with this URL`);
            bills.push(...foundBills);
            break; // Success with this URL, move to next chamber
          }
          
        } catch (urlError) {
          console.log(`⚠️ URL failed: ${urlError}`);
          continue; // Try next URL
        }
      }
      
      await page.close();
      return bills.slice(0, limit);
      
    } catch (error) {
      console.error(`❌ Error scraping ${chamber} with advanced search:`, error);
      return bills;
    }
  }

  /**
   * Generate multiple search URLs to try
   */
  private generateSearchUrls(chamber: 'house' | 'senate'): string[] {
    const congress = this.currentCongress;
    const billType = chamber === 'house' ? 'house-bill' : 'senate-bill';
    
    return [
      // Strategy 1: Advanced search with JSON query
      `https://www.congress.gov/search?q=%7B%22source%22%3A%22legislation%22%2C%22type%22%3A%22bills%22%2C%22congress%22%3A%22${congress}%22%2C%22bill-type%22%3A%22${billType}%22%7D&pageSort=latestAction%3Adesc`,
      
      // Strategy 2: Simple search
      `https://www.congress.gov/search?q=congress%3A${congress}+type%3Abills&pageSort=latestAction%3Adesc`,
      
      // Strategy 3: Browse by congress
      `https://www.congress.gov/browse/bills/${congress}?pageSort=latestAction%3Adesc`,
      
      // Strategy 4: Direct chamber browse
      `https://www.congress.gov/browse/bills/${congress}/${chamber}?pageSort=latestAction%3Adesc`,
      
      // Strategy 5: Recent activity
      `https://www.congress.gov/search?q=%7B%22source%22%3A%22legislation%22%2C%22congress%22%3A%22${congress}%22%7D&pageSort=latestAction%3Adesc`
    ];
  }

  /**
   * Try multiple selector strategies to find bills
   */
  private async parseWithMultipleSelectors($: cheerio.CheerioAPI, chamber: string): Promise<ScrapedBill[]> {
    const bills: ScrapedBill[] = [];
    
    // Selector strategies to try
    const selectorStrategies = [
      // Strategy 1: Standard results
      '.results-item',
      '.result-item', 
      '.search-result-item',
      
      // Strategy 2: List items
      '.expanded-bill-sample',
      '.bill-item',
      '.legislation-item',
      
      // Strategy 3: Table rows
      'tr.results',
      'tbody tr',
      '.bill-summary-item',
      
      // Strategy 4: Generic containers
      '[data-bill-id]',
      '.bill-container',
      '.legislation-container',
      
      // Strategy 5: Broader selectors
      'li[class*="result"]',
      'div[class*="bill"]',
      'article'
    ];
    
    for (const selector of selectorStrategies) {
      const elements = $(selector);
      console.log(`🔍 Trying selector "${selector}": found ${elements.length} elements`);
      
      if (elements.length > 0) {
        elements.each((index, element) => {
          if (bills.length >= 20) return false; // Limit per selector
          
          try {
            const bill = this.parseBillElement($, element, chamber);
            if (bill) {
              bills.push(bill);
            }
          } catch (error) {
            console.log(`⚠️ Error parsing element ${index}:`, error);
          }
        });
        
        if (bills.length > 0) {
          console.log(`✅ Successfully parsed ${bills.length} bills with selector: ${selector}`);
          break; // Success with this selector
        }
      }
    }
    
    return bills;
  }

  /**
   * Parse individual bill element with multiple strategies
   */
  private parseBillElement($: cheerio.CheerioAPI, element: cheerio.Element, chamber: string): ScrapedBill | null {
    try {
      const $el = $(element);
      
      // Extract title and URL with multiple strategies
      const titleSelectors = [
        '.result-heading a',
        '.bill-title a',
        'h3 a',
        'h2 a',
        'a[href*="/bill/"]',
        '.title a',
        'a.bill-link'
      ];
      
      let titleLink: cheerio.Cheerio<cheerio.Element> | null = null;
      let title = '';
      let billUrl = '';
      
      for (const selector of titleSelectors) {
        const link = $el.find(selector).first();
        if (link.length > 0 && link.text().trim()) {
          titleLink = link;
          title = link.text().trim();
          const href = link.attr('href');
          if (href) {
            billUrl = href.startsWith('http') ? href : `https://www.congress.gov${href}`;
            break;
          }
        }
      }
      
      if (!title || !billUrl) {
        // Try alternative extraction
        const allLinks = $el.find('a[href*="/bill/"]');
        if (allLinks.length > 0) {
          const link = allLinks.first();
          title = link.text().trim();
          const href = link.attr('href');
          if (href) {
            billUrl = href.startsWith('http') ? href : `https://www.congress.gov${href}`;
          }
        }
      }
      
      if (!title || !billUrl) return null;
      
      // Extract bill number and create ID
      const billNumberMatch = title.match(/^(H\.R\.|S\.)(\d+)/i) || 
                             billUrl.match(/\/(hr|s)(\d+)\//i);
      
      if (!billNumberMatch) return null;
      
      const billType = billNumberMatch[1].toLowerCase().replace('.', '');
      const billNumber = billNumberMatch[2];
      const billId = `${billType}${billNumber}-${this.currentCongress}`;
      
      // Clean title
      const cleanTitle = title.replace(/^(H\.R\.|S\.)\d+\s*-?\s*/i, '').trim();
      
      // Extract other information
      const fullText = $el.text();
      
      // Extract sponsor
      const sponsorMatch = fullText.match(/Sponsor:\s*([^,\n]+)/i) ||
                          fullText.match(/Rep\.\s+([^,\n]+)/i) ||
                          fullText.match(/Sen\.\s+([^,\n]+)/i);
      const sponsorName = sponsorMatch ? sponsorMatch[1].trim() : undefined;
      
      // Extract dates
      const introducedMatch = fullText.match(/Introduced:\s*(\d{2}\/\d{2}\/\d{4})/i) ||
                             fullText.match(/(\d{2}\/\d{2}\/\d{4})/);
      const introducedDate = introducedMatch ? 
        this.parseDate(introducedMatch[1]) : 
        new Date().toISOString().split('T')[0];
      
      // Extract latest action
      const latestActionMatch = fullText.match(/Latest Action:\s*(\d{2}\/\d{2}\/\d{4})\s*([^\.]+)/i) ||
                               fullText.match(/Last Action:\s*(\d{2}\/\d{2}\/\d{4})\s*([^\.]+)/i);
      
      const lastAction = latestActionMatch ? 
        this.parseDate(latestActionMatch[1]) : introducedDate;
      const lastActionText = latestActionMatch ? 
        latestActionMatch[2].trim() : 'Introduced';
      
      // Create bill object
      const bill: ScrapedBill = {
        id: billId,
        congress: this.currentCongress,
        chamber: chamber,
        title: cleanTitle,
        summary: '', // Will be filled later
        status: this.determineStatus(lastActionText),
        sponsorName,
        introducedDate,
        lastAction,
        lastActionText,
        sourceUrl: billUrl,
        propublicaUrl: `https://projects.propublica.org/represent/bills/${this.currentCongress}/${billType}${billNumber}`,
        currentStage: this.determineCurrentStage(lastActionText),
        timeline: [],
        votes: [],
        cosponsors: 0,
        subjects: []
      };
      
      return bill;
      
    } catch (error) {
      console.error('Error parsing bill element:', error);
      return null;
    }
  }

  /**
   * Strategy 2: Simple listing approach
   */
  private async scrapeWithSimpleListing(limit: number): Promise<ScrapedBill[]> {
    const bills: ScrapedBill[] = [];
    
    try {
      if (!this.browser) throw new Error('Browser not initialized');
      
      await this.rateLimitDelayMethod();
      const page = await this.browser.newPage();
      
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      // Simple browse URL
      const url = `https://www.congress.gov/browse/bills/${this.currentCongress}`;
      console.log(`🔍 Simple listing approach: ${url}`);
      
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
      
      const content = await page.content();
      const $ = cheerio.load(content);
      
      // Look for any bill links
      const billLinks = $('a[href*="/bill/"]');
      console.log(`📊 Found ${billLinks.length} bill links`);
      
      billLinks.each((index, element) => {
        if (bills.length >= limit) return false;
        
        try {
          const $link = $(element);
          const href = $link.attr('href');
          const text = $link.text().trim();
          
          if (href && text && text.match(/^(H\.R\.|S\.)\d+/)) {
            const bill = this.createBillFromLink(text, href);
            if (bill) {
              bills.push(bill);
            }
          }
        } catch (error) {
          console.log(`⚠️ Error parsing link ${index}:`, error);
        }
      });
      
      await page.close();
      return bills;
      
    } catch (error) {
      console.error('❌ Simple listing strategy failed:', error);
      return bills;
    }
  }

  /**
   * Strategy 3: RSS/XML approach
   */
  private async scrapeWithRSS(limit: number): Promise<ScrapedBill[]> {
    const bills: ScrapedBill[] = [];
    
    try {
      if (!this.browser) throw new Error('Browser not initialized');
      
      await this.rateLimitDelayMethod();
      const page = await this.browser.newPage();
      
      // Try RSS feeds
      const rssUrls = [
        `https://www.congress.gov/rss/bills-by-congress/${this.currentCongress}`,
        `https://www.congress.gov/rss/bills-by-congress/${this.currentCongress}/house`,
        `https://www.congress.gov/rss/bills-by-congress/${this.currentCongress}/senate`
      ];
      
      for (const rssUrl of rssUrls) {
        try {
          console.log(`🔍 Trying RSS: ${rssUrl}`);
          
          await page.goto(rssUrl, { waitUntil: 'networkidle0', timeout: 15000 });
          const content = await page.content();
          
          if (content.includes('<rss') || content.includes('<feed')) {
            const $ = cheerio.load(content, { xmlMode: true });
            
            $('item, entry').each((index, element) => {
              if (bills.length >= limit) return false;
              
              try {
                const $item = $(element);
                const title = $item.find('title').text().trim();
                const link = $item.find('link').text().trim() || $item.find('link').attr('href');
                const description = $item.find('description').text().trim();
                const pubDate = $item.find('pubDate, published').text().trim();
                
                if (title && link && title.match(/^(H\.R\.|S\.)\d+/)) {
                  const bill = this.createBillFromRSS(title, link, description, pubDate);
                  if (bill) {
                    bills.push(bill);
                  }
                }
              } catch (error) {
                console.log(`⚠️ Error parsing RSS item ${index}:`, error);
              }
            });
            
            if (bills.length > 0) {
              console.log(`✅ Found ${bills.length} bills from RSS`);
              break;
            }
          }
        } catch (rssError) {
          console.log(`⚠️ RSS URL failed: ${rssError}`);
          continue;
        }
      }
      
      await page.close();
      return bills;
      
    } catch (error) {
      console.error('❌ RSS strategy failed:', error);
      return bills;
    }
  }

  /**
   * Create bill from simple link
   */
  private createBillFromLink(text: string, href: string): ScrapedBill | null {
    try {
      const billNumberMatch = text.match(/^(H\.R\.|S\.)(\d+)/i);
      if (!billNumberMatch) return null;
      
      const billType = billNumberMatch[1].toLowerCase().replace('.', '');
      const billNumber = billNumberMatch[2];
      const billId = `${billType}${billNumber}-${this.currentCongress}`;
      
      const chamber = billType === 'hr' ? 'house' : 'senate';
      const title = text.replace(/^(H\.R\.|S\.)\d+\s*-?\s*/i, '').trim();
      const sourceUrl = href.startsWith('http') ? href : `https://www.congress.gov${href}`;
      
      return {
        id: billId,
        congress: this.currentCongress,
        chamber,
        title: title || 'Title not available',
        summary: '',
        status: 'Unknown',
        introducedDate: new Date().toISOString().split('T')[0],
        lastAction: new Date().toISOString().split('T')[0],
        lastActionText: 'Status unknown',
        sourceUrl,
        propublicaUrl: `https://projects.propublica.org/represent/bills/${this.currentCongress}/${billType}${billNumber}`,
        currentStage: 'Legislative Process',
        timeline: [],
        votes: [],
        cosponsors: 0,
        subjects: []
      };
    } catch (error) {
      console.error('Error creating bill from link:', error);
      return null;
    }
  }

  /**
   * Create bill from RSS item
   */
  private createBillFromRSS(title: string, link: string, description: string, pubDate: string): ScrapedBill | null {
    try {
      const billNumberMatch = title.match(/^(H\.R\.|S\.)(\d+)/i);
      if (!billNumberMatch) return null;
      
      const billType = billNumberMatch[1].toLowerCase().replace('.', '');
      const billNumber = billNumberMatch[2];
      const billId = `${billType}${billNumber}-${this.currentCongress}`;
      
      const chamber = billType === 'hr' ? 'house' : 'senate';
      const cleanTitle = title.replace(/^(H\.R\.|S\.)\d+\s*-?\s*/i, '').trim();
      
      const date = pubDate ? this.parseDate(pubDate) : new Date().toISOString().split('T')[0];
      
      return {
        id: billId,
        congress: this.currentCongress,
        chamber,
        title: cleanTitle || 'Title not available',
        summary: description.substring(0, 500),
        status: 'Unknown',
        introducedDate: date,
        lastAction: date,
        lastActionText: 'RSS update',
        sourceUrl: link,
        propublicaUrl: `https://projects.propublica.org/represent/bills/${this.currentCongress}/${billType}${billNumber}`,
        currentStage: 'Legislative Process',
        timeline: [],
        votes: [],
        cosponsors: 0,
        subjects: this.extractSubjectsFromText(description)
      };
    } catch (error) {
      console.error('Error creating bill from RSS:', error);
      return null;
    }
  }

  /**
   * Remove duplicate bills
   */
  private deduplicateBills(bills: ScrapedBill[]): ScrapedBill[] {
    const seen = new Set<string>();
    return bills.filter(bill => {
      if (seen.has(bill.id)) {
        return false;
      }
      seen.add(bill.id);
      return true;
    });
  }

  /**
   * Enhanced bill details scraping
   */
  async enhanceBillsWithDetails(bills: ScrapedBill[]): Promise<ScrapedBill[]> {
    console.log(`🔍 Enhancing ${bills.length} bills with detailed information...`);
    
    const enhanced: ScrapedBill[] = [];
    
    for (let i = 0; i < bills.length; i++) {
      const bill = bills[i];
      console.log(`📄 Enhancing bill ${i + 1}/${bills.length}: ${bill.title}`);
      
      try {
        const enhancedBill = await this.getBillDetails(bill);
        enhanced.push(enhancedBill || bill);
        
        // Rate limiting
        if (i < bills.length - 1) {
          await this.rateLimitDelayMethod();
        }
      } catch (error) {
        console.error(`❌ Error enhancing bill ${bill.id}:`, error);
        enhanced.push(bill); // Keep original if enhancement fails
      }
    }
    
    return enhanced;
  }

  /**
   * Get detailed bill information
   */
  private async getBillDetails(bill: ScrapedBill): Promise<ScrapedBill | null> {
    try {
      if (!this.browser) {
        await this.initializeBrowser();
      }
      if (!this.browser) throw new Error('Browser failed to initialize');
      
      const page = await this.browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      console.log(`🔍 Getting details for ${bill.id} from ${bill.sourceUrl}`);
      
      await page.goto(bill.sourceUrl, { waitUntil: 'networkidle0', timeout: 30000 });
      
      const content = await page.content();
      const $ = cheerio.load(content);
      
      // Extract summary with multiple selectors
      const summarySelectors = [
        '.bill-summary p',
        '.overview p',
        '.standard_box .overview p',
        '.bill-text-summary p',
        '.summary p'
      ];
      
      let summary = bill.summary;
      for (const selector of summarySelectors) {
        const summaryEl = $(selector).first();
        if (summaryEl.length > 0 && summaryEl.text().trim().length > 50) {
          summary = summaryEl.text().trim();
          break;
        }
      }
      
      // Extract subjects
      const subjects: string[] = [];
      $('.bill-topics li, .subjects li, .policy-area li').each((_, el) => {
        const subject = $(el).text().trim();
        if (subject && !subjects.includes(subject)) {
          subjects.push(subject);
        }
      });
      
      // Extract cosponsors
      const cosponsorMatch = content.match(/(\d+)\s*cosponsor/i);
      const cosponsors = cosponsorMatch ? parseInt(cosponsorMatch[1]) : 0;
      
      // Extract timeline
      const timeline = this.extractTimelineFromPage($);
      
      await page.close();
      
      return {
        ...bill,
        summary: summary.substring(0, 500),
        subjects: subjects.length > 0 ? subjects.slice(0, 6) : this.extractSubjectsFromText(summary),
        cosponsors,
        timeline
      };
      
    } catch (error) {
      console.error(`Error getting details for bill ${bill.id}:`, error);
      return bill;
    }
  }

  /**
   * Extract timeline from bill page
   */
  private extractTimelineFromPage($: cheerio.CheerioAPI): Array<{date: string, action: string, chamber: string}> {
    const timeline: Array<{date: string, action: string, chamber: string}> = [];
    
    try {
      // Multiple timeline selectors
      const timelineSelectors = [
        '.actions-list tr',
        '.bill-actions tr',
        '.timeline-item',
        '.action-item'
      ];
      
      for (const selector of timelineSelectors) {
        $(selector).each((_, row) => {
          const $row = $(row);
          const dateText = $row.find('td, .date').first().text().trim();
          const actionText = $row.find('td, .action').eq(1).text().trim() || 
                           $row.find('.action-text').text().trim();
          
          if (dateText && actionText) {
            const dateMatch = dateText.match(/(\d{2}\/\d{2}\/\d{4})/);
            if (dateMatch) {
              const date = this.parseDate(dateMatch[1]);
              const chamber = actionText.toLowerCase().includes('senate') ? 'senate' : 'house';
              
              timeline.push({
                date,
                action: actionText.substring(0, 200),
                chamber
              });
            }
          }
        });
        
        if (timeline.length > 0) break; // Found timeline with this selector
      }
      
      // Sort by date
      timeline.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      return timeline.slice(0, 10);
    } catch (error) {
      console.error('Error extracting timeline:', error);
      return [];
    }
  }

  /**
   * Save bills to database
   */
  async saveBillsToDatabase(bills: ScrapedBill[]): Promise<void> {
    console.log(`💾 Saving ${bills.length} bills to database...`);
    
    let savedCount = 0;
    let errorCount = 0;
    
    for (const bill of bills) {
      try {
        // Try to find sponsor
        let sponsorId = bill.sponsorId;
        if (!sponsorId && bill.sponsorName) {
          const sponsor = await this.findMemberByName(bill.sponsorName);
          sponsorId = sponsor?.id;
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
            sponsorId,
            createdAt: new Date(bill.introducedDate),
            updatedAt: new Date(bill.lastAction)
          }
        });
        
        // Save timeline
        for (const action of bill.timeline) {
          await prisma.billAction.upsert({
            where: { 
              id: `${bill.id}-${action.date}-${this.hashString(action.action)}` 
            },
            update: {
              date: new Date(action.date),
              chamber: action.chamber,
              stage: this.determineStage(action.action),
              text: action.action,
              sourceUrl: bill.sourceUrl
            },
            create: {
              id: `${bill.id}-${action.date}-${this.hashString(action.action)}`,
              billId: bill.id,
              date: new Date(action.date),
              chamber: action.chamber,
              stage: this.determineStage(action.action),
              text: action.action,
              sourceUrl: bill.sourceUrl
            }
          });
        }
        
        console.log(`✅ Saved: ${bill.title} (${bill.id})`);
        savedCount++;
        
      } catch (error) {
        console.error(`❌ Error saving bill ${bill.id}:`, error);
        errorCount++;
      }
    }
    
    console.log(`\n📊 Database save results:`);
    console.log(`   ✅ Successfully saved: ${savedCount} bills`);
    console.log(`   ❌ Errors: ${errorCount} bills`);
  }

  // Utility methods
  private parseDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? 
        new Date().toISOString().split('T')[0] : 
        date.toISOString().split('T')[0];
    } catch {
      return new Date().toISOString().split('T')[0];
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

  private determineStage(actionText: string): string {
    const text = actionText.toLowerCase();
    
    if (text.includes('introduced')) return 'introduced';
    if (text.includes('committee')) return 'committee';
    if (text.includes('floor') || text.includes('passed')) return 'floor';
    if (text.includes('enacted') || text.includes('became law')) return 'enacted';
    
    return 'other';
  }

  private extractSubjectsFromText(text: string): string[] {
    const subjects: string[] = [];
    const lowerText = text.toLowerCase();
    
    const subjectKeywords = {
      'Energy': ['energy', 'oil', 'gas', 'renewable', 'solar', 'wind', 'nuclear'],
      'Healthcare': ['health', 'medical', 'insurance', 'medicare', 'medicaid', 'hospital'],
      'Education': ['education', 'school', 'university', 'student', 'teacher', 'college'],
      'Immigration': ['immigration', 'border', 'visa', 'refugee', 'asylum', 'citizenship'],
      'Economy': ['economy', 'economic', 'tax', 'business', 'trade', 'commerce', 'finance'],
      'Defense': ['defense', 'military', 'veteran', 'security', 'army', 'navy', 'force'],
      'Transportation': ['transportation', 'highway', 'road', 'infrastructure', 'bridge', 'transit'],
      'Environment': ['environment', 'climate', 'pollution', 'conservation', 'wildlife', 'clean'],
      'Civil Rights': ['civil rights', 'discrimination', 'equality', 'voting rights', 'justice'],
      'Agriculture': ['agriculture', 'farm', 'food', 'rural', 'crop', 'livestock']
    };
    
    Object.entries(subjectKeywords).forEach(([subject, keywords]) => {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        subjects.push(subject);
      }
    });
    
    return subjects.length > 0 ? subjects : ['General'];
  }

  private async findMemberByName(sponsorName: string): Promise<{id: string} | null> {
    try {
      const cleanName = sponsorName.replace(/^(Rep\.|Sen\.|Mr\.|Ms\.|Mrs\.)\s*/i, '').trim();
      const parts = cleanName.split(' ');
      
      if (parts.length >= 2) {
        const member = await prisma.member.findFirst({
          where: {
            OR: [
              {
                firstName: { contains: parts[0] },
                lastName: { contains: parts[parts.length - 1] }
              },
              {
                firstName: { contains: parts[parts.length - 1] },
                lastName: { contains: parts[0] }
              }
            ]
          },
          select: { id: true }
        });
        return member;
      }
      
      return null;
    } catch (error) {
      console.error('Error finding member by name:', error);
      return null;
    }
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }
}

// Main function for CLI usage
export async function scrapeCongressBillsV2(limit: number = 50): Promise<ScrapedBill[]> {
  const scraper = new CongressScraperV2();
  
  try {
    console.log('🏛️ Starting comprehensive congress.gov scraping...');
    
    // Step 1: Scrape bills (browser stays open)
    const bills = await scraper.scrapeRecentBillsKeepBrowser(limit);
    console.log(`📊 Initial scraping found ${bills.length} bills`);
    
    if (bills.length === 0) {
      console.log('⚠️ No bills found with current scraping strategies');
      return [];
    }
    
    // Step 2: Enhance with details (reuses browser)
    const enhancedBills = await scraper.enhanceBillsWithDetails(bills);
    console.log(`🔍 Enhanced ${enhancedBills.length} bills with detailed information`);
    
    // Step 3: Save to database
    await scraper.saveBillsToDatabase(enhancedBills);
    
    console.log(`\n🎉 Successfully scraped and saved ${enhancedBills.length} bills!`);
    return enhancedBills;
    
  } catch (error) {
    console.error('❌ Error in comprehensive scraping:', error);
    return [];
  } finally {
    await scraper.closeBrowser();
  }
}
