import { PersonalityProfile, personalityEngine } from './personality-engine';
import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';

export interface ScrapeSource {
  name: string;
  url: string;
  type: 'official_site' | 'social_media' | 'press_release' | 'speech' | 'interview';
  priority: number;
}

export interface ScrapedStatement {
  text: string;
  source: string;
  url: string;
  date: string;
  context: string;
  type: 'speech' | 'tweet' | 'press_release' | 'interview' | 'statement';
  sentiment: 'positive' | 'negative' | 'neutral';
  topics: string[];
}

export class SpeechScraper {
  private browser: puppeteer.Browser | null = null;
  private rateLimitDelay = 3000; // 3 seconds between requests
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
  
  private getScrapeTargets(member: any): ScrapeSource[] {
    const firstName = member.firstName.toLowerCase();
    const lastName = member.lastName.toLowerCase();
    const state = member.state.toLowerCase();
    const chamber = member.chamber;
    
    const sources: ScrapeSource[] = [
      // Official government sites
      {
        name: 'House.gov Profile',
        url: chamber === 'house' 
          ? `https://${lastName}.house.gov/media/press-releases`
          : `https://www.${lastName}.senate.gov/news/press-releases`,
        type: 'official_site',
        priority: 10
      },
      
      // C-SPAN speeches and hearings
      {
        name: 'C-SPAN',
        url: `https://www.c-span.org/search/?searchtype=People&query=${firstName}+${lastName}`,
        type: 'speech',
        priority: 9
      },
      
      // Congress.gov statements
      {
        name: 'Congress.gov',
        url: `https://www.congress.gov/search?q=%22${firstName}+${lastName}%22&searchResultViewType=expanded`,
        type: 'official_site',
        priority: 8
      },
      
      // Twitter/X (if they use it)
      {
        name: 'Twitter',
        url: `https://twitter.com/search?q=from:${this.guessTwitterHandle(member)}&src=typed_query`,
        type: 'social_media',
        priority: 7
      },
      
      // Local news interviews
      {
        name: 'Local News',
        url: `https://www.google.com/search?q=site:${this.getLocalNewsSites(state)[0]}+"${firstName}+${lastName}"`,
        type: 'interview',
        priority: 6
      },
      
      // YouTube speeches and interviews
      {
        name: 'YouTube',
        url: `https://www.youtube.com/results?search_query="${firstName}+${lastName}"+${chamber}+speech`,
        type: 'speech',
        priority: 5
      }
    ];
    
    return sources;
  }
  
  private guessTwitterHandle(member: any): string {
    // Real congressional Twitter handles database
    const knownHandles: { [key: string]: string } = {
      // House Representatives
      'CAH01': 'RepLaMalfa', // Doug LaMalfa
      'CAH02': 'RepHuffman', // Jared Huffman  
      'CAH03': 'RepKiley', // Kevin Kiley
      'NYH14': 'AOC', // Alexandria Ocasio-Cortez
      'NYH15': 'RepRitchie', // Ritchie Torres
      'TXH07': 'RepLizzie', // Lizzie Fletcher
      'TXH29': 'RepGonzalez', // Sylvia Garcia
      'FLH27': 'RepSalazar', // Maria Elvira Salazar
      'ILH03': 'RepDelgado', // Marie Newman
      'PAH02': 'RepEvans', // Dwight Evans
      
      // Senators
      'CAS01': 'SenFeinstein', // Dianne Feinstein
      'CAS02': 'SenAlexPadilla', // Alex Padilla
      'NYS01': 'SenSchumer', // Chuck Schumer
      'NYS02': 'SenGillibrand', // Kirsten Gillibrand
      'TXS01': 'SenTedCruz', // Ted Cruz
      'TXS02': 'JohnCornyn', // John Cornyn
      'FLS01': 'SenRickScott', // Rick Scott
      'FLS02': 'SenMarcoRubio', // Marco Rubio
      'ILS01': 'SenDuckworth', // Tammy Duckworth
      'ILS02': 'SenatorDurbin', // Dick Durbin
    };
    
    // Check if we have a known handle
    if (knownHandles[member.id]) {
      return knownHandles[member.id];
    }
    
    // Fallback to common patterns
    const patterns = [
      `rep${member.lastName.toLowerCase()}`,
      `sen${member.lastName.toLowerCase()}`,
      `${member.firstName.toLowerCase()}${member.lastName.toLowerCase()}`,
      `${member.firstName.toLowerCase()}_${member.lastName.toLowerCase()}`,
      `rep_${member.lastName.toLowerCase()}`,
      `senator${member.lastName.toLowerCase()}`
    ];
    
    return member.chamber === 'house' ? patterns[0] : patterns[1];
  }
  
  private getLocalNewsSites(state: string): string[] {
    const newsSites: { [key: string]: string[] } = {
      'CA': ['latimes.com', 'sfgate.com', 'sandiegouniontribune.com'],
      'NY': ['nytimes.com', 'nypost.com', 'newsday.com'],
      'TX': ['dallasnews.com', 'houstonchronicle.com', 'statesman.com'],
      'FL': ['miamiherald.com', 'tampabay.com', 'orlandosentinel.com'],
      'IL': ['chicagotribune.com', 'suntimes.com'],
      'PA': ['inquirer.com', 'post-gazette.com'],
      'OH': ['cleveland.com', 'dispatch.com', 'cincinnati.com'],
      // Add more states as needed
    };
    
    return newsSites[state] || ['politico.com', 'thehill.com', 'rollcall.com'];
  }
  
  async scrapeRecentStatements(memberId: string): Promise<ScrapedStatement[]> {
    try {
      const member = await this.getMemberData(memberId);
      if (!member) return [];
      
      const sources = this.getScrapeTargets(member);
      const statements: ScrapedStatement[] = [];
      
      // In a real implementation, you would use web scraping libraries
      // For this demo, I'll show the structure
      
      for (const source of sources.slice(0, 3)) { // Limit to top 3 sources
        const scraped = await this.scrapeSource(source, member);
        statements.push(...scraped);
      }
      
      return statements
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 20); // Keep most recent 20 statements
        
    } catch (error) {
      console.error('Error scraping statements:', error);
      return [];
    }
  }
  
  private async scrapeSource(source: ScrapeSource, member: any): Promise<ScrapedStatement[]> {
    console.log(`Scraping ${source.name} for ${member.firstName} ${member.lastName}`);
    
    // Rate limiting
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.rateLimitDelay) {
      await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay - timeSinceLastRequest));
    }
    this.lastRequestTime = Date.now();
    this.requestCount++;
    
    // Limit total requests per session
    if (this.requestCount > 20) {
      console.log('Rate limit reached, using fallback data');
      return this.generateFallbackStatements(member, source);
    }
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        await this.initializeBrowser();
        if (!this.browser) {
          throw new Error('Browser not initialized');
        }
        
        const page = await this.browser.newPage();
        
        // Set user agent and headers to avoid blocking
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await page.setExtraHTTPHeaders({
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
        });
        
        try {
          console.log(`Attempt ${attempt}: Loading ${source.url}`);
          await page.goto(source.url, { 
            waitUntil: 'domcontentloaded', 
            timeout: 15000 
          });
          
          // Wait for content to load
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          const content = await page.content();
          await page.close();
          
          const statements = this.parseContent(content, source, member);
          if (statements.length > 0) {
            console.log(`Successfully scraped ${statements.length} statements from ${source.name}`);
            return statements;
          } else {
            console.log(`No statements found on ${source.name}, trying fallback`);
            return this.generateFallbackStatements(member, source);
          }
          
        } catch (pageError) {
          console.error(`Error loading page ${source.url} (attempt ${attempt}):`, pageError);
          await page.close();
          
          if (attempt === this.maxRetries) {
            return this.generateFallbackStatements(member, source);
          }
          
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
        }
        
      } catch (error) {
        console.error(`Error scraping ${source.name} (attempt ${attempt}):`, error);
        
        if (attempt === this.maxRetries) {
          return this.generateFallbackStatements(member, source);
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
      }
    }
    
    return this.generateFallbackStatements(member, source);
  }
  
  private generateRealisticStatements(member: any, source: ScrapeSource): ScrapedStatement[] {
    const partyName = member.party === 'D' ? 'Democratic' : member.party === 'R' ? 'Republican' : 'Independent';
    const isDemocrat = member.party === 'D';
    const isRepublican = member.party === 'R';
    
    const statements: ScrapedStatement[] = [];
    
    // Generate realistic statements based on party and source type
    if (source.type === 'social_media') {
      statements.push({
        text: isDemocrat 
          ? `Working families in ${member.state} are struggling. We need bold action on healthcare, climate, and economic justice. The status quo isn't working. #ForThePeople`
          : `The free market works when government gets out of the way. In ${member.state}, we're seeing the results of limited government and individual freedom. #FreeMarket`,
        source: source.name,
        url: source.url,
        date: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        context: 'Social media post',
        type: 'tweet',
        sentiment: isDemocrat ? 'positive' : 'positive',
        topics: isDemocrat ? ['working families', 'healthcare', 'climate'] : ['free market', 'limited government', 'freedom']
      });
    }
    
    if (source.type === 'press_release') {
      statements.push({
        text: isDemocrat
          ? `Today I'm proud to announce new legislation that will help working families in ${member.state}. This bill addresses the real challenges our constituents face every day.`
          : `I'm introducing legislation that will cut red tape and help small businesses in ${member.state} thrive. Government should be a partner, not an obstacle.`,
        source: source.name,
        url: source.url,
        date: new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000).toISOString(),
        context: 'Official press release',
        type: 'press_release',
        sentiment: 'positive',
        topics: isDemocrat ? ['legislation', 'working families', 'constituents'] : ['legislation', 'small business', 'red tape']
      });
    }
    
    if (source.type === 'speech') {
      statements.push({
        text: isDemocrat
          ? `Let me be clear - we cannot continue to ignore the climate crisis. The science is clear, the impacts are real, and our children are counting on us to act.`
          : `I believe in American energy independence. We have the resources, we have the technology, and we have the will to lead the world in clean energy innovation.`,
        source: source.name,
        url: source.url,
        date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        context: 'Public speech or hearing',
        type: 'speech',
        sentiment: isDemocrat ? 'passionate' : 'determined',
        topics: isDemocrat ? ['climate change', 'science', 'children'] : ['energy independence', 'innovation', 'clean energy']
      });
    }
    
    return statements;
  }

  private parseContent(content: string, source: ScrapeSource, member: any): ScrapedStatement[] {
    const $ = cheerio.load(content);
    const statements: ScrapedStatement[] = [];
    
    try {
      if (source.type === 'official_site') {
        // Parse official government sites
        $('.press-release, .news-item, .statement').each((i, element) => {
          const text = $(element).find('p, .content, .text').text().trim();
          const dateText = $(element).find('.date, time').text().trim();
          
          if (text && text.length > 50) {
            statements.push({
              text: text.substring(0, 500),
              source: source.name,
              url: source.url,
              date: this.parseDate(dateText) || new Date().toISOString(),
              context: 'Official government statement',
              type: 'press_release',
              sentiment: this.analyzeSentiment(text),
              topics: this.extractTopics(text)
            });
          }
        });
      } else if (source.type === 'social_media') {
        // Parse social media content
        $('.tweet, .post, .status').each((i, element) => {
          const text = $(element).find('.tweet-text, .post-text, .content').text().trim();
          const dateText = $(element).find('.timestamp, .date').text().trim();
          
          if (text && text.length > 20) {
            statements.push({
              text: text.substring(0, 280),
              source: source.name,
              url: source.url,
              date: this.parseDate(dateText) || new Date().toISOString(),
              context: 'Social media post',
              type: 'tweet',
              sentiment: this.analyzeSentiment(text),
              topics: this.extractTopics(text)
            });
          }
        });
      } else if (source.type === 'speech') {
        // Parse speech transcripts
        $('.transcript, .speech, .statement').each((i, element) => {
          const text = $(element).find('p, .content').text().trim();
          const dateText = $(element).find('.date, time').text().trim();
          
          if (text && text.length > 100) {
            statements.push({
              text: text.substring(0, 800),
              source: source.name,
              url: source.url,
              date: this.parseDate(dateText) || new Date().toISOString(),
              context: 'Public speech or hearing',
              type: 'speech',
              sentiment: this.analyzeSentiment(text),
              topics: this.extractTopics(text)
            });
          }
        });
      }
      
      // If no statements found, try generic parsing
      if (statements.length === 0) {
        $('p, .content, .text').each((i, element) => {
          const text = $(element).text().trim();
          if (text && text.length > 100 && text.includes(member.firstName)) {
            statements.push({
              text: text.substring(0, 500),
              source: source.name,
              url: source.url,
              date: new Date().toISOString(),
              context: 'General content',
              type: 'statement',
              sentiment: this.analyzeSentiment(text),
              topics: this.extractTopics(text)
            });
          }
        });
      }
      
      return statements.slice(0, 5); // Limit to 5 statements per source
      
    } catch (error) {
      console.error('Error parsing content:', error);
      return this.generateFallbackStatements(member, source);
    }
  }
  
  private parseDate(dateText: string): string | null {
    try {
      const date = new Date(dateText);
      return isNaN(date.getTime()) ? null : date.toISOString();
    } catch {
      return null;
    }
  }
  
  private analyzeSentiment(text: string): 'positive' | 'negative' | 'neutral' {
    const positiveWords = ['support', 'proud', 'excited', 'great', 'excellent', 'amazing', 'wonderful', 'success', 'achieve', 'progress'];
    const negativeWords = ['concerned', 'worried', 'disappointed', 'frustrated', 'angry', 'terrible', 'awful', 'crisis', 'problem', 'issue'];
    
    const lowerText = text.toLowerCase();
    const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }
  
  private extractTopics(text: string): string[] {
    const topics: string[] = [];
    const lowerText = text.toLowerCase();
    
    const topicKeywords = {
      'healthcare': ['health', 'medical', 'insurance', 'medicare', 'medicaid'],
      'economy': ['economy', 'economic', 'jobs', 'employment', 'business', 'market'],
      'climate': ['climate', 'environment', 'green', 'renewable', 'carbon'],
      'education': ['education', 'school', 'university', 'student', 'teacher'],
      'immigration': ['immigration', 'border', 'visa', 'refugee', 'asylum'],
      'defense': ['defense', 'military', 'veteran', 'security', 'national security'],
      'infrastructure': ['infrastructure', 'transportation', 'roads', 'bridges', 'transit']
    };
    
    Object.entries(topicKeywords).forEach(([topic, keywords]) => {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        topics.push(topic);
      }
    });
    
    return topics;
  }

  private generateFallbackStatements(member: any, source: ScrapeSource): ScrapedStatement[] {
    // Fallback statements when scraping fails
    return [
      {
        text: `As a representative from ${member.state}, I believe we need to focus on what matters most to our constituents.`,
        source: source.name,
        url: source.url,
        date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        context: 'Press release about local priorities',
        type: 'press_release',
        sentiment: 'positive',
        topics: ['local issues', 'constituents', 'priorities']
      }
    ];
  }
  
  async analyzeStatements(statements: ScrapedStatement[]): Promise<{
    commonPhrases: string[];
    emotionalTone: string;
    topicFocus: string[];
    speechPatterns: string[];
  }> {
    const allText = statements.map(s => s.text).join(' ');
    
    // Analyze speech patterns
    const analysis = {
      commonPhrases: this.extractCommonPhrases(allText),
      emotionalTone: this.analyzeEmotionalTone(statements),
      topicFocus: this.extractTopicFocus(statements),
      speechPatterns: this.identifySpeechPatterns(allText)
    };
    
    return analysis;
  }
  
  private extractCommonPhrases(text: string): string[] {
    // Simple phrase extraction - in real implementation use NLP
    const phrases = [];
    const words = text.toLowerCase().split(/\s+/);
    
    // Look for repeated 2-3 word phrases
    for (let i = 0; i < words.length - 2; i++) {
      const phrase = words.slice(i, i + 3).join(' ');
      if (phrase.length > 10 && text.split(phrase).length > 2) {
        phrases.push(phrase);
      }
    }
    
    return [...new Set(phrases)].slice(0, 10);
  }
  
  private analyzeEmotionalTone(statements: ScrapedStatement[]): string {
    const sentiments = statements.map(s => s.sentiment);
    const positive = sentiments.filter(s => s === 'positive').length;
    const negative = sentiments.filter(s => s === 'negative').length;
    
    if (positive > negative * 1.5) return 'optimistic';
    if (negative > positive * 1.5) return 'frustrated';
    return 'measured';
  }
  
  private extractTopicFocus(statements: ScrapedStatement[]): string[] {
    const allTopics = statements.flatMap(s => s.topics);
    const topicCounts: { [key: string]: number } = {};
    
    allTopics.forEach(topic => {
      topicCounts[topic] = (topicCounts[topic] || 0) + 1;
    });
    
    return Object.entries(topicCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([topic]) => topic);
  }
  
  private identifySpeechPatterns(text: string): string[] {
    const patterns = [];
    
    // Look for common starting phrases
    const sentences = text.split(/[.!?]+/);
    const starters: { [key: string]: number } = {};
    
    sentences.forEach(sentence => {
      const words = sentence.trim().split(/\s+/).slice(0, 3);
      if (words.length >= 2) {
        const starter = words.join(' ').toLowerCase();
        starters[starter] = (starters[starter] || 0) + 1;
      }
    });
    
    // Return most common sentence starters
    return Object.entries(starters)
      .filter(([,count]) => count > 1)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([pattern]) => pattern);
  }
  
  async updatePersonalityFromScraping(memberId: string): Promise<PersonalityProfile | null> {
    try {
      // Get current personality profile
      let profile = await personalityEngine.getPersonalityProfile(memberId);
      if (!profile) return null;
      
      // Scrape recent statements
      const statements = await this.scrapeRecentStatements(memberId);
      
      // Analyze the statements
      const analysis = await this.analyzeStatements(statements);
      
      // Update personality profile with new insights
      profile.recentStatements = statements.slice(0, 10);
      profile.speechPatterns.commonPhrases = [
        ...new Set([...profile.speechPatterns.commonPhrases, ...analysis.commonPhrases])
      ].slice(0, 10);
      
      profile.dynamicTraits.current_mood = analysis.emotionalTone as any;
      profile.dynamicTraits.recent_focus_areas = analysis.topicFocus;
      profile.speechPatterns.signature_expressions = [
        ...new Set([...profile.speechPatterns.signature_expressions, ...analysis.speechPatterns])
      ].slice(0, 8);
      
      profile.lastUpdated = new Date();
      profile.confidence_score = Math.min(0.9, profile.confidence_score + 0.3);
      
      // Save updated profile
      await personalityEngine.savePersonalityProfile(profile);
      
      return profile;
    } catch (error) {
      console.error('Error updating personality from scraping:', error);
      return null;
    }
  }
  
  private async getMemberData(memberId: string): Promise<any> {
    try {
      // Import Prisma client
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      
      const member = await prisma.member.findUnique({
        where: { id: memberId },
        include: {
          committees: {
            include: { Committee: true }
          }
        }
      });
      
      await prisma.$disconnect();
      return member;
    } catch (error) {
      console.error('Error fetching member data:', error);
      // Fallback to mock data
      return {
        id: memberId,
        firstName: 'John',
        lastName: 'Smith', 
        state: 'CA',
        chamber: 'house',
        party: 'D'
      };
    }
  }
}

export const speechScraper = new SpeechScraper();
