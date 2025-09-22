import { GoogleGenerativeAI } from '@google/generative-ai';
import { retrieve } from './rag';
import { DebateTurn, Citation, DebateResult } from '@/types/citations';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function runDebate({ 
  memberA, 
  memberB, 
  topic 
}: { 
  memberA: any; 
  memberB: any; 
  topic: string 
}): Promise<DebateResult> {
  try {
    console.log(`Running debate between ${memberA.firstName} ${memberA.lastName} and ${memberB.firstName} ${memberB.lastName} on topic: ${topic}`);
    
    // Retrieve relevant context for the debate topic
    const context = await retrieve(topic, 5);
    
    // Create debate personas
    const personaA = createPersona(memberA, 'A');
    const personaB = createPersona(memberB, 'B');
    
    // Generate debate turns
    const turns: DebateTurn[] = [];
    
    // Opening statements
    const openingA = await generateOpeningStatement(personaA, topic, context);
    const openingB = await generateOpeningStatement(personaB, topic, context);
    
    turns.push({ speaker: "A", text: openingA.text, citations: openingA.citations });
    turns.push({ speaker: "B", text: openingB.text, citations: openingB.citations });
    
    // Rebuttals
    const rebuttalA = await generateRebuttal(personaA, openingB.text, topic, context);
    const rebuttalB = await generateRebuttal(personaB, openingA.text, topic, context);
    
    turns.push({ speaker: "A", text: rebuttalA.text, citations: rebuttalA.citations });
    turns.push({ speaker: "B", text: rebuttalB.text, citations: rebuttalB.citations });
    
    // Closing statements
    const closingA = await generateClosingStatement(personaA, topic, context);
    const closingB = await generateClosingStatement(personaB, topic, context);
    
    turns.push({ speaker: "A", text: closingA.text, citations: closingA.citations });
    turns.push({ speaker: "B", text: closingB.text, citations: closingB.citations });
    
    // Generate summary
    const summary = await generateDebateSummary(turns, topic);
    
    // Collect all citations
    const allCitations: Citation[] = [];
    turns.forEach(turn => {
      allCitations.push(...turn.citations);
    });
    
    return {
      turns,
      summary,
      citations: allCitations,
      contested: []
    };
  } catch (error) {
    console.error('Error in runDebate:', error);
    return {
      turns: [
        { speaker: "A", text: "I apologize, but I'm experiencing technical difficulties and cannot participate in this debate at the moment.", citations: [] },
        { speaker: "B", text: "I understand. Let's reschedule this important discussion for when the technical issues are resolved.", citations: [] }
      ],
      summary: "Debate was unable to proceed due to technical difficulties.",
      citations: [],
      contested: []
    };
  }
}

function createPersona(member: any, speaker: 'A' | 'B') {
  const partyName = member.party === 'D' ? 'Democratic' : member.party === 'R' ? 'Republican' : 'Independent';
  const chamberName = member.chamber === 'house' ? 'House of Representatives' : 'Senate';
  const district = member.district ? ` District ${member.district}` : '';
  
  return {
    name: `${member.firstName} ${member.lastName}`,
    party: partyName,
    chamber: chamberName,
    state: member.state,
    district: district,
    speaker: speaker,
    committees: member.committees?.map((c: any) => c.Committee.name).join(', ') || 'No committee assignments',
    dwNominate: member.dwNominate || 0
  };
}

async function generateOpeningStatement(persona: any, topic: string, context: any[]) {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  
  const prompt = `You are ${persona.name}, a ${persona.party} ${persona.chamber} representing ${persona.state}${persona.district}. 

Your political background:
- Party: ${persona.party}
- Chamber: ${persona.chamber}
- Committees: ${persona.committees}
- Ideology Score: ${persona.dwNominate} (negative = liberal, positive = conservative)

Topic: ${topic}

Context from recent sources:
${context.map((c, i) => `[${i + 1}] ${c.text.substring(0, 200)}...`).join('\n')}

Write a 2-3 paragraph opening statement for this debate. Be authentic to your political position and party affiliation. Use specific policy details and cite sources with [1], [2], etc. Be respectful but firm in your position.`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();
  
  // Extract citations from the text
  const citations: Citation[] = [];
  const citationRegex = /\[(\d+)\]/g;
  let match;
  while ((match = citationRegex.exec(text)) !== null) {
    const index = parseInt(match[1]) - 1;
    if (index < context.length) {
      citations.push({
        marker: parseInt(match[1]),
        url: context[index].sourceUrl,
        title: `Source ${match[1]}`,
        publisher: context[index].publisher,
        retrieved_at: context[index].retrievedAt,
        as_of: context[index].asOf,
        quote: context[index].text.substring(0, 100) + '...'
      });
    }
  }
  
  return { text, citations };
}

async function generateRebuttal(persona: any, opponentStatement: string, topic: string, context: any[]) {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  
  const prompt = `You are ${persona.name}, a ${persona.party} ${persona.chamber} representing ${persona.state}${persona.district}.

Your opponent just said: "${opponentStatement.substring(0, 500)}..."

Topic: ${topic}

Context from recent sources:
${context.map((c, i) => `[${i + 1}] ${c.text.substring(0, 200)}...`).join('\n')}

Write a 2-3 paragraph rebuttal. Address your opponent's points directly, provide counterarguments, and strengthen your own position. Be respectful but firm. Use specific policy details and cite sources with [1], [2], etc.`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();
  
  // Extract citations from the text
  const citations: Citation[] = [];
  const citationRegex = /\[(\d+)\]/g;
  let match;
  while ((match = citationRegex.exec(text)) !== null) {
    const index = parseInt(match[1]) - 1;
    if (index < context.length) {
      citations.push({
        marker: parseInt(match[1]),
        url: context[index].sourceUrl,
        title: `Source ${match[1]}`,
        publisher: context[index].publisher,
        retrieved_at: context[index].retrievedAt,
        as_of: context[index].asOf,
        quote: context[index].text.substring(0, 100) + '...'
      });
    }
  }
  
  return { text, citations };
}

async function generateClosingStatement(persona: any, topic: string, context: any[]) {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  
  const prompt = `You are ${persona.name}, a ${persona.party} ${persona.chamber} representing ${persona.state}${persona.district}.

Topic: ${topic}

Context from recent sources:
${context.map((c, i) => `[${i + 1}] ${c.text.substring(0, 200)}...`).join('\n')}

Write a 1-2 paragraph closing statement. Summarize your key points, emphasize why your position is best for the American people, and end on a strong, memorable note. Be respectful but firm. Use specific policy details and cite sources with [1], [2], etc.`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();
  
  // Extract citations from the text
  const citations: Citation[] = [];
  const citationRegex = /\[(\d+)\]/g;
  let match;
  while ((match = citationRegex.exec(text)) !== null) {
    const index = parseInt(match[1]) - 1;
    if (index < context.length) {
      citations.push({
        marker: parseInt(match[1]),
        url: context[index].sourceUrl,
        title: `Source ${match[1]}`,
        publisher: context[index].publisher,
        retrieved_at: context[index].retrievedAt,
        as_of: context[index].asOf,
        quote: context[index].text.substring(0, 100) + '...'
      });
    }
  }
  
  return { text, citations };
}

async function generateDebateSummary(turns: DebateTurn[], topic: string) {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  
  const prompt = `Summarize this political debate on "${topic}":

${turns.map((turn, i) => `Speaker ${turn.speaker}: ${turn.text}`).join('\n\n')}

Provide a neutral, factual summary of the key points made by each speaker, their main arguments, and areas of agreement/disagreement. Keep it concise (2-3 paragraphs).`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
}