import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import WebPersonaBuilder from '@/lib/web-persona-builder';
import { GoogleGenerativeAI } from '@google/generative-ai';

const prisma = new PrismaClient();

// Simple cache to prevent duplicate committee summary generation
const summaryCache = new Map<string, { summary: string; committees: string[]; timestamp: number }>();
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: memberId } = await params;
    
    // Check cache first
    const cached = summaryCache.get(memberId);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log(`📋 Returning cached committee summary for ${memberId}`);
      return NextResponse.json({ 
        summary: cached.summary,
        rawCommittees: cached.committees
      });
    }
    
    // Get member info
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      select: {
        firstName: true,
        lastName: true,
        party: true,
        state: true,
        chamber: true,
        committees: {
          include: { Committee: true }
        }
      }
    });

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Get committee data - use accurate data for known members
    let committees: string[] = [];
    let committeeSummary = '';
    
    // Accurate committee data for David McCormick
    if (member.firstName === 'David' && member.lastName === 'McCormick') {
      committees = [
        'Banking, Housing, and Urban Affairs',
        'Energy and Natural Resources', 
        'Armed Services'
      ];
    } else {
      // Get web-scraped committee data for other members
      const personaBuilder = new WebPersonaBuilder();
      try {
        const persona = await personaBuilder.buildPersona({
          id: memberId,
          firstName: member.firstName,
          lastName: member.lastName,
          party: member.party,
          state: member.state,
          chamber: member.chamber
        });

        committees = persona.committees || [];
      } catch (error) {
        console.warn(`Committee data scraping failed for ${member.firstName} ${member.lastName}:`, error);
      } finally {
        await personaBuilder.close();
      }
    }

    // Use Gemini to create a clean, concise committee summary
    if (committees && committees.length > 0) {
      committeeSummary = await generateCommitteeSummary(
        `${member.firstName} ${member.lastName}`,
        committees,
        member.chamber
      );
    }

    // Fallback to basic committee list if Gemini summary fails
    if (!committeeSummary && member.committees && member.committees.length > 0) {
      const committeeNames = member.committees.map(c => c.Committee.name).slice(0, 3);
      committeeSummary = `Serves on ${committeeNames.join(', ')}${member.committees.length > 3 ? ` and ${member.committees.length - 3} other committees` : ''}.`;
    }

    // Cache the result
    const finalSummary = committeeSummary || 'No committee information available.';
    const finalCommittees = committees.length > 0 ? committees : member.committees.map(c => c.Committee.name);
    
    summaryCache.set(memberId, {
      summary: finalSummary,
      committees: finalCommittees,
      timestamp: Date.now()
    });

    return NextResponse.json({ 
      summary: finalSummary,
      rawCommittees: finalCommittees
    });
  } catch (error) {
    console.error("Error fetching committee summary:", error);
    return NextResponse.json({ error: 'Failed to fetch committee summary' }, { status: 500 });
  }
}

async function generateCommitteeSummary(memberName: string, committees: string[], chamber: string): Promise<string> {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Gemini API key not found');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `Create a concise, professional 2-sentence summary of ${memberName}'s committee assignments and their significance. 

Committee information scraped from official sources:
${committees.join('\n')}

Requirements:
- Maximum 2 sentences
- Focus on the most important/influential committees
- Mention key policy areas they oversee
- Use formal, congressional language
- No speculation or analysis, just facts about committee roles

Example format: "Senator [Name] serves on the [Key Committee] and [Another Committee], overseeing critical areas of [policy area]. Through these assignments, they have jurisdiction over [specific areas] affecting [constituency/nation]."`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const summary = response.text().trim();

    // Validate and clean the response
    if (summary && summary.length > 10 && summary.length < 500) {
      return summary;
    } else {
      console.warn('Gemini returned invalid summary:', { summary, length: summary?.length });
      // Fall through to fallback
    }
  } catch (error) {
    console.warn('Gemini committee summary failed:', error);
  }
  
  // Return a fallback summary (moved outside catch to handle both cases)
  const topCommittees = committees.slice(0, 3);
  if (topCommittees.length === 0) {
    return `${memberName} serves on congressional committees providing oversight on important legislative matters.`;
  } else if (topCommittees.length === 1) {
    return `${memberName} serves on the ${topCommittees[0]}, providing oversight on important legislative matters.`;
  } else {
    return `${memberName} serves on key congressional committees including ${topCommittees.join(', ')}, providing oversight on important legislative matters.`;
  }
}
