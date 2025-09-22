import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from '@prisma/client';
import { cleanBillTitle, cleanBillSummary } from '@/lib/html-cleaner';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const congress = searchParams.get('congress');
    const chamber = searchParams.get('chamber');
    
    const bills = await prisma.bill.findMany({
      where: {
        ...(congress && { congress: parseInt(congress) }),
        ...(chamber && { chamber }),
      },
      include: {
        sponsor: true,
        actions: true,
        votes: true
      }
    });
    
    // Clean HTML content from bills before returning
    const cleanedBills = bills.map(bill => ({
      ...bill,
      title: cleanBillTitle(bill.title),
      summary: cleanBillSummary(bill.summary)
    }));
    
    return NextResponse.json({ bills: cleanedBills });
  } catch (error) {
    console.error('Bills API error:', error);
    return NextResponse.json({ error: 'Failed to fetch bills' }, { status: 500 });
  }
}
