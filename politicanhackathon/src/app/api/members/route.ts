import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const state = searchParams.get('state');
    const chamber = searchParams.get('chamber');
    
    // List of non-voting territorial delegates to exclude
    const nonVotingTerritories = [
      'American Samoa',       // AS
      'District of Columbia', // DC  
      'Guam',                // GU
      'Northern Mariana Islands', // MP
      'Puerto Rico',         // PR
      'Virgin Islands'       // VI
    ];

    const members = await prisma.member.findMany({
      where: {
        ...(state && { state }),
        ...(chamber && { chamber }),
        // Exclude non-voting territorial delegates
        state: {
          notIn: nonVotingTerritories
        }
      },
      include: {
        committees: {
          include: { Committee: true }
        }
      }
    });
    
    return NextResponse.json({ members });
  } catch (error) {
    console.error('Members API error:', error);
    return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 });
  }
}
