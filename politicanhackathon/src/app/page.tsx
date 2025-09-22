'use client';

import Link from "next/link";
import { InteractiveUSMap } from "@/components/InteractiveUSMap";
import { apiFetch } from "@/lib/api";
import { useState, useEffect } from "react";

interface Member {
  id: string;
  firstName: string;
  lastName: string;
  chamber: string;
  state: string;
  district?: string;
  party: string;
  committees: Array<{ Committee: { name: string } }>;
}

interface StateData {
  state: string;
  name: string;
  representatives: Member[];
  senators: Member[];
}

const stateNames: Record<string, string> = {
  'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas', 'CA': 'California',
  'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware', 'FL': 'Florida', 'GA': 'Georgia',
  'HI': 'Hawaii', 'ID': 'Idaho', 'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa',
  'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
  'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi', 'MO': 'Missouri',
  'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada', 'NH': 'New Hampshire', 'NJ': 'New Jersey',
  'NM': 'New Mexico', 'NY': 'New York', 'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio',
  'OK': 'Oklahoma', 'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
  'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah', 'VT': 'Vermont',
  'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia', 'WI': 'Wisconsin', 'WY': 'Wyoming'
};

export default function Home() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedState, setSelectedState] = useState<string | null>(null);

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const response = await apiFetch('/api/members');
      const data = await response.json();
      setMembers(data.members || []);
    } catch (error) {
      console.error('Error fetching members:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStateData = (stateCode: string): StateData => {
    const stateMembers = members.filter(member => member.state === stateCode);
    const representatives = stateMembers.filter(member => member.chamber === 'house');
    const senators = stateMembers.filter(member => member.chamber === 'senate');

    return {
      state: stateCode,
      name: stateNames[stateCode] || stateCode,
      representatives,
      senators,
    };
  };

  const handleStateClick = (stateCode: string) => {
    setSelectedState(selectedState === stateCode ? null : stateCode);
  };

  const selectedStateData = selectedState ? getStateData(selectedState) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* Educational Purposes Banner */}
      <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border-b border-yellow-200">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-center text-center">
            <div className="flex items-center space-x-3">
              <p className="text-yellow-900 font-medium">
                Educational Resource
              </p>
              <span className="text-yellow-700">•</span>
              <p className="text-yellow-800 text-sm">
                This platform is designed for educational and informational purposes to promote political literacy and civic engagement.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-gray-900/3 to-black/5"></div>
        <div className="container mx-auto px-4 py-16 relative">
          <div className="text-center mb-16">
            <h1 className="text-6xl md:text-7xl font-bold bg-gradient-to-r from-gray-900 via-black to-gray-800 bg-clip-text text-transparent mb-6 tracking-tight">
              AGORA
            </h1>
            <p className="text-2xl md:text-3xl text-gray-700 mb-4 font-light tracking-wide">
              Congressional Intelligence Platform
            </p>
            <p className="text-lg text-gray-600 mb-12 max-w-2xl mx-auto leading-relaxed">
              Evidence-based insights for informed citizenship. Navigate the political landscape with confidence through comprehensive data and nonpartisan analysis.
            </p>
          </div>

          {/* Interactive Congressional Map Section */}
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 mb-20">
            <div className="p-8 md:p-12">
        <div className="text-center mb-12">
                <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 tracking-tight">
                  Interactive Congressional Map
                </h2>
                <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
                  Explore the United States Congress through our comprehensive interactive map. Click any state to discover its congressional delegation, party composition, and legislative representation.
                </p>
              </div>
              
              <div className="relative">
                {loading ? (
                  <div className="flex items-center justify-center h-96 bg-gray-50 rounded-2xl">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-gray-800 mx-auto"></div>
                      <p className="mt-4 text-gray-600 text-lg">Loading congressional data...</p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-2xl p-8 shadow-inner">
                    <InteractiveUSMap
                      selectedState={selectedState || undefined}
                      onStateClick={handleStateClick}
                      showTooltip={true}
                      colorScheme="political"
                    />
                  </div>
                )}
              </div>

              {/* Selected State Information */}
              {selectedStateData && (
                <div className="mt-12 bg-gradient-to-r from-gray-50 via-white to-gray-100 rounded-2xl border border-gray-200 overflow-hidden">
                  <div className="p-8">
                    <div className="text-center mb-8">
                      <h3 className="text-3xl font-bold text-gray-900 mb-2">
                        {selectedStateData.name} Congressional Delegation
                      </h3>
                      <p className="text-lg text-gray-600">
                        Complete representation overview with {selectedStateData.senators.length} senators and {selectedStateData.representatives.length} representatives
                      </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                      {/* Senators */}
                      <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-gray-200">
                        <h4 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                          <span className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center mr-3 text-gray-700 font-bold text-sm">S</span>
                          US Senators ({selectedStateData.senators.length})
                        </h4>
                        <div className="space-y-3">
                          {selectedStateData.senators.map((senator) => (
                            <div key={senator.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:border-gray-400 transition-colors">
                              <div>
                                <Link
                                  href={`/member/${senator.id}`}
                                  className="font-semibold text-lg hover:underline text-gray-900"
                                >
                                  {senator.firstName} {senator.lastName}
                                </Link>
                              </div>
                              <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                                senator.party === 'D' ? 'bg-blue-100 text-blue-900' :
                                senator.party === 'R' ? 'bg-red-100 text-red-900' :
                                'bg-gray-100 text-gray-900'
                              }`}>
                                {senator.party}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Representatives */}
                      <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-gray-200">
                        <h4 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                          <span className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center mr-3 text-gray-700 font-bold text-sm">H</span>
                          House Representatives ({selectedStateData.representatives.length})
                        </h4>
                        <div className="space-y-3 max-h-64 overflow-y-auto">
                          {selectedStateData.representatives.map((rep) => (
                            <div key={rep.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:border-gray-400 transition-colors">
                              <div>
                                <Link
                                  href={`/member/${rep.id}`}
                                  className="font-semibold hover:underline text-gray-900"
                                >
                                  {rep.firstName} {rep.lastName}
                                </Link>
                                <div className="text-sm text-gray-600">District {rep.district}</div>
                              </div>
                              <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                                rep.party === 'D' ? 'bg-blue-100 text-blue-900' :
                                rep.party === 'R' ? 'bg-red-100 text-red-900' :
                                'bg-gray-100 text-gray-900'
                              }`}>
                                {rep.party}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* State Summary & Action */}
                    <div className="text-center">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4 border border-gray-200">
                          <div className="text-2xl font-bold text-gray-900">
                            {selectedStateData.senators.length + selectedStateData.representatives.length}
                          </div>
                          <div className="text-sm text-gray-600">Total Members</div>
                        </div>
                        <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4 border border-gray-200">
                          <div className="text-2xl font-bold text-blue-600">
                            {[...selectedStateData.senators, ...selectedStateData.representatives].filter(m => m.party === 'D').length}
                          </div>
                          <div className="text-sm text-gray-600">Democrats</div>
                        </div>
                        <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4 border border-gray-200">
                          <div className="text-2xl font-bold text-red-600">
                            {[...selectedStateData.senators, ...selectedStateData.representatives].filter(m => m.party === 'R').length}
                          </div>
                          <div className="text-sm text-gray-600">Republicans</div>
                        </div>
                        <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4 border border-gray-200">
                          <div className="text-2xl font-bold text-gray-600">
                            {[...selectedStateData.senators, ...selectedStateData.representatives].filter(m => m.party === 'I').length}
                          </div>
                          <div className="text-sm text-gray-600">Independents</div>
                        </div>
                      </div>
                      <Link
                        href={`/map?state=${selectedState}`}
                        className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-gray-800 to-black text-white font-semibold rounded-xl hover:from-gray-900 hover:to-gray-800 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                      >
                        Explore {selectedStateData.name} in Detail
                        <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 pb-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 tracking-tight">
            Comprehensive Political Intelligence
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Access real-time congressional data, legislative tracking, and AI-powered political analysis through our integrated platform
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
          <div className="group bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-500 border border-gray-200 overflow-hidden">
            <div className="p-8">
            <div className="flex items-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-gray-600 to-gray-800 rounded-2xl flex items-center justify-center mr-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <span className="text-2xl">🗺️</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900">
                  Congressional Map
                </h3>
              </div>
              <p className="text-gray-600 mb-8 leading-relaxed">
                Explore all 535 members of Congress with interactive state-by-state analysis. View party compositions, committee assignments, and voting patterns.
            </p>
            <Link
              href="/map"
                className="inline-flex items-center justify-center w-full px-6 py-3 bg-gradient-to-r from-gray-800 to-black text-white font-semibold rounded-xl hover:from-gray-900 hover:to-gray-800 transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
                Explore Full Map
              <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            </div>
          </div>

          <div className="group bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-500 border border-gray-200 overflow-hidden">
            <div className="p-8">
            <div className="flex items-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-green-600 to-emerald-800 rounded-2xl flex items-center justify-center mr-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                  <span className="text-2xl">💰</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900">
                  Campaign Finance
                </h3>
              </div>
              <p className="text-gray-600 mb-8 leading-relaxed">
                Explore campaign funding sources, donor analysis, and financial transparency. See who funds congressional campaigns and track PAC contributions.
            </p>
            <Link
                href="/funding"
                className="inline-flex items-center justify-center w-full px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-700 text-white font-semibold rounded-xl hover:from-green-700 hover:to-emerald-800 transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
                Explore Funding Data
              <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            </div>
          </div>

          <div className="group bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-500 border border-gray-200 overflow-hidden">
            <div className="p-8">
            <div className="flex items-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-gray-600 to-gray-800 rounded-2xl flex items-center justify-center mr-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                  <span className="text-2xl">📋</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900">
                  Legislative Tracker
                </h3>
              </div>
              <p className="text-gray-600 mb-8 leading-relaxed">
                Monitor legislation through Congress with real-time updates, comprehensive timelines, sponsor details, and voting records.
            </p>
            <Link
                href="/bills"
                className="inline-flex items-center justify-center w-full px-6 py-3 bg-gradient-to-r from-gray-800 to-black text-white font-semibold rounded-xl hover:from-gray-900 hover:to-gray-800 transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
                Track Legislation
              <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>

        </div>

        {/* Mission & Principles Section */}
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-gray-200 overflow-hidden">
          <div className="p-12 md:p-16">
            <div className="text-center mb-16">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-gray-700 to-black rounded-2xl mb-8 shadow-xl">
              <span className="text-3xl">🎯</span>
            </div>
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-8 tracking-tight">
                Our Mission & Principles
            </h2>
              <p className="text-xl text-gray-700 mb-12 max-w-4xl mx-auto leading-relaxed">
                AGORA provides grounded, citation-rich analysis of U.S. policies, legislation, and political dynamics. Our commitment to evidence-based information promotes informed citizenship through transparent, nonpartisan intelligence.
              </p>
          </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="group bg-gradient-to-br from-gray-50 to-white rounded-2xl p-8 border border-gray-200 hover:shadow-lg transition-all duration-300">
                <div className="flex items-start space-x-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-gray-600 to-gray-800 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <span className="text-white font-bold text-lg">1</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">Evidence-Based Foundation</h3>
                    <p className="text-gray-700 leading-relaxed">Every assertion is backed by retrievable, timestamped sources. No claim exists without verifiable documentation from official government records and authenticated data.</p>
                  </div>
                </div>
              </div>

              <div className="group bg-gradient-to-br from-gray-50 to-white rounded-2xl p-8 border border-gray-200 hover:shadow-lg transition-all duration-300">
                <div className="flex items-start space-x-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-gray-600 to-gray-800 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <span className="text-white font-bold text-lg">2</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">Nonpartisan Analysis</h3>
                    <p className="text-gray-700 leading-relaxed">Maintaining strict neutrality in tone and presentation. No persuasion, endorsements, or voting recommendations—only factual reporting and data-driven insights.</p>
                  </div>
                </div>
              </div>

              <div className="group bg-gradient-to-br from-gray-50 to-white rounded-2xl p-8 border border-gray-200 hover:shadow-lg transition-all duration-300">
                <div className="flex items-start space-x-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-gray-600 to-gray-800 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <span className="text-white font-bold text-lg">3</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">Transparency & Timeliness</h3>
                    <p className="text-gray-700 leading-relaxed">All information includes publication dates and data freshness indicators. Time-sensitive metrics clearly show when information was last verified and updated.</p>
                  </div>
                </div>
              </div>

              <div className="group bg-gradient-to-br from-gray-50 to-white rounded-2xl p-8 border border-gray-200 hover:shadow-lg transition-all duration-300">
                <div className="flex items-start space-x-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-gray-600 to-gray-800 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <span className="text-white font-bold text-lg">4</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">Intellectual Honesty</h3>
                    <p className="text-gray-700 leading-relaxed">When credible sources present conflicting information, we display all perspectives clearly labeled as "contested" rather than favoring any single narrative.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-16 text-center">
              <div className="bg-gradient-to-r from-gray-50 to-white rounded-2xl p-8 border border-gray-200">
                <p className="text-lg text-gray-700 font-medium mb-4">
                  "Democracy flourishes when citizens have access to accurate, unbiased information."
                </p>
                <p className="text-gray-600">
                  Join thousands of Americans using AGORA to stay informed about their government and representatives.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
