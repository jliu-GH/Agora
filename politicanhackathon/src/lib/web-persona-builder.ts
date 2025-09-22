import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';

interface PoliticianPersona {
  name: string;
  party: string;
  state: string;
  chamber: string;
  biography: string;
  keyPositions: string[];
  recentStatements: string[];
  committees: string[];
  votingRecord: string[];
  communicationStyle: string;
  achievements: string[];
  constituency: string;
  headshotUrl?: string;
}

interface ScrapingSource {
  url: string;
  type: 'official' | 'voting' | 'news' | 'committee';
  priority: number;
}

export class WebPersonaBuilder {
  private browser: puppeteer.Browser | null = null;

  async initialize() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Build comprehensive persona for any politician
   */
  async buildPersona(politician: {
    id: string;
    firstName: string;
    lastName: string;
    party: string;
    state: string;
    chamber: string;
  }): Promise<PoliticianPersona> {
    await this.initialize();
    
    console.log(`🕷️ Building persona for ${politician.firstName} ${politician.lastName}...`);

    const fullName = `${politician.firstName} ${politician.lastName}`;
    const sources = this.generateScrapingSources(politician);
    
    const scrapedData = await this.scrapeMultipleSources(sources, fullName);
    
    // Scrape headshot from Google Images
    const headshotUrl = await this.scrapeGoogleImage(`${fullName} ${politician.party} ${politician.state} senator representative headshot official photo`);
    
    return {
      name: fullName,
      party: politician.party,
      state: politician.state,
      chamber: politician.chamber,
      biography: scrapedData.biography,
      keyPositions: scrapedData.positions,
      recentStatements: scrapedData.statements,
      committees: scrapedData.committees,
      votingRecord: scrapedData.voting,
      communicationStyle: this.inferCommunicationStyle(scrapedData.statements),
      achievements: scrapedData.achievements,
      constituency: this.buildConstituencyDescription(politician.state, politician.chamber),
      headshotUrl: headshotUrl || undefined
    };
  }

  /**
   * Generate URLs to scrape for politician information
   */
  private generateScrapingSources(politician: any): ScrapingSource[] {
    const fullName = `${politician.firstName} ${politician.lastName}`;
    const nameForUrl = fullName.toLowerCase().replace(/\s+/g, '-');
    const chamber = politician.chamber === 'house' ? 'house' : 'senate';
    
    // Generate name variations for Wikipedia
    const nameVariations = this.generateNameVariations(politician.firstName, politician.lastName);
    const wikipediaUrls = nameVariations.map(name => ({
      url: `https://en.wikipedia.org/wiki/${name.replace(/\s+/g, '_')}`,
      type: 'official' as const,
      priority: 1
    }));
    
    return [
      // Wikipedia - Try multiple name variations
      ...wikipediaUrls,
      // Official government sources
      {
        url: `https://www.${chamber}.gov/members`,
        type: 'official',
        priority: 2
      },
      {
        url: `https://www.congress.gov/member/${nameForUrl}`,
        type: 'official',
        priority: 2
      },
      // Voting records
      {
        url: `https://www.govtrack.us/congress/members/${politician.state}`,
        type: 'voting',
        priority: 3
      },
      // Committee information
      {
        url: `https://www.congress.gov/committees`,
        type: 'committee',
        priority: 3
      }
    ];
  }

  /**
   * Generate name variations for Wikipedia lookup
   */
  private generateNameVariations(firstName: string, lastName: string): string[] {
    const variations = [];
    
    // Full name
    variations.push(`${firstName} ${lastName}`);
    
    // Common nickname variations
    const nicknames: Record<string, string[]> = {
      'David': ['Dave', 'Davey'],
      'William': ['Bill', 'Billy', 'Will'],
      'Robert': ['Bob', 'Bobby', 'Rob'],
      'Richard': ['Rick', 'Dick', 'Ricky'],
      'Christopher': ['Chris', 'Christie'],
      'Michael': ['Mike', 'Mickey'],
      'Timothy': ['Tim', 'Timmy'],
      'Anthony': ['Tony', 'Anton'],
      'Joseph': ['Joe', 'Joey'],
      'James': ['Jim', 'Jimmy', 'Jamie']
    };
    
    if (nicknames[firstName]) {
      nicknames[firstName].forEach(nickname => {
        variations.push(`${nickname} ${lastName}`);
      });
    }
    
    // With politician qualifier
    variations.push(`${firstName} ${lastName} (politician)`);
    variations.push(`${firstName} ${lastName} (${lastName.toLowerCase()} politician)`);
    
    return variations;
  }

  /**
   * Scrape multiple sources and compile information
   */
  private async scrapeMultipleSources(sources: ScrapingSource[], politicianName: string) {
    const results = {
      biography: '',
      positions: [] as string[],
      statements: [] as string[],
      committees: [] as string[],
      voting: [] as string[],
      achievements: [] as string[]
    };

    // First, try to scrape Wikipedia for comprehensive political background
    const wikipediaSources = sources.filter(s => s.url.includes('wikipedia.org'));
    for (const source of wikipediaSources) {
      try {
        console.log(`📖 Scraping Wikipedia: ${source.url}`);
        const wikiData = await this.scrapeWikipedia(source.url, politicianName);
        results.biography += wikiData.biography + ' ';
        results.positions.push(...wikiData.positions);
        results.statements.push(...wikiData.statements);
        results.committees.push(...wikiData.committees);
        results.voting.push(...wikiData.voting);
        results.achievements.push(...wikiData.achievements);
      } catch (error) {
        console.warn(`Wikipedia scraping failed for ${source.url}:`, error);
      }
    }

    // Fallback to search-based scraping for additional information
    const searchQueries = [
      `${politicianName} official biography Congress`,
      `${politicianName} policy positions voting record`,
      `${politicianName} recent statements press releases`,
      `${politicianName} congressional committees`,
      `${politicianName} legislative achievements`
    ];

    for (const query of searchQueries) {
      try {
        const searchResults = await this.searchAndScrape(query, politicianName);
        results.biography += searchResults.biography + ' ';
        results.positions.push(...searchResults.positions);
        results.statements.push(...searchResults.statements);
        results.committees.push(...searchResults.committees);
        results.voting.push(...searchResults.voting);
        results.achievements.push(...searchResults.achievements);
      } catch (error) {
        console.warn(`Failed to scrape for query: ${query}`, error);
      }
    }

    // Clean and deduplicate results
    return {
      biography: this.cleanText(results.biography),
      positions: this.deduplicateArray(results.positions),
      statements: this.deduplicateArray(results.statements),
      committees: this.deduplicateArray(results.committees),
      voting: this.deduplicateArray(results.voting),
      achievements: this.deduplicateArray(results.achievements)
    };
  }

  /**
   * Scrape Google Images for headshot
   */
  private async scrapeGoogleImage(searchQuery: string): Promise<string | null> {
    try {
      if (!this.browser) throw new Error('Browser not initialized');
      
      const page = await this.browser.newPage();
      
      // Try multiple search strategies
      const searchStrategies = [
        `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}&tbm=isch`,
        `https://www.bing.com/images/search?q=${encodeURIComponent(searchQuery)}`,
        `https://duckduckgo.com/?q=${encodeURIComponent(searchQuery)}&t=images&iax=images&ia=images`
      ];
      
      for (const searchUrl of searchStrategies) {
        try {
          console.log(`🔍 Searching images: ${searchUrl}`);
          await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 15000 });
          
          // Wait a bit for images to load
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Try multiple selectors for different image search engines
          const firstImageUrl = await page.evaluate((query) => {
            // Google Images selectors
            const googleSelectors = [
              'img[data-src]',
              'img[src*="encrypted-tbn"]',
              'img[src*="googleusercontent"]',
              '.rg_i',
              'img[alt*="' + query.split(' ')[0] + '"]'
            ];
            
            // Bing Images selectors
            const bingSelectors = [
              '.img_cont img',
              '.iusc img',
              'img[data-src]',
              'img[src*="bing"]'
            ];
            
            // DuckDuckGo selectors
            const duckSelectors = [
              '.tile--img img',
              'img[data-src]',
              'img[src*="duckduckgo"]'
            ];
            
            const allSelectors = [...googleSelectors, ...bingSelectors, ...duckSelectors];
            
            for (const selector of allSelectors) {
              const img = document.querySelector(selector) as HTMLImageElement;
              if (img) {
                const src = img.getAttribute('data-src') || img.getAttribute('src');
                if (src && src.startsWith('http') && 
                    !src.includes('gstatic.com') && 
                    !src.includes('google.com/images/branding') &&
                    !src.includes('fonts.gstatic.com') &&
                    !src.includes('googleusercontent.com/images/branding')) {
                  return src;
                }
              }
            }
            
            // Fallback: get any image with a valid src, excluding branding
            const allImages = document.querySelectorAll('img');
            for (const img of allImages) {
              const src = img.getAttribute('src') || img.getAttribute('data-src');
              if (src && src.startsWith('http') && 
                  !src.includes('google.com/images/branding') && 
                  !src.includes('gstatic.com') &&
                  !src.includes('googleusercontent.com/images/branding') &&
                  !src.includes('fonts.gstatic.com') &&
                  !src.includes('bing.com/images/branding')) {
                return src;
              }
            }
            
            return null;
          }, searchQuery);
          
          if (firstImageUrl) {
            console.log(`📸 Found headshot: ${firstImageUrl}`);
            await page.close();
            return firstImageUrl;
          }
        } catch (error) {
          console.warn(`Search strategy failed: ${searchUrl}`, error);
          continue;
        }
      }
      
      await page.close();
      return null;
    } catch (error) {
      console.warn(`Failed to scrape image for ${searchQuery}:`, error);
      return null;
    }
  }

  /**
   * Scrape Wikipedia page for comprehensive political background
   */
  private async scrapeWikipedia(url: string, politicianName: string) {
    if (!this.browser) throw new Error('Browser not initialized');
    
    const page = await this.browser.newPage();
    const results = {
      biography: '',
      positions: [] as string[],
      statements: [] as string[],
      committees: [] as string[],
      voting: [] as string[],
      achievements: [] as string[]
    };

    try {
      // Set user agent to avoid detection
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
      
      console.log(`🌐 Loading Wikipedia page: ${url}`);
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      
      const content = await page.content();
      const $ = cheerio.load(content);
      
      // Extract biography from infobox and early sections
      const infobox = $('.infobox, .vcard, .biography');
      if (infobox.length > 0) {
        infobox.find('tr').each((i, row) => {
          const label = $(row).find('th').text().trim();
          const value = $(row).find('td').text().trim();
          
          if (label && value && value.length > 3) {
            const cleanLabel = label.replace(/\[.*?\]/g, '').trim();
            const cleanValue = value.replace(/\[.*?\]/g, '').trim();
            
            if (cleanLabel.toLowerCase().includes('born') || cleanLabel.toLowerCase().includes('birth')) {
              results.biography += `Born: ${cleanValue}. `;
            }
            if (cleanLabel.toLowerCase().includes('education') || cleanLabel.toLowerCase().includes('alma')) {
              results.biography += `Education: ${cleanValue}. `;
            }
            if (cleanLabel.toLowerCase().includes('party') || cleanLabel.toLowerCase().includes('political')) {
              results.positions.push(`${cleanLabel}: ${cleanValue}`);
            }
            if (cleanLabel.toLowerCase().includes('office') || cleanLabel.toLowerCase().includes('position')) {
              results.achievements.push(`${cleanLabel}: ${cleanValue}`);
            }
          }
        });
      }
      
      // Extract main content sections - get more comprehensive content
      $('h2, h3').each((i, heading) => {
        const headingText = $(heading).text().toLowerCase().replace(/\[.*?\]/g, '');
        
        // Get all paragraphs in the section, not just the first one
        let sectionContent = '';
        $(heading).nextUntil('h2, h3').find('p').each((j, p) => {
          const pText = $(p).text().trim();
          if (pText.length > 30) {
            sectionContent += pText + ' ';
          }
        });
        
        if (sectionContent && sectionContent.length > 50) {
          const cleanContent = sectionContent.replace(/\[.*?\]/g, '').trim();
          
          if (headingText.includes('early life') || headingText.includes('education') || headingText.includes('background')) {
            results.biography += cleanContent.substring(0, 800) + ' '; // Increased from 300
          }
          
          if (headingText.includes('political') || headingText.includes('positions') || headingText.includes('views') || headingText.includes('ideology')) {
            results.positions.push(cleanContent.substring(0, 500)); // Increased from 200
          }
          
          if (headingText.includes('congress') || headingText.includes('senate') || headingText.includes('house') || headingText.includes('legislative')) {
            results.committees.push(cleanContent.substring(0, 500)); // Increased from 200
          }
          
          if (headingText.includes('voting') || headingText.includes('record') || headingText.includes('bills') || headingText.includes('legislation')) {
            results.voting.push(cleanContent.substring(0, 500)); // Increased from 200
          }
          
          if (headingText.includes('career') || headingText.includes('business') || headingText.includes('military') || headingText.includes('service')) {
            results.achievements.push(cleanContent.substring(0, 500)); // Increased from 200
          }
        }
      });
      
      // Also extract the main introductory paragraphs
      $('#mw-content-text .mw-parser-output p').slice(0, 3).each((i, p) => {
        const pText = $(p).text().trim();
        if (pText.length > 100) {
          const cleanText = pText.replace(/\[.*?\]/g, '').trim();
          results.biography += cleanText + ' ';
        }
      });
      
      // Extract key quotes and statements
      $('blockquote, .quote, .citation').each((i, quote) => {
        const quoteText = $(quote).text().trim();
        if (quoteText.length > 20 && quoteText.length < 300) {
          results.statements.push(quoteText);
        }
      });
      
      // Extract from main content paragraphs
      $('p').each((i, paragraph) => {
        const text = $(paragraph).text().trim();
        if (text.length > 50) {
          const lowerText = text.toLowerCase();
          
          if (lowerText.includes(politicianName.toLowerCase()) && 
              (lowerText.includes('supports') || lowerText.includes('opposes') || lowerText.includes('believes'))) {
            results.positions.push(text.substring(0, 200));
          }
          
          if (lowerText.includes('said') || lowerText.includes('stated') || lowerText.includes('announced')) {
            results.statements.push(text.substring(0, 200));
          }
        }
      });
      
      console.log(`✅ Wikipedia scraping completed for ${politicianName}`);
      
    } catch (error) {
      console.warn(`Wikipedia scraping failed for ${url}:`, error);
    } finally {
      await page.close();
    }

    return results;
  }

  /**
   * Perform web search and scrape results
   */
  private async searchAndScrape(query: string, politicianName: string) {
    if (!this.browser) throw new Error('Browser not initialized');
    
    const page = await this.browser.newPage();
    const results = {
      biography: '',
      positions: [] as string[],
      statements: [] as string[],
      committees: [] as string[],
      voting: [] as string[],
      achievements: [] as string[]
    };

    try {
      // Set user agent to avoid detection
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
      
      // Search for information (using DuckDuckGo to avoid blocking)
      const searchUrl = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      
      const content = await page.content();
      const $ = cheerio.load(content);
      
      // Extract relevant information from search results
      $('.result').each((i, element) => {
        const text = $(element).text().toLowerCase();
        const snippet = $(element).find('.result__snippet').text();
        
        if (text.includes(politicianName.toLowerCase())) {
          // Categorize content based on keywords
          if (text.includes('biography') || text.includes('born') || text.includes('education')) {
            results.biography += snippet + ' ';
          }
          if (text.includes('position') || text.includes('supports') || text.includes('opposes')) {
            results.positions.push(snippet);
          }
          if (text.includes('statement') || text.includes('said') || text.includes('announced')) {
            results.statements.push(snippet);
          }
          if (text.includes('committee') || text.includes('chair') || text.includes('member')) {
            results.committees.push(snippet);
          }
          if (text.includes('voted') || text.includes('bill') || text.includes('legislation')) {
            results.voting.push(snippet);
          }
          if (text.includes('achievement') || text.includes('accomplished') || text.includes('success')) {
            results.achievements.push(snippet);
          }
        }
      });

    } catch (error) {
      console.warn(`Search failed for query: ${query}`, error);
    } finally {
      await page.close();
    }

    return results;
  }

  /**
   * Infer communication style from statements
   */
  private inferCommunicationStyle(statements: string[]): string {
    const allText = statements.join(' ').toLowerCase();
    
    const styles = [];
    
    if (allText.includes('fight') || allText.includes('battle') || allText.includes('struggle')) {
      styles.push('combative');
    }
    if (allText.includes('bipartisan') || allText.includes('across the aisle') || allText.includes('compromise')) {
      styles.push('collaborative');
    }
    if (allText.includes('data') || allText.includes('research') || allText.includes('evidence')) {
      styles.push('analytical');
    }
    if (allText.includes('people') || allText.includes('families') || allText.includes('community')) {
      styles.push('populist');
    }
    if (allText.includes('constitution') || allText.includes('principle') || allText.includes('founding')) {
      styles.push('principled');
    }

    return styles.length > 0 ? styles.join(', ') : 'measured and thoughtful';
  }

  /**
   * Build constituency description
   */
  private buildConstituencyDescription(state: string, chamber: string): string {
    const stateNames: Record<string, string> = {
      'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas', 'CA': 'California',
      'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware', 'FL': 'Florida', 'GA': 'Georgia',
      'HI': 'Hawaii', 'ID': 'Idaho', 'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa',
      'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
      'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi', 'MO': 'Missouri',
      'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada', 'NH': 'New Hampshire', 'NJ': 'New Jersey',
      'NM': 'New Mexico', 'NY': 'New York', 'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio',
      'OK': 'Oklahoma', 'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
      'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah', 'VT': 'Vermont',
      'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia', 'WI': 'Wisconsin', 'WY': 'Wyoming'
    };

    const stateName = stateNames[state] || state;
    const role = chamber === 'house' ? 'Congressional district' : 'entire state';
    
    return `Representing the ${role} of ${stateName}`;
  }

  /**
   * Create persona prompt for AI
   */
  createPersonaPrompt(persona: PoliticianPersona, userQuery: string): string {
    const hasConversationHistory = userQuery.includes('PREVIOUS CONVERSATION:');
    
    return `You are ${persona.name}, a ${persona.chamber === 'house' ? 'U.S. Representative' : 'U.S. Senator'} representing ${persona.constituency} (${persona.party} party).

PERSONA PROFILE:
- Background: ${persona.biography}
- Communication Style: ${persona.communicationStyle}
- Key Policy Positions: ${persona.keyPositions.slice(0, 5).join('; ')}
- Committee Work: ${persona.committees.slice(0, 3).join('; ')}
- Recent Achievements: ${persona.achievements.slice(0, 3).join('; ')}

INSTRUCTIONS:
1. Respond in first person as ${persona.name}
2. Stay true to your established positions and communication style
3. Be authentic to your political record and party affiliation
4. Reference your actual work and achievements when relevant
5. Maintain the tone and approach consistent with your public persona
${hasConversationHistory ? `6. **IMPORTANT**: This is a continuing conversation. Reference and build upon what was discussed previously. Use phrases like "As I mentioned," "Building on that," "Like I said earlier," etc. to connect your response to the previous discussion.
7. **CONVERSATION FLOW**: Acknowledge the context of our previous exchange and provide a natural follow-up response that advances the discussion.` : ''}

${userQuery}

RESPONSE (as ${persona.name}):`;
  }

  /**
   * Utility functions
   */
  private cleanText(text: string): string {
    // NUCLEAR OPTION: Complete Wikipedia table removal for demo
    let cleaned = text;
    
    // Step 1: Remove ENTIRE Wikipedia infobox sections (everything after "show" keywords)
    cleaned = cleaned.replace(/show[A-Za-z\s]*positions?.*$/gis, '');
    cleaned = cleaned.replace(/show[A-Za-z\s]*offices?.*$/gis, '');
    
    // Step 2: Remove any remaining position/leadership content blocks
    const positionPatterns = [
      /President pro tempore[\s\S]*?(?=[A-Z][a-z]{3,}|$)/gi,
      /Chair of the Senate[\s\S]*?(?=[A-Z][a-z]{3,}|$)/gi,
      /Chair of the House[\s\S]*?(?=[A-Z][a-z]{3,}|$)/gi,
      /Senate Assistant[\s\S]*?Leader[\s\S]*?(?=[A-Z][a-z]{3,}|$)/gi,
      /House Assistant[\s\S]*?Leader[\s\S]*?(?=[A-Z][a-z]{3,}|$)/gi,
      /Secretary of the[\s\S]*?Caucus[\s\S]*?(?=[A-Z][a-z]{3,}|$)/gi,
      /Chair of the[\s\S]*?Campaign Committee[\s\S]*?(?=[A-Z][a-z]{3,}|$)/gi,
      /Preceded by[\s\S]*?Succeeded by[\s\S]*?(?=[A-Z][a-z]{3,}|$)/gi,
      /In office[\s\S]*?(?=[A-Z][a-z]{3,}|$)/gi,
      /Incumbent[\s\S]*?(?=[A-Z][a-z]{3,}|$)/gi,
      /Assumed office[\s\S]*?(?=[A-Z][a-z]{3,}|$)/gi,
      /Position established[\s\S]*?(?=[A-Z][a-z]{3,}|$)/gi,
      /Position abolished[\s\S]*?(?=[A-Z][a-z]{3,}|$)/gi,
      /January \d+, \d{4}[\s\S]*?(?=[A-Z][a-z]{3,}|$)/gi,
      /\d{4}–\d{4}[\s\S]*?(?=[A-Z][a-z]{3,}|$)/gi,
      /\d{4}–Present[\s\S]*?(?=[A-Z][a-z]{3,}|$)/gi
    ];
    
    positionPatterns.forEach(pattern => {
      cleaned = cleaned.replace(pattern, '');
    });
    
    // Step 3: Remove Wikipedia markup and references
    cleaned = cleaned
      .replace(/\[edit\]/g, '')
      .replace(/\[citation needed\]/g, '')
      .replace(/\[\d+\]/g, '')
      .replace(/\[.*?\]/g, '')
      .replace(/\(.*?\)/g, ' ');
    
    // Step 4: Remove navigation and artifacts
    const artifacts = [
      /See also.*$/i, /External links.*$/i, /References.*$/i,
      /Click here for.*$/i, /Hide Overview.*$/i, /Read biography.*$/i,
      /Official.*Photo.*$/i, /In Congress.*Present.*$/i, /Member.*$/i,
      /Track.*Senator.*$/i, /View bills.*$/i, /CONTACT.*$/i,
      /Capitol Office.*$/i, /District.*$/i, /Assistant.*Leader.*$/i,
      /S\.\d+.*?Congress.*?/g, /Senator.*?Committee.*?on.*?/g,
      /Senate.*?Committee.*?on.*?/g, /House.*?Committee.*?on.*?/g
    ];
    
    artifacts.forEach(pattern => {
      cleaned = cleaned.replace(pattern, '');
    });
    
    // Step 5: Clean up whitespace and structure
    cleaned = cleaned
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, ' ')
      .replace(/\t+/g, ' ')
      .replace(/\.\s*\./g, '.')
      .replace(/\s+\./g, '.')
      .replace(/^\s*\.+/, '')
      .replace(/\.+$/, '.')
      .trim();
    
    // Step 6: FINAL FILTER - Only keep clean biographical sentences
    const sentences = cleaned.split(/[.!?]+/).filter(sentence => {
      const s = sentence.trim().toLowerCase();
      if (s.length < 15) return false;
      
      // Reject sentences containing position/table keywords
      const badKeywords = [
        'preceded by', 'succeeded by', 'in office', 'chair of', 'leader',
        'position', 'committee', 'january', 'february', 'march', 'april',
        'may', 'june', 'july', 'august', 'september', 'october', 'november',
        'december', '2020', '2021', '2022', '2023', '2024', '2025', 'show',
        'incumbent', 'assumed', 'established', 'abolished', 'vice chair',
        'secretary', 'campaign', 'caucus', 'whip', 'pro tempore'
      ];
      
      return !badKeywords.some(keyword => s.includes(keyword)) && 
             s.match(/[a-z].*[a-z]/) && // Must contain letters
             s.split(' ').length >= 3; // At least 3 words
    });
    
    // Return first 2-3 clean sentences, max 400 chars
    return sentences.slice(0, 3).join('. ').substring(0, 400).trim();
  }

  private deduplicateArray(arr: string[]): string[] {
    return Array.from(new Set(arr.filter(item => item && item.length > 10)));
  }
}

export default WebPersonaBuilder;
