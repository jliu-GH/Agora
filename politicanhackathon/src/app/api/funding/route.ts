import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import path from 'path';
import CampaignFinanceParser from '@/lib/campaign-finance-parser';

// Cache for parsed funding data
let cachedFundingData: any[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

function loadFundingData() {
  const now = Date.now();
  
  // Return cached data if still valid
  if (cachedFundingData && (now - cacheTimestamp) < CACHE_DURATION) {
    return cachedFundingData;
  }

  try {
    console.log('📊 Loading campaign finance data...');
    const dataPath = path.join(process.cwd(), 'weball26.txt');
    const rawData = readFileSync(dataPath, 'utf-8');
    
    const records = CampaignFinanceParser.parseAllRecords(rawData);
    console.log(`✅ Loaded ${records.length} campaign finance records`);
    
    // Cache the data
    cachedFundingData = records;
    cacheTimestamp = now;
    
    return records;
  } catch (error) {
    console.error('❌ Error loading campaign finance data:', error);
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const candidateName = searchParams.get('candidate');
    const state = searchParams.get('state');
    const district = searchParams.get('district');
    const type = searchParams.get('type') || 'search';

    const fundingData = loadFundingData();

    if (fundingData.length === 0) {
      return NextResponse.json({ 
        error: 'Campaign finance data not available',
        records: [],
        total: 0
      }, { status: 404 });
    }

    switch (type) {
      case 'search':
        if (candidateName) {
          const records = CampaignFinanceParser.findByCandidateName(fundingData, candidateName);
          
          const enrichedRecords = records.map(record => ({
            ...record,
            analytics: CampaignFinanceParser.calculateFundingAnalytics(record),
            contributorAnalysis: CampaignFinanceParser.getContributorAnalysis(record)
          }));

          return NextResponse.json({
            query: candidateName,
            records: enrichedRecords,
            total: enrichedRecords.length
          });
        }
        
        if (state) {
          const records = CampaignFinanceParser.findByLocation(fundingData, state, district);
          
          const enrichedRecords = records.map(record => ({
            ...record,
            analytics: CampaignFinanceParser.calculateFundingAnalytics(record),
            contributorAnalysis: CampaignFinanceParser.getContributorAnalysis(record)
          }));

          return NextResponse.json({
            query: { state, district },
            records: enrichedRecords,
            total: enrichedRecords.length
          });
        }

        return NextResponse.json({ 
          error: 'Please provide candidate name or state parameter',
          records: [],
          total: 0
        }, { status: 400 });

      case 'analytics':
        // Return aggregate analytics
        const totalRecords = fundingData.length;
        const totalFunding = fundingData.reduce((sum, record) => sum + record.totalReceipts, 0);
        const avgFunding = totalFunding / totalRecords;
        
        const partyBreakdown = fundingData.reduce((acc, record) => {
          acc[record.party] = (acc[record.party] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const stateBreakdown = fundingData.reduce((acc, record) => {
          acc[record.state] = (acc[record.state] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        return NextResponse.json({
          overview: {
            totalCandidates: totalRecords,
            totalFunding: CampaignFinanceParser.formatCurrency(totalFunding),
            averageFunding: CampaignFinanceParser.formatCurrency(avgFunding)
          },
          partyBreakdown,
          stateBreakdown,
          topFundedCandidates: fundingData
            .sort((a, b) => b.totalReceipts - a.totalReceipts)
            .slice(0, 10)
            .map(record => ({
              name: record.candidateName,
              party: record.party,
              state: record.state,
              district: record.district,
              totalFunding: CampaignFinanceParser.formatCurrency(record.totalReceipts),
              analytics: CampaignFinanceParser.calculateFundingAnalytics(record)
            }))
        });

      case 'top-donors':
        // Analysis of funding patterns
        const highPacCandidates = fundingData
          .filter(record => record.pacContributions > 100000)
          .sort((a, b) => b.pacContributions - a.pacContributions)
          .slice(0, 20);

        const selfFundedCandidates = fundingData
          .filter(record => (record.candidateContributions + record.candidateLoans) > 100000)
          .sort((a, b) => (b.candidateContributions + b.candidateLoans) - (a.candidateContributions + a.candidateLoans))
          .slice(0, 20);

        const grassrootsCandidates = fundingData
          .filter(record => record.individualContributions > 50000)
          .sort((a, b) => b.individualContributions - a.individualContributions)
          .slice(0, 20);

        return NextResponse.json({
          highPacFunding: highPacCandidates.map(record => ({
            name: record.candidateName,
            party: record.party,
            state: record.state,
            district: record.district,
            pacContributions: CampaignFinanceParser.formatCurrency(record.pacContributions),
            pacPercentage: CampaignFinanceParser.formatPercentage(
              (record.pacContributions / Math.max(1, record.totalReceipts)) * 100
            )
          })),
          selfFunded: selfFundedCandidates.map(record => ({
            name: record.candidateName,
            party: record.party,
            state: record.state,
            district: record.district,
            selfContributions: CampaignFinanceParser.formatCurrency(
              record.candidateContributions + record.candidateLoans
            ),
            selfPercentage: CampaignFinanceParser.formatPercentage(
              ((record.candidateContributions + record.candidateLoans) / Math.max(1, record.totalReceipts)) * 100
            )
          })),
          grassroots: grassrootsCandidates.map(record => ({
            name: record.candidateName,
            party: record.party,
            state: record.state,
            district: record.district,
            individualContributions: CampaignFinanceParser.formatCurrency(record.individualContributions),
            individualPercentage: CampaignFinanceParser.formatPercentage(
              (record.individualContributions / Math.max(1, record.totalReceipts)) * 100
            )
          }))
        });

      default:
        return NextResponse.json({ 
          error: 'Invalid type parameter. Use: search, analytics, or top-donors' 
        }, { status: 400 });
    }

  } catch (error) {
    console.error('Campaign finance API error:', error);
    return NextResponse.json({ 
      error: 'Failed to process campaign finance request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST endpoint for bulk analysis
export async function POST(request: NextRequest) {
  try {
    const { candidates } = await request.json();
    
    if (!candidates || !Array.isArray(candidates)) {
      return NextResponse.json({ 
        error: 'Candidates array required in request body' 
      }, { status: 400 });
    }

    const fundingData = loadFundingData();
    const results = [];

    for (const candidateName of candidates) {
      const records = CampaignFinanceParser.findByCandidateName(fundingData, candidateName);
      
      if (records.length > 0) {
        const record = records[0]; // Use the first/most recent record
        results.push({
          candidateName,
          found: true,
          record: {
            ...record,
            analytics: CampaignFinanceParser.calculateFundingAnalytics(record),
            contributorAnalysis: CampaignFinanceParser.getContributorAnalysis(record)
          }
        });
      } else {
        results.push({
          candidateName,
          found: false,
          record: null
        });
      }
    }

    return NextResponse.json({
      results,
      summary: {
        requested: candidates.length,
        found: results.filter(r => r.found).length,
        missing: results.filter(r => !r.found).length
      }
    });

  } catch (error) {
    console.error('Bulk campaign finance analysis error:', error);
    return NextResponse.json({ 
      error: 'Failed to perform bulk analysis',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}