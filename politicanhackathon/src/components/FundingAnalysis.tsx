'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';

interface FundingSource {
  amount: number;
  percentage: number;
  label: string;
  description: string;
}

interface FundingData {
  summary: {
    totalRaised: number;
    totalSpent: number;
    cashOnHand: number;
    debt: number;
    netPosition: number;
    coveragePeriod: string;
  };
  fundingSources: {
    individual: FundingSource;
    pac: FundingSource;
    party: FundingSource;
    candidate: FundingSource;
    other: FundingSource;
  };
  influenceAnalysis: {
    corporateInfluence: 'High' | 'Medium' | 'Low';
    grassrootsSupport: 'High' | 'Medium' | 'Low';
    selfFunded: boolean;
    partySupported: boolean;
    primaryFundingSource: string;
  };
  financialHealth: {
    efficiency: number;
    burnRate: number;
    debtRatio: number;
    status: string;
  };
  historicalData: Array<{
    cycle: number;
    totalRaised: number;
    totalSpent: number;
    cashOnHand: number;
  }>;
}

interface FundingAnalysisProps {
  memberId: string;
  memberName: string;
}

export default function FundingAnalysis({ memberId, memberName }: FundingAnalysisProps) {
  const [fundingData, setFundingData] = useState<FundingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchFundingData();
  }, [memberId]);

  const fetchFundingData = async () => {
    try {
      setLoading(true);
      const response = await apiFetch(`/api/members/${memberId}/funding`);
      const data = await response.json();
      
      if (response.ok && data.funding) {
        setFundingData(data.funding);
        setError(null);
      } else {
        setError(data.message || data.error || 'No funding data available');
        setFundingData(null);
      }
    } catch (err) {
      setError('Failed to fetch funding data');
      setFundingData(null);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatPercentage = (percentage: number): string => {
    return `${percentage.toFixed(1)}%`;
  };

  const getInfluenceColor = (level: 'High' | 'Medium' | 'Low'): string => {
    switch (level) {
      case 'High': return 'text-red-600 bg-red-50 border-red-200';
      case 'Medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'Low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getFinancialHealthColor = (status: string): string => {
    if (status.includes('Well Funded')) return 'text-green-600 bg-green-50';
    if (status.includes('Adequate')) return 'text-blue-600 bg-blue-50';
    if (status.includes('Concerning')) return 'text-red-600 bg-red-50';
    return 'text-yellow-600 bg-yellow-50';
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl shadow-lg p-8">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          <span className="ml-3 text-green-700">Loading funding data...</span>
        </div>
      </div>
    );
  }

  if (error || !fundingData) {
    return (
      <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl shadow-lg p-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-4 flex items-center">
          <svg className="w-8 h-8 mr-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
          </svg>
          Campaign Finance Data
        </h2>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-center">
            <svg className="w-6 h-6 text-yellow-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="text-yellow-800 font-semibold">Data Not Available</h3>
              <p className="text-yellow-700 text-sm mt-1">
                Campaign finance records for {memberName} are not currently available in our database.
                This may be due to recent election cycles or data processing delays.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl shadow-lg p-8 mb-8">
      <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
        <svg className="w-8 h-8 mr-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
        </svg>
        Campaign Finance Analysis
        <span className="ml-3 text-sm font-normal text-gray-600">(FEC Data)</span>
      </h2>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 bg-white rounded-lg p-1 shadow-sm">
        {[
          { id: 'overview', label: 'Overview', icon: '📊' },
          { id: 'sources', label: 'Funding Sources', icon: '💰' },
          { id: 'influence', label: 'Influence Analysis', icon: '🏛️' },
          { id: 'health', label: 'Financial Health', icon: '📈' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center py-3 px-4 rounded-md text-sm font-medium transition-colors ${
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

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg p-6 text-center shadow-md border border-green-100">
              <div className="text-3xl font-bold text-green-600 mb-2">
                {formatCurrency(fundingData.summary.totalRaised)}
              </div>
              <div className="text-sm font-medium text-gray-700">Total Raised</div>
              <div className="text-xs text-gray-500 mt-1">
                {fundingData.summary.adjustedAmount ? 'Adjusted for transfers' : 'Campaign receipts'}
              </div>
            </div>
            <div className="bg-white rounded-lg p-6 text-center shadow-md border border-blue-100">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {formatCurrency(fundingData.summary.totalSpent)}
              </div>
              <div className="text-sm font-medium text-gray-700">Total Spent</div>
              <div className="text-xs text-gray-500 mt-1">
                {fundingData.summary.adjustedSpent ? 'Adjusted for transfers' : 'Campaign expenditures'}
              </div>
            </div>
            <div className="bg-white rounded-lg p-6 text-center shadow-md border border-emerald-100">
              <div className="text-3xl font-bold text-emerald-600 mb-2">
                {formatCurrency(fundingData.summary.cashOnHand)}
              </div>
              <div className="text-sm font-medium text-gray-700">Cash on Hand</div>
              <div className="text-xs text-gray-500 mt-1">Available funds</div>
            </div>
            <div className="bg-white rounded-lg p-6 text-center shadow-md border border-purple-100">
              <div className="text-3xl font-bold text-purple-600 mb-2">
                {formatCurrency(Math.abs(fundingData.summary.netPosition))}
              </div>
              <div className="text-sm font-medium text-gray-700">Net Position</div>
              <div className="text-xs text-gray-500 mt-1">
                {fundingData.summary.netPosition >= 0 ? 'Surplus' : 'Deficit'}
              </div>
            </div>
          </div>

          {/* Transfer Activity Warning */}
          {fundingData.summary.hasTransferIssue && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-yellow-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div>
                  <h4 className="text-yellow-800 font-semibold">Transfer Activity Detected</h4>
                  <p className="text-yellow-700 text-sm mt-1">
                    This candidate has transfers between authorized committees. Numbers shown are adjusted to avoid double-counting as per FEC guidelines.
                  </p>
                  <div className="text-xs text-yellow-600 mt-2">
                    Transfers In: {formatCurrency(fundingData.summary.transfersIn || 0)} • 
                    Transfers Out: {formatCurrency(fundingData.summary.transfersOut || 0)}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg p-6 shadow-md border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Primary Funding Source</h3>
            <div className="text-2xl font-bold text-green-600 capitalize">
              {fundingData.influenceAnalysis.primaryFundingSource.replace('_', ' ')} Contributions
            </div>
            <p className="text-gray-600 mt-2">
              Data covers period ending: {new Date(fundingData.summary.coveragePeriod).toLocaleDateString()}
            </p>
          </div>
        </div>
      )}

      {/* Funding Sources Tab */}
      {activeTab === 'sources' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(fundingData.fundingSources).map(([key, source]) => (
              <div key={key} className="bg-white rounded-lg p-6 shadow-md border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900">{source.label}</h3>
                  <span className="text-2xl font-bold text-green-600">
                    {formatPercentage(source.percentage)}
                  </span>
                </div>
                <div className="text-3xl font-bold text-gray-800 mb-2">
                  {formatCurrency(source.amount)}
                </div>
                <p className="text-sm text-gray-600">{source.description}</p>
                <div className="mt-3 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(source.percentage, 100)}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Influence Analysis Tab */}
      {activeTab === 'influence' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg p-6 shadow-md border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Influence Indicators</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Corporate Influence</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getInfluenceColor(fundingData.influenceAnalysis.corporateInfluence)}`}>
                    {fundingData.influenceAnalysis.corporateInfluence}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Grassroots Support</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getInfluenceColor(fundingData.influenceAnalysis.grassrootsSupport)}`}>
                    {fundingData.influenceAnalysis.grassrootsSupport}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-md border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Funding Characteristics</h3>
              <div className="space-y-3">
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-3 ${fundingData.influenceAnalysis.selfFunded ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
                  <span className="text-gray-700">Self-Funded Campaign</span>
                </div>
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-3 ${fundingData.influenceAnalysis.partySupported ? 'bg-purple-500' : 'bg-gray-300'}`}></div>
                  <span className="text-gray-700">Party-Supported</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Financial Health Tab */}
      {activeTab === 'health' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg p-6 shadow-md border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Campaign Efficiency</h3>
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {formatPercentage(fundingData.financialHealth.efficiency)}
              </div>
              <p className="text-sm text-gray-600">Cash retention rate</p>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-md border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Burn Rate</h3>
              <div className="text-3xl font-bold text-orange-600 mb-2">
                {formatPercentage(fundingData.financialHealth.burnRate * 100)}
              </div>
              <p className="text-sm text-gray-600">Spending vs fundraising</p>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-md border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Financial Status</h3>
              <div className={`px-4 py-2 rounded-lg text-center font-semibold ${getFinancialHealthColor(fundingData.financialHealth.status)}`}>
                {fundingData.financialHealth.status}
              </div>
            </div>
          </div>

          {fundingData.historicalData.length > 0 && (
            <div className="bg-white rounded-lg p-6 shadow-md border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Historical Performance</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {fundingData.historicalData.map((cycle, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="text-lg font-semibold text-gray-800 mb-2">Cycle {cycle.cycle}</div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Raised:</span>
                        <span className="font-medium">{formatCurrency(cycle.totalRaised)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Spent:</span>
                        <span className="font-medium">{formatCurrency(cycle.totalSpent)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Remaining:</span>
                        <span className="font-medium">{formatCurrency(cycle.cashOnHand)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-6 text-xs text-gray-500 text-center">
        Data sourced from Federal Election Commission (FEC) filings • Campaign finance laws require disclosure of contributions above $200
      </div>
    </div>
  );
}
