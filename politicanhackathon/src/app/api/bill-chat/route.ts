import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

interface BillChatRequest {
  bill_id: string;
  bill_title: string;
  bill_summary: string;
  bill_status: string;
  bill_chamber: string;
  query: string;
  conversation_history?: Array<{
    role: 'user' | 'assistant';
    message: string;
  }>;
}

interface BillChatResponse {
  response: string;
  bill_context: {
    id: string;
    title: string;
    status: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: BillChatRequest = await request.json();
    
    if (!body.query || !body.bill_id) {
      return NextResponse.json(
        { error: 'Missing required fields: query and bill_id' },
        { status: 400 }
      );
    }

    console.log(`💬 Bill Chat Request for ${body.bill_id}: "${body.query}"`);

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Build conversation context if history exists
    let conversationContext = '';
    if (body.conversation_history && body.conversation_history.length > 0) {
      console.log(`📜 Including conversation history (${body.conversation_history.length} messages)...`);
      conversationContext = '\n\nPREVIOUS CONVERSATION:\n';
      body.conversation_history.forEach((entry) => {
        if (entry.role === 'user') {
          conversationContext += `User: ${entry.message}\n`;
        } else {
          conversationContext += `Assistant: ${entry.message}\n`;
        }
      });
      conversationContext += '\nCURRENT QUESTION:\n';
    }

    // Create comprehensive bill analysis prompt
    const billChatPrompt = `You are a knowledgeable legislative analyst specializing in U.S. Congressional bills. You have access to detailed information about a specific bill and can answer questions about it.

BILL INFORMATION:
- ID: ${body.bill_id}
- Title: ${body.bill_title}
- Chamber: ${body.bill_chamber === 'house' ? 'House of Representatives' : 'Senate'}
- Status: ${body.bill_status}
- Summary: ${body.bill_summary}

INSTRUCTIONS:
1. Answer questions specifically about this bill using the provided information
2. If asked about broader policy implications, relate them back to this specific bill
3. Provide clear, factual responses based on the bill's content and status
4. If you don't have specific information about an aspect of the bill, be honest about limitations
5. Use accessible language while maintaining accuracy
6. When discussing legislative process, explain it in context of this bill's current status
${body.conversation_history && body.conversation_history.length > 0 ? `7. This is a continuing conversation - reference previous discussion when relevant and build upon earlier topics naturally` : ''}

${conversationContext}${body.query}

Please provide a comprehensive response about this bill:`;

    console.log(`🤖 Generating response with Gemini for bill ${body.bill_id}...`);
    
    const result = await model.generateContent(billChatPrompt);
    const aiResponse = await result.response;
    const responseText = aiResponse.text();

    const response: BillChatResponse = {
      response: responseText,
      bill_context: {
        id: body.bill_id,
        title: body.bill_title,
        status: body.bill_status
      }
    };

    console.log(`✅ Bill chat response generated (${responseText.length} chars)`);
    
    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Bill Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to process bill chat request' },
      { status: 500 }
    );
  }
}
