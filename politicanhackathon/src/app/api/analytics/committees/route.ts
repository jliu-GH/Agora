import { NextRequest, NextResponse } from 'next/server';
import CongressCommitteeAPI from '@/lib/congress-committee-api';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const chamber = searchParams.get('chamber') as 'house' | 'senate';
    const committeeCode = searchParams.get('code');
    const type = searchParams.get('type') || 'overview';

    if (!chamber) {
      return NextResponse.json({ 
        error: 'Chamber parameter required (house or senate)' 
      }, { status: 400 });
    }

    const committeeAPI = new CongressCommitteeAPI();

    switch (type) {
      case 'overview':
        // Get all committees for a chamber with basic analytics
        const committees = await committeeAPI.getCommitteesByChamber(chamber);
        
        // Get analytics for top 10 most active committees
        const analyticsPromises = committees.slice(0, 10).map(async (committee) => {
          const analytics = await committeeAPI.generateCommitteeAnalytics(chamber, committee.systemCode);
          return analytics;
        });

        const analytics = (await Promise.all(analyticsPromises))
          .filter(a => a !== null)
          .sort((a, b) => b!.productivityScore - a!.productivityScore);

        return NextResponse.json({
          chamber,
          totalCommittees: committees.length,
          analytics: analytics.slice(0, 10),
          lastUpdated: new Date().toISOString()
        });

      case 'detail':
        if (!committeeCode) {
          return NextResponse.json({ 
            error: 'Committee code required for detailed analytics' 
          }, { status: 400 });
        }

        const detailedAnalytics = await committeeAPI.generateCommitteeAnalytics(chamber, committeeCode);
        
        if (!detailedAnalytics) {
          return NextResponse.json({ 
            error: 'Committee not found or no data available' 
          }, { status: 404 });
        }

        // Get additional detailed activity
        const activity = await committeeAPI.getCommitteeActivity(chamber, committeeCode);

        return NextResponse.json({
          ...detailedAnalytics,
          detailedActivity: activity,
          lastUpdated: new Date().toISOString()
        });

      case 'bills':
        if (!committeeCode) {
          return NextResponse.json({ 
            error: 'Committee code required for bills data' 
          }, { status: 400 });
        }

        const bills = await committeeAPI.getCommitteeBills(chamber, committeeCode, 50);
        
        return NextResponse.json({
          chamber,
          committeeCode,
          bills,
          totalBills: bills.length,
          lastUpdated: new Date().toISOString()
        });

      case 'reports':
        if (!committeeCode) {
          return NextResponse.json({ 
            error: 'Committee code required for reports data' 
          }, { status: 400 });
        }

        const reports = await committeeAPI.getCommitteeReports(chamber, committeeCode, 25);
        
        return NextResponse.json({
          chamber,
          committeeCode,
          reports,
          totalReports: reports.length,
          lastUpdated: new Date().toISOString()
        });

      case 'member-analytics':
        // Get analytics for member's committees
        const memberCommittees = searchParams.get('committees');
        if (!memberCommittees) {
          return NextResponse.json({ 
            error: 'Committees parameter required for member analytics' 
          }, { status: 400 });
        }

        const committeeNames = memberCommittees.split(',').map(c => c.trim());
        const memberAnalytics = await committeeAPI.getMemberCommitteeAnalytics(committeeNames, chamber);

        return NextResponse.json({
          chamber,
          committees: committeeNames,
          analytics: memberAnalytics,
          totalProductivityScore: memberAnalytics.reduce((sum, a) => sum + a.productivityScore, 0),
          lastUpdated: new Date().toISOString()
        });

      default:
        return NextResponse.json({ 
          error: 'Invalid type. Use: overview, detail, bills, reports, or member-analytics' 
        }, { status: 400 });
    }

  } catch (error) {
    console.error('Committee analytics API error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch committee analytics',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST endpoint for bulk committee analysis
export async function POST(request: NextRequest) {
  try {
    const { committees, chamber, analysisType = 'productivity' } = await request.json();

    if (!committees || !Array.isArray(committees)) {
      return NextResponse.json({ 
        error: 'Committees array required in request body' 
      }, { status: 400 });
    }

    if (!chamber) {
      return NextResponse.json({ 
        error: 'Chamber required in request body' 
      }, { status: 400 });
    }

    const committeeAPI = new CongressCommitteeAPI();
    const results = [];

    for (const committee of committees) {
      try {
        let analytics;
        
        if (typeof committee === 'string') {
          // Committee name provided, find by name
          const committeeObj = await committeeAPI.findCommitteeByName(committee, chamber);
          if (committeeObj) {
            analytics = await committeeAPI.generateCommitteeAnalytics(chamber, committeeObj.systemCode);
          }
        } else if (committee.systemCode) {
          // Committee object with system code provided
          analytics = await committeeAPI.generateCommitteeAnalytics(chamber, committee.systemCode);
        }

        if (analytics) {
          results.push({
            input: committee,
            analytics,
            success: true
          });
        } else {
          results.push({
            input: committee,
            error: 'Committee not found or no data available',
            success: false
          });
        }
      } catch (error) {
        results.push({
          input: committee,
          error: error instanceof Error ? error.message : 'Unknown error',
          success: false
        });
      }
    }

    // Calculate summary statistics
    const successful = results.filter(r => r.success);
    const totalProductivity = successful.reduce((sum, r) => sum + (r.analytics?.productivityScore || 0), 0);
    const avgProductivity = successful.length > 0 ? totalProductivity / successful.length : 0;

    return NextResponse.json({
      chamber,
      analysisType,
      results,
      summary: {
        totalRequested: committees.length,
        successful: successful.length,
        failed: results.length - successful.length,
        averageProductivityScore: Math.round(avgProductivity * 100) / 100,
        totalProductivityScore: totalProductivity
      },
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Bulk committee analysis error:', error);
    return NextResponse.json({ 
      error: 'Failed to perform bulk committee analysis',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
