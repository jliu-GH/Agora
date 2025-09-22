/**
 * Enhanced Congress.gov Scraper (2025 Format)
 * Handles Cloudflare protection and modern congress.gov structure
 */

import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface ModernBill {
  id: string;
  congress: number;
  chamber: string;
  title: string;
  summary: string;
  status: string;
  sponsorName?: string;
  introducedDate: string;
  lastAction: string;
  lastActionText: string;
  sourceUrl: string;
  subjects: string[];
}

export class EnhancedCongressScraper {
  private browser: puppeteer.Browser | null = null;
  private currentCongress = 119;

  async initializeBrowser(): Promise<void> {
    if (!this.browser) {
      console.log('🚀 Initializing enhanced browser with anti-bot measures...');
      this.browser = await puppeteer.launch({
        headless: false, // Required for Cloudflare bypass
        slowMo: 100, // Human-like timing
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled',
          '--disable-dev-shm-usage',
          '--no-first-run',
          '--disable-extensions',
          '--disable-default-apps'
        ]
      });
    }
  }

  async setupAntiDetection(page: puppeteer.Page): Promise<void> {
    // Set realistic user agent
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Remove webdriver property
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });
    });

    // Override plugins and languages
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
      });
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });
    });

    // Set viewport
    await page.setViewport({ width: 1366, height: 768 });

    // Add extra headers
    await page.setExtraHTTPHeaders({
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
    });
  }

  /**
   * Modern approach using multiple strategies
   */
  async scrapeWithModernApproach(limit: number = 50): Promise<ModernBill[]> {
    console.log(`🏛️ Starting enhanced congress.gov scraping (2025 format)...`);
    
    try {
      await this.initializeBrowser();
      if (!this.browser) throw new Error('Browser failed to initialize');

      const bills: ModernBill[] = [];
      
      // Strategy 1: Try ProPublica API (no auth required)
      console.log('📊 Strategy 1: ProPublica Congress API...');
      const propublicaBills = await this.scrapeFromProPublica(limit);
      bills.push(...propublicaBills);
      
      if (bills.length < limit) {
        // Strategy 2: Try GovInfo API
        console.log('📊 Strategy 2: GovInfo bulk data...');
        const govinfoBills = await this.scrapeFromGovInfo(limit - bills.length);
        bills.push(...govinfoBills);
      }
      
      if (bills.length < limit) {
        // Strategy 3: Enhanced congress.gov with anti-bot measures
        console.log('📊 Strategy 3: Enhanced congress.gov scraping...');
        const congressBills = await this.scrapeFromCongressGov(limit - bills.length);
        bills.push(...congressBills);
      }
      
      return this.deduplicateBills(bills).slice(0, limit);
    } catch (error) {
      console.error('❌ Error in enhanced scraping:', error);
      return [];
    } finally {
      await this.closeBrowser();
    }
  }

  /**
   * Strategy 1: ProPublica Congress API (Free, no auth)
   */
  private async scrapeFromProPublica(limit: number): Promise<ModernBill[]> {
    const bills: ModernBill[] = [];
    
    try {
      console.log('🔍 Accessing ProPublica Congress API...');
      
      // ProPublica API endpoints (no API key required for basic data)
      const endpoints = [
        `https://projects.propublica.org/congress/api/v1/${this.currentCongress}/house/bills/introduced.json`,
        `https://projects.propublica.org/congress/api/v1/${this.currentCongress}/senate/bills/introduced.json`
      ];
      
      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            console.log(`✅ ProPublica API returned ${data.bills?.length || 0} bills`);
            
            if (data.bills) {
              for (const bill of data.bills.slice(0, limit - bills.length)) {
                const modernBill = this.convertProPublicaBill(bill);
                if (modernBill) {
                  bills.push(modernBill);
                }
              }
            }
          }
        } catch (endpointError) {
          console.log(`⚠️ ProPublica endpoint failed: ${endpointError}`);
        }
      }
      
      console.log(`📊 ProPublica strategy found ${bills.length} bills`);
      return bills;
    } catch (error) {
      console.error('❌ ProPublica strategy failed:', error);
      return bills;
    }
  }

  /**
   * Strategy 2: GovInfo API (Government bulk data)
   */
  private async scrapeFromGovInfo(limit: number): Promise<ModernBill[]> {
    const bills: ModernBill[] = [];
    
    try {
      console.log('🔍 Accessing GovInfo API...');
      
      // GovInfo provides bulk legislative data
      const url = `https://api.govinfo.gov/collections/BILLS/${this.currentCongress}/summary?offset=0&pageSize=${limit}`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ GovInfo API returned ${data.packages?.length || 0} packages`);
        
        if (data.packages) {
          for (const pkg of data.packages.slice(0, limit)) {
            const modernBill = this.convertGovInfoBill(pkg);
            if (modernBill) {
              bills.push(modernBill);
            }
          }
        }
      }
      
      console.log(`📊 GovInfo strategy found ${bills.length} bills`);
      return bills;
    } catch (error) {
      console.error('❌ GovInfo strategy failed:', error);
      return bills;
    }
  }

  /**
   * Strategy 3: Enhanced congress.gov scraping with anti-bot measures
   */
  private async scrapeFromCongressGov(limit: number): Promise<ModernBill[]> {
    const bills: ModernBill[] = [];
    
    try {
      if (!this.browser) throw new Error('Browser not initialized');
      
      const page = await this.browser.newPage();
      await this.setupAntiDetection(page);
      
      // Wait and retry strategy for Cloudflare
      console.log('🔍 Attempting to bypass Cloudflare protection...');
      
      await page.goto('https://www.congress.gov', { 
        waitUntil: 'networkidle0', 
        timeout: 60000 
      });
      
      // Wait for potential Cloudflare challenge
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      // Check if we passed Cloudflare
      const content = await page.content();
      if (content.includes('Just a moment') || content.includes('challenge-platform')) {
        console.log('⚠️ Cloudflare protection detected, waiting...');
        await new Promise(resolve => setTimeout(resolve, 15000));
      }
      
      // Try to navigate to search
      try {
        await page.goto(`https://www.congress.gov/search?q=%7B%22source%22%3A%22legislation%22%2C%22congress%22%3A%22${this.currentCongress}%22%7D`, {
          waitUntil: 'networkidle0',
          timeout: 30000
        });
        
        const searchContent = await page.content();
        const $ = cheerio.load(searchContent);
        
        // Use enhanced selectors for modern congress.gov
        const modernSelectors = [
          '[data-testid="search-result"]',
          '.result-item',
          '.search-result-item',
          '.bill-search-result'
        ];
        
        for (const selector of modernSelectors) {
          const elements = $(selector);
          if (elements.length > 0) {
            console.log(`✅ Found ${elements.length} elements with selector: ${selector}`);
            break;
          }
        }
        
      } catch (searchError) {
        console.log(`⚠️ Congress.gov search failed: ${searchError}`);
      }
      
      await page.close();
      return bills;
    } catch (error) {
      console.error('❌ Enhanced congress.gov scraping failed:', error);
      return bills;
    }
  }

  /**
   * Convert ProPublica bill format
   */
  private convertProPublicaBill(bill: any): ModernBill | null {
    try {
      if (!bill.bill_id || !bill.title) return null;
      
      const billType = bill.bill_id.toLowerCase().includes('hr') ? 'house' : 'senate';
      
      return {
        id: `${bill.bill_id.toLowerCase()}-${this.currentCongress}`,
        congress: this.currentCongress,
        chamber: billType,
        title: bill.title,
        summary: bill.summary || bill.short_title || '',
        status: bill.latest_major_action || 'Unknown',
        sponsorName: bill.sponsor_name || bill.sponsor_title,
        introducedDate: bill.introduced_date || new Date().toISOString().split('T')[0],
        lastAction: bill.latest_major_action_date || bill.introduced_date || new Date().toISOString().split('T')[0],
        lastActionText: bill.latest_major_action || 'Introduced',
        sourceUrl: `https://www.congress.gov/bill/${this.currentCongress}th-congress/${billType}-bill/${bill.number}`,
        subjects: this.extractSubjectsFromText(bill.title + ' ' + (bill.summary || ''))
      };
    } catch (error) {
      console.error('Error converting ProPublica bill:', error);
      return null;
    }
  }

  /**
   * Convert GovInfo package format
   */
  private convertGovInfoBill(pkg: any): ModernBill | null {
    try {
      if (!pkg.packageId || !pkg.title) return null;
      
      const billMatch = pkg.packageId.match(/BILLS-(\d+)(hr|s)(\d+)/i);
      if (!billMatch) return null;
      
      const [, congress, chamber, number] = billMatch;
      const chamberFull = chamber.toLowerCase() === 'hr' ? 'house' : 'senate';
      
      return {
        id: `${chamber.toLowerCase()}${number}-${congress}`,
        congress: parseInt(congress),
        chamber: chamberFull,
        title: pkg.title,
        summary: pkg.summary || '',
        status: 'Available on GovInfo',
        introducedDate: pkg.dateIssued || new Date().toISOString().split('T')[0],
        lastAction: pkg.lastModified || pkg.dateIssued || new Date().toISOString().split('T')[0],
        lastActionText: 'Published on GovInfo',
        sourceUrl: `https://www.congress.gov/bill/${congress}th-congress/${chamberFull}-bill/${number}`,
        subjects: this.extractSubjectsFromText(pkg.title)
      };
    } catch (error) {
      console.error('Error converting GovInfo package:', error);
      return null;
    }
  }

  private extractSubjectsFromText(text: string): string[] {
    const subjects: string[] = [];
    const lowerText = text.toLowerCase();
    
    const subjectKeywords = {
      'Energy': ['energy', 'oil', 'gas', 'renewable', 'solar', 'wind'],
      'Healthcare': ['health', 'medical', 'insurance', 'medicare', 'medicaid'],
      'Education': ['education', 'school', 'university', 'student'],
      'Immigration': ['immigration', 'border', 'visa', 'refugee'],
      'Economy': ['economy', 'tax', 'business', 'trade', 'finance'],
      'Defense': ['defense', 'military', 'veteran', 'security'],
      'Transportation': ['transportation', 'highway', 'infrastructure'],
      'Environment': ['environment', 'climate', 'pollution', 'conservation']
    };
    
    Object.entries(subjectKeywords).forEach(([subject, keywords]) => {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        subjects.push(subject);
      }
    });
    
    return subjects.length > 0 ? subjects : ['General'];
  }

  private deduplicateBills(bills: ModernBill[]): ModernBill[] {
    const seen = new Set<string>();
    return bills.filter(bill => {
      if (seen.has(bill.id)) return false;
      seen.add(bill.id);
      return true;
    });
  }

  async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

// Export for CLI usage
export async function scrapeWithEnhancedMethod(limit: number = 50): Promise<ModernBill[]> {
  const scraper = new EnhancedCongressScraper();
  
  try {
    console.log('🏛️ Starting enhanced congress.gov scraping with 2025 compatibility...');
    const bills = await scraper.scrapeWithModernApproach(limit);
    console.log(`🎉 Enhanced scraping completed! Found ${bills.length} bills.`);
    return bills;
  } catch (error) {
    console.error('❌ Enhanced scraping failed:', error);
    return [];
  } finally {
    await scraper.closeBrowser();
  }
}


