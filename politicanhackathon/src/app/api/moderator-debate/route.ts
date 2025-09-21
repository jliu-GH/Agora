import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from '@prisma/client';
import { moderatorDebateSystem } from "@/lib/moderator-debate-system";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const { action, memberAId, memberBId, topic, userQuestion, speaker, response } = await req.json();

    let result: string;

    switch (action) {
      case 'initialize':
        if (!memberAId || !memberBId || !topic) {
          return NextResponse.json({ 
            error: 'Member A ID, Member B ID, and topic are required' 
          }, { status: 400 });
        }

        // Fetch member data
        const [memberA, memberB] = await Promise.all([
          prisma.member.findUnique({
            where: { id: memberAId },
            include: {
              committees: {
                include: { Committee: true }
              }
            }
          }),
          prisma.member.findUnique({
            where: { id: memberBId },
            include: {
              committees: {
                include: { Committee: true }
              }
            }
          })
        ]);

        if (!memberA || !memberB) {
          return NextResponse.json({ 
            error: 'One or both members not found' 
          }, { status: 404 });
        }

        result = await moderatorDebateSystem.initializeDebate(memberA, memberB, topic);
        break;

      case 'start_free_flowing':
        result = await moderatorDebateSystem.startFreeFlowingDebate();
        break;

      case 'respond':
        if (!speaker) {
          return NextResponse.json({ 
            error: 'Speaker is required' 
          }, { status: 400 });
        }

        if (speaker !== 'memberA' && speaker !== 'memberB') {
          return NextResponse.json({ 
            error: 'Speaker must be either memberA or memberB' 
          }, { status: 400 });
        }

        result = await moderatorDebateSystem.processResponse(speaker);
        break;

      case 'user_interject':
        if (!userQuestion) {
          return NextResponse.json({ 
            error: 'User question is required' 
          }, { status: 400 });
        }

        result = await moderatorDebateSystem.processUserInterjection(userQuestion);
        break;

      case 'resume':
        result = await moderatorDebateSystem.resumeDebate();
        break;

      case 'pause':
        result = moderatorDebateSystem.pauseDebate();
        break;

      case 'end':
        result = await moderatorDebateSystem.endDebate();
        break;

      case 'reset':
        result = moderatorDebateSystem.resetDebate();
        break;

      case 'get_state':
        return NextResponse.json({ 
          state: moderatorDebateSystem.getState() 
        });

      default:
        return NextResponse.json({ 
          error: 'Invalid action' 
        }, { status: 400 });
    }

    return NextResponse.json({ 
      result,
      state: moderatorDebateSystem.getState()
    });
  } catch (error) {
    console.error('Moderator debate API error:', error);
    return NextResponse.json({ 
      error: 'Moderator debate failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    return NextResponse.json({ 
      state: moderatorDebateSystem.getState() 
    });
  } catch (error) {
    console.error('Error fetching moderator debate state:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch debate state' 
    }, { status: 500 });
  }
}
