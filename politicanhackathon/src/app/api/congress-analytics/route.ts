import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import CongressCommitteeAPI from '@/lib/congress-committee-api';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'overview';

    switch (type) {
      case 'overview':
        return NextResponse.json(await getOverviewAnalytics());
      
      case 'bills-by-status':
        return NextResponse.json(await getBillsByStatus());
      
      case 'member-activity':
        return NextResponse.json(await getMemberActivity());
      
      case 'committee-breakdown':
        return NextResponse.json(await getCommitteeBreakdown());
      
      case 'legislative-trends':
        return NextResponse.json(await getLegislativeTrends());
        
      default:
        return NextResponse.json({ error: 'Invalid analytics type' }, { status: 400 });
    }
  } catch (error) {
    console.error('Congress analytics API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch congress analytics' },
      { status: 500 }
    );
  }
}

async function getOverviewAnalytics() {
  // Get member and bill stats from database
  const [memberStats, billStats] = await Promise.all([
    prisma.member.groupBy({
      by: ['chamber', 'party'],
      _count: { id: true }
    }),
    prisma.bill.groupBy({
      by: ['chamber'],
      _count: { id: true }
    })
  ]);

  // Use accurate committee counts for 119th Congress (2025-2026)
  // Source: https://www.congress.gov/committees
  const committeeData = {
    house: 21,        // House standing committees
    senate: 20,       // Senate standing committees  
    joint: 4,         // Joint committees
    total: 45         // Total active committees for 119th Congress
  };

  const committeeStats = [
    {
      chamber: 'house',
      _count: { id: committeeData.house }
    },
    {
      chamber: 'senate', 
      _count: { id: committeeData.senate }
    },
    {
      chamber: 'joint',
      _count: { id: committeeData.joint }
    },
    {
      chamber: 'all',
      _count: { id: committeeData.total }
    }
  ];

  const totals = {
    members: await prisma.member.count(),
    bills: await prisma.bill.count(),
    committees: committeeData.total // 45 for 119th Congress
  };

  return {
    overview: totals,
    memberComposition: memberStats,
    billDistribution: billStats,
    committeeStructure: committeeStats,
    committeeBreakdown: {
      house: committeeData.house,
      senate: committeeData.senate,
      joint: committeeData.joint,
      total: committeeData.total
    },
    lastUpdated: new Date().toISOString()
  };
}

async function getBillsByStatus() {
  // Extract status patterns from bill status text
  const bills = await prisma.bill.findMany({
    select: { status: true, chamber: true, createdAt: true }
  });

  const statusCategories = {
    introduced: 0,
    committee: 0,
    floor: 0,
    passed: 0,
    enrolled: 0,
    enacted: 0,
    failed: 0,
    other: 0
  };

  bills.forEach(bill => {
    const status = bill.status.toLowerCase();
    if (status.includes('introduced')) statusCategories.introduced++;
    else if (status.includes('committee')) statusCategories.committee++;
    else if (status.includes('floor') || status.includes('debate')) statusCategories.floor++;
    else if (status.includes('passed')) statusCategories.passed++;
    else if (status.includes('enrolled')) statusCategories.enrolled++;
    else if (status.includes('enacted') || status.includes('became public law')) statusCategories.enacted++;
    else if (status.includes('failed') || status.includes('defeated')) statusCategories.failed++;
    else statusCategories.other++;
  });

  return {
    statusBreakdown: statusCategories,
    totalBills: bills.length,
    byChamber: {
      house: bills.filter(b => b.chamber === 'house').length,
      senate: bills.filter(b => b.chamber === 'senate').length
    }
  };
}

async function getMemberActivity() {
  const stateActivity = await prisma.member.groupBy({
    by: ['state'],
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } }
  });

  const partyBreakdown = await prisma.member.groupBy({
    by: ['party'],
    _count: { id: true }
  });

  // Top states by representation
  const topStates = stateActivity.slice(0, 10);

  return {
    stateRepresentation: stateActivity,
    topStates,
    partyComposition: partyBreakdown,
    totalStates: stateActivity.length
  };
}

async function getCommitteeBreakdown() {
  const committees = await prisma.committee.findMany({
    select: {
      id: true,
      name: true
    },
    orderBy: { name: 'asc' }
  });

  // Since we don't have chamber field in current schema, show all committees
  return {
    committees,
    breakdown: {
      total: committees.length,
      note: "Committee chamber classification requires schema update"
    },
    sampleCommittees: committees.slice(0, 10)
  };
}

async function getLegislativeTrends() {
  // Get recent bill activity by month
  const recentBills = await prisma.bill.findMany({
    select: {
      createdAt: true,
      chamber: true,
      status: true
    },
    orderBy: { createdAt: 'desc' },
    take: 500
  });

  // Group by month
  const monthlyActivity: Record<string, number> = {};
  recentBills.forEach(bill => {
    const month = bill.createdAt.toISOString().substring(0, 7); // YYYY-MM
    monthlyActivity[month] = (monthlyActivity[month] || 0) + 1;
  });

  const sortedMonths = Object.entries(monthlyActivity)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 12);

  return {
    monthlyActivity: sortedMonths,
    recentTrends: {
      totalRecent: recentBills.length,
      averagePerMonth: Math.round(recentBills.length / 12),
      chamberSplit: {
        house: recentBills.filter(b => b.chamber === 'house').length,
        senate: recentBills.filter(b => b.chamber === 'senate').length
      }
    }
  };
}
