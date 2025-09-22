import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import path from 'path';
import CampaignFinanceParser from '@/lib/campaign-finance-parser';

const prisma = new PrismaClient();

// Cache for funding data
const fundingCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

let globalFundingData: any[] | null = null;

function loadGlobalFundingData() {
  if (globalFundingData) return globalFundingData;
  
  try {
    const dataPath = path.join(process.cwd(), 'weball26.txt');
    const rawData = readFileSync(dataPath, 'utf-8');
    globalFundingData = CampaignFinanceParser.parseAllRecords(rawData);
    return globalFundingData;
  } catch (error) {
    console.error('Error loading funding data:', error);
    return [];
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: memberId } = await params;
    
    // Check cache first
    const cached = fundingCache.get(memberId);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log(`💰 Returning cached funding data for ${memberId}`);
      return NextResponse.json(cached.data);
    }

    // Get member info
    const member = await prisma.member.findUnique({
      where: { id: memberId }
    });

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    console.log(`💰 Fetching funding data for ${member.firstName} ${member.lastName}...`);

    // Load campaign finance data
    const fundingData = loadGlobalFundingData();
    
    if (fundingData.length === 0) {
      return NextResponse.json({
        member: {
          id: member.id,
          name: `${member.firstName} ${member.lastName}`,
          party: member.party,
          state: member.state,
          chamber: member.chamber
        },
        funding: null,
        error: 'Campaign finance data not available'
      });
    }

    // Search for member's funding records
    const memberName = `${member.lastName}, ${member.firstName}`;
    let fundingRecords = CampaignFinanceParser.findByCandidateName(fundingData, memberName);
    
    // If no exact match, try just last name
    if (fundingRecords.length === 0) {
      fundingRecords = CampaignFinanceParser.findByCandidateName(fundingData, member.lastName);
      // Further filter by state if multiple matches
      if (fundingRecords.length > 1) {
        fundingRecords = fundingRecords.filter(record => 
          record.state === member.state
        );
      }
    }

    if (fundingRecords.length === 0) {
      const result = {
        member: {
          id: member.id,
          name: `${member.firstName} ${member.lastName}`,
          party: member.party,
          state: member.state,
          chamber: member.chamber
        },
        funding: null,
        searchAttempts: [memberName, member.lastName],
        message: 'No campaign finance records found for this member'
      };
      
      fundingCache.set(memberId, { data: result, timestamp: Date.now() });
      return NextResponse.json(result);
    }

    // Use the most recent record (first one, as they're typically sorted by cycle)
    const primaryRecord = fundingRecords[0];
    const analytics = CampaignFinanceParser.calculateFundingAnalytics(primaryRecord);
    const contributorAnalysis = CampaignFinanceParser.getContributorAnalysis(primaryRecord);

    // Create detailed funding analysis with corrected numbers
    const fundingAnalysis = {
      summary: {
        totalRaised: analytics.totalFunding, // This is now the adjusted amount
        totalSpent: analytics.expenditures.adjustedTotal, // Adjusted spending
        cashOnHand: analytics.financialHealth.cashOnHand,
        debt: analytics.financialHealth.debt,
        netPosition: analytics.financialHealth.netPosition,
        coveragePeriod: primaryRecord.coverageEndDate,
        // Transfer activity information
        hasTransferIssue: analytics.transferActivity.hasDoubleCountingIssue,
        transfersIn: analytics.transferActivity.transfersIn,
        transfersOut: analytics.transferActivity.transfersOut,
        netTransfers: analytics.transferActivity.netTransfers,
        adjustedAmount: analytics.adjustedTotalReceipts !== primaryRecord.totalReceipts,
        adjustedSpent: analytics.adjustedTotalDisbursements !== primaryRecord.totalDisbursements,
        // Raw amounts for comparison
        rawTotalReceipts: primaryRecord.totalReceipts,
        rawTotalDisbursements: primaryRecord.totalDisbursements
      },
      fundingSources: {
        individual: {
          amount: analytics.fundingSources.individual.amount,
          percentage: analytics.fundingSources.individual.percentage,
          label: 'Individual Contributions',
          description: 'Contributions from individual donors'
        },
        pac: {
          amount: analytics.fundingSources.pac.amount,
          percentage: analytics.fundingSources.pac.percentage,
          label: 'PAC Contributions',
          description: 'Political Action Committee contributions'
        },
        party: {
          amount: analytics.fundingSources.party.amount,
          percentage: analytics.fundingSources.party.percentage,
          label: 'Party Contributions',
          description: 'Contributions from political party committees'
        },
        candidate: {
          amount: analytics.fundingSources.candidate.amount,
          percentage: analytics.fundingSources.candidate.percentage,
          label: 'Self-Funded',
          description: 'Candidate personal contributions and loans'
        },
        other: {
          amount: analytics.fundingSources.other.amount,
          percentage: analytics.fundingSources.other.percentage,
          label: 'Other Sources',
          description: 'Other contribution sources and transfers'
        }
      },
      influenceAnalysis: {
        corporateInfluence: contributorAnalysis.corporateInfluence,
        grassrootsSupport: contributorAnalysis.grassrootsSupport,
        selfFunded: contributorAnalysis.selfFunded,
        partySupported: contributorAnalysis.partySupported,
        primaryFundingSource: contributorAnalysis.primaryFundingSource
      },
      financialHealth: {
        efficiency: analytics.expenditures.efficiency,
        burnRate: analytics.financialHealth.burnRate,
        debtRatio: analytics.financialHealth.debt / Math.max(1, analytics.totalFunding),
        status: getFinancialHealthStatus(analytics.financialHealth)
      },
      historicalData: fundingRecords.length > 1 ? fundingRecords.slice(1, 4).map(record => ({
        cycle: record.cycleNumber,
        totalRaised: record.totalReceipts,
        totalSpent: record.totalDisbursements,
        cashOnHand: record.endingCash
      })) : []
    };

    const result = {
      member: {
        id: member.id,
        name: `${member.firstName} ${member.lastName}`,
        party: member.party,
        state: member.state,
        chamber: member.chamber
      },
      funding: fundingAnalysis,
      rawRecord: primaryRecord,
      lastUpdated: new Date().toISOString()
    };

    // Cache the result
    fundingCache.set(memberId, { data: result, timestamp: Date.now() });

    return NextResponse.json(result);

  } catch (error) {
    console.error("Error fetching member funding data:", error);
    return NextResponse.json({ 
      error: 'Failed to fetch funding data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function getFinancialHealthStatus(health: any): string {
  if (health.netPosition < 0) return 'Concerning';
  if (health.burnRate > 0.8) return 'High Burn Rate';
  if (health.cashOnHand > 100000) return 'Well Funded';
  if (health.cashOnHand > 50000) return 'Adequate';
  return 'Limited Resources';
}
