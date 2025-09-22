import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PrismaClient } from '@prisma/client';
import WebPersonaBuilder from '../../../lib/web-persona-builder';

const SAFETY_FALLBACK = "I do not have sufficient information on my record to provide a specific answer.";

interface QAHistoryEntry {
  role: 'user' | 'politician';
  message: string;
}

interface QARequest {
  mode: 'qa';
  politician_id: string;
  query: string;
  conversation_history?: QAHistoryEntry[];
}

interface DebateHistoryEntry {
  politician_id: string;
  statement: string;
}

interface DebateRequest {
  mode: 'debate';
  politician_ids: [string, string];
  query: string;
  turn?: number; // For continuing debates
  debate_history?: DebateHistoryEntry[];
  targetPolitician?: string; // 'both', politician_id, or undefined for normal alternating
}

type InteractionRequest = QARequest | DebateRequest;

interface InteractionResponse {
  mode: string;
  response: string;
  citations: string[];
  politicians: Array<{id: string, name: string, party: string, state: string, chamber: string}>;
  hasSufficientContext: boolean;
  turn?: number;
  currentPolitician?: {id: string, name: string, party: string, state: string, chamber: string};
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Starting interaction API request...');
    
    const body: InteractionRequest = await request.json();
    console.log('📝 Request body:', { mode: body.mode, query: body.query?.substring(0, 50) + '...' });
    
    // Validate request
    if (!body.mode || !body.query) {
      console.error('❌ Missing required fields:', { mode: body.mode, hasQuery: !!body.query });
      return NextResponse.json(
        { error: 'Missing required fields: mode and query' },
        { status: 400 }
      );
    }

    // Validate Gemini API key
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      console.error('❌ Gemini API key not configured');
      return NextResponse.json(
        { error: 'AI service not configured' },
        { status: 503 }
      );
    }

        console.log('🕷️ Initializing web persona builder...');
        const personaBuilder = new WebPersonaBuilder();
        const prisma = new PrismaClient();
        const genAI = new GoogleGenerativeAI(geminiApiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    let response: InteractionResponse;

        if (body.mode === 'qa') {
          console.log('💬 Processing Q&A session...');
          response = await handleQASession(body as QARequest, personaBuilder, prisma, model);
        } else if (body.mode === 'debate') {
          console.log('🗣️ Processing debate session...');
          response = await handleDebateSession(body as DebateRequest, personaBuilder, prisma, model);
        } else {
          console.error('❌ Invalid mode:', (body as any).mode);
          return NextResponse.json(
            { error: 'Invalid mode. Must be "qa" or "debate"' },
            { status: 400 }
          );
        }

    console.log('✅ Response generated successfully');
    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Interaction API error:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { 
        error: 'Failed to process interaction',
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

async function handleQASession(
  request: QARequest,
  personaBuilder: WebPersonaBuilder,
  prisma: any,
  model: any
): Promise<InteractionResponse> {
  
  // Get basic politician info from database
  const politician = await prisma.member.findUnique({
    where: { id: request.politician_id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      party: true,
      state: true,
      chamber: true
    }
  });

  if (!politician) {
    throw new Error('Politician not found');
  }

  console.log(`🕷️ Building web-scraped persona for ${politician.firstName} ${politician.lastName}...`);

  try {
    // Build comprehensive persona using web scraping
    const persona = await personaBuilder.buildPersona(politician);
    
    // Create conversation context with history
    let conversationContext = '';
    if (request.conversation_history && request.conversation_history.length > 0) {
      console.log(`📜 Including conversation history (${request.conversation_history.length} messages)...`);
      conversationContext = '\n\nPREVIOUS CONVERSATION:\n';
      request.conversation_history.forEach((entry, index) => {
        if (entry.role === 'user') {
          conversationContext += `User: ${entry.message}\n`;
        } else {
          conversationContext += `${politician.firstName} ${politician.lastName}: ${entry.message}\n`;
        }
      });
      conversationContext += '\nCURRENT QUESTION:\n';
    }
    
    // Create AI persona prompt with conversation history
    const personaPrompt = personaBuilder.createPersonaPrompt(persona, conversationContext + request.query);
    
    console.log(`🎭 Generating AI response with web-scraped persona and conversation history...`);
    const result = await model.generateContent(personaPrompt);
    const aiResponse = await result.response;
    const responseText = aiResponse.text();

    const citations = [
      '[Web Sources] Information gathered from official government websites, recent statements, and public records'
    ];

    return {
      mode: 'qa',
      response: responseText,
      citations,
      politicians: [{
        id: politician.id,
        name: `${politician.firstName} ${politician.lastName}`,
        party: politician.party,
        state: politician.state,
        chamber: politician.chamber
      }],
      hasSufficientContext: true
    };

  } catch (error) {
    console.error(`❌ Error building persona for ${politician.firstName} ${politician.lastName}:`, error);
    
    // Fallback to basic response
    const fallbackPrompt = `You are ${politician.firstName} ${politician.lastName}, a ${politician.chamber === 'house' ? 'U.S. Representative' : 'U.S. Senator'} from ${politician.state} (${politician.party} party).

Please respond to this question in first person based on your general political positions and party affiliation:

${request.query}`;

    const result = await model.generateContent(fallbackPrompt);
    const aiResponse = await result.response;
    
    return {
      mode: 'qa',
      response: aiResponse.text(),
      citations: ['[Basic Profile] Response based on general political positions'],
      politicians: [{
        id: politician.id,
        name: `${politician.firstName} ${politician.lastName}`,
        party: politician.party,
        state: politician.state,
        chamber: politician.chamber
      }],
      hasSufficientContext: true
    };
  } finally {
    await personaBuilder.close();
  }
}

async function handleDebateSession(
  request: DebateRequest,
  personaBuilder: WebPersonaBuilder,
  prisma: any,
  model: any
): Promise<InteractionResponse> {

  if (request.politician_ids.length !== 2) {
    throw new Error('Debate mode requires exactly 2 politicians');
  }

  // Get both politicians from database
  const politicians = await prisma.member.findMany({
    where: {
      id: {
        in: request.politician_ids
      }
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      party: true,
      state: true,
      chamber: true
    }
  });

  if (politicians.length !== 2) {
    throw new Error('Could not find both politicians');
  }

  console.log(`🗣️ Starting debate between ${politicians[0].firstName} ${politicians[0].lastName} and ${politicians[1].firstName} ${politicians[1].lastName}...`);

  try {
    // Build personas for both politicians using web scraping
    const [persona1, persona2] = await Promise.all([
      personaBuilder.buildPersona(politicians[0]),
      personaBuilder.buildPersona(politicians[1])
    ]);

    // Ensure consistent politician order by sorting by ID
    politicians.sort((a: any, b: any) => a.id.localeCompare(b.id));
    
    // Determine whose turn it is based on targeting or normal alternating
    let isFirstPoliticianTurn: boolean;
    
    if (request.targetPolitician && request.targetPolitician !== 'both') {
      // Question is targeted to a specific politician
      isFirstPoliticianTurn = request.targetPolitician === politicians[0].id;
    } else {
      // ROBUST alternating behavior - always alternate regardless of turn number
      // If we have debate history, check who spoke last and switch to the other person
      if (request.debate_history && request.debate_history.length > 0) {
        const lastSpeaker = request.debate_history[request.debate_history.length - 1];
        // Switch to the OTHER politician (opposite of who spoke last)
        isFirstPoliticianTurn = lastSpeaker.politician_id !== politicians[0].id;
      } else {
        // First turn - start with first politician (alphabetically by ID)
        isFirstPoliticianTurn = true;
      }
    }
    
    const currentPolitician = isFirstPoliticianTurn ? politicians[0] : politicians[1];
    const currentPersona = isFirstPoliticianTurn ? persona1 : persona2;
    const otherPolitician = isFirstPoliticianTurn ? politicians[1] : politicians[0];
    const otherPersona = isFirstPoliticianTurn ? persona2 : persona1;

    // Format the debate history for context
    const debateHistory = request.debate_history || [];
    const formattedHistory = debateHistory.length > 0 
      ? debateHistory.map((entry: DebateHistoryEntry) => {
          const speaker = politicians.find((p: any) => p.id === entry.politician_id);
          const speakerName = speaker ? `${speaker.firstName} ${speaker.lastName}` : 'Unknown';
          return `${speakerName}: ${entry.statement}`;
        }).join('\n\n')
      : 'No previous statements in this debate.';

    // Create conversation-aware debate prompt
    const targetingContext = request.targetPolitician && request.targetPolitician !== 'both' 
      ? `\nIMPORTANT: This question was specifically directed to you by the moderator. You should respond directly and personally.`
      : '';
    
    const debatePrompt = `You are ${currentPersona.name}, a ${currentPersona.chamber === 'house' ? 'U.S. Representative' : 'U.S. Senator'} representing ${currentPersona.constituency} (${currentPersona.party} party).

DEBATE CONTEXT:
You are engaged in a political debate with ${otherPersona.name} (${otherPersona.party}-${otherPersona.state}) on the topic: "${request.query}"${targetingContext}

YOUR PROFILE:
- Background: ${currentPersona.biography}
- Communication Style: ${currentPersona.communicationStyle}
- Key Policy Positions: ${currentPersona.keyPositions.slice(0, 5).join('; ')}
- Committee Work: ${currentPersona.committees.slice(0, 3).join('; ')}

YOUR OPPONENT'S PROFILE:
- Name: ${otherPersona.name} (${otherPersona.party}-${otherPersona.state})
- Their Key Positions: ${otherPersona.keyPositions.slice(0, 3).join('; ')}

FULL DEBATE HISTORY SO FAR:
${formattedHistory}

INSTRUCTIONS:
1. Respond as ${currentPersona.name} in first person
2. Reference the debate history and build upon previous points
3. Address or counter points made by ${otherPersona.name} if applicable
4. Stay true to your political positions and party affiliation
5. Be respectful but assertive in your debate style
6. Keep your response focused and under 150 words
7. You can reference specific policies, voting records, or achievements from your background

Current Turn: ${request.turn || 1}
Your Response (as ${currentPersona.name}):`;

    console.log(`🎭 Generating response for ${currentPersona.name} (Turn ${request.turn || 1})...`);
    console.log(`🔄 ALTERNATING: Turn=${request.turn || 1}, lastSpeaker=${request.debate_history?.length ? request.debate_history[request.debate_history.length - 1].politician_id : 'none'}, currentPolitician=${currentPolitician.firstName} ${currentPolitician.lastName}, politicians=[${politicians[0].firstName} ${politicians[0].lastName}, ${politicians[1].firstName} ${politicians[1].lastName}]`);
    
    const result = await model.generateContent(debatePrompt);
    const aiResponse = await result.response;
    const responseText = aiResponse.text();

    const citations = [
      '[Web Sources] Politician personas built from current official information and public records'
    ];

    return {
      mode: 'debate',
      response: responseText,
      citations,
      politicians: politicians.map((p: any) => ({
        id: p.id,
        name: `${p.firstName} ${p.lastName}`,
        party: p.party,
        state: p.state,
        chamber: p.chamber
      })),
      hasSufficientContext: true,
      turn: (request.turn || 1) + 1,
      currentPolitician: {
        id: currentPolitician.id,
        name: `${currentPolitician.firstName} ${currentPolitician.lastName}`,
        party: currentPolitician.party,
        state: currentPolitician.state,
        chamber: currentPolitician.chamber
      }
    };

  } catch (error) {
    console.error(`❌ Error in debate session:`, error);
    
    // Fallback response
    const fallbackPolitician = politicians[!request.turn || request.turn % 2 === 1 ? 0 : 1];
    
    return {
      mode: 'debate',
      response: `I apologize, but I'm having difficulty accessing current information to provide a comprehensive response on this topic. I'd be happy to discuss this further when we have better access to the relevant data.`,
      citations: ['[System] Fallback response due to technical difficulties'],
      politicians: politicians.map((p: any) => ({
        id: p.id,
        name: `${p.firstName} ${p.lastName}`,
        party: p.party,
        state: p.state,
        chamber: p.chamber
      })),
      hasSufficientContext: false,
      turn: (request.turn || 1) + 1,
      currentPolitician: {
        id: fallbackPolitician.id,
        name: `${fallbackPolitician.firstName} ${fallbackPolitician.lastName}`,
        party: fallbackPolitician.party,
        state: fallbackPolitician.state,
        chamber: fallbackPolitician.chamber
      }
    };
  } finally {
    await personaBuilder.close();
  }
}
