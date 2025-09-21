import { PrismaClient } from '@prisma/client';
import { MemberPacket } from './debate-system';

const prisma = new PrismaClient();

export interface PersonalityProfile {
  memberId: string;
  name: string;
  
  // Core personality traits
  communicationStyle: {
    formality: 'formal' | 'casual' | 'mixed';
    directness: 'blunt' | 'diplomatic' | 'evasive';
    emotionality: 'passionate' | 'measured' | 'volatile';
    humor: 'frequent' | 'occasional' | 'rare';
  };
  
  // Speech patterns
  speechPatterns: {
    commonPhrases: string[];
    fillerWords: string[];
    signature_expressions: string[];
    preferred_metaphors: string[];
    regional_dialect: string[];
  };
  
  // Communication preferences
  preferences: {
    topics_passionate_about: string[];
    topics_avoids: string[];
    preferred_debate_style: 'aggressive' | 'collaborative' | 'analytical';
    uses_personal_anecdotes: boolean;
    cites_data_frequently: boolean;
  };
  
  // Social media style (if applicable)
  digitalPersona: {
    twitter_tone: 'professional' | 'combative' | 'folksy' | 'academic';
    uses_social_media: boolean;
    emoji_usage: 'never' | 'rarely' | 'frequently';
  };
  
  // Scraped data insights
  recentStatements: {
    text: string;
    source: string;
    date: string;
    context: string;
  }[];
  
  // Dynamic personality metrics (updated from web scraping)
  dynamicTraits: {
    current_mood: 'optimistic' | 'frustrated' | 'determined' | 'defensive';
    recent_focus_areas: string[];
    stance_evolution: {
      topic: string;
      change_detected: string;
      confidence: number;
    }[];
  };
  
  // Metadata
  lastUpdated: Date;
  confidence_score: number; // How much data we have on this person
}

export class PersonalityEngine {
  
  async getPersonalityProfile(memberId: string): Promise<PersonalityProfile | null> {
    try {
      // Try to load from database first
      const cached = await prisma.chunk.findFirst({
        where: {
          sourceUrl: `personality://${memberId}`,
        }
      });
      
      if (cached) {
        return JSON.parse(cached.text) as PersonalityProfile;
      }
      
      // If not found, generate a basic profile and trigger update
      const member = await prisma.member.findUnique({
        where: { id: memberId }
      });
      
      if (!member) return null;
      
      const basicProfile = this.generateBasicProfile(member);
      await this.savePersonalityProfile(basicProfile);
      
      return basicProfile;
    } catch (error) {
      console.error('Error loading personality profile:', error);
      return null;
    }
  }
  
  private generateBasicProfile(member: any): PersonalityProfile {
    // Generate basic profile based on party, region, etc.
    const isRepublican = member.party === 'R';
    const isDemocrat = member.party === 'D';
    const isSouthern = ['TX', 'FL', 'GA', 'NC', 'SC', 'AL', 'MS', 'LA', 'AR', 'TN', 'KY', 'WV', 'VA'].includes(member.state);
    const isNortheast = ['NY', 'MA', 'CT', 'RI', 'VT', 'NH', 'ME', 'NJ', 'PA'].includes(member.state);
    const isWestern = ['CA', 'OR', 'WA', 'NV', 'AZ', 'UT', 'CO', 'WY', 'MT', 'ID'].includes(member.state);
    
    return {
      memberId: member.id,
      name: `${member.firstName} ${member.lastName}`,
      
      communicationStyle: {
        formality: isRepublican && !isSouthern ? 'formal' : 'mixed',
        directness: isSouthern ? 'diplomatic' : isNortheast ? 'blunt' : 'diplomatic',
        emotionality: isDemocrat ? 'passionate' : 'measured',
        humor: isSouthern ? 'frequent' : 'occasional'
      },
      
      speechPatterns: {
        commonPhrases: this.getCommonPhrases(member),
        fillerWords: this.getFillerWords(member),
        signature_expressions: this.getSignatureExpressions(member),
        preferred_metaphors: this.getPreferredMetaphors(member),
        regional_dialect: this.getRegionalDialect(member.state)
      },
      
      preferences: {
        topics_passionate_about: this.getPassionateTopics(member),
        topics_avoids: this.getAvoidedTopics(member),
        preferred_debate_style: isDemocrat ? 'collaborative' : 'analytical',
        uses_personal_anecdotes: isSouthern || member.chamber === 'house',
        cites_data_frequently: member.chamber === 'senate' || isNortheast
      },
      
      digitalPersona: {
        twitter_tone: isRepublican ? 'combative' : 'professional',
        uses_social_media: member.chamber === 'house', // House reps more active on social
        emoji_usage: member.chamber === 'house' ? 'rarely' : 'never'
      },
      
      recentStatements: [],
      
      dynamicTraits: {
        current_mood: 'determined',
        recent_focus_areas: [],
        stance_evolution: []
      },
      
      lastUpdated: new Date(),
      confidence_score: 0.3 // Low confidence until we scrape real data
    };
  }
  
  private getCommonPhrases(member: any): string[] {
    const republican = [
      "Let me be clear",
      "The American people deserve",
      "We need to get back to basics",
      "This is about freedom",
      "The Constitution is clear on this"
    ];
    
    const democrat = [
      "We need to fight for",
      "This is about fairness",
      "Working families are struggling",
      "We can't afford to wait",
      "It's time for change"
    ];
    
    return member.party === 'R' ? republican : democrat;
  }
  
  private getFillerWords(member: any): string[] {
    const southern = ["well", "you know", "I tell you what", "let me tell you"];
    const northeast = ["look", "listen", "the fact is", "here's the thing"];
    const midwest = ["you bet", "absolutely", "without a doubt", "that's right"];
    const western = ["obviously", "clearly", "I mean", "basically"];
    
    const isSouthern = ['TX', 'FL', 'GA', 'NC', 'SC', 'AL', 'MS', 'LA', 'AR', 'TN', 'KY', 'WV', 'VA'].includes(member.state);
    const isNortheast = ['NY', 'MA', 'CT', 'RI', 'VT', 'NH', 'ME', 'NJ', 'PA'].includes(member.state);
    const isMidwest = ['OH', 'MI', 'IN', 'IL', 'WI', 'MN', 'IA', 'MO', 'ND', 'SD', 'NE', 'KS'].includes(member.state);
    
    if (isSouthern) return southern;
    if (isNortheast) return northeast;
    if (isMidwest) return midwest;
    return western;
  }
  
  private getSignatureExpressions(member: any): string[] {
    // These would be updated from real speech pattern analysis
    return [
      `As a representative from ${member.state}`,
      `In my district, we`,
      `I've seen firsthand`
    ];
  }
  
  private getPreferredMetaphors(member: any): string[] {
    const republican = ["building", "foundation", "common sense", "main street"];
    const democrat = ["bridge", "ladder", "opportunity", "investment"];
    
    return member.party === 'R' ? republican : democrat;
  }
  
  private getRegionalDialect(state: string): string[] {
    const dialects: { [key: string]: string[] } = {
      'TX': ["y'all", "fixin' to", "might could", "over yonder"],
      'NY': ["coffee" > "cawfee", "talk" > "tawk"],
      'MA': ["car" > "cah", "park" > "pahk"],
      'CA': ["like", "totally", "for sure", "you guys"],
      'MN': ["you betcha", "oh ya", "doncha know"],
      'LA': ["making groceries", "banquette", "where y'at"]
    };
    
    return dialects[state] || [];
  }
  
  private getPassionateTopics(member: any): string[] {
    // Would be enhanced with committee assignments and real data
    const topics = [];
    
    if (member.committees?.some((c: any) => c.Committee?.name.includes('Agriculture'))) {
      topics.push('rural development', 'farming', 'food security');
    }
    if (member.committees?.some((c: any) => c.Committee?.name.includes('Armed Services'))) {
      topics.push('national defense', 'veterans affairs', 'military families');
    }
    
    return topics;
  }
  
  private getAvoidedTopics(member: any): string[] {
    // Topics politicians typically avoid based on party/region
    if (member.party === 'R') {
      return ['climate change details', 'abortion specifics', 'gun control measures'];
    } else {
      return ['deficit spending', 'regulatory burden', 'tax increases'];
    }
  }
  
  async savePersonalityProfile(profile: PersonalityProfile): Promise<void> {
    try {
      // First ensure the document exists
      await prisma.document.upsert({
        where: {
          id: `personality-doc-${profile.memberId}`
        },
        update: {
          url: `personality://${profile.memberId}`,
          publisher: 'PersonalityEngine',
          retrievedAt: new Date(),
          text: JSON.stringify(profile)
        },
        create: {
          id: `personality-doc-${profile.memberId}`,
          url: `personality://${profile.memberId}`,
          publisher: 'PersonalityEngine',
          retrievedAt: new Date(),
          text: JSON.stringify(profile)
        }
      });

      // Then save as a special chunk in the database
      await prisma.chunk.upsert({
        where: {
          id: `personality-${profile.memberId}`
        },
        update: {
          text: JSON.stringify(profile),
          sourceUrl: `personality://${profile.memberId}`
        },
        create: {
          id: `personality-${profile.memberId}`,
          documentId: `personality-doc-${profile.memberId}`,
          text: JSON.stringify(profile),
          spanStart: 0,
          spanEnd: JSON.stringify(profile).length,
          embedding: JSON.stringify(new Array(1536).fill(0)),
          sourceUrl: `personality://${profile.memberId}`
        }
      });
    } catch (error) {
      console.error('Error saving personality profile:', error);
    }
  }
  
  generatePersonalityPrompt(profile: PersonalityProfile): string {
    return `You are ${profile.name}, and you must embody their authentic personality and speaking style.

CORE PERSONALITY:
- Party: ${profile.party} from ${profile.state}${profile.district ? ` District ${profile.district}` : ''}
- Communication Style: ${profile.communicationStyle.formality}, ${profile.communicationStyle.directness}, ${profile.communicationStyle.emotionality}
- Debate Approach: ${profile.preferences.preferred_debate_style}
- Current Mood: ${profile.dynamicTraits.current_mood}

SPEAKING PATTERNS (Use sparingly - vary your expression):
- Signature phrases: ${profile.speechPatterns.commonPhrases.slice(0, 3).join(', ')} (don't overuse)
- Regional expressions: ${profile.speechPatterns.regional_dialect.slice(0, 3).join(', ')} (use occasionally)
- Filler words: ${profile.speechPatterns.fillerWords.slice(0, 2).join(', ')} (natural use only)
- Preferred metaphors: ${profile.speechPatterns.preferred_metaphors.slice(0, 2).join(', ')}

KEY BEHAVIORAL TRAITS:
- Uses personal anecdotes: ${profile.preferences.uses_personal_anecdotes ? 'Yes' : 'No'}
- Cites data frequently: ${profile.preferences.cites_data_frequently ? 'Yes' : 'No'}
- Passionate about: ${profile.preferences.topics_passionate_about.slice(0, 3).join(', ')}
- Recent focus: ${profile.dynamicTraits.recent_focus_areas.slice(0, 3).join(', ')}

CRITICAL INSTRUCTIONS FOR NATURAL CONVERSATION:
- VARY your opening phrases - don't start every response the same way
- Use your signature phrases SPARINGLY - maybe once per response maximum
- Focus on substance over catchphrases
- Build on what others have said rather than giving speeches
- Be conversational and responsive, not repetitive
- Bring specific examples, data, or new angles to keep things fresh
- Engage with your opponent's actual points
- Show evolution in your thinking as the debate progresses

Remember: You're having a real conversation, not delivering the same stump speech over and over. Be authentic but dynamic.`;
  }
}

export const personalityEngine = new PersonalityEngine();
