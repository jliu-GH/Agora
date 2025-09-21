import { retrieve } from './rag';
import { Citation } from '@/types/citations';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { personalityEngine, PersonalityProfile } from './personality-engine';
import { speechScraper } from './speech-scraper';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export interface MemberPacket {
  id: string;
  name: string;
  chamber: string;
  state: string;
  district?: string;
  party: string;
  dwNominate?: number;
  committees: string[];
  snippets: any[];
  personalityProfile?: PersonalityProfile;
}

export interface DebateState {
  mode: 'SOLO' | 'TRIAD';
  memberA?: MemberPacket;
  memberB?: MemberPacket;
  topic: string;
  turns: number;
  maxWords: { opening: number; rebuttal: number; closing: number };
  currentRound: number;
  userStance?: string;
}

export class DebateSystem {
  private state: DebateState = {
    mode: 'SOLO',
    topic: '',
    turns: 3,
    maxWords: { opening: 120, rebuttal: 120, closing: 80 },
    currentRound: 0
  };

  async chooseRep(memberId: string, memberData: any): Promise<string> {
    try {
      // Retrieve relevant snippets for this member
      const snippets = await retrieve(`${memberData.firstName} ${memberData.lastName} ${this.state.topic}`, 5);
      
      // Load or create personality profile
      let personalityProfile = await personalityEngine.getPersonalityProfile(memberId);
      if (!personalityProfile) {
        // Create basic profile and trigger scraping update
        console.log(`Creating personality profile for ${memberData.firstName} ${memberData.lastName}`);
        personalityProfile = await speechScraper.updatePersonalityFromScraping(memberId);
      }
      
      this.state.memberA = {
        id: memberId,
        name: `${memberData.firstName} ${memberData.lastName}`,
        chamber: memberData.chamber,
        state: memberData.state,
        district: memberData.district,
        party: memberData.party,
        dwNominate: memberData.dwNominate,
        committees: memberData.committees?.map((c: any) => c.Committee.name) || [],
        snippets,
        personalityProfile // Add personality profile to member data
      };
      
      this.state.mode = 'SOLO';
      this.state.currentRound = 0;
      
      return `[MOD] Loaded ${this.state.memberA.name} (${this.state.memberA.party}-${this.state.memberA.state}). Personality profile loaded with ${personalityProfile?.confidence_score || 0.3} confidence. Ready for SOLO CHAT. Use /topic to set a discussion topic.`;
    } catch (error) {
      return "Insufficient evidence to answer.";
    }
  }

  async addRep(memberId: string, memberData: any): Promise<string> {
    try {
      // Retrieve relevant snippets for this member
      const snippets = await retrieve(`${memberData.firstName} ${memberData.lastName} ${this.state.topic}`, 5);
      
      this.state.memberB = {
        id: memberId,
        name: `${memberData.firstName} ${memberData.lastName}`,
        chamber: memberData.chamber,
        state: memberData.state,
        district: memberData.district,
        party: memberData.party,
        dwNominate: memberData.dwNominate,
        committees: memberData.committees?.map((c: any) => c.Committee.name) || [],
        snippets
      };
      
      this.state.mode = 'TRIAD';
      this.state.currentRound = 0;
      
      return `[MOD] Added ${this.state.memberB.name} (${this.state.memberB.party}-${this.state.memberB.state}). Switched to TRIAD DEBATE mode. Use /topic to set debate topic, then begin.`;
    } catch (error) {
      return "Insufficient evidence to answer.";
    }
  }

  setTopic(topic: string): string {
    this.state.topic = topic;
    return `[MOD] Topic set to "${topic}".`;
  }

  setTurns(turns: number): string {
    this.state.turns = Math.max(1, Math.min(5, turns));
    return `[MOD] Debate rounds set to ${this.state.turns}.`;
  }

  setMaxWords(type: 'opening' | 'rebuttal' | 'closing', words: number): string {
    this.state.maxWords[type] = Math.max(20, Math.min(200, words));
    return `[MOD] ${type} word limit set to ${words}.`;
  }

  endDebate(): string {
    if (this.state.mode === 'TRIAD' && this.state.memberA) {
      this.state.mode = 'SOLO';
      this.state.memberB = undefined;
      this.state.currentRound = 0;
      return `[MOD] Ended TRIAD debate. Returned to SOLO CHAT with ${this.state.memberA.name}.`;
    }
    return "[MOD] No active TRIAD debate to end.";
  }

  async processUserInput(userInput: string, userStance?: string): Promise<string> {
    if (!this.state.memberA) {
      return "[MOD] Please choose a representative first using /choose_rep <name_or_id>.";
    }

    if (userStance) {
      this.state.userStance = userStance;
    }

    if (this.state.mode === 'SOLO') {
      return await this.handleSoloChat(userInput);
    } else {
      return await this.handleTriadDebate(userInput);
    }
  }

  private async handleSoloChat(userInput: string): Promise<string> {
    if (!this.state.memberA) return "Insufficient evidence to answer.";

    // Generate response based on member's political position and available snippets
    const response = await this.generateSoloResponse(this.state.memberA, userInput);
    const citations = this.extractCitations(this.state.memberA.snippets, response);
    
    return `[REP A] ${response}\n\nCITATIONS=${JSON.stringify(citations)}`;
  }

  private async handleTriadDebate(userInput: string): Promise<string> {
    if (!this.state.memberA || !this.state.memberB) {
      return "[MOD] Both representatives must be loaded for TRIAD debate.";
    }

    // Check if this is a new debate round
    if (userInput.toLowerCase().includes('/start') || userInput.toLowerCase().includes('begin debate')) {
      this.state.currentRound = 1;
      return await this.runDebateRound();
    }

    // Handle user interjection
    if (userInput.toLowerCase().includes('interject') || userInput.toLowerCase().includes('question')) {
      return `[MOD] User interjection: "${userInput}"\n\nPlease continue the debate.`;
    }

    // Continue with current round
    return await this.runDebateRound();
  }

  private async runDebateRound(): Promise<string> {
    if (!this.state.memberA || !this.state.memberB) {
      return "Insufficient evidence to answer.";
    }

    let result = `[MOD] Round ${this.state.currentRound} of ${this.state.turns} - Topic: "${this.state.topic}"\n\n`;

    if (this.state.currentRound === 1) {
      // Opening statements
      result += await this.generateOpeningStatement(this.state.memberA);
      result += "\n\n";
      result += await this.generateOpeningStatement(this.state.memberB);
    } else if (this.state.currentRound === 2) {
      // Rebuttals
      result += await this.generateRebuttal(this.state.memberA, this.state.memberB);
      result += "\n\n";
      result += await this.generateRebuttal(this.state.memberB, this.state.memberA);
    } else if (this.state.currentRound === 3) {
      // Closing statements
      result += await this.generateClosingStatement(this.state.memberA);
      result += "\n\n";
      result += await this.generateClosingStatement(this.state.memberB);
      result += "\n\n";
      result += await this.generateNeutralSummary();
    }

    this.state.currentRound++;
    return result;
  }

  private async generateSoloResponse(member: MemberPacket, userInput: string): Promise<string> {
    try {
      // Check if Gemini API is available
      if (process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes('blocked')) {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        // Create a system prompt for authentic responses
        const systemPrompt = this.createSystemPrompt(member);
        
        // Retrieve relevant context from various sources
        const context = await retrieve(`${member.name} ${this.state.topic} ${userInput}`, 5);
        
        const prompt = `${systemPrompt}

TOPIC: ${this.state.topic}
USER QUESTION: ${userInput}

RELEVANT CONTEXT:
${context.map((c, i) => `[${i + 1}] ${c.text.substring(0, 200)}...`).join('\n')}

IMPORTANT: Respond as ${member.name} would - with emotion, personality, and authentic voice. Use varied sentence structures and show genuine feelings about the topic.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        return text;
      } else {
        // Fallback to enhanced mock responses
        return this.generateEnhancedMockResponse(member, userInput);
      }
    } catch (error) {
      console.error('Error generating solo response:', error);
      return this.generateEnhancedMockResponse(member, userInput);
    }
  }

  private generateEnhancedMockResponse(member: MemberPacket, userInput: string): string {
    const partyName = member.party === 'D' ? 'Democratic' : member.party === 'R' ? 'Republican' : 'Independent';
    
    // Generate varied response formats
    const responseFormats = this.getResponseFormats();
    const format = responseFormats[Math.floor(Math.random() * responseFormats.length)];
    
    let response = '';
    
    // Generate topic-specific responses with emotion and variety
    if (this.state.topic.toLowerCase().includes('climate')) {
      if (member.party === 'R') {
        response = this.generateClimateResponse(member, 'republican');
      } else if (member.party === 'D') {
        response = this.generateClimateResponse(member, 'democratic');
      } else {
        response = this.generateClimateResponse(member, 'independent');
      }
    } else if (this.state.topic.toLowerCase().includes('healthcare')) {
      if (member.party === 'R') {
        response = this.generateHealthcareResponse(member, 'republican');
      } else if (member.party === 'D') {
        response = this.generateHealthcareResponse(member, 'democratic');
      } else {
        response = this.generateHealthcareResponse(member, 'independent');
      }
    } else if (this.state.topic.toLowerCase().includes('economy')) {
      if (member.party === 'R') {
        response = this.generateEconomyResponse(member, 'republican');
      } else if (member.party === 'D') {
        response = this.generateEconomyResponse(member, 'democratic');
      } else {
        response = this.generateEconomyResponse(member, 'independent');
      }
    } else {
      response = this.generateGenericResponse(member, userInput);
    }
    
    return response;
  }

  private getResponseFormats(): string[] {
    return [
      "Let me tell you something...",
      "You know what really gets me?",
      "I've been thinking about this a lot lately...",
      "Here's the thing...",
      "You know, I was just talking to a constituent about this...",
      "I'm gonna be honest with you...",
      "This is something I'm passionate about...",
      "Let me be clear about where I stand...",
      "I've seen this issue firsthand...",
      "You know what frustrates me?"
    ];
  }

  private generateClimateResponse(member: MemberPacket, party: string): string {
    const responses = {
      republican: [
        "Look, I'm not denying climate change, but we need practical solutions that don't kill jobs. Let me tell you what I've seen in my district - families struggling to make ends meet. We can't just shut down industries overnight. We need innovation, not regulation that crushes our economy.",
        "Here's the thing about climate policy - it's got to work for real people. I've talked to farmers in my district who are already adapting to changing weather patterns. But we can't let Washington bureaucrats dictate how they run their operations. Market solutions, not government mandates.",
        "I'm all for clean energy, but let's be smart about it. We've got natural gas, nuclear, and yes, even some renewables that make sense. But this idea that we can just flip a switch and everything's clean? That's not how the real world works."
      ],
      democratic: [
        "This is personal for me. I've seen the wildfires, the floods, the extreme weather that's hitting our communities. We can't keep kicking the can down the road. Our kids are counting on us to act now, not when it's convenient for the fossil fuel industry.",
        "Let me be clear - climate change is real, it's happening now, and we need bold action. I'm tired of the excuses and the delays. We have the technology, we have the solutions, we just need the political will to make it happen.",
        "You know what keeps me up at night? Thinking about what kind of world we're leaving for our grandchildren. We're already seeing the impacts, and it's only going to get worse if we don't act. This isn't about politics - it's about survival."
      ],
      independent: [
        "Both parties are missing the point on climate. The left wants to regulate everything, the right wants to ignore it. We need practical solutions that actually work. Let's look at what other countries are doing successfully and adapt it to our situation.",
        "I'm frustrated with the partisan bickering on this issue. Climate change is real, but so are the economic concerns. We need to find the middle ground that protects both our environment and our economy. It's not impossible, we just need leaders willing to work together."
      ]
    };
    
    const partyResponses = responses[party as keyof typeof responses];
    return partyResponses[Math.floor(Math.random() * partyResponses.length)];
  }

  private generateHealthcareResponse(member: MemberPacket, party: string): string {
    const responses = {
      republican: [
        "Healthcare is broken, but government takeover isn't the answer. I've seen what happens when bureaucrats get involved - it gets worse, not better. We need to fix what's broken while keeping what works. Let the market drive innovation and competition.",
        "Look, I've talked to doctors in my district who are drowning in paperwork and regulations. They want to help patients, not fill out forms. We need to get government out of the way and let healthcare providers do their job.",
        "Here's what really frustrates me - we're spending more on healthcare than ever, but people are getting worse care. The problem isn't that we need more government, it's that we need less. Let's fix the real problems: costs, access, and quality."
      ],
      democratic: [
        "I'm tired of watching families go bankrupt because they get sick. Healthcare is a right, not a privilege. We're the richest country in the world, but we're the only developed nation that doesn't guarantee healthcare for everyone. That's not right.",
        "Let me tell you about a family I met last week - they're working two jobs, paying $800 a month for insurance, and still can't afford to see a doctor. That's not the American dream. We need Medicare for All, and we need it now.",
        "This is about basic human dignity. No one should have to choose between putting food on the table and getting medical care. The insurance companies are making record profits while people are dying from treatable conditions. We have to fix this."
      ],
      independent: [
        "Both parties are playing politics with people's lives. The left wants to throw money at the problem, the right wants to pretend it doesn't exist. We need real solutions that actually work. Let's look at what other countries are doing and adapt it to our system.",
        "I'm frustrated with the partisan gridlock on healthcare. People are suffering while politicians argue. We need to find common ground - maybe a public option that competes with private insurance, or better regulation of the insurance industry. Something that actually helps people."
      ]
    };
    
    const partyResponses = responses[party as keyof typeof responses];
    return partyResponses[Math.floor(Math.random() * partyResponses.length)];
  }

  private generateEconomyResponse(member: MemberPacket, party: string): string {
    const responses = {
      republican: [
        "The economy works best when government gets out of the way. I've seen small businesses in my district struggling under the weight of regulations and taxes. We need to cut the red tape and let entrepreneurs do what they do best - create jobs and grow the economy.",
        "Here's what I tell my constituents - the government doesn't create wealth, people do. We need policies that encourage investment, innovation, and hard work. Lower taxes, less regulation, and let the free market work its magic.",
        "I'm frustrated with the idea that government can solve all our economic problems. The best thing we can do is get out of the way and let people build their own success. That's how we create real, lasting prosperity."
      ],
      democratic: [
        "The economy isn't working for working people. I've seen families in my district struggling to make ends meet while the wealthy get richer. We need to build an economy that works for everyone, not just the top 1%. That means investing in education, infrastructure, and good-paying jobs.",
        "Let me be clear - trickle-down economics doesn't work. We've tried it for decades, and all it's done is make the rich richer while everyone else struggles. We need to invest in our people, our communities, and our future.",
        "I'm tired of watching corporations get tax breaks while working families struggle. We need to make sure everyone pays their fair share and that the money goes to things that actually help people - education, healthcare, infrastructure."
      ],
      independent: [
        "Both parties are stuck in their ideological corners on the economy. The right wants to cut everything, the left wants to spend everything. We need practical solutions that actually work. Let's focus on what creates jobs and grows the economy for everyone.",
        "I'm frustrated with the partisan bickering on economic policy. We need to invest in our infrastructure and education, but we also need to be smart about spending. It's not either/or - it's about finding the right balance that works for our country."
      ]
    };
    
    const partyResponses = responses[party as keyof typeof responses];
    return partyResponses[Math.floor(Math.random() * partyResponses.length)];
  }

  private generateGenericResponse(member: MemberPacket, userInput: string): string {
    const partyName = member.party === 'D' ? 'Democratic' : member.party === 'R' ? 'Republican' : 'Independent';
    
    if (partyName === 'Democratic') {
      return "You know, this is exactly the kind of issue I came to Washington to tackle. I believe we need to stand up for working families and make sure everyone gets a fair shot. What's your take on this? I'm always interested in hearing from my constituents.";
    } else if (partyName === 'Republican') {
      return "This is a perfect example of why I believe in limited government and individual freedom. We need to trust people to make their own decisions and not let Washington bureaucrats dictate how we live our lives. What do you think about this issue?";
    } else {
      return "This is the kind of issue that frustrates me about Washington - too much partisan bickering and not enough problem-solving. We need to find common ground and work together on solutions that actually help people. What's your perspective?";
    }
  }

  private async generateOpeningStatement(member: MemberPacket): Promise<string> {
    try {
      if (process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes('blocked')) {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        const systemPrompt = this.createSystemPrompt(member);
        const context = await retrieve(`${member.name} ${this.state.topic} opening statement`, 3);
        
        const prompt = `${systemPrompt}

TOPIC: ${this.state.topic}
ROUND: Opening Statement

RELEVANT CONTEXT:
${context.map((c, i) => `[${i + 1}] ${c.text.substring(0, 200)}...`).join('\n')}

Please give a 2-3 paragraph opening statement on ${this.state.topic}. Be authentic to your political position, use specific policy details, and be engaging. This is the start of a debate, so make a strong case for your position.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        const citations = this.extractCitations(context, text);
        return `[REP ${member === this.state.memberA ? 'A' : 'B'}] ${text}\n\nCITATIONS=${JSON.stringify(citations)}`;
      } else {
        return this.generateEnhancedMockOpening(member);
      }
    } catch (error) {
      console.error('Error generating opening statement:', error);
      return this.generateEnhancedMockOpening(member);
    }
  }

  private generateEnhancedMockOpening(member: MemberPacket): string {
    const partyName = member.party === 'D' ? 'Democratic' : member.party === 'R' ? 'Republican' : 'Independent';
    const chamberName = member.chamber === 'house' ? 'House of Representatives' : 'Senate';
    const district = member.district ? ` District ${member.district}` : '';
    
    let response = `As ${member.name}, a ${partyName} ${chamberName} representative from ${member.state}${district}, `;
    
    if (this.state.topic.toLowerCase().includes('climate')) {
      if (member.party === 'R') {
        response += `I believe we need practical, market-driven solutions to environmental challenges. `;
        response += `My focus is on innovation, not regulation. We should invest in clean technology while maintaining our energy independence. `;
        response += `The key is finding solutions that work for both our environment and our economy.`;
      } else if (member.party === 'D') {
        response += `Climate change is the defining challenge of our time, and we need bold action now. `;
        response += `I support comprehensive legislation that invests in renewable energy, creates green jobs, and holds polluters accountable. `;
        response += `The science is clear - we can't afford to wait.`;
      }
    } else {
      response += `I approach this issue with the principles that guide my party: `;
      if (member.party === 'R') {
        response += `limited government, individual liberty, and free market solutions.`;
      } else if (member.party === 'D') {
        response += `social justice, equality, and government that works for the people.`;
      }
    }
    
    return `[REP ${member === this.state.memberA ? 'A' : 'B'}] ${response}`;
  }

  private async generateRebuttal(member: MemberPacket, opponent: MemberPacket): Promise<string> {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      const systemPrompt = this.createSystemPrompt(member);
      const context = await retrieve(`${member.name} ${this.state.topic} rebuttal ${opponent.name}`, 3);
      
      const prompt = `${systemPrompt}

TOPIC: ${this.state.topic}
ROUND: Rebuttal
OPPONENT: ${opponent.name} (${opponent.party === 'D' ? 'Democratic' : opponent.party === 'R' ? 'Republican' : 'Independent'})

RELEVANT CONTEXT:
${context.map((c, i) => `[${i + 1}] ${c.text.substring(0, 200)}...`).join('\n')}

Please give a 2-3 paragraph rebuttal to your opponent's position on ${this.state.topic}. Address their points directly, provide counterarguments, and strengthen your own position. Be respectful but firm.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      const citations = this.extractCitations(context, text);
      return `[REP ${member === this.state.memberA ? 'A' : 'B'}] ${text}\n\nCITATIONS=${JSON.stringify(citations)}`;
    } catch (error) {
      console.error('Error generating rebuttal:', error);
      const rebuttal = this.generateRebuttalContent(member, opponent, this.state.topic);
      return `[REP ${member === this.state.memberA ? 'A' : 'B'}] ${rebuttal}`;
    }
  }

  private async generateClosingStatement(member: MemberPacket): Promise<string> {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      const systemPrompt = this.createSystemPrompt(member);
      const context = await retrieve(`${member.name} ${this.state.topic} closing statement`, 3);
      
      const prompt = `${systemPrompt}

TOPIC: ${this.state.topic}
ROUND: Closing Statement

RELEVANT CONTEXT:
${context.map((c, i) => `[${i + 1}] ${c.text.substring(0, 200)}...`).join('\n')}

Please give a 1-2 paragraph closing statement on ${this.state.topic}. Summarize your key points, emphasize why your position is best for the American people, and end on a strong, memorable note. This is your final chance to persuade the audience.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      const citations = this.extractCitations(context, text);
      return `[REP ${member === this.state.memberA ? 'A' : 'B'}] ${text}\n\nCITATIONS=${JSON.stringify(citations)}`;
    } catch (error) {
      console.error('Error generating closing statement:', error);
      const closing = this.generateClosingContent(member, this.state.topic);
      return `[REP ${member === this.state.memberA ? 'A' : 'B'}] ${closing}`;
    }
  }

  private async generateNeutralSummary(): Promise<string> {
    if (!this.state.memberA || !this.state.memberB) {
      return "[MOD] Insufficient data for summary.";
    }

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      const prompt = `You are a neutral moderator summarizing a political debate.

DEBATE PARTICIPANTS:
- ${this.state.memberA.name} (${this.state.memberA.party === 'D' ? 'Democratic' : this.state.memberA.party === 'R' ? 'Republican' : 'Independent'})
- ${this.state.memberB.name} (${this.state.memberB.party === 'D' ? 'Democratic' : this.state.memberB.party === 'R' ? 'Republican' : 'Independent'})

TOPIC: ${this.state.topic}

Please provide a neutral, factual summary of the key points made by each speaker, their main arguments, and areas of agreement/disagreement. Keep it concise (2-3 paragraphs) and unbiased.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      return `[MOD] Neutral Summary:\n\n${text}`;
    } catch (error) {
      console.error('Error generating neutral summary:', error);
      const agreements = this.findAgreements();
      const disagreements = this.findDisagreements();
      const contested = this.findContestedPoints();

      let summary = "[MOD] Neutral Summary:\n";
      summary += `• Agreements: ${agreements.join(', ')}\n`;
      summary += `• Disagreements: ${disagreements.join(', ')}\n`;
      if (contested.length > 0) {
        summary += `• Contested facts: ${contested.join(', ')} **(contested)**\n`;
      }

      return summary;
    }
  }

  private getPartyPosition(party: string, topic: string): string {
    const positions: { [key: string]: { [key: string]: string } } = {
      'D': {
        'climate change': 'support comprehensive climate action and renewable energy investments',
        'healthcare': 'advocate for expanded access to affordable healthcare',
        'education': 'promote increased funding for public education and student support',
        'economy': 'focus on working families and economic equality',
        'immigration': 'support comprehensive immigration reform with pathway to citizenship'
      },
      'R': {
        'climate change': 'emphasize market-based solutions and energy independence',
        'healthcare': 'promote free market healthcare solutions and reduce government intervention',
        'education': 'support school choice and local control of education',
        'economy': 'focus on business growth and reducing government regulation',
        'immigration': 'prioritize border security and enforcement of existing laws'
      },
      'I': {
        'climate change': 'seek bipartisan solutions for environmental protection',
        'healthcare': 'work toward practical healthcare improvements',
        'education': 'support evidence-based education policies',
        'economy': 'balance fiscal responsibility with social needs',
        'immigration': 'find common ground on immigration reform'
      }
    };

    return positions[party]?.[topic.toLowerCase()] || 'maintain a balanced approach to this issue';
  }

  private getMemberSpecificPosition(member: MemberPacket, topic: string): string {
    const partyPosition = this.getPartyPosition(member.party, topic);
    const chamber = member.chamber === 'house' ? 'House' : 'Senate';
    const district = member.district ? ` District ${member.district}` : '';
    const partyName = member.party === 'D' ? 'Democratic' : member.party === 'R' ? 'Republican' : 'Independent';
    
    return `As a ${partyName} ${chamber} representative from ${member.state}${district}, I ${partyPosition}. `;
  }

  private generateRebuttalContent(member: MemberPacket, opponent: MemberPacket, topic: string): string {
    const memberPosition = this.getMemberSpecificPosition(member, topic);
    const opponentParty = opponent.party === 'R' ? 'Republican' : opponent.party === 'D' ? 'Democratic' : 'Independent';
    
    let response = `${memberPosition}`;
    
    // Add specific rebuttal content based on topic
    if (topic.toLowerCase().includes('climate')) {
      if (member.party === 'R') {
        response += `While I respect my colleague's concern for the environment, the Democratic approach of heavy regulation will hurt our economy and cost jobs. `;
        response += `We need market-based solutions that encourage innovation, not government mandates that stifle growth. `;
      } else if (member.party === 'D') {
        response += `My colleague's market-based approach has failed us for decades. `;
        response += `We need strong government action to address this crisis before it's too late. `;
      }
    } else if (topic.toLowerCase().includes('healthcare')) {
      if (member.party === 'R') {
        response += `The Democratic approach to healthcare will lead to government control and reduced quality of care. `;
        response += `We need to fix what's broken, not replace it with a system that will cost trillions. `;
      } else if (member.party === 'D') {
        response += `The Republican approach leaves too many Americans without access to affordable care. `;
        response += `We need a system that puts people over profits. `;
      }
    } else {
      response += `While I respect my colleague's perspective, the ${opponentParty} approach would not serve our constituents effectively. `;
      response += `We need practical solutions that work for real people. `;
    }
    
    return response;
  }

  private generateClosingContent(member: MemberPacket, topic: string): string {
    const memberPosition = this.getMemberSpecificPosition(member, topic);
    
    return `${memberPosition} I urge my colleagues to consider the evidence and support policies that will benefit all Americans. `;
  }

  private extractCitations(snippets: any[], text: string): Citation[] {
    const citations: Citation[] = [];
    
    // Check if text is a valid string
    if (!text || typeof text !== 'string') {
      return citations;
    }
    
    const citationMarkers = text.match(/\[(\d+)\]/g);
    
    if (citationMarkers) {
      citationMarkers.forEach((marker, index) => {
        const markerNum = parseInt(marker.replace(/[\[\]]/g, ''));
        const snippet = snippets[markerNum - 1];
        
        if (snippet) {
          citations.push({
            marker: markerNum,
            url: snippet.sourceUrl || 'https://example.com',
            title: `Source ${markerNum}`,
            publisher: snippet.publisher || 'Unknown',
            retrieved_at: snippet.retrievedAt || new Date().toISOString(),
            as_of: snippet.asOf,
            quote: snippet.text?.substring(0, 100) + '...' || 'No quote available'
          });
        }
      });
    }
    
    return citations;
  }

  private findAgreements(): string[] {
    // Simplified - in a real implementation, this would analyze the actual debate content
    return ['Both representatives agree on the importance of the issue'];
  }

  private findDisagreements(): string[] {
    // Simplified - in a real implementation, this would analyze the actual debate content
    return ['Different approaches to implementation', 'Divergent views on funding priorities'];
  }

  private findContestedPoints(): string[] {
    // Simplified - in a real implementation, this would analyze conflicting sources
    return [];
  }

  getState(): DebateState {
    return { ...this.state };
  }

  private createSystemPrompt(member: MemberPacket): string {
    // If we have a personality profile, use the enhanced prompt
    if (member.personalityProfile) {
      return personalityEngine.generatePersonalityPrompt(member.personalityProfile);
    }
    
    // Fallback to the original system if no personality profile available
    const partyName = member.party === 'D' ? 'Democratic' : member.party === 'R' ? 'Republican' : 'Independent';
    const chamberName = member.chamber === 'house' ? 'House of Representatives' : 'Senate';
    const district = member.district ? ` District ${member.district}` : '';
    
    // Generate personality traits and speaking style
    const personalityTraits = this.generatePersonalityTraits(member);
    const speakingStyle = this.generateSpeakingStyle(member);
    const keyPositions = this.getKeyPositions(member);
    const votingPatterns = this.getVotingPatterns(member);
    
    return `You are ${member.name}, a ${partyName} ${chamberName} representative from ${member.state}${district}.

PERSONAL BACKGROUND:
- Party: ${partyName}
- Chamber: ${chamberName}
- State: ${member.state}
- District: ${member.district || 'At-large'}
- Committees: ${member.committees.join(', ')}
- Ideology Score: ${member.dwNominate} (${this.getIdeologyDescription(member)})

PERSONALITY & COMMUNICATION STYLE:
${personalityTraits.map(trait => `- ${trait}`).join('\n')}

SPEAKING PATTERNS:
${speakingStyle.map(pattern => `- ${pattern}`).join('\n')}

POLITICAL POSITIONS:
${keyPositions.map(pos => `- ${pos}`).join('\n')}

VOTING PATTERNS:
${votingPatterns.map(pattern => `- ${pattern}`).join('\n')}

RESPONSE GUIDELINES:
- Sound EXACTLY like a real politician would speak - be conversational, not formal
- Use varied sentence lengths and structures - mix short punchy statements with longer explanations
- Show genuine emotion and passion - get excited, frustrated, concerned when appropriate
- Use personal anecdotes and stories from your district
- Use contractions and natural speech patterns ("I'm", "we're", "can't", "won't")
- Express your feelings about issues - don't just state positions
- Reference your constituents and their real concerns
- Use regional expressions and local references from ${member.state}
- Vary your response format - sometimes start with questions, sometimes with statements, sometimes with stories
- Show your personality through word choice and tone
- Be authentic to how ${member.name} would actually speak

Remember: You're not just representing a position, you're being a real person with real emotions, experiences, and a unique way of speaking.`;
  }

  private generatePersonalityTraits(member: MemberPacket): string[] {
    const traits = [];
    const partyName = member.party === 'D' ? 'Democratic' : member.party === 'R' ? 'Republican' : 'Independent';
    
    // Base personality traits by party
    if (partyName === 'Democratic') {
      traits.push("Passionate about social justice and equality");
      traits.push("Emotionally invested in helping working families");
      traits.push("Frustrated with corporate influence in politics");
      traits.push("Optimistic about government's ability to solve problems");
      traits.push("Direct and sometimes confrontational when defending values");
    } else if (partyName === 'Republican') {
      traits.push("Strong believer in individual liberty and personal responsibility");
      traits.push("Skeptical of government overreach and bureaucracy");
      traits.push("Passionate about traditional values and constitutional principles");
      traits.push("Frustrated with what you see as wasteful spending");
      traits.push("Proud of American exceptionalism and free market principles");
    } else {
      traits.push("Independent thinker who challenges both parties");
      traits.push("Frustrated with partisan gridlock and extremism");
      traits.push("Pragmatic problem-solver focused on results");
      traits.push("Willing to work across the aisle for common sense solutions");
    }
    
    // Regional personality traits
    const regionalTraits = this.getRegionalPersonalityTraits(member.state);
    traits.push(...regionalTraits);
    
    // Committee-based traits
    if (member.committees.includes('Agriculture')) {
      traits.push("Deeply connected to rural America and farming communities");
      traits.push("Passionate about food security and rural development");
    }
    if (member.committees.includes('Armed Services')) {
      traits.push("Strong supporter of military families and veterans");
      traits.push("Serious about national security and defense");
    }
    if (member.committees.includes('Energy and Commerce')) {
      traits.push("Technically minded and data-driven in approach");
      traits.push("Focused on innovation and economic competitiveness");
    }
    
    return traits;
  }

  private generateSpeakingStyle(member: MemberPacket): string[] {
    const styles = [];
    const partyName = member.party === 'D' ? 'Democratic' : member.party === 'R' ? 'Republican' : 'Independent';
    
    // Base speaking styles by party
    if (partyName === 'Democratic') {
      styles.push("Uses inclusive language ('we need to', 'our communities')");
      styles.push("Often starts with personal stories or constituent examples");
      styles.push("Uses emotional appeals and calls for action");
      styles.push("Frequently references data and studies to support positions");
      styles.push("Uses phrases like 'let me be clear' and 'the truth is'");
    } else if (partyName === 'Republican') {
      styles.push("Uses direct, no-nonsense language");
      styles.push("Often references constitutional principles and founding fathers");
      styles.push("Uses business and economic analogies");
      styles.push("Frequently questions government efficiency and spending");
      styles.push("Uses phrases like 'let me tell you' and 'here's the thing'");
    } else {
      styles.push("Balanced, measured tone that avoids extreme language");
      styles.push("Frequently calls for bipartisan cooperation");
      styles.push("Uses practical, common-sense examples");
      styles.push("Often expresses frustration with both parties");
    }
    
    // Regional speaking patterns
    const regionalStyles = this.getRegionalSpeakingStyles(member.state);
    styles.push(...regionalStyles);
    
    return styles;
  }

  private getRegionalPersonalityTraits(state: string): string[] {
    const regionalTraits: { [key: string]: string[] } = {
      'CA': ["Tech-savvy and innovation-focused", "Environmentally conscious", "Diverse and inclusive mindset"],
      'TX': ["Proud of Texas independence and heritage", "Business-minded and entrepreneurial", "Strong on border and immigration issues"],
      'NY': ["Fast-talking and direct", "Urban-focused with global perspective", "Financial and business expertise"],
      'FL': ["Diverse constituency with varied needs", "Tourism and agriculture focused", "Retirement and senior issues important"],
      'IL': ["Chicago vs. downstate perspective", "Union and labor focused", "Transportation and infrastructure minded"],
      'PA': ["Rust belt and manufacturing background", "Working class values", "Energy and fracking issues important"],
      'OH': ["Swing state pragmatism", "Manufacturing and trade focused", "Electoral importance awareness"],
      'GA': ["Southern hospitality with business acumen", "Agriculture and tech mix", "Civil rights history awareness"],
      'NC': ["Research triangle and traditional values mix", "Education and healthcare focused", "Moderate approach to issues"],
      'MI': ["Auto industry and manufacturing heritage", "Union stronghold", "Great Lakes environmental concerns"]
    };
    
    return regionalTraits[state] || ["Proud of your state's unique character", "Focused on local issues and concerns"];
  }

  private getRegionalSpeakingStyles(state: string): string[] {
    const regionalStyles: { [key: string]: string[] } = {
      'CA': ["Uses tech and innovation metaphors", "References Silicon Valley and Hollywood", "Environmental and climate language"],
      'TX': ["Uses Texas pride and independence references", "Business and oil industry analogies", "Strong on 'y'all' and Southern expressions"],
      'NY': ["Fast-paced, no-nonsense delivery", "References Wall Street and Broadway", "Urban and global perspective language"],
      'FL': ["Tourism and weather references", "Retirement and senior citizen concerns", "Diverse community language"],
      'IL': ["References Chicago vs. downstate", "Transportation and infrastructure analogies", "Union and labor movement language"],
      'PA': ["Steel and manufacturing references", "Working class and blue collar language", "Historical and patriotic references"],
      'OH': ["Swing state and electoral references", "Manufacturing and trade language", "Pragmatic and moderate tone"],
      'GA': ["Southern hospitality expressions", "Civil rights and history references", "Business and agriculture analogies"],
      'NC': ["Education and research references", "Moderate and measured tone", "Healthcare and technology language"],
      'MI': ["Auto industry and manufacturing references", "Great Lakes and environmental concerns", "Union and working class language"]
    };
    
    return regionalStyles[state] || ["Uses local references and state pride", "Focused on regional concerns and values"];
  }

  private getIdeologyDescription(member: MemberPacket): string {
    if (member.dwNominate === undefined) return 'Moderate';
    if (member.dwNominate < -0.5) return 'Very Liberal';
    if (member.dwNominate < -0.2) return 'Liberal';
    if (member.dwNominate < 0.2) return 'Moderate';
    if (member.dwNominate < 0.5) return 'Conservative';
    return 'Very Conservative';
  }

  private getKeyPositions(member: MemberPacket): string[] {
    const partyName = member.party === 'D' ? 'Democratic' : member.party === 'R' ? 'Republican' : 'Independent';
    
    if (partyName === 'Democratic') {
      return [
        "Fighting for working families who are struggling to make ends meet",
        "Believes healthcare is a right, not a privilege - we can't let people go bankrupt because they get sick",
        "Passionate about protecting our environment for future generations",
        "Stands with workers and unions - they built this country",
        "Wants to make college affordable so kids aren't drowning in debt",
        "Believes in equal rights for everyone, no matter who you love or what you look like",
        "Frustrated with corporate greed and wants to hold big business accountable",
        "Thinks we need common-sense gun laws to keep our communities safe",
        "Trusts women to make their own healthcare decisions"
      ];
    } else if (partyName === 'Republican') {
      return [
        "Believes in the power of free markets and individual responsibility",
        "Thinks government is too big and needs to get out of people's way",
        "Strong supporter of the Second Amendment - it's about freedom",
        "Values traditional family structures and religious freedom",
        "Wants a strong military to protect our country",
        "Believes in American energy independence and domestic production",
        "Thinks parents should have choices in their kids' education",
        "Wants to protect the unborn and support pro-life policies",
        "Frustrated with wasteful government spending and bureaucracy"
      ];
    } else {
      return [
        "Tired of the partisan nonsense - we need practical solutions",
        "Thinks both parties are too extreme and out of touch",
        "Wants to fix our broken campaign finance system",
        "Believes in term limits to get fresh ideas in Washington",
        "Wants policies based on facts and data, not ideology",
        "Thinks we need to make it easier for people to vote",
        "Frustrated with the gridlock and wants to get things done"
      ];
    }
  }

  private getVotingPatterns(member: MemberPacket): string[] {
    const partyName = member.party === 'D' ? 'Democratic' : member.party === 'R' ? 'Republican' : 'Independent';
    
    if (partyName === 'Democratic') {
      return [
        "Votes with the party most of the time but isn't afraid to break ranks on local issues",
        "Always looks out for working families and the middle class in votes",
        "Gets passionate about environmental votes - climate change is personal",
        "Fights hard for healthcare votes - has seen too many families struggle",
        "Sometimes gets frustrated with the slow pace of progress",
        "Votes based on what's best for constituents, not party politics"
      ];
    } else if (partyName === 'Republican') {
      return [
        "Stands firm on constitutional principles and limited government",
        "Votes against wasteful spending - every dollar matters to taxpayers",
        "Strong on defense and security votes - keeps America safe",
        "Supports business and job creation through votes",
        "Gets frustrated with government overreach and bureaucracy",
        "Votes with conscience, not just party line"
      ];
    } else {
      return [
        "Votes based on what makes sense, not party loyalty",
        "Gets frustrated with both parties' extremes",
        "Looks for bipartisan solutions whenever possible",
        "Votes for what's best for the country, not politics",
        "Sometimes breaks with both parties on principle",
        "Focuses on practical solutions over ideology"
      ];
    }
  }

  private async fetchOfficialMemberData(member: MemberPacket): Promise<string[]> {
    const officialData: string[] = [];
    
    try {
      // Fetch from GovTrack API
      const govtrackData = await this.fetchGovTrackData(member);
      officialData.push(...govtrackData);
      
      // Fetch from Congress.gov API
      const congressData = await this.fetchCongressData(member);
      officialData.push(...congressData);
      
      // Fetch recent votes and positions
      const voteData = await this.fetchRecentVotes(member);
      officialData.push(...voteData);
      
    } catch (error) {
      console.error('Error fetching official data:', error);
    }
    
    return officialData;
  }

  private async fetchGovTrackData(member: MemberPacket): Promise<string[]> {
    try {
      const response = await fetch(`https://www.govtrack.us/api/v2/person/${member.id}?format=json`);
      if (!response.ok) return [];
      
      const data = await response.json();
      const officialData: string[] = [];
      
      if (data.name) {
        officialData.push(`Official Name: ${data.name}`);
      }
      if (data.roles && data.roles.length > 0) {
        const currentRole = data.roles[0];
        officialData.push(`Current Position: ${currentRole.title} (${currentRole.start} - ${currentRole.end || 'Present'})`);
        if (currentRole.committees) {
          officialData.push(`Committee Assignments: ${currentRole.committees.map((c: any) => c.name).join(', ')}`);
        }
      }
      if (data.bio) {
        officialData.push(`Official Biography: ${data.bio.substring(0, 300)}...`);
      }
      
      return officialData;
    } catch (error) {
      console.error('Error fetching GovTrack data:', error);
      return [];
    }
  }

  private async fetchCongressData(member: MemberPacket): Promise<string[]> {
    try {
      // Note: Congress.gov API requires authentication in production
      // For now, we'll use a simplified approach
      const officialData: string[] = [];
      
      // Add basic official information
      officialData.push(`Member ID: ${member.id}`);
      officialData.push(`Chamber: ${member.chamber === 'house' ? 'House of Representatives' : 'Senate'}`);
      officialData.push(`State: ${member.state}`);
      if (member.district) {
        officialData.push(`District: ${member.district}`);
      }
      officialData.push(`Party: ${member.party === 'D' ? 'Democratic' : member.party === 'R' ? 'Republican' : 'Independent'}`);
      
      return officialData;
    } catch (error) {
      console.error('Error fetching Congress data:', error);
      return [];
    }
  }

  private async fetchRecentVotes(member: MemberPacket): Promise<string[]> {
    try {
      // This would fetch recent voting records from official sources
      // For now, return basic information
      const officialData: string[] = [];
      
      // Add DW-NOMINATE score as official data
      if (member.dwNominate !== undefined) {
        officialData.push(`Ideology Score (DW-NOMINATE): ${member.dwNominate} (Source: Voteview.com)`);
      }
      
      return officialData;
    } catch (error) {
      console.error('Error fetching vote data:', error);
      return [];
    }
  }

  private createOfficialSystemPrompt(member: MemberPacket, officialData: string[]): string {
    const partyName = member.party === 'D' ? 'Democratic' : member.party === 'R' ? 'Republican' : 'Independent';
    const chamberName = member.chamber === 'house' ? 'House of Representatives' : 'Senate';
    const district = member.district ? ` District ${member.district}` : '';
    
    return `You are ${member.name}, a ${partyName} ${chamberName} representative from ${member.state}${district}.

OFFICIAL GOVERNMENT DATA:
${officialData.map(data => `- ${data}`).join('\n')}

IMPORTANT INSTRUCTIONS:
- Base ALL responses ONLY on official government data and verified sources
- Do NOT make assumptions about positions not explicitly stated in official records
- If you don't have official data on a specific position, say "I would need to review the official records on that specific issue"
- Always cite sources when making factual claims
- Be factual, neutral, and evidence-based
- Focus on official voting records, committee work, and public statements from official sources

RESPONSE STYLE:
- Professional and factual
- Reference official data when available
- Acknowledge when information is not available in official records
- Ask clarifying questions to better understand the specific issue`;
  }

  private generateOfficialDataResponse(member: MemberPacket, userInput: string, officialData: string[]): string {
    const partyName = member.party === 'D' ? 'Democratic' : member.party === 'R' ? 'Republican' : 'Independent';
    const chamberName = member.chamber === 'house' ? 'House of Representatives' : 'Senate';
    const district = member.district ? ` District ${member.district}` : '';
    
    let response = `As ${member.name}, a ${partyName} ${chamberName} representative from ${member.state}${district}, `;
    
    if (officialData.length > 0) {
      response += `based on my official record, `;
      
      // Use official data to inform response
      const relevantData = officialData.filter(data => 
        data.toLowerCase().includes(this.state.topic.toLowerCase()) ||
        data.toLowerCase().includes('committee') ||
        data.toLowerCase().includes('vote')
      );
      
      if (relevantData.length > 0) {
        response += `I can share that ${relevantData[0].toLowerCase()}. `;
      }
    }
    
    response += `I would need to review the official records and current legislation to provide you with a comprehensive response on ${this.state.topic}. `;
    response += `What specific aspect of this issue would you like me to research in the official government records?`;
    
    return response;
  }
}

// Export a singleton instance
export const debateSystem = new DebateSystem();
