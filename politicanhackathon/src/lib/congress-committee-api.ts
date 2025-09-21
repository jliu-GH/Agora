interface Committee {
  systemCode: string;
  name: string;
  chamber: string;
  url: string;
  updateDate: string;
  updateDateIncludingText: string;
  isCurrent: boolean;
  subcommittees?: Committee[];
}

interface CommitteeActivity {
  bills?: Bill[];
  reports?: Report[];
  nominations?: Nomination[];
  houseCommunications?: Communication[];
  senateCommunications?: Communication[];
}

interface Bill {
  congress: number;
  latestAction: {
    actionDate: string;
    text: string;
  };
  number: string;
  originChamber: string;
  title: string;
  type: string;
  url: string;
  updateDate: string;
}

interface Report {
  citation: string;
  number: string;
  part?: string;
  type: string;
  url: string;
  updateDate: string;
}

interface Nomination {
  citation: string;
  congress: number;
  description: string;
  latestAction: {
    actionDate: string;
    text: string;
  };
  number: string;
  url: string;
  updateDate: string;
}

interface Communication {
  citation: string;
  communicationType: string;
  number: string;
  url: string;
  updateDate: string;
}

interface CommitteeAnalytics {
  committee: Committee;
  memberCount: number;
  recentActivity: {
    billsConsidered: number;
    reportsPublished: number;
    nominationsProcessed: number;
    communications: number;
  };
  topBills: Bill[];
  recentReports: Report[];
  productivityScore: number;
}

export class CongressCommitteeAPI {
  private baseUrl = 'https://api.congress.gov/v3';
  private apiKey: string;
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.CONGRESS_API_KEY || '';
    if (!this.apiKey) {
      console.warn('⚠️ Congress API key not provided. Some features may be limited.');
    }
  }

  private async fetchFromAPI(endpoint: string): Promise<any> {
    const cacheKey = endpoint;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log(`📋 Using cached data for ${endpoint}`);
      return cached.data;
    }

    try {
      const url = `${this.baseUrl}${endpoint}`;
      const params = new URLSearchParams({
        format: 'json',
        limit: '250'
      });

      if (this.apiKey) {
        params.append('api_key', this.apiKey);
      }

      console.log(`🌐 Fetching: ${url}?${params}`);
      const response = await fetch(`${url}?${params}`);
      
      if (!response.ok) {
        throw new Error(`Congress API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // Cache the result
      this.cache.set(cacheKey, { data, timestamp: Date.now() });
      
      return data;
    } catch (error) {
      console.error(`❌ Error fetching from Congress API: ${endpoint}`, error);
      throw error;
    }
  }

  /**
   * Get all committees for current Congress
   */
  async getCurrentCommittees(): Promise<Committee[]> {
    const data = await this.fetchFromAPI('/committee');
    return data.committees || [];
  }

  /**
   * Get only main active committees (excluding subcommittees)
   */
  async getMainActiveCommittees(): Promise<{
    house: Committee[];
    senate: Committee[];
    joint: Committee[];
    total: number;
  }> {
    const [houseCommittees, senateCommittees, allCommittees] = await Promise.all([
      this.getCommitteesByChamber('house'),
      this.getCommitteesByChamber('senate'),
      this.getCurrentCommittees()
    ]);

    // Find joint committees from all committees
    const jointCommittees = allCommittees.filter((committee: Committee) => {
      const systemCode = committee.systemCode || '';
      // Joint committees typically start with "J"
      return committee.isCurrent && systemCode.match(/^J[A-Z]{2,4}$/);
    });

    return {
      house: houseCommittees,
      senate: senateCommittees,
      joint: jointCommittees,
      total: houseCommittees.length + senateCommittees.length + jointCommittees.length
    };
  }

  /**
   * Get committees by chamber (house/senate)
   */
  async getCommitteesByChamber(chamber: 'house' | 'senate'): Promise<Committee[]> {
    const data = await this.fetchFromAPI(`/committee/${chamber}`);
    const allCommittees = data.committees || [];
    
    // Filter for only main committees (exclude subcommittees and inactive committees)
    return allCommittees.filter((committee: Committee) => {
      // Only include current/active committees
      if (!committee.isCurrent) return false;
      
      // Exclude subcommittees (they typically have parent committee codes in their systemCode)
      // Main committees usually have shorter system codes
      const systemCode = committee.systemCode || '';
      
      // House main committees typically start with "H" followed by 2-4 characters
      // Senate main committees typically start with "S" followed by 2-4 characters
      if (chamber === 'house') {
        return systemCode.match(/^H[A-Z]{2,4}$/);
      } else {
        return systemCode.match(/^S[A-Z]{2,4}$/);
      }
    });
  }

  /**
   * Get specific committee details
   */
  async getCommitteeDetails(chamber: string, committeeCode: string): Promise<Committee | null> {
    try {
      const data = await this.fetchFromAPI(`/committee/${chamber}/${committeeCode}`);
      return data.committee || null;
    } catch (error) {
      console.warn(`Committee not found: ${chamber}/${committeeCode}`);
      return null;
    }
  }

  /**
   * Get committee's recent bills
   */
  async getCommitteeBills(chamber: string, committeeCode: string, limit = 20): Promise<Bill[]> {
    try {
      const data = await this.fetchFromAPI(`/committee/${chamber}/${committeeCode}/bills`);
      return (data.bills || []).slice(0, limit);
    } catch (error) {
      console.warn(`No bills found for committee: ${chamber}/${committeeCode}`);
      return [];
    }
  }

  /**
   * Get committee reports
   */
  async getCommitteeReports(chamber: string, committeeCode: string, limit = 10): Promise<Report[]> {
    try {
      const data = await this.fetchFromAPI(`/committee/${chamber}/${committeeCode}/reports`);
      return (data.reports || []).slice(0, limit);
    } catch (error) {
      console.warn(`No reports found for committee: ${chamber}/${committeeCode}`);
      return [];
    }
  }

  /**
   * Get committee nominations (mainly for Senate)
   */
  async getCommitteeNominations(chamber: string, committeeCode: string): Promise<Nomination[]> {
    try {
      const data = await this.fetchFromAPI(`/committee/${chamber}/${committeeCode}/nominations`);
      return data.nominations || [];
    } catch (error) {
      console.warn(`No nominations found for committee: ${chamber}/${committeeCode}`);
      return [];
    }
  }

  /**
   * Get committee communications
   */
  async getCommitteeCommunications(chamber: string, committeeCode: string): Promise<Communication[]> {
    try {
      const endpoint = chamber === 'house' 
        ? `/committee/${chamber}/${committeeCode}/house-communication`
        : `/committee/${chamber}/${committeeCode}/senate-communication`;
      
      const data = await this.fetchFromAPI(endpoint);
      return data.communications || [];
    } catch (error) {
      console.warn(`No communications found for committee: ${chamber}/${committeeCode}`);
      return [];
    }
  }

  /**
   * Get comprehensive committee activity
   */
  async getCommitteeActivity(chamber: string, committeeCode: string): Promise<CommitteeActivity> {
    const [bills, reports, nominations, communications] = await Promise.allSettled([
      this.getCommitteeBills(chamber, committeeCode),
      this.getCommitteeReports(chamber, committeeCode),
      this.getCommitteeNominations(chamber, committeeCode),
      this.getCommitteeCommunications(chamber, committeeCode)
    ]);

    return {
      bills: bills.status === 'fulfilled' ? bills.value : [],
      reports: reports.status === 'fulfilled' ? reports.value : [],
      nominations: nominations.status === 'fulfilled' ? nominations.value : [],
      houseCommunications: chamber === 'house' && communications.status === 'fulfilled' ? communications.value : [],
      senateCommunications: chamber === 'senate' && communications.status === 'fulfilled' ? communications.value : []
    };
  }

  /**
   * Generate committee analytics
   */
  async generateCommitteeAnalytics(chamber: string, committeeCode: string): Promise<CommitteeAnalytics | null> {
    try {
      console.log(`📊 Generating analytics for committee: ${chamber}/${committeeCode}`);
      
      const [committee, activity] = await Promise.all([
        this.getCommitteeDetails(chamber, committeeCode),
        this.getCommitteeActivity(chamber, committeeCode)
      ]);

      if (!committee) {
        return null;
      }

      // Calculate recent activity (last 6 months)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const recentBills = (activity.bills || []).filter(bill => 
        new Date(bill.updateDate) > sixMonthsAgo
      );

      const recentReports = (activity.reports || []).filter(report => 
        new Date(report.updateDate) > sixMonthsAgo
      );

      const recentNominations = (activity.nominations || []).filter(nomination => 
        new Date(nomination.updateDate) > sixMonthsAgo
      );

      const recentCommunications = [
        ...(activity.houseCommunications || []),
        ...(activity.senateCommunications || [])
      ].filter(comm => new Date(comm.updateDate) > sixMonthsAgo);

      // Calculate productivity score (0-100)
      const billScore = Math.min(recentBills.length * 5, 40); // Max 40 points
      const reportScore = Math.min(recentReports.length * 10, 30); // Max 30 points
      const nominationScore = Math.min(recentNominations.length * 15, 20); // Max 20 points
      const communicationScore = Math.min(recentCommunications.length * 2, 10); // Max 10 points
      
      const productivityScore = billScore + reportScore + nominationScore + communicationScore;

      return {
        committee,
        memberCount: 0, // Would need separate API call to get member count
        recentActivity: {
          billsConsidered: recentBills.length,
          reportsPublished: recentReports.length,
          nominationsProcessed: recentNominations.length,
          communications: recentCommunications.length
        },
        topBills: recentBills.slice(0, 5),
        recentReports: recentReports.slice(0, 3),
        productivityScore
      };
    } catch (error) {
      console.error(`❌ Error generating committee analytics: ${chamber}/${committeeCode}`, error);
      return null;
    }
  }

  /**
   * Find committee code from name (for mapping member committees)
   */
  async findCommitteeByName(committeeName: string, chamber?: string): Promise<Committee | null> {
    try {
      const committees = chamber 
        ? await this.getCommitteesByChamber(chamber as 'house' | 'senate')
        : await this.getCurrentCommittees();

      // Direct name match
      let match = committees.find(c => 
        c.name.toLowerCase() === committeeName.toLowerCase()
      );

      if (!match) {
        // Partial name match
        match = committees.find(c => 
          c.name.toLowerCase().includes(committeeName.toLowerCase()) ||
          committeeName.toLowerCase().includes(c.name.toLowerCase())
        );
      }

      return match || null;
    } catch (error) {
      console.warn(`Error finding committee by name: ${committeeName}`, error);
      return null;
    }
  }

  /**
   * Get analytics for multiple committees (for member profile)
   */
  async getMemberCommitteeAnalytics(committeeNames: string[], chamber: string): Promise<CommitteeAnalytics[]> {
    const analytics: CommitteeAnalytics[] = [];

    for (const committeeName of committeeNames) {
      try {
        const committee = await this.findCommitteeByName(committeeName, chamber);
        if (committee) {
          const analytics_data = await this.generateCommitteeAnalytics(chamber, committee.systemCode);
          if (analytics_data) {
            analytics.push(analytics_data);
          }
        }
      } catch (error) {
        console.warn(`Failed to get analytics for committee: ${committeeName}`, error);
      }
    }

    return analytics;
  }
}

export default CongressCommitteeAPI;
