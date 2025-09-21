/**
 * Aggressive Congress.gov Scraper
 * Designed to find hundreds of bills by using multiple approaches and pagination
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

export class AggressiveCongressScraper {
  private browser: puppeteer.Browser | null = null;
  private rateLimitDelay = 2000; // 2 seconds between requests
  private maxRetries = 3;
  private requestCount = 0;
  private currentCongress = 119;

  async initializeBrowser(): Promise<void> {
    if (!this.browser) {
      console.log('🚀 Initializing aggressive browser...');
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
   * Aggressive scraping with multiple strategies and pagination
   */
  async scrapeAggressively(limit: number = 200): Promise<ScrapedBill[]> {
    console.log(`🏛️ Starting AGGRESSIVE congress.gov scrape for ${limit} bills...`);
    
    try {
      await this.initializeBrowser();
      if (!this.browser) throw new Error('Browser failed to initialize');

      const allBills: ScrapedBill[] = [];
      
      // Strategy 1: Multiple search pages with pagination
      console.log('📊 Strategy 1: Paginated search approach...');
      const searchBills = await this.scrapeWithPagination(limit);
      allBills.push(...searchBills);
      
      if (allBills.length < limit) {
        // Strategy 2: Direct bill browsing with multiple pages
        console.log('📊 Strategy 2: Multi-page browsing approach...');
        const browseBills = await this.scrapeWithMultiPageBrowsing(limit - allBills.length);
        allBills.push(...browseBills);
      }
      
      if (allBills.length < limit) {
        // Strategy 3: RSS feeds with multiple sources
        console.log('📊 Strategy 3: Multiple RSS sources...');
        const rssBills = await this.scrapeWithMultipleRSS(limit - allBills.length);
        allBills.push(...rssBills);
      }
      
      // Remove duplicates and sort by date
      const uniqueBills = this.deduplicateBills(allBills);
      uniqueBills.sort((a, b) => new Date(b.lastAction).getTime() - new Date(a.lastAction).getTime());
      
      console.log(`🎯 Found ${uniqueBills.length} unique bills total`);
      return uniqueBills.slice(0, limit);
    } catch (error) {
      console.error('❌ Error in aggressive scraping:', error);
      return [];
    } finally {
      await this.closeBrowser();
    }
  }

  /**
   * Scrape with pagination through multiple search result pages
   */
  private async scrapeWithPagination(limit: number): Promise<ScrapedBill[]> {
    const bills: ScrapedBill[] = [];
    
    try {
      if (!this.browser) throw new Error('Browser not initialized');
      
      // Multiple search strategies
      const searchStrategies = [
        // Strategy 1: All 119th Congress bills
        {
          url: 'https://www.congress.gov/search?q=%7B%22source%22%3A%22legislation%22%2C%22type%22%3A%22bills%22%2C%22congress%22%3A%22119%22%7D&pageSort=latestAction%3Adesc',
          name: 'All 119th Congress Bills'
        },
        // Strategy 2: House bills only
        {
          url: 'https://www.congress.gov/search?q=%7B%22source%22%3A%22legislation%22%2C%22type%22%3A%22bills%22%2C%22congress%22%3A%22119%22%2C%22bill-type%22%3A%22house-bill%22%7D&pageSort=latestAction%3Adesc',
          name: 'House Bills 119th Congress'
        },
        // Strategy 3: Senate bills only
        {
          url: 'https://www.congress.gov/search?q=%7B%22source%22%3A%22legislation%22%2C%22type%22%3A%22bills%22%2C%22congress%22%3A%22119%22%2C%22bill-type%22%3A%22senate-bill%22%7D&pageSort=latestAction%3Adesc',
          name: 'Senate Bills 119th Congress'
        },
        // Strategy 4: Recent activity
        {
          url: 'https://www.congress.gov/search?q=%7B%22source%22%3A%22legislation%22%2C%22congress%22%3A%22119%22%7D&pageSort=latestAction%3Adesc',
          name: 'Recent Legislative Activity'
        }
      ];
      
      for (const strategy of searchStrategies) {
        if (bills.length >= limit) break;
        
        console.log(`🔍 Trying strategy: ${strategy.name}`);
        
        try {
          await this.rateLimitDelayMethod();
          const page = await this.browser.newPage();
          
          await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
          
          await page.goto(strategy.url, { 
            waitUntil: 'networkidle0', 
            timeout: 30000 
          });
          
          // Wait for content to load
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          const content = await page.content();
          const $ = cheerio.load(content);
          
          console.log(`📄 Page title: ${$('title').text()}`);
          
          // Try to find pagination info
          const totalResults = this.extractTotalResults($);
          console.log(`📊 Total results found: ${totalResults}`);
          
          // Extract bills from this page
          const pageBills = await this.extractBillsFromSearchPage($, strategy.name);
          bills.push(...pageBills);
          
          console.log(`✅ Found ${pageBills.length} bills from this search`);
          
          // Try to go to next pages if we need more bills
          if (bills.length < limit && totalResults > 20) {
            const additionalBills = await this.scrapeAdditionalPages(page, $, limit - bills.length);
            bills.push(...additionalBills);
          }
          
          await page.close();
          
        } catch (strategyError) {
          console.log(`⚠️ Strategy failed: ${strategyError}`);
          continue;
        }
      }
      
      return bills.slice(0, limit);
    } catch (error) {
      console.error('❌ Error in paginated scraping:', error);
      return bills;
    }
  }

  /**
   * Extract total number of results from search page
   */
  private extractTotalResults($: cheerio.CheerioAPI): number {
    try {
      // Try multiple selectors for result count
      const resultSelectors = [
        '.results-count',
        '.search-results-count',
        '.total-results',
        '[data-total-results]',
        '.pagination-info',
        '.results-summary'
      ];
      
      for (const selector of resultSelectors) {
        const element = $(selector);
        if (element.length > 0) {
          const text = element.text();
          const match = text.match(/(\d+)/);
          if (match) {
            return parseInt(match[1]);
          }
        }
      }
      
      // Fallback: count visible result items
      const resultItems = $('.result-item, .results-item, .bill-item, .legislation-item');
      return resultItems.length;
    } catch (error) {
      console.error('Error extracting total results:', error);
      return 0;
    }
  }

  /**
   * Extract bills from a search results page
   */
  private async extractBillsFromSearchPage($: cheerio.CheerioAPI, strategyName: string): Promise<ScrapedBill[]> {
    const bills: ScrapedBill[] = [];
    
    try {
      // Multiple selectors for bill items
      const billSelectors = [
        '.result-item',
        '.results-item',
        '.bill-item',
        '.legislation-item',
        '.search-result',
        'li[class*="result"]',
        'div[class*="bill"]',
        'article'
      ];
      
      for (const selector of billSelectors) {
        const elements = $(selector);
        console.log(`🔍 Trying selector "${selector}": found ${elements.length} elements`);
        
        if (elements.length > 0) {
          elements.each((index, element) => {
            if (bills.length >= 50) return false; // Limit per selector
            
            try {
              const bill = this.parseBillElement($, element, strategyName);
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
    } catch (error) {
      console.error('Error extracting bills from search page:', error);
      return bills;
    }
  }

  /**
   * Scrape additional pages of results
   */
  private async scrapeAdditionalPages(page: puppeteer.Page, $: cheerio.CheerioAPI, limit: number): Promise<ScrapedBill[]> {
    const bills: ScrapedBill[] = [];
    
    try {
      // Look for pagination links
      const nextPageSelectors = [
        'a[aria-label="Next page"]',
        'a[title="Next page"]',
        '.pagination-next',
        '.next-page',
        'a:contains("Next")',
        'a:contains(">")'
      ];
      
      let hasNextPage = false;
      let nextPageUrl = '';
      
      for (const selector of nextPageSelectors) {
        const nextLink = $(selector);
        if (nextLink.length > 0) {
          const href = nextLink.attr('href');
          if (href) {
            hasNextPage = true;
            nextPageUrl = href.startsWith('http') ? href : `https://www.congress.gov${href}`;
            break;
          }
        }
      }
      
      // Try to scrape up to 3 additional pages
      let pagesScraped = 0;
      while (hasNextPage && bills.length < limit && pagesScraped < 3) {
        try {
          console.log(`📄 Scraping additional page ${pagesScraped + 2}...`);
          
          await this.rateLimitDelayMethod();
          await page.goto(nextPageUrl, { waitUntil: 'networkidle0', timeout: 30000 });
          
          const content = await page.content();
          const $page = cheerio.load(content);
          
          const pageBills = await this.extractBillsFromSearchPage($page, `Additional Page ${pagesScraped + 2}`);
          bills.push(...pageBills);
          
          console.log(`✅ Found ${pageBills.length} bills on additional page`);
          
          // Look for next page again
          hasNextPage = false;
          for (const selector of nextPageSelectors) {
            const nextLink = $page(selector);
            if (nextLink.length > 0) {
              const href = nextLink.attr('href');
              if (href) {
                hasNextPage = true;
                nextPageUrl = href.startsWith('http') ? href : `https://www.congress.gov${href}`;
                break;
              }
            }
          }
          
          pagesScraped++;
        } catch (pageError) {
          console.log(`⚠️ Error scraping additional page: ${pageError}`);
          break;
        }
      }
      
      return bills;
    } catch (error) {
      console.error('Error scraping additional pages:', error);
      return bills;
    }
  }

  /**
   * Multi-page browsing approach
   */
  private async scrapeWithMultiPageBrowsing(limit: number): Promise<ScrapedBill[]> {
    const bills: ScrapedBill[] = [];
    
    try {
      if (!this.browser) throw new Error('Browser not initialized');
      
      // Multiple browse URLs
      const browseUrls = [
        `https://www.congress.gov/browse/bills/${this.currentCongress}`,
        `https://www.congress.gov/browse/bills/${this.currentCongress}/house`,
        `https://www.congress.gov/browse/bills/${this.currentCongress}/senate`,
        `https://www.congress.gov/browse/bills/${this.currentCongress}/house?pageSort=latestAction%3Adesc`,
        `https://www.congress.gov/browse/bills/${this.currentCongress}/senate?pageSort=latestAction%3Adesc`
      ];
      
      for (const url of browseUrls) {
        if (bills.length >= limit) break;
        
        try {
          console.log(`🔍 Browsing: ${url}`);
          
          await this.rateLimitDelayMethod();
          const page = await this.browser.newPage();
          
          await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
          
          await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
          
          const content = await page.content();
          const $ = cheerio.load(content);
          
          // Look for bill links
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
          
        } catch (urlError) {
          console.log(`⚠️ Browse URL failed: ${urlError}`);
          continue;
        }
      }
      
      return bills;
    } catch (error) {
      console.error('❌ Error in multi-page browsing:', error);
      return bills;
    }
  }

  /**
   * Multiple RSS sources approach
   */
  private async scrapeWithMultipleRSS(limit: number): Promise<ScrapedBill[]> {
    const bills: ScrapedBill[] = [];
    
    try {
      if (!this.browser) throw new Error('Browser not initialized');
      
      // Multiple RSS sources
      const rssUrls = [
        `https://www.congress.gov/rss/bills-by-congress/${this.currentCongress}`,
        `https://www.congress.gov/rss/bills-by-congress/${this.currentCongress}/house`,
        `https://www.congress.gov/rss/bills-by-congress/${this.currentCongress}/senate`,
        `https://www.congress.gov/rss/recent-bills`,
        `https://www.congress.gov/rss/recent-house-bills`,
        `https://www.congress.gov/rss/recent-senate-bills`
      ];
      
      for (const rssUrl of rssUrls) {
        if (bills.length >= limit) break;
        
        try {
          console.log(`🔍 Trying RSS: ${rssUrl}`);
          
          await this.rateLimitDelayMethod();
          const page = await this.browser.newPage();
          
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
            }
          }
          
          await page.close();
        } catch (rssError) {
          console.log(`⚠️ RSS URL failed: ${rssError}`);
          continue;
        }
      }
      
      return bills;
    } catch (error) {
      console.error('❌ Error in multiple RSS scraping:', error);
      return bills;
    }
  }

  /**
   * Parse individual bill element with enhanced strategies
   */
  private parseBillElement($: cheerio.CheerioAPI, element: cheerio.Element, strategyName: string): ScrapedBill | null {
    try {
      const $el = $(element);
      
      // Enhanced title and URL extraction
      const titleSelectors = [
        '.result-heading a',
        '.bill-title a',
        'h3 a',
        'h2 a',
        'h1 a',
        'a[href*="/bill/"]',
        '.title a',
        'a.bill-link',
        '.result-title a',
        '.legislation-title a'
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
      
      // Alternative extraction if primary methods fail
      if (!title || !billUrl) {
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
      
      // Enhanced bill number extraction
      const billNumberMatch = title.match(/^(H\.R\.|S\.)(\d+)/i) || 
                             billUrl.match(/\/(hr|s)(\d+)\//i) ||
                             title.match(/^(HR|S)(\d+)/i);
      
      if (!billNumberMatch) return null;
      
      const billType = billNumberMatch[1].toLowerCase().replace('.', '');
      const billNumber = billNumberMatch[2];
      const billId = `${billType}${billNumber}-${this.currentCongress}`;
      
      // Clean title
      const cleanTitle = title.replace(/^(H\.R\.|S\.)\d+\s*-?\s*/i, '').trim();
      
      // Enhanced information extraction
      const fullText = $el.text();
      
      // Extract sponsor with multiple patterns
      const sponsorMatch = fullText.match(/Sponsor:\s*([^,\n]+)/i) ||
                          fullText.match(/Rep\.\s+([^,\n]+)/i) ||
                          fullText.match(/Sen\.\s+([^,\n]+)/i) ||
                          fullText.match(/Introduced by\s+([^,\n]+)/i);
      const sponsorName = sponsorMatch ? sponsorMatch[1].trim() : undefined;
      
      // Enhanced date extraction
      const introducedMatch = fullText.match(/Introduced:\s*(\d{2}\/\d{2}\/\d{4})/i) ||
                             fullText.match(/(\d{2}\/\d{2}\/\d{4})/);
      const introducedDate = introducedMatch ? 
        this.parseDate(introducedMatch[1]) : 
        new Date().toISOString().split('T')[0];
      
      // Enhanced latest action extraction
      const latestActionMatch = fullText.match(/Latest Action:\s*(\d{2}\/\d{2}\/\d{4})\s*([^\.]+)/i) ||
                               fullText.match(/Last Action:\s*(\d{2}\/\d{2}\/\d{4})\s*([^\.]+)/i) ||
                               fullText.match(/(\d{2}\/\d{2}\/\d{4})\s*([^\.]+)/i);
      
      const lastAction = latestActionMatch ? 
        this.parseDate(latestActionMatch[1]) : introducedDate;
      const lastActionText = latestActionMatch ? 
        latestActionMatch[2].trim() : 'Introduced';
      
      // Create enhanced bill object
      const bill: ScrapedBill = {
        id: billId,
        congress: this.currentCongress,
        chamber: billType === 'hr' ? 'house' : 'senate',
        title: cleanTitle || 'Title not available',
        summary: this.extractSummary($el),
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
        subjects: this.extractSubjectsFromText(cleanTitle + ' ' + this.extractSummary($el))
      };
      
      return bill;
      
    } catch (error) {
      console.error('Error parsing bill element:', error);
      return null;
    }
  }

  /**
   * Extract summary from bill element
   */
  private extractSummary($el: cheerio.Cheerio<cheerio.Element>): string {
    const summarySelectors = [
      '.result-summary',
      '.bill-summary',
      '.summary',
      '.description',
      'p'
    ];
    
    for (const selector of summarySelectors) {
      const summaryEl = $el.find(selector).first();
      if (summaryEl.length > 0) {
        const text = summaryEl.text().trim();
        if (text.length > 20 && text.length < 500) {
          return text;
        }
      }
    }
    
    return '';
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

  private lastRequestTime = 0;
}

// Main function for CLI usage
export async function scrapeAggressively(limit: number = 200): Promise<ScrapedBill[]> {
  const scraper = new AggressiveCongressScraper();
  
  try {
    console.log('🏛️ Starting AGGRESSIVE congress.gov scraping...');
    
    // Step 1: Aggressive scraping
    const bills = await scraper.scrapeAggressively(limit);
    console.log(`📊 Aggressive scraping found ${bills.length} bills`);
    
    if (bills.length === 0) {
      console.log('⚠️ No bills found with aggressive scraping strategies');
      return [];
    }
    
    // Step 2: Save to database
    await scraper.saveBillsToDatabase(bills);
    
    console.log(`\n🎉 Successfully scraped and saved ${bills.length} bills!`);
    return bills;
    
  } catch (error) {
    console.error('❌ Error in aggressive scraping:', error);
    return [];
  } finally {
    await scraper.closeBrowser();
  }
}
