import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const chamber = searchParams.get('chamber');
    const congress = searchParams.get('congress');
    
    const votes = await prisma.rollCall.findMany({
      where: {
        ...(chamber && { chamber }),
        ...(congress && { 
          bill: { 
            congress: parseInt(congress) 
          } 
        }),
      },
      include: {
        positions: {
          include: { Member: true }
        },
        Bill: true
      }
    });
    
    return NextResponse.json({ votes });
  } catch (error) {
    console.error('Votes API error:', error);
    return NextResponse.json({ error: 'Failed to fetch votes' }, { status: 500 });
  }
}
