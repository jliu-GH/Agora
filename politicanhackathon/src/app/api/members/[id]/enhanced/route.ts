import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Get member with all enhanced profile data
    const member = await prisma.member.findUnique({
      where: { id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        chamber: true,
        state: true,
        district: true,
        party: true,
        bio: true,
        politicalBackground: true,
        keyPositions: true,
        recentBills: true,
        votingRecord: true,
        contactInfo: true,
        createdAt: true,
        updatedAt: true,
        committees: {
          include: {
            Committee: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });

    if (!member) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      );
    }

    // Parse JSON fields
    const enhancedMember = {
      ...member,
      keyPositions: member.keyPositions ? JSON.parse(member.keyPositions) : null,
      recentBills: member.recentBills ? JSON.parse(member.recentBills) : null,
      votingRecord: member.votingRecord ? JSON.parse(member.votingRecord) : null,
      contactInfo: member.contactInfo ? JSON.parse(member.contactInfo) : null,
      committees: member.committees.map(cm => cm.Committee)
    };

    // Generate summary stats
    const summaryStats = generateSummaryStats(enhancedMember);

    return NextResponse.json({
      member: enhancedMember,
      summary: summaryStats,
      lastUpdated: member.updatedAt
    });

  } catch (error) {
    console.error('Enhanced member API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch enhanced member data' },
      { status: 500 }
    );
  }
}

function generateSummaryStats(member: any) {
  const stats = {
    basic: {
      fullName: `${member.firstName} ${member.lastName}`,
      title: `${member.chamber === 'house' ? 'Representative' : 'Senator'} (${member.party}-${member.state}${member.district ? `-${member.district}` : ''})`,
      chamber: member.chamber,
      state: member.state,
      party: member.party
    },
    legislative: {
      sponsoredBills: 0,
      cosponsoredBills: 0,
      topPolicyArea: 'Unknown',
      productivity: 'Not Available'
    },
    profile: {
      hasBio: !!member.bio,
      hasPoliticalBackground: !!member.politicalBackground,
      hasRecentActivity: !!member.recentBills,
      hasVotingRecord: !!member.votingRecord,
      profileCompleteness: 0
    },
    committees: {
      count: member.committees?.length || 0,
      names: member.committees?.map((c: any) => c.name) || []
    }
  };

  // Calculate legislative stats if available
  if (member.keyPositions) {
    stats.legislative.sponsoredBills = member.keyPositions.totalSponsoredBills || 0;
    stats.legislative.cosponsoredBills = member.keyPositions.totalCosponsoredBills || 0;
    stats.legislative.topPolicyArea = member.keyPositions.topPolicyAreas?.[0]?.area || 'Unknown';
  }

  if (member.votingRecord?.legislativeProductivity) {
    stats.legislative.productivity = Math.round(member.votingRecord.legislativeProductivity.productivity || 0).toString();
  }

  // Calculate profile completeness
  let completeness = 0;
  if (member.bio) completeness += 20;
  if (member.politicalBackground) completeness += 20;
  if (member.keyPositions) completeness += 20;
  if (member.recentBills) completeness += 20;
  if (member.votingRecord) completeness += 20;
  
  stats.profile.profileCompleteness = completeness;

  return stats;
}
