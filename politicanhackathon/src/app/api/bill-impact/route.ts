import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface DemographicProfile {
  ageGroup: string;
  incomeLevel: string;
  education: string;
  location: string;
  employment: string;
  familyStatus: string;
  healthStatus?: string;
  housingStatus?: string;
  additionalContext?: string;
}

interface BillImpactRequest {
  billId: string;
  demographics: DemographicProfile;
}

export async function POST(request: NextRequest) {
  try {
    const { billId, demographics }: BillImpactRequest = await request.json();

    // Validate Gemini API key
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return NextResponse.json(
        { error: 'AI analysis service not configured' },
        { status: 503 }
      );
    }

    // Get bill details from database
    const bill = await prisma.bill.findUnique({
      where: { id: billId },
      select: {
        id: true,
        title: true,
        summary: true,
        chamber: true,
        status: true,
        congress: true
      }
    });

    if (!bill) {
      return NextResponse.json(
        { error: 'Bill not found' },
        { status: 404 }
      );
    }

    // Initialize Gemini AI
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Generate demographic-specific analysis
    const analysis = await analyzeBillImpact(model, bill, demographics);

    return NextResponse.json({
      billInfo: {
        id: bill.id,
        title: bill.title,
        chamber: bill.chamber,
        status: bill.status
      },
      demographics,
      analysis,
      analysisDate: new Date().toISOString()
    });

  } catch (error) {
    console.error('Bill impact analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze bill impact' },
      { status: 500 }
    );
  }
}

async function analyzeBillImpact(model: any, bill: any, demographics: DemographicProfile) {
  const prompt = createAnalysisPrompt(bill, demographics);
  
  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const analysisText = response.text();

    // Parse the structured response
    return parseAnalysisResponse(analysisText);
  } catch (error) {
    console.error('Gemini AI analysis error:', error);
    return {
      overallImpact: 'Unable to analyze at this time',
      specificEffects: ['Analysis service temporarily unavailable'],
      timeframe: 'Unknown',
      confidence: 'low',
      actionItems: ['Check back later for analysis']
    };
  }
}

function createAnalysisPrompt(bill: any, demographics: DemographicProfile): string {
  return `
You are a senior policy analyst providing detailed, evidence-based impact analysis. Analyze how this legislation would specifically affect an individual with the given demographic profile. Focus on concrete, actionable insights.

INDIVIDUAL PROFILE:
- Age Group: ${demographics.ageGroup}
- Annual Income: ${demographics.incomeLevel}
- Education Level: ${demographics.education}
- Location Type: ${demographics.location}
- Employment Status: ${demographics.employment}
- Family Situation: ${demographics.familyStatus}
${demographics.healthStatus ? `- Health Status: ${demographics.healthStatus}` : ''}
${demographics.housingStatus ? `- Housing Status: ${demographics.housingStatus}` : ''}
${demographics.additionalContext ? `- Additional Context: ${demographics.additionalContext}` : ''}

LEGISLATION DETAILS:
Title: ${bill.title}
Summary: ${bill.summary || 'Limited summary available - analyze based on title and typical legislative patterns for similar bills'}
Current Status: ${bill.status}
Originating Chamber: ${bill.chamber}
Congress Session: ${bill.congress}

ANALYSIS FRAMEWORK:
Provide substantive analysis even with limited bill details. Use the title, demographic profile, and knowledge of similar legislation to infer likely impacts. Be specific and practical. ${demographics.additionalContext ? 'PAY SPECIAL ATTENTION to the additional context provided - this contains specific circumstances that should heavily influence your analysis and recommendations.' : ''}

REQUIRED OUTPUT FORMAT:

OVERALL IMPACT: [Impact Level] - Provide 2-3 sentences explaining the reasoning behind this assessment, including specific factors from the demographic profile that influence this conclusion.

SPECIFIC EFFECTS:
- [Effect 1]: Detailed explanation of how this person's income level/age/employment would be affected, including estimated magnitude or scope
- [Effect 2]: Specific impact on daily life, finances, or opportunities based on their family situation and location
- [Effect 3]: Regulatory or procedural changes that would directly affect someone in their demographic category
- [Effect 4]: Secondary or indirect effects considering their education level and health status (if applicable)${demographics.additionalContext ? `
- [Context-Specific Effect]: Direct analysis of how the bill affects the specific circumstances described in their additional context` : ''}
- [Additional effects as relevant to this specific demographic combination]

TIMEFRAME: Provide specific timeline with implementation phases: "Implementation would likely begin [timeframe] after passage, with [specific phases] occurring over [duration]. Full effects would be realized within [timeframe]."

CONFIDENCE: [Level] - Explain the confidence level based on: bill detail availability, precedent from similar legislation, and certainty of demographic impact patterns. Include what factors could change this assessment.

ACTION ITEMS:
- [Immediate Action]: Specific step to take now with exact resources, contacts, or deadlines
- [Monitoring Action]: How to track legislative progress with specific sources, timelines, or indicators to watch
- [Preparation Action]: Concrete steps to prepare for potential changes with specific recommendations based on their situation

CRITICAL REQUIREMENTS:
1. Be specific about dollar amounts, timeframes, and percentages when possible
2. Reference how their specific age, income, and employment create unique impacts
3. Avoid generic responses - tailor everything to this exact demographic profile
4. Provide actionable intelligence, not vague observations
5. Even with limited bill details, use legislative patterns and demographic analysis to provide substantive insights
`;
}

function parseAnalysisResponse(analysisText: string) {
  try {
    // Extract structured information from the AI response
    const sections = analysisText.split('\n\n');
    
    let overallImpact = 'This legislation presents a mixed impact scenario for your demographic profile, with effects varying based on implementation details and timeline.';
    let specificEffects: string[] = [];
    let timeframe = 'Implementation would likely begin 6-12 months after passage, with initial effects visible within the first year and full implementation over 2-3 years.';
    let confidence = 'medium';
    let actionItems: string[] = [];

    sections.forEach(section => {
      const lines = section.split('\n');
      const header = lines[0].toUpperCase();

      if (header.includes('OVERALL IMPACT')) {
        const impactText = lines[0].replace(/OVERALL IMPACT:?\s*/i, '').trim();
        if (impactText.length > 20) { // Ensure we have a substantial response
          overallImpact = impactText;
        }
      } else if (header.includes('SPECIFIC EFFECTS')) {
        const effects = lines.slice(1)
          .filter(line => line.trim().startsWith('-'))
          .map(line => line.replace(/^-\s*/, '').trim())
          .filter(line => line.length > 30); // Filter out very short responses
        
        if (effects.length > 0) {
          specificEffects = effects;
        }
      } else if (header.includes('TIMEFRAME')) {
        const timeText = lines[0].replace(/TIMEFRAME:?\s*/i, '').trim();
        if (timeText.length > 15) { // Ensure substantial timeframe description
          timeframe = timeText;
        }
      } else if (header.includes('CONFIDENCE')) {
        const confText = lines[0].replace(/CONFIDENCE:?\s*/i, '').toLowerCase().trim();
        if (confText.length > 10) { // Look for detailed confidence explanation
          confidence = confText;
        } else {
          confidence = confText.includes('high') ? 'high' : confText.includes('low') ? 'low' : 'medium';
        }
      } else if (header.includes('ACTION ITEMS')) {
        const actions = lines.slice(1)
          .filter(line => line.trim().startsWith('-'))
          .map(line => line.replace(/^-\s*/, '').trim())
          .filter(line => line.length > 25); // Filter out generic short actions
        
        if (actions.length > 0) {
          actionItems = actions;
        }
      }
    });

    // Provide enhanced fallbacks if parsing didn't capture good content
    if (specificEffects.length === 0) {
      specificEffects = [
        'Direct financial implications based on your income level and employment status require detailed bill analysis',
        'Regulatory changes may affect your industry sector and geographic location differently than other demographics',
        'Implementation timeline and phase-in periods could create both opportunities and challenges for your situation',
        'Secondary effects on related services and benefits should be monitored as the legislation develops'
      ];
    }

    if (actionItems.length === 0) {
      actionItems = [
        'Monitor legislative progress through Congress.gov and track committee activity for implementation details',
        'Contact your representatives to understand how they plan to vote and voice your concerns or support',
        'Research similar legislation in other states or previous sessions to understand potential outcomes and prepare accordingly'
      ];
    }

    return {
      overallImpact,
      specificEffects,
      timeframe,
      confidence: typeof confidence === 'string' && confidence.length > 10 ? confidence : (confidence.includes ? (confidence.includes('high') ? 'high' : confidence.includes('low') ? 'low' : 'medium') : 'medium'),
      actionItems,
      rawAnalysis: analysisText
    };
  } catch (error) {
    console.error('Error parsing analysis response:', error);
    return {
      overallImpact: 'This legislation requires detailed analysis to determine specific impacts on your demographic profile. The effects will depend heavily on implementation details and timeline.',
      specificEffects: [
        'Income and employment factors in your profile suggest multiple potential impact pathways',
        'Geographic and family situation variables create unique considerations for implementation effects',
        'Age and education demographics may influence both benefits and compliance requirements',
        'Detailed bill text and regulatory guidance will be needed for precise impact assessment'
      ],
      timeframe: 'Legislative timeline varies, but implementation typically begins 6-18 months after passage with phased rollout over 2-4 years depending on bill complexity.',
      confidence: 'Medium - assessment based on demographic analysis patterns, though specific bill provisions may significantly alter impacts',
      actionItems: [
        'Track bill progress through congressional committees and monitor for amendments that could affect your situation',
        'Engage with relevant professional or advocacy organizations that represent your demographic interests',
        'Prepare for potential changes by reviewing current benefits, obligations, or services that might be affected'
      ],
      rawAnalysis: analysisText
    };
  }
}
