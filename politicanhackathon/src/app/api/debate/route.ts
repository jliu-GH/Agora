import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from '@prisma/client';
import { debateSystem } from "@/lib/debate-system";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const { command, memberId, topic, userInput, userStance, turns, maxWords } = await req.json();

    let result: string;

    switch (command) {
      case 'choose_rep':
        if (!memberId) {
          return NextResponse.json({ error: 'Member ID required' }, { status: 400 });
        }
        const memberA = await prisma.member.findUnique({
          where: { id: memberId },
          include: {
            committees: {
              include: {
                Committee: true
              }
            }
          }
        });
        if (!memberA) {
          return NextResponse.json({ error: 'Member not found' }, { status: 404 });
        }
        result = await debateSystem.chooseRep(memberId, memberA);
        break;

      case 'add_rep':
        if (!memberId) {
          return NextResponse.json({ error: 'Member ID required' }, { status: 400 });
        }
        const memberB = await prisma.member.findUnique({
          where: { id: memberId },
          include: {
            committees: {
              include: {
                Committee: true
              }
            }
          }
        });
        if (!memberB) {
          return NextResponse.json({ error: 'Member not found' }, { status: 404 });
        }
        result = await debateSystem.addRep(memberId, memberB);
        break;

      case 'topic':
        if (!topic) {
          return NextResponse.json({ error: 'Topic required' }, { status: 400 });
        }
        result = debateSystem.setTopic(topic);
        break;

      case 'turns':
        if (!turns) {
          return NextResponse.json({ error: 'Number of turns required' }, { status: 400 });
        }
        result = debateSystem.setTurns(turns);
        break;

      case 'max_words':
        if (!maxWords || !maxWords.type || !maxWords.words) {
          return NextResponse.json({ error: 'Word type and count required' }, { status: 400 });
        }
        result = debateSystem.setMaxWords(maxWords.type, maxWords.words);
        break;

      case 'end_debate':
        result = debateSystem.endDebate();
        break;

      case 'chat':
        if (!userInput) {
          return NextResponse.json({ error: 'User input required' }, { status: 400 });
        }
        try {
          result = await debateSystem.processUserInput(userInput, userStance);
        } catch (error) {
          console.error('Error in processUserInput:', error);
          return NextResponse.json({ error: 'Failed to process user input: ' + error.message }, { status: 500 });
        }
        break;

      case 'get_state':
        return NextResponse.json({ state: debateSystem.getState() });

      default:
        return NextResponse.json({ error: 'Invalid command' }, { status: 400 });
    }

    return NextResponse.json({ 
      result,
      state: debateSystem.getState()
    });
  } catch (error) {
    console.error('Debate API error:', error);
    return NextResponse.json({ error: 'Debate failed' }, { status: 500 });
  }
}
