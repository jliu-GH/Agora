interface CampaignFinanceRecord {
  candidateId: string;
  candidateName: string;
  candidateStatus: 'C' | 'I' | 'O'; // Challenger, Incumbent, Open seat
  cycleNumber: number;
  party: 'DEM' | 'REP' | 'LIB' | 'IND' | string;
  
  // Financial data
  totalReceipts: number;
  transfersFromAuthorized: number;
  totalDisbursements: number;
  transfersToAuthorized: number;
  beginningCash: number;
  endingCash: number;
  candidateContributions: number;
  candidateLoans: number;
  otherLoans: number;
  candidateLoanRepayments: number;
  otherLoanRepayments: number;
  debts: number;
  individualContributions: number;
  
  // Geographic data
  state: string;
  district: string;
  
  // PAC and committee data
  pacContributions: number;
  partyContributions: number;
  coverageEndDate: string;
  refundsToIndividuals: number;
  refundsToCommittees: number;
}

export class CampaignFinanceParser {
  /**
   * Parse a single line of FEC campaign finance data
   */
  static parseRecord(line: string): CampaignFinanceRecord | null {
    try {
      const fields = line.split('|');
      
      if (fields.length < 30) {
        console.warn('Invalid record - insufficient fields:', fields.length);
        return null;
      }

      return {
        candidateId: fields[0] || '',
        candidateName: fields[1] || '',
        candidateStatus: fields[2] as 'C' | 'I' | 'O',
        cycleNumber: parseInt(fields[3]) || 0,
        party: fields[4] || '',
        
        // Financial fields (converted to numbers, defaulting to 0)
        totalReceipts: parseFloat(fields[5]) || 0,
        transfersFromAuthorized: parseFloat(fields[6]) || 0,
        totalDisbursements: parseFloat(fields[7]) || 0,
        transfersToAuthorized: parseFloat(fields[8]) || 0,
        beginningCash: parseFloat(fields[9]) || 0,
        endingCash: parseFloat(fields[10]) || 0,
        candidateContributions: parseFloat(fields[11]) || 0,
        candidateLoans: parseFloat(fields[12]) || 0,
        otherLoans: parseFloat(fields[13]) || 0,
        candidateLoanRepayments: parseFloat(fields[14]) || 0,
        otherLoanRepayments: parseFloat(fields[15]) || 0,
        debts: parseFloat(fields[29]) || 0, // Column 30: Debt field
        individualContributions: parseFloat(fields[17]) || 0,
        
        state: fields[18] || '',
        district: fields[19] || '',
        
        // Additional financial data
        pacContributions: parseFloat(fields[25]) || 0, // Column 26: PAC contributions
        partyContributions: parseFloat(fields[26]) || 0, // Column 27: Party contributions  
        coverageEndDate: fields[27] || '', // Column 28: Correct date field
        refundsToIndividuals: parseFloat(fields[29]) || 0,
        refundsToCommittees: parseFloat(fields[30]) || 0
      };
    } catch (error) {
      console.error('Error parsing campaign finance record:', error);
      return null;
    }
  }

  /**
   * Parse all records from the campaign finance data
   */
  static parseAllRecords(data: string): CampaignFinanceRecord[] {
    const lines = data.trim().split('\n');
    const records: CampaignFinanceRecord[] = [];
    
    for (const line of lines) {
      if (line.trim()) {
        const record = this.parseRecord(line);
        if (record) {
          records.push(record);
        }
      }
    }
    
    return records;
  }

  /**
   * Find records by candidate name (fuzzy matching)
   */
  static findByCandidateName(records: CampaignFinanceRecord[], searchName: string): CampaignFinanceRecord[] {
    const searchTerms = searchName.toLowerCase().split(' ');
    
    return records.filter(record => {
      const recordName = record.candidateName.toLowerCase();
      return searchTerms.every(term => recordName.includes(term));
    });
  }

  /**
   * Find records by state and district
   */
  static findByLocation(records: CampaignFinanceRecord[], state: string, district?: string): CampaignFinanceRecord[] {
    return records.filter(record => {
      if (record.state !== state.toUpperCase()) return false;
      if (district !== undefined && record.district !== district.padStart(2, '0')) return false;
      return true;
    });
  }

  /**
   * Calculate funding analytics for a candidate (correcting for double-counted transfers)
   */
  static calculateFundingAnalytics(record: CampaignFinanceRecord): {
    totalFunding: number;
    adjustedTotalReceipts: number;
    adjustedTotalDisbursements: number;
    fundingSources: {
      individual: { amount: number; percentage: number };
      pac: { amount: number; percentage: number };
      party: { amount: number; percentage: number };
      candidate: { amount: number; percentage: number };
      other: { amount: number; percentage: number };
    };
    expenditures: {
      total: number;
      adjustedTotal: number;
      efficiency: number; // Cash on hand vs adjusted receipts
    };
    financialHealth: {
      cashOnHand: number;
      debt: number;
      netPosition: number;
      burnRate: number;
    };
    transferActivity: {
      transfersIn: number;
      transfersOut: number;
      netTransfers: number;
      hasDoubleCountingIssue: boolean;
    };
  } {
    // Correct for double-counted activity as per FEC documentation
    // If there are transfers both in and out, subtract them to avoid double-counting
    const transfersIn = record.transfersFromAuthorized;
    const transfersOut = record.transfersToAuthorized;
    const hasDoubleCountingIssue = transfersIn > 0 && transfersOut > 0;
    
    // Adjusted totals removing double-counted transfers
    const adjustedTotalReceipts = record.totalReceipts - transfersIn;
    const adjustedTotalDisbursements = record.totalDisbursements - transfersOut;
    
    // Use adjusted receipts for percentage calculations
    const totalFunding = adjustedTotalReceipts;
    
    const individual = record.individualContributions;
    const pac = record.pacContributions;
    const party = record.partyContributions;
    const candidate = record.candidateContributions + record.candidateLoans;
    
    // Calculate "other" based on what's left after known sources
    const knownSources = individual + pac + party + candidate;
    const other = Math.max(0, totalFunding - knownSources);

    const calculatePercentage = (amount: number) => 
      totalFunding > 0 ? (amount / totalFunding) * 100 : 0;

    return {
      totalFunding,
      adjustedTotalReceipts,
      adjustedTotalDisbursements,
      fundingSources: {
        individual: { amount: individual, percentage: calculatePercentage(individual) },
        pac: { amount: pac, percentage: calculatePercentage(pac) },
        party: { amount: party, percentage: calculatePercentage(party) },
        candidate: { amount: candidate, percentage: calculatePercentage(candidate) },
        other: { amount: other, percentage: calculatePercentage(other) }
      },
      expenditures: {
        total: record.totalDisbursements,
        adjustedTotal: adjustedTotalDisbursements,
        efficiency: totalFunding > 0 ? (record.endingCash / totalFunding) * 100 : 0
      },
      financialHealth: {
        cashOnHand: record.endingCash,
        debt: record.debts,
        netPosition: record.endingCash - record.debts,
        burnRate: adjustedTotalDisbursements / Math.max(1, totalFunding)
      },
      transferActivity: {
        transfersIn,
        transfersOut,
        netTransfers: transfersIn - transfersOut,
        hasDoubleCountingIssue
      }
    };
  }

  /**
   * Get top contributors analysis
   */
  static getContributorAnalysis(record: CampaignFinanceRecord): {
    primaryFundingSource: string;
    corporateInfluence: 'High' | 'Medium' | 'Low';
    grassrootsSupport: 'High' | 'Medium' | 'Low';
    selfFunded: boolean;
    partySupported: boolean;
  } {
    const analytics = this.calculateFundingAnalytics(record);
    const sources = analytics.fundingSources;
    
    // Determine primary funding source
    let primarySource = 'individual';
    let maxAmount = sources.individual.amount;
    
    Object.entries(sources).forEach(([source, data]) => {
      if (data.amount > maxAmount) {
        primarySource = source;
        maxAmount = data.amount;
      }
    });

    // Corporate influence (based on PAC contributions)
    const corporateInfluence = 
      sources.pac.percentage > 40 ? 'High' :
      sources.pac.percentage > 15 ? 'Medium' : 'Low';

    // Grassroots support (based on individual contributions)
    const grassrootsSupport = 
      sources.individual.percentage > 60 ? 'High' :
      sources.individual.percentage > 30 ? 'Medium' : 'Low';

    return {
      primaryFundingSource: primarySource,
      corporateInfluence,
      grassrootsSupport,
      selfFunded: sources.candidate.percentage > 50,
      partySupported: sources.party.percentage > 10
    };
  }

  /**
   * Format currency for display
   */
  static formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  /**
   * Format percentage for display
   */
  static formatPercentage(percentage: number): string {
    return `${percentage.toFixed(1)}%`;
  }
}

export default CampaignFinanceParser;
