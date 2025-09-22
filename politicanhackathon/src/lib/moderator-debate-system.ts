import { retrieve } from './rag';
import { Citation } from '@/types/citations';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { personalityEngine, PersonalityProfile } from './personality-engine';
import { speechScraper } from './speech-scraper';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export interface ModeratorQuestion {
  id: string;
  question: string;
  context: string;
  followUpQuestions: string[];
  category: 'opening' | 'policy' | 'rebuttal' | 'closing' | 'user_interjection';
}

export interface DebateTurn {
  id: string;
  speaker: 'moderator' | 'memberA' | 'memberB' | 'user';
  content: string;
  questionId?: string;
  citations?: Citation[];
  timestamp: Date;
  isPaused?: boolean;
}

export interface ModeratorDebateState {
  mode: 'MODERATED_DEBATE';
  memberA?: {
    id: string;
    name: string;
    chamber: string;
    state: string;
    district?: string;
    party: string;
    personalityProfile?: PersonalityProfile;
  };
  memberB?: {
    id: string;
    name: string;
    chamber: string;
    state: string;
    district?: string;
    party: string;
    personalityProfile?: PersonalityProfile;
  };
  topic: string;
  currentQuestion?: ModeratorQuestion;
  debateHistory: DebateTurn[];
  isPaused: boolean;
  isRunning: boolean;
  currentPhase: 'setup' | 'opening' | 'policy_discussion' | 'rebuttal' | 'closing' | 'user_questions';
  questionIndex: number;
  totalQuestions: number;
  autoProgressTimer?: NodeJS.Timeout;
  nextSpeaker?: 'moderator' | 'memberA' | 'memberB';
}

export class ModeratorDebateSystem {
  private state: ModeratorDebateState = {
    mode: 'MODERATED_DEBATE',
    topic: '',
    debateHistory: [],
    isPaused: false,
    isRunning: false,
    currentPhase: 'setup',
    questionIndex: 0,
    totalQuestions: 0,
    nextSpeaker: 'moderator'
  };
  
  // Cache for faster response generation
  private contextCache: Map<string, any[]> = new Map();
  private lastCacheTime: Map<string, number> = new Map();

  async initializeDebate(memberA: any, memberB: any, topic: string): Promise<string> {
    try {
      // Load personality profiles for both members
      const profileA = await personalityEngine.getPersonalityProfile(memberA.id);
      const profileB = await personalityEngine.getPersonalityProfile(memberB.id);

      this.state.memberA = {
        id: memberA.id,
        name: `${memberA.firstName} ${memberA.lastName}`,
        chamber: memberA.chamber,
        state: memberA.state,
        district: memberA.district,
        party: memberA.party,
        personalityProfile: profileA || undefined
      };

      this.state.memberB = {
        id: memberB.id,
        name: `${memberB.firstName} ${memberB.lastName}`,
        chamber: memberB.chamber,
        state: memberB.state,
        district: memberB.district,
        party: memberB.party,
        personalityProfile: profileB || undefined
      };

      this.state.topic = topic;
      this.state.currentPhase = 'opening';
      this.state.questionIndex = 0;
      this.state.debateHistory = [];
      this.state.isPaused = false;

      // Generate initial moderator questions
      const questions = await this.generateModeratorQuestions(topic);
      this.state.totalQuestions = questions.length;

      // Start with opening question
      const openingQuestion = questions[0];
      this.state.currentQuestion = openingQuestion;

      const moderatorMessage = `🎭 **MODERATED DEBATE BEGINS**

**Topic:** ${topic}
**Participants:** 
- ${this.state.memberA.name} (${this.state.memberA.party}-${this.state.memberA.state})
- ${this.state.memberB.name} (${this.state.memberB.party}-${this.state.memberB.state})

**Opening Question:**
${openingQuestion.question}

${this.state.memberA.name}, you have 2 minutes to respond.`;

      this.addToHistory('moderator', moderatorMessage, openingQuestion.id);

      return moderatorMessage;
    } catch (error) {
      console.error('Error initializing moderated debate:', error);
      return 'Failed to initialize moderated debate.';
    }
  }

  async processResponse(speaker: 'memberA' | 'memberB'): Promise<string> {
    if (!this.state.memberA || !this.state.memberB || !this.state.currentQuestion) {
      return 'No active debate session.';
    }

    const member = speaker === 'memberA' ? this.state.memberA : this.state.memberB;
    
    // Generate authentic response using personality profile and web scraping
    const authenticResponse = await this.generateAuthenticResponse(member, this.state.currentQuestion);
    
    // Add to history
    this.addToHistory(speaker, authenticResponse, this.state.currentQuestion.id);

    // Determine next action
    if (speaker === 'memberA') {
      // Member A just spoke, now it's Member B's turn
      return `**${this.state.memberB.name}**, you have 2 minutes to respond to ${this.state.memberA.name}'s statement.`;
    } else {
      // Both members have responded, move to next question or phase
      return await this.advanceDebate();
    }
  }

  async processUserInterjection(userQuestion: string): Promise<string> {
    if (!this.state.memberA || !this.state.memberB) {
      return 'No active debate session.';
    }
    if (!this.state.isPaused) {
      return 'Debate must be paused to ask questions.';
    }

    // Add user question to history
    this.addToHistory('user', userQuestion);

    // Create a special moderator question for the user's interjection
    const interjectionQuestion: ModeratorQuestion = {
      id: `user-interjection-${Date.now()}`,
      question: userQuestion,
      context: 'User interjection during debate',
      followUpQuestions: [],
      category: 'user_interjection'
    };

    // Generate responses from both representatives
    const responseA = await this.generateAuthenticResponse(this.state.memberA, interjectionQuestion);
    const responseB = await this.generateAuthenticResponse(this.state.memberB, interjectionQuestion);

    // Add responses to history as separate entries (this is key for frontend display)
    this.addToHistory('memberA', responseA, interjectionQuestion.id);
    this.addToHistory('memberB', responseB, interjectionQuestion.id);

    // Return a simple confirmation message since the actual responses are now in debateHistory
    return `[MOD] User question answered by both representatives. The debate remains paused.`;
  }

  async resumeDebate(): Promise<string> {
    if (!this.state.isPaused) {
      return 'Debate is not currently paused.';
    }

    this.state.isPaused = false;
    
    // Continue with the next question in sequence
    return await this.advanceDebate();
  }

  private async advanceDebate(): Promise<string> {
    this.state.questionIndex++;
    
    if (this.state.questionIndex >= this.state.totalQuestions) {
      // End of debate
      this.state.currentPhase = 'closing';
      return await this.generateClosingSummary();
    }

    // Get next question
    const questions = await this.generateModeratorQuestions(this.state.topic);
    const nextQuestion = questions[this.state.questionIndex];
    this.state.currentQuestion = nextQuestion;

    const moderatorMessage = `**Next Question:**

${nextQuestion.question}

**${this.state.memberA.name}**, you have 2 minutes to respond.`;

    this.addToHistory('moderator', moderatorMessage, nextQuestion.id);

    return moderatorMessage;
  }

  private async generateModeratorQuestions(topic: string): Promise<ModeratorQuestion[]> {
    try {
      if (process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes('blocked')) {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        const prompt = `You are a professional debate moderator. Generate 5-7 thoughtful questions for a political debate on "${topic}".

The questions should:
1. Be fair and balanced
2. Allow both sides to present their views
3. Encourage substantive discussion
4. Cover different aspects of the topic
5. Be specific and actionable

Format your response as a JSON array of questions, each with:
- question: The actual question text
- context: Brief context for why this question matters
- category: "opening", "policy", "rebuttal", or "closing"

Example format:
[
  {
    "question": "What is your position on [specific aspect of topic]?",
    "context": "This question addresses the core policy differences",
    "category": "opening"
  }
]`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        // Parse JSON response
        const questions = JSON.parse(text);
        return questions.map((q: any, index: number) => ({
          id: `question-${index}`,
          question: q.question,
          context: q.context,
          followUpQuestions: [],
          category: q.category
        }));
      } else {
        // Fallback questions
        return this.getFallbackQuestions(topic);
      }
    } catch (error) {
      console.error('Error generating moderator questions:', error);
      return this.getFallbackQuestions(topic);
    }
  }

  private getFallbackQuestions(topic: string): ModeratorQuestion[] {
    const baseQuestions = [
      {
        id: 'opening-1',
        question: `What is your position on ${topic} and why do you believe it's the right approach for America?`,
        context: 'Opening question to establish positions',
        followUpQuestions: [],
        category: 'opening' as const
      },
      {
        id: 'policy-1',
        question: `How would your approach to ${topic} impact working families and the economy?`,
        context: 'Economic impact question',
        followUpQuestions: [],
        category: 'policy' as const
      },
      {
        id: 'policy-2',
        question: `What specific legislation would you support to address ${topic}?`,
        context: 'Policy specifics question',
        followUpQuestions: [],
        category: 'policy' as const
      },
      {
        id: 'rebuttal-1',
        question: `How do you respond to critics who say your position on ${topic} is unrealistic or harmful?`,
        context: 'Rebuttal and criticism question',
        followUpQuestions: [],
        category: 'rebuttal' as const
      },
      {
        id: 'closing-1',
        question: `In your final statement, what is the most important thing voters should know about your position on ${topic}?`,
        context: 'Closing statement question',
        followUpQuestions: [],
        category: 'closing' as const
      }
    ];

    return baseQuestions;
  }

  private async generateAuthenticResponse(member: any, question: ModeratorQuestion): Promise<string> {
    try {
      if (process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes('blocked')) {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        // Use existing personality profile (skip real-time scraping for speed)
        let systemPrompt = '';
        if (member.personalityProfile) {
          systemPrompt = personalityEngine.generatePersonalityPrompt(member.personalityProfile);
        } else {
          systemPrompt = this.createBasicSystemPrompt(member);
        }
        
        // Get conversation history for this member to avoid repetition
        const memberHistory = this.state.debateHistory
          .filter(turn => turn.speaker === (member.id === this.state.memberA?.id ? 'memberA' : 'memberB'))
          .slice(-2) // Reduced from 3 to 2 for speed
          .map(turn => turn.content);
        
        // Get recent debate context (what the other person said)
        const recentContext = this.state.debateHistory
          .slice(-2) // Last 2 turns
          .filter(turn => turn.speaker !== 'user')
          .map(turn => `${turn.speaker}: ${turn.content.substring(0, 150)}...`) // Reduced from 200 to 150
          .join('\n');
        
        // Fast cached context retrieval
        const context = await this.getCachedContext(`${member.name} ${this.state.topic}`);
        
        // Create anti-repetition instructions
        const avoidanceInstructions = this.generateAvoidanceInstructions(memberHistory, member.personalityProfile);
        
        // Streamlined prompt for faster generation
        const prompt = `${systemPrompt}

AVOID REPETITION: ${avoidanceInstructions}

RECENT CONTEXT: ${recentContext}

QUESTION: ${question.question}
TOPIC: ${this.state.topic}

KEY CONTEXT:
${context.slice(0, 2).map((c, i) => `[${i + 1}] ${c.text.substring(0, 100)}...`).join('\n')}

INSTRUCTIONS:
- Respond directly to the question in 100-200 words
- Use your authentic personality and speaking style
- Show real emotion and human reactions
- If inappropriate/off-topic, acknowledge and redirect professionally
- Be conversational, not formal
- Vary your opening phrases

Remember: You're a real person having a conversation, not giving a speech.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        return text;
      } else {
        return this.generateFallbackResponse(member, question);
      }
    } catch (error) {
      console.error('Error generating authentic response:', error);
      return this.generateFallbackResponse(member, question);
    }
  }

  private generateAvoidanceInstructions(memberHistory: string[], profile: any): string {
    if (!memberHistory.length) return "This is your first response - be engaging and authentic.";
    
    // Extract commonly used phrases from previous responses
    const allPrevious = memberHistory.join(' ').toLowerCase();
    const commonPhrases = profile?.speechPatterns?.commonPhrases || [];
    
    const overusedPhrases = commonPhrases.filter(phrase => 
      (allPrevious.match(new RegExp(phrase.toLowerCase(), 'g')) || []).length >= 2
    );
    
    const recentStartWords = memberHistory.map(response => {
      const firstSentence = response.split('.')[0];
      return firstSentence.split(' ').slice(0, 3).join(' ');
    });
    
    let instructions = `AVOID REPEATING:
- Previous phrases you've overused: ${overusedPhrases.join(', ')}
- Starting patterns you've used: ${recentStartWords.join(' | ')}
- Don't begin with "Look," "Well," or "As a representative" again
- Vary your sentence structure and opening approach
- Bring fresh examples and new angles to your argument`;

    return instructions;
  }

  private createBasicSystemPrompt(member: any): string {
    const partyName = member.party === 'D' ? 'Democratic' : member.party === 'R' ? 'Republican' : 'Independent';
    const chamberName = member.chamber === 'house' ? 'House of Representatives' : 'Senate';
    const district = member.district ? ` District ${member.district}` : '';
    
    return `You are ${member.name}, a ${partyName} ${chamberName} representative from ${member.state}${district}.

You are participating in a moderated political debate. Respond authentically as this representative would, using their political positions and communication style.`;
  }

  private generateFallbackResponse(member: any, question: ModeratorQuestion): string {
    const partyName = member.party === 'D' ? 'Democratic' : member.party === 'R' ? 'Republican' : 'Independent';
    const questionText = question.question.toLowerCase();
    
    // Handle inappropriate or off-topic questions more authentically
    if (questionText.includes('stink') || questionText.includes('suck') || questionText.length < 10) {
      const responses = [
        `Well, that's... certainly direct. Look, I'm here to discuss ${this.state.topic} and the real issues facing American families. Let's focus on substance over insults.`,
        `I think we can have a more productive conversation if we stick to the policy issues at hand. What I'd really like to address is ${this.state.topic} and how it affects people in my district.`,
        `That's not really a policy question, but I appreciate your engagement. What I think people really want to know about is ${this.state.topic} and how we can make real progress on this issue.`,
        `I've heard worse in Congress, believe me. But let's talk about what really matters - ${this.state.topic} and how we can solve these challenges for working families.`
      ];
      return responses[Math.floor(Math.random() * responses.length)];
    }
    
    // Handle very short or unclear questions
    if (questionText.length < 20) {
      return `I'm not sure I understand the question completely. Could you be more specific about what aspect of ${this.state.topic} you'd like me to address? I want to make sure I give you a thoughtful response.`;
    }
    
    // Default fallback for API failures
    if (partyName === 'Democratic') {
      return `I appreciate you bringing that up. As a Democrat representing ${member.state}, I believe we need to focus on policies that help working families and create a more just society. On ${this.state.topic}, I support a comprehensive approach that addresses the root causes while ensuring no one is left behind.`;
    } else if (partyName === 'Republican') {
      return `Thank you for the question. As a Republican representing ${member.state}, I believe in limited government and free market solutions. On ${this.state.topic}, I support policies that promote individual freedom and economic growth while reducing government overreach.`;
    } else {
      return `That's an important question. As an Independent representing ${member.state}, I believe we need practical solutions that work for everyone. On ${this.state.topic}, I support evidence-based policies that transcend partisan politics.`;
    }
  }

  private async generateClosingSummary(): Promise<string> {
    if (!this.state.memberA || !this.state.memberB) {
      return 'No active debate to summarize.';
    }

    try {
      if (process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes('blocked')) {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        const debateTranscript = this.state.debateHistory
          .filter(turn => turn.speaker !== 'moderator')
          .map(turn => `${turn.speaker}: ${turn.content}`)
          .join('\n\n');

        const prompt = `You are a neutral debate moderator providing a closing summary.

DEBATE TOPIC: ${this.state.topic}
PARTICIPANTS: ${this.state.memberA.name} (${this.state.memberA.party}) vs ${this.state.memberB.name} (${this.state.memberB.party})

DEBATE TRANSCRIPT:
${debateTranscript}

Provide a neutral, factual summary of the key points made by each speaker, their main arguments, and areas of agreement/disagreement. Keep it concise (2-3 paragraphs) and unbiased.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        const summary = `🎭 **DEBATE SUMMARY**

${text}

**Thank you to both ${this.state.memberA.name} and ${this.state.memberB.name} for participating in this important discussion on ${this.state.topic}.**`;

        this.addToHistory('moderator', summary);
        return summary;
      } else {
        return this.generateFallbackSummary();
      }
    } catch (error) {
      console.error('Error generating closing summary:', error);
      return this.generateFallbackSummary();
    }
  }

  private generateFallbackSummary(): string {
    if (!this.state.memberA || !this.state.memberB) {
      return 'No active debate to summarize.';
    }

    return `🎭 **DEBATE SUMMARY**

Both ${this.state.memberA.name} and ${this.state.memberB.name} presented their positions on ${this.state.topic} with passion and conviction. While they differ in their approaches, both representatives demonstrated their commitment to serving their constituents and addressing this important issue.

**Thank you to both participants for this engaging discussion.**`;
  }

  private addToHistory(speaker: 'moderator' | 'memberA' | 'memberB' | 'user', content: string, questionId?: string) {
    this.state.debateHistory.push({
      id: `turn-${Date.now()}-${Math.random()}`,
      speaker,
      content,
      questionId,
      timestamp: new Date(),
      isPaused: this.state.isPaused
    });
  }

  getState(): ModeratorDebateState {
    // Return state without non-serializable properties like timers
    const { autoProgressTimer, ...serializedState } = this.state;
    return serializedState;
  }


  endDebate(): string {
    this.state.currentPhase = 'closing';
    this.state.isRunning = false;
    if (this.state.autoProgressTimer) {
      clearTimeout(this.state.autoProgressTimer);
      this.state.autoProgressTimer = undefined;
    }
    return this.generateClosingSummary();
  }

  resetDebate(): string {
    // Clear any running timers
    if (this.state.autoProgressTimer) {
      clearTimeout(this.state.autoProgressTimer);
      this.state.autoProgressTimer = undefined;
    }

    // Clear caches for fresh start
    this.contextCache.clear();
    this.lastCacheTime.clear();

    // Reset state to initial values
    this.state = {
      mode: 'MODERATED_DEBATE',
      topic: '',
      debateHistory: [],
      isPaused: false,
      isRunning: false,
      currentPhase: 'setup',
      questionIndex: 0,
      totalQuestions: 0,
      nextSpeaker: 'moderator'
    };

    return "[MOD] Debate conversation has been reset. You can now select new representatives and start a fresh debate.";
  }

  async startFreeFlowingDebate(): Promise<string> {
    if (!this.state.memberA || !this.state.memberB || !this.state.topic) {
      return "[MOD] Please choose two representatives and set a topic before starting the debate.";
    }

    this.state.isRunning = true;
    this.state.isPaused = false;
    this.state.currentPhase = 'opening';
    this.state.questionIndex = 0;
    this.state.nextSpeaker = 'moderator';

    // Generate initial moderator questions
    const questions = this.generateModeratorQuestions(this.state.topic);
    this.state.totalQuestions = questions.length;

    // Start the debate with opening question
    const openingResult = await this.automaticProgression();
    this.scheduleNextResponse();

    return openingResult;
  }

  pauseDebate(): string {
    this.state.isPaused = true;
    if (this.state.autoProgressTimer) {
      clearTimeout(this.state.autoProgressTimer);
      this.state.autoProgressTimer = undefined;
    }
    return "[MOD] Debate paused. You can now ask your questions or make comments. Use 'Resume Debate' to continue.";
  }

  resumeDebate(): string {
    if (!this.state.isRunning) {
      return "[MOD] Please start the debate first.";
    }
    
    this.state.isPaused = false;
    this.scheduleNextResponse();
    return "[MOD] Debate resumed. Continuing with the discussion...";
  }

  private scheduleNextResponse(): void {
    if (this.state.isPaused || !this.state.isRunning) {
      return;
    }

    // Schedule the next automatic response after 3-5 seconds
    const delay = 3000 + Math.random() * 2000; // 3-5 seconds
    this.state.autoProgressTimer = setTimeout(() => {
      if (!this.state.isPaused && this.state.isRunning) {
        this.automaticProgression().then(() => {
          this.scheduleNextResponse();
        }).catch(error => {
          console.error('Error in automatic progression:', error);
        });
      }
    }, delay);
  }

  private async automaticProgression(): Promise<string> {
    try {
      const nextSpeaker = this.determineNextSpeaker();
      
      if (nextSpeaker === 'moderator') {
        return await this.generateModeratorTurn();
      } else if (nextSpeaker === 'memberA') {
        return await this.generateMemberResponse(this.state.memberA!, 'memberA');
      } else if (nextSpeaker === 'memberB') {
        return await this.generateMemberResponse(this.state.memberB!, 'memberB');
      }
      
      return "[MOD] Continuing debate...";
    } catch (error) {
      console.error('Error in automatic progression:', error);
      return "[MOD] Error in debate progression.";
    }
  }

  private determineNextSpeaker(): 'moderator' | 'memberA' | 'memberB' {
    const recentHistory = this.state.debateHistory.slice(-3);
    
    // If no recent history, start with moderator
    if (recentHistory.length === 0) {
      return 'moderator';
    }
    
    const lastSpeaker = recentHistory[recentHistory.length - 1].speaker;
    
    // Moderator asks question → Member A responds
    if (lastSpeaker === 'moderator') {
      return 'memberA';
    }
    
    // Member A responds → Member B responds
    if (lastSpeaker === 'memberA') {
      return 'memberB';
    }
    
    // Member B responds → Check if we need follow-up or new question
    if (lastSpeaker === 'memberB') {
      // 30% chance for follow-up, 70% chance for new moderator question
      if (Math.random() < 0.3 && recentHistory.filter(h => h.speaker === 'moderator').length > 0) {
        return 'memberA'; // Follow-up discussion
      } else {
        return 'moderator'; // New question
      }
    }
    
    return 'moderator';
  }

  private async generateModeratorTurn(): Promise<string> {
    try {
      if (this.state.questionIndex >= this.state.totalQuestions) {
        // Debate is ending
        return this.endDebate();
      }

      // Generate contextual questions based on what's been said
      const questions = this.generateModeratorQuestions(this.state.topic);
      let currentQuestion = questions[this.state.questionIndex];
      
      // If we're past the first few questions, generate follow-ups based on debate content
      if (this.state.questionIndex > 2 && this.state.debateHistory.length > 4) {
        const followUpQuestion = this.generateFollowUpQuestion();
        if (followUpQuestion) {
          currentQuestion = followUpQuestion;
        }
      }
      
      this.state.currentQuestion = {
        id: `q${this.state.questionIndex}`,
        question: currentQuestion,
        context: this.state.topic,
        followUpQuestions: [],
        category: this.state.questionIndex === 0 ? 'opening' : 
                  this.state.questionIndex === questions.length - 1 ? 'closing' : 'policy'
      };

      const moderatorTurn: DebateTurn = {
        id: `turn_${Date.now()}`,
        speaker: 'moderator',
        content: currentQuestion,
        questionId: this.state.currentQuestion.id,
        timestamp: new Date()
      };

      this.state.debateHistory.push(moderatorTurn);
      this.state.questionIndex++;

      return `[MOD] ${currentQuestion}`;
    } catch (error) {
      console.error('Error generating moderator turn:', error);
      return "[MOD] Let's continue with our discussion.";
    }
  }

  private generateFollowUpQuestion(): string | null {
    const recentMemberResponses = this.state.debateHistory
      .filter(turn => turn.speaker === 'memberA' || turn.speaker === 'memberB')
      .slice(-2); // Last 2 member responses

    if (recentMemberResponses.length === 0) return null;

    // Extract key themes from recent responses
    const recentContent = recentMemberResponses.map(r => r.content).join(' ');
    
    // Generate follow-up questions based on common themes
    if (recentContent.toLowerCase().includes('jobs') || recentContent.toLowerCase().includes('economy')) {
      return "Let's dig deeper into the economic impacts. How would your approach specifically affect job creation in different sectors?";
    }
    
    if (recentContent.toLowerCase().includes('farmers') || recentContent.toLowerCase().includes('agriculture')) {
      return "I'm hearing different approaches to agricultural policy. Can you both address how your positions would affect food security and rural communities?";
    }
    
    if (recentContent.toLowerCase().includes('regulation') || recentContent.toLowerCase().includes('freedom')) {
      return "There seems to be disagreement about the role of government regulation. Where do you draw the line between necessary oversight and economic freedom?";
    }
    
    if (recentContent.toLowerCase().includes('future') || recentContent.toLowerCase().includes('generations')) {
      return "You both mention future generations. What specific timeline are you looking at, and what would success look like in 10 years?";
    }

    // Generic follow-up questions
    const followUps = [
      "Let's get specific. What would be your first concrete action if this policy passed tomorrow?",
      "I'm hearing different priorities. How would you respond to your colleague's main argument?",
      "Can you address the potential unintended consequences of your approach?",
      "What would you say to voters who are concerned about the costs of these policies?",
      "How do you balance competing interests in your district on this issue?"
    ];

    return followUps[Math.floor(Math.random() * followUps.length)];
  }

  private async generateMemberResponse(member: any, speakerType: 'memberA' | 'memberB'): Promise<string> {
    try {
      const response = await this.generateAuthenticResponse(member, this.state.currentQuestion!);
      
      const memberTurn: DebateTurn = {
        id: `turn_${Date.now()}`,
        speaker: speakerType,
        content: response,
        questionId: this.state.currentQuestion?.id,
        timestamp: new Date()
      };

      this.state.debateHistory.push(memberTurn);

      const memberName = speakerType === 'memberA' ? this.state.memberA?.name : this.state.memberB?.name;
      return `[${memberName}] ${response}`;
    } catch (error) {
      console.error('Error generating member response:', error);
      const memberName = speakerType === 'memberA' ? this.state.memberA?.name : this.state.memberB?.name;
      return `[${memberName}] I'd like to review the specifics on that issue.`;
    }
  }

  private async getCachedContext(query: string): Promise<any[]> {
    const cacheKey = query;
    const now = Date.now();
    
    // Check if we have fresh cached data (less than 5 minutes old)
    if (this.contextCache.has(cacheKey)) {
      const lastTime = this.lastCacheTime.get(cacheKey) || 0;
      if (now - lastTime < 5 * 60 * 1000) { // 5 minutes
        return this.contextCache.get(cacheKey) || [];
      }
    }
    
    try {
      // Fetch new context data
      const context = await retrieve(query, 2); // Reduced to 2 chunks for speed
      
      // Cache the results
      this.contextCache.set(cacheKey, context);
      this.lastCacheTime.set(cacheKey, now);
      
      return context;
    } catch (error) {
      console.error('Error retrieving context:', error);
      // Return cached data if available, even if stale
      return this.contextCache.get(cacheKey) || [];
    }
  }

  private async updatePersonalityWithScraping(member: any): Promise<PersonalityProfile | null> {
    try {
      // Update personality profile with fresh web scraping data
      const updatedProfile = await speechScraper.updatePersonalityFromScraping(member.id);
      
      // Update the member's personality profile in state
      if (updatedProfile) {
        if (member === this.state.memberA) {
          this.state.memberA.personalityProfile = updatedProfile;
        } else if (member === this.state.memberB) {
          this.state.memberB.personalityProfile = updatedProfile;
        }
      }
      
      return updatedProfile;
    } catch (error) {
      console.error('Error updating personality with scraping:', error);
      return null;
    }
  }

  private async getRecentStatements(member: any): Promise<Array<{text: string, source: string, date: string}>> {
    try {
      // Get recent statements from web scraping
      const statements = await speechScraper.scrapeRecentStatements(member.id);
      
      return statements.map(stmt => ({
        text: stmt.text,
        source: stmt.source,
        date: stmt.date
      }));
    } catch (error) {
      console.error('Error getting recent statements:', error);
      return [];
    }
  }
}

// Export a singleton instance
export const moderatorDebateSystem = new ModeratorDebateSystem();
