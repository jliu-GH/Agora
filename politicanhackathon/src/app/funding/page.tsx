'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';

interface FundingOverview {
  overview: {
    totalCandidates: number;
    totalFunding: string;
    averageFunding: string;
  };
  partyBreakdown: Record<string, number>;
  stateBreakdown: Record<string, number>;
  topFundedCandidates: Array<{
    name: string;
    party: string;
    state: string;
    district: string;
    totalFunding: string;
    analytics: any;
  }>;
}

interface DonorAnalysis {
  highPacFunding: Array<{
    name: string;
    party: string;
    state: string;
    district: string;
    pacContributions: string;
    pacPercentage: string;
  }>;
  selfFunded: Array<{
    name: string;
    party: string;
    state: string;
    district: string;
    selfContributions: string;
    selfPercentage: string;
  }>;
  grassroots: Array<{
    name: string;
    party: string;
    state: string;
    district: string;
    individualContributions: string;
    individualPercentage: string;
  }>;
}

export default function FundingDashboard() {
  const [overview, setOverview] = useState<FundingOverview | null>(null);
  const [donorAnalysis, setDonorAnalysis] = useState<DonorAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    fetchOverviewData();
    fetchDonorAnalysis();
  }, []);

  const fetchOverviewData = async () => {
    try {
      const response = await apiFetch('/api/funding?type=analytics');
      if (response.ok) {
        const data = await response.json();
        setOverview(data);
      }
    } catch (error) {
      console.error('Error fetching overview data:', error);
    }
  };

  const fetchDonorAnalysis = async () => {
    try {
      const response = await apiFetch('/api/funding?type=top-donors');
      if (response.ok) {
        const data = await response.json();
        setDonorAnalysis(data);
      }
    } catch (error) {
      console.error('Error fetching donor analysis:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setSearching(true);
    try {
      const response = await apiFetch(`/api/funding?candidate=${encodeURIComponent(searchQuery)}`);
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.records || []);
        setActiveTab('search');
      }
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setSearching(false);
    }
  };

  const getPartyColor = (party: string): string => {
    switch (party) {
      case 'DEM': return 'text-blue-600 bg-blue-50';
      case 'REP': return 'text-red-600 bg-red-50';
      case 'LIB': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-600 mx-auto"></div>
              <p className="mt-4 text-gray-600 text-lg">Loading Campaign Finance Data...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-green-600 via-emerald-600 to-green-800 bg-clip-text text-transparent mb-4">
            💰 Campaign Finance Dashboard
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Comprehensive analysis of congressional campaign funding, donors, and financial transparency
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Data sourced from Federal Election Commission (FEC) filings
          </p>
        </div>

        {/* Search Bar */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search for a candidate (e.g., 'Smith', 'John Doe')..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              <svg className="absolute right-3 top-3.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <button
              onClick={handleSearch}
              disabled={searching || !searchQuery.trim()}
              className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {searching ? 'Searching...' : 'Search'}
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-8">
          <div className="flex space-x-1 bg-white rounded-lg p-1 shadow-sm">
            {[
              { id: 'overview', label: 'Overview', icon: '📊' },
              { id: 'top-funded', label: 'Top Funded', icon: '💰' },
              { id: 'pac-influence', label: 'PAC Influence', icon: '🏢' },
              { id: 'grassroots', label: 'Grassroots', icon: '🌱' },
              { id: 'self-funded', label: 'Self-Funded', icon: '💼' },
              ...(searchResults.length > 0 ? [{ id: 'search', label: 'Search Results', icon: '🔍' }] : [])
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-green-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto">
          {/* Overview Tab */}
          {activeTab === 'overview' && overview && (
            <div className="space-y-8">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Candidates</h3>
                  <p className="text-3xl font-bold text-green-600">{overview.overview.totalCandidates.toLocaleString()}</p>
                  <p className="text-sm text-gray-600 mt-1">With FEC filings</p>
                </div>
                <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Funding</h3>
                  <p className="text-3xl font-bold text-blue-600">{overview.overview.totalFunding}</p>
                  <p className="text-sm text-gray-600 mt-1">Across all campaigns</p>
                </div>
                <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Average Funding</h3>
                  <p className="text-3xl font-bold text-purple-600">{overview.overview.averageFunding}</p>
                  <p className="text-sm text-gray-600 mt-1">Per candidate</p>
                </div>
              </div>

              {/* Party Breakdown */}
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Candidates by Party</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(overview.partyBreakdown).map(([party, count]) => (
                    <div key={party} className={`p-4 rounded-lg ${getPartyColor(party)}`}>
                      <div className="text-2xl font-bold">{count}</div>
                      <div className="text-sm font-medium">{party}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Top Funded Tab */}
          {activeTab === 'top-funded' && overview && (
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">Top Funded Candidates</h3>
              <div className="space-y-4">
                {overview.topFundedCandidates.map((candidate, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <span className="text-lg font-bold text-gray-500">#{index + 1}</span>
                        <div>
                          <h4 className="font-semibold text-gray-900">{candidate.name}</h4>
                          <p className="text-sm text-gray-600">
                            {candidate.party} • {candidate.state}-{candidate.district}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-green-600">{candidate.totalFunding}</div>
                      <div className="text-sm text-gray-500">Total raised</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PAC Influence Tab */}
          {activeTab === 'pac-influence' && donorAnalysis && (
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">Highest PAC Funding</h3>
              <div className="space-y-4">
                {donorAnalysis.highPacFunding.map((candidate, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <span className="text-lg font-bold text-gray-500">#{index + 1}</span>
                        <div>
                          <h4 className="font-semibold text-gray-900">{candidate.name}</h4>
                          <p className="text-sm text-gray-600">
                            {candidate.party} • {candidate.state}-{candidate.district}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-red-600">{candidate.pacContributions}</div>
                      <div className="text-sm text-gray-500">{candidate.pacPercentage} of total</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Grassroots Tab */}
          {activeTab === 'grassroots' && donorAnalysis && (
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">Highest Individual Contributions</h3>
              <div className="space-y-4">
                {donorAnalysis.grassroots.map((candidate, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <span className="text-lg font-bold text-gray-500">#{index + 1}</span>
                        <div>
                          <h4 className="font-semibold text-gray-900">{candidate.name}</h4>
                          <p className="text-sm text-gray-600">
                            {candidate.party} • {candidate.state}-{candidate.district}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-green-600">{candidate.individualContributions}</div>
                      <div className="text-sm text-gray-500">{candidate.individualPercentage} of total</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Self-Funded Tab */}
          {activeTab === 'self-funded' && donorAnalysis && (
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">Highest Self-Funded Campaigns</h3>
              <div className="space-y-4">
                {donorAnalysis.selfFunded.map((candidate, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <span className="text-lg font-bold text-gray-500">#{index + 1}</span>
                        <div>
                          <h4 className="font-semibold text-gray-900">{candidate.name}</h4>
                          <p className="text-sm text-gray-600">
                            {candidate.party} • {candidate.state}-{candidate.district}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-blue-600">{candidate.selfContributions}</div>
                      <div className="text-sm text-gray-500">{candidate.selfPercentage} of total</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search Results Tab */}
          {activeTab === 'search' && searchResults.length > 0 && (
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">
                Search Results for "{searchQuery}" ({searchResults.length} found)
              </h3>
              <div className="space-y-4">
                {searchResults.map((result, index) => (
                  <div key={index} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-gray-900">{result.candidateName}</h4>
                      <span className={`px-2 py-1 rounded text-sm ${getPartyColor(result.party)}`}>
                        {result.party}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Total Raised:</span>
                        <div className="font-semibold">${result.totalReceipts?.toLocaleString() || '0'}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Individual:</span>
                        <div className="font-semibold">${result.individualContributions?.toLocaleString() || '0'}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">PAC:</span>
                        <div className="font-semibold">${result.pacContributions?.toLocaleString() || '0'}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Location:</span>
                        <div className="font-semibold">{result.state}-{result.district}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Call to Action */}
        <div className="text-center mt-12">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-8 border border-green-100">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Explore Individual Members</h3>
            <p className="text-gray-600 mb-6">
              View detailed campaign finance analysis for specific congressional members
            </p>
            <Link
              href="/map"
              className="inline-flex items-center px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m-6 3l6-3" />
              </svg>
              Browse Congressional Map
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
