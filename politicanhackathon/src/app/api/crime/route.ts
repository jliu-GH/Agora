import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const state = searchParams.get('state');
    const year = searchParams.get('year');
    
    const crimeData = await prisma.crimeMetric.findMany({
      where: {
        ...(state && { state }),
        ...(year && { year: parseInt(year) }),
      }
    });
    
    return NextResponse.json({ crimeData });
  } catch (error) {
    console.error('Crime API error:', error);
    return NextResponse.json({ error: 'Failed to fetch crime data' }, { status: 500 });
  }
}
