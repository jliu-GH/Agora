'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';

interface AnalyticsData {
  overview: {
    members: number;
    bills: number;
    committees: number;
  };
  memberComposition: Array<{
    chamber: string;
    party: string;
    _count: { id: number };
  }>;
  billDistribution: Array<{
    chamber: string;
    _count: { id: number };
  }>;
  committeeStructure: Array<{
    chamber: string;
    _count: { id: number };
  }>;
  lastUpdated: string;
}

interface BillStatusData {
  statusBreakdown: {
    introduced: number;
    committee: number;
    floor: number;
    passed: number;
    enrolled: number;
    enacted: number;
    failed: number;
    other: number;
  };
  totalBills: number;
  byChamber: {
    house: number;
    senate: number;
  };
}

interface MemberActivityData {
  stateRepresentation: Array<{
    state: string;
    _count: { id: number };
  }>;
  topStates: Array<{
    state: string;
    _count: { id: number };
  }>;
  partyComposition: Array<{
    party: string;
    _count: { id: number };
  }>;
  totalStates: number;
}

export default function CongressionalAnalytics() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [billStatusData, setBillStatusData] = useState<BillStatusData | null>(null);
  const [memberActivityData, setMemberActivityData] = useState<MemberActivityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      
      const [overviewResponse, billStatusResponse, memberActivityResponse] = await Promise.all([
        apiFetch('/api/congress-analytics?type=overview'),
        apiFetch('/api/congress-analytics?type=bills-by-status'),
        apiFetch('/api/congress-analytics?type=member-activity')
      ]);

      if (overviewResponse.ok) {
        const overviewData = await overviewResponse.json();
        setAnalyticsData(overviewData);
      }

      if (billStatusResponse.ok) {
        const billData = await billStatusResponse.json();
        setBillStatusData(billData);
      }

      if (memberActivityResponse.ok) {
        const memberActivityData = await memberActivityResponse.json();
        setMemberActivityData(memberActivityData);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
        <div className="container mx-auto px-4 py-16">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-gray-800 mx-auto"></div>
              <p className="mt-4 text-gray-600 text-lg">Loading Congressional Analytics...</p>
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
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-gray-900 via-black to-gray-800 bg-clip-text text-transparent mb-4">
            Congressional Intelligence Dashboard
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Real-time analytics and insights from the U.S. Congress powered by official government data
          </p>
          {analyticsData && (
            <p className="text-sm text-gray-500 mt-2">
              Last updated: {new Date(analyticsData.lastUpdated).toLocaleString()}
            </p>
          )}
        </div>

        {/* Overview Cards */}
        {analyticsData && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200 p-8">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center mr-4">
                  <span className="text-white font-bold text-lg">👥</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Congressional Members</h3>
              </div>
              <p className="text-4xl font-bold text-blue-600">{analyticsData.overview.members}</p>
              <p className="text-gray-600 mt-2">Active members across both chambers</p>
            </div>

            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200 p-8">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-700 rounded-xl flex items-center justify-center mr-4">
                  <span className="text-white font-bold text-lg">📋</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Active Legislation</h3>
              </div>
              <p className="text-4xl font-bold text-green-600">{analyticsData.overview.bills}</p>
              <p className="text-gray-600 mt-2">Bills and resolutions tracked</p>
            </div>

            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200 p-8">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl flex items-center justify-center mr-4">
                  <span className="text-white font-bold text-lg">🏢</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Committees</h3>
              </div>
              <p className="text-4xl font-bold text-purple-600">{analyticsData.overview.committees}</p>
              <p className="text-gray-600 mt-2">Congressional committees active</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200 overflow-hidden mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex">
              {[
                { id: 'overview', label: 'Composition', icon: '🏛️' },
                { id: 'bills', label: 'Legislation Status', icon: '📊' },
                { id: 'activity', label: 'Member Activity', icon: '⚡' },
                { id: 'committees', label: 'Committee Structure', icon: '🏢' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center px-6 py-4 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-gray-900 text-white border-b-2 border-gray-900'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-8">
            {/* Overview Tab */}
            {activeTab === 'overview' && analyticsData && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-6">Congressional Composition</h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* House Composition */}
                    <div className="bg-gradient-to-br from-blue-50 to-white rounded-xl p-6 border border-blue-200">
                      <h4 className="text-xl font-semibold text-blue-900 mb-4 flex items-center">
                        <span className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3 text-blue-700 font-bold text-sm">H</span>
                        House of Representatives
                      </h4>
                      <div className="space-y-3">
                        {analyticsData.memberComposition
                          .filter(item => item.chamber === 'house')
                          .map(item => (
                            <div key={item.party} className="flex justify-between items-center">
                              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                                item.party === 'D' ? 'bg-blue-100 text-blue-900' :
                                item.party === 'R' ? 'bg-red-100 text-red-900' :
                                'bg-gray-100 text-gray-900'
                              }`}>
                                {item.party === 'D' ? 'Democrats' : item.party === 'R' ? 'Republicans' : item.party}
                              </span>
                              <span className="text-2xl font-bold text-gray-900">{item._count.id}</span>
                            </div>
                          ))}
                      </div>
                    </div>

                    {/* Senate Composition */}
                    <div className="bg-gradient-to-br from-red-50 to-white rounded-xl p-6 border border-red-200">
                      <h4 className="text-xl font-semibold text-red-900 mb-4 flex items-center">
                        <span className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mr-3 text-red-700 font-bold text-sm">S</span>
                        Senate
                      </h4>
                      <div className="space-y-3">
                        {analyticsData.memberComposition
                          .filter(item => item.chamber === 'senate')
                          .map(item => (
                            <div key={item.party} className="flex justify-between items-center">
                              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                                item.party === 'D' ? 'bg-blue-100 text-blue-900' :
                                item.party === 'R' ? 'bg-red-100 text-red-900' :
                                item.party === 'I' ? 'bg-green-100 text-green-900' :
                                'bg-gray-100 text-gray-900'
                              }`}>
                                {item.party === 'D' ? 'Democrats' : 
                                 item.party === 'R' ? 'Republicans' : 
                                 item.party === 'I' ? 'Independents' : item.party}
                              </span>
                              <span className="text-2xl font-bold text-gray-900">{item._count.id}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Bills Tab */}
            {activeTab === 'bills' && billStatusData && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-6">Legislative Status Breakdown</h3>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    {Object.entries(billStatusData.statusBreakdown).map(([status, count]) => (
                      <div key={status} className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-4 border border-gray-200">
                        <h5 className="text-sm font-semibold text-gray-600 capitalize mb-2">{status}</h5>
                        <p className="text-2xl font-bold text-gray-900">{count}</p>
                      </div>
                    ))}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gradient-to-br from-blue-50 to-white rounded-xl p-6 border border-blue-200">
                      <h4 className="text-lg font-semibold text-blue-900 mb-4">House Bills</h4>
                      <p className="text-3xl font-bold text-blue-600">{billStatusData.byChamber.house}</p>
                    </div>
                    <div className="bg-gradient-to-br from-red-50 to-white rounded-xl p-6 border border-red-200">
                      <h4 className="text-lg font-semibold text-red-900 mb-4">Senate Bills</h4>
                      <p className="text-3xl font-bold text-red-600">{billStatusData.byChamber.senate}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Activity Tab */}
            {activeTab === 'activity' && memberActivityData && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-6">Member Activity Analysis</h3>
                  
                  {/* Party Composition Overview */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {memberActivityData.partyComposition.map((party) => {
                      const getPartyInfo = (partyCode: string) => {
                        switch(partyCode) {
                          case 'D': return { name: 'Democratic', color: 'blue', bgColor: 'from-blue-50 to-blue-100', textColor: 'text-blue-900', numberColor: 'text-blue-600' };
                          case 'R': return { name: 'Republican', color: 'red', bgColor: 'from-red-50 to-red-100', textColor: 'text-red-900', numberColor: 'text-red-600' };
                          case 'I': return { name: 'Independent', color: 'purple', bgColor: 'from-purple-50 to-purple-100', textColor: 'text-purple-900', numberColor: 'text-purple-600' };
                          default: return { name: party.party, color: 'gray', bgColor: 'from-gray-50 to-gray-100', textColor: 'text-gray-900', numberColor: 'text-gray-600' };
                        }
                      };
                      const partyInfo = getPartyInfo(party.party);
                      
                      return (
                        <div key={party.party} className={`bg-gradient-to-br ${partyInfo.bgColor} rounded-xl p-6 border border-${partyInfo.color}-200`}>
                          <h4 className={`text-lg font-semibold ${partyInfo.textColor} mb-2`}>{partyInfo.name}</h4>
                          <p className={`text-3xl font-bold ${partyInfo.numberColor}`}>{party._count.id}</p>
                          <p className="text-sm text-gray-600 mt-1">Members</p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Top States by Representation */}
                  <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
                    <h4 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                      <svg className="w-6 h-6 mr-3 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      Top States by Representation
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {memberActivityData.topStates.map((state, index) => (
                        <div key={state.state} className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-200">
                          <div className="flex items-center space-x-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                              index < 3 ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white' : 'bg-gray-200 text-gray-700'
                            }`}>
                              {index + 1}
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900">{state.state}</div>
                              <div className="text-sm text-gray-600">
                                {state._count.id} member{state._count.id !== 1 ? 's' : ''}
                              </div>
                            </div>
                          </div>
                          <div className="text-2xl font-bold text-indigo-600">
                            {state._count.id}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* State Representation Summary */}
                  <div className="bg-white rounded-xl shadow-lg p-6">
                    <h4 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                      <svg className="w-6 h-6 mr-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      National Representation Overview
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-4 bg-gradient-to-br from-green-50 to-white rounded-lg border border-green-200">
                        <div className="text-3xl font-bold text-green-600">{memberActivityData.totalStates}</div>
                        <div className="text-sm font-medium text-gray-700">Total States/Territories</div>
                      </div>
                      <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-white rounded-lg border border-blue-200">
                        <div className="text-3xl font-bold text-blue-600">
                          {Math.round(memberActivityData.stateRepresentation.reduce((sum, state) => sum + state._count.id, 0) / memberActivityData.totalStates)}
                        </div>
                        <div className="text-sm font-medium text-gray-700">Avg Members/State</div>
                      </div>
                      <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-white rounded-lg border border-purple-200">
                        <div className="text-3xl font-bold text-purple-600">
                          {memberActivityData.topStates[0]?._count.id || 0}
                        </div>
                        <div className="text-sm font-medium text-gray-700">Largest Delegation</div>
                        <div className="text-xs text-gray-500">{memberActivityData.topStates[0]?.state}</div>
                      </div>
                      <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-white rounded-lg border border-orange-200">
                        <div className="text-3xl font-bold text-orange-600">
                          {memberActivityData.stateRepresentation[memberActivityData.stateRepresentation.length - 1]?._count.id || 0}
                        </div>
                        <div className="text-sm font-medium text-gray-700">Smallest Delegation</div>
                        <div className="text-xs text-gray-500">
                          {memberActivityData.stateRepresentation
                            .filter(s => s._count.id === Math.min(...memberActivityData.stateRepresentation.map(st => st._count.id)))
                            .map(s => s.state)
                            .slice(0, 2)
                            .join(', ')}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Committees Tab */}
            {activeTab === 'committees' && analyticsData && (
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-6">Committee Structure</h3>
                
                {/* Committee Overview */}
                <div className="bg-gradient-to-br from-blue-50 to-white rounded-xl p-6 border border-blue-200 mb-8">
                  <h4 className="text-lg font-semibold text-blue-900 mb-3">119th Congress Committee Overview</h4>
                  <p className="text-gray-700 mb-4">
                    The U.S. Congress operates through a structured committee system with <strong>45 active committees</strong> 
                    that handle the detailed work of legislation, oversight, and investigation.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="bg-white rounded-lg p-4 border border-blue-100">
                      <div className="font-semibold text-blue-800">Standing Committees</div>
                      <div className="text-gray-600">Permanent committees that handle ongoing legislative business</div>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-blue-100">
                      <div className="font-semibold text-blue-800">Joint Committees</div>
                      <div className="text-gray-600">Bipartisan committees with members from both chambers</div>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-blue-100">
                      <div className="font-semibold text-blue-800">Subcommittees</div>
                      <div className="text-gray-600">Specialized groups within standing committees (not counted above)</div>
                    </div>
                  </div>
                </div>

                {/* Committee Counts */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  {analyticsData.committeeStructure
                    .filter(item => item.chamber !== 'all')
                    .map(item => (
                    <div key={item.chamber} className="bg-gradient-to-br from-purple-50 to-white rounded-xl p-6 border border-purple-200">
                      <h4 className="text-lg font-semibold text-purple-900 mb-2 capitalize">
                        {item.chamber === 'joint' ? 'Joint' : `${item.chamber} Standing`} Committees
                      </h4>
                      <p className="text-3xl font-bold text-purple-600">{item._count.id}</p>
                      <p className="text-sm text-gray-600 mt-2">
                        {item.chamber === 'house' && 'Oversight of House legislation'}
                        {item.chamber === 'senate' && 'Oversight of Senate legislation'}
                        {item.chamber === 'joint' && 'Bipartisan oversight & investigation'}
                      </p>
                    </div>
                  ))}
                  
                  {/* Total */}
                  <div className="bg-gradient-to-br from-gray-800 to-black rounded-xl p-6 text-white">
                    <h4 className="text-lg font-semibold mb-2">Total Active</h4>
                    <p className="text-3xl font-bold">{analyticsData.overview.committees}</p>
                    <p className="text-sm text-gray-300 mt-2">All standing & joint committees</p>
                  </div>
                </div>

                <div className="mt-6 text-xs text-gray-500 text-center">
                  Committee counts reflect active standing and joint committees for the 119th Congress (2025-2026) • 
                  Source: Congress.gov
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="text-center">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
            <button
              onClick={() => window.location.href = '/map'}
              className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-gray-800 to-black text-white font-semibold rounded-xl hover:from-gray-900 hover:to-gray-800 transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              🗺️ Interactive Map
            </button>
            <button
              onClick={() => window.location.href = '/bills'}
              className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-gray-800 to-black text-white font-semibold rounded-xl hover:from-gray-900 hover:to-gray-800 transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              📋 Browse Legislation
            </button>
            <button
              onClick={fetchAnalyticsData}
              className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-gray-800 to-black text-white font-semibold rounded-xl hover:from-gray-900 hover:to-gray-800 transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              🔄 Refresh Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
