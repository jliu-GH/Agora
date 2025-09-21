'use client';

import { useState, useEffect } from 'react';
import { InteractiveUSMap } from '@/components/InteractiveUSMap';
import Link from 'next/link';

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
  governor?: {
    name: string;
    party: string;
  };
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

export default function MapPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const response = await fetch('/api/members');
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading congressional map...</p>
        </div>
      </div>
    );
  }

  const selectedStateData = selectedState ? getStateData(selectedState) : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">US Congressional Map</h1>
          <p className="text-xl text-gray-600 mb-6">
            Explore congressional representation across the United States
          </p>
          
          {/* View Toggle */}
          <div className="flex space-x-4 mb-6">
            <button
              onClick={() => setViewMode('map')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'map'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              🗺️ Interactive Map
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              📋 List View
            </button>
          </div>
        </div>

        {viewMode === 'map' ? (
          <div className="space-y-8">
            {/* Interactive Map */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Interactive US Map</h2>
              <p className="text-gray-600 mb-6">Click on any state to view its congressional delegation</p>
              
              <InteractiveUSMap
                selectedState={selectedState || undefined}
                onStateClick={handleStateClick}
                showTooltip={true}
                colorScheme="political"
              />
            </div>

            {/* Selected State Details */}
            {selectedStateData && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {selectedStateData.name} Congressional Delegation
                  </h2>
                  <button
                    onClick={() => setSelectedState(null)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕ Close
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Senators */}
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">
                      US Senators ({selectedStateData.senators.length})
                    </h3>
                    <div className="space-y-3">
                      {selectedStateData.senators.map((senator) => (
                        <div key={senator.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                          <div>
                            <Link 
                              href={`/member/${senator.id}`}
                              className={`font-bold text-lg hover:underline ${
                                senator.party === 'D' ? 'text-blue-700' : senator.party === 'R' ? 'text-red-700' : 'text-purple-700'
                              }`}
                            >
                              {senator.firstName} {senator.lastName}
                            </Link>
                            <div className="text-sm text-gray-600">
                              {senator.committees.length > 0 && (
                                <span>Committees: {senator.committees.slice(0, 2).map(c => c.Committee.name).join(', ')}</span>
                              )}
                            </div>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                            senator.party === 'D' ? 'bg-blue-200 text-blue-900' : 
                            senator.party === 'R' ? 'bg-red-200 text-red-900' : 
                            'bg-purple-200 text-purple-900'
                          }`}>
                            {senator.party}
                          </span>
                        </div>
                      ))}
                      {selectedStateData.senators.length === 0 && (
                        <p className="text-gray-500">No senators found in database</p>
                      )}
                    </div>
                  </div>

                  {/* Representatives */}
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">
                      House Representatives ({selectedStateData.representatives.length})
                    </h3>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {selectedStateData.representatives.map((rep) => (
                        <div key={rep.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                          <div>
                            <Link 
                              href={`/member/${rep.id}`}
                              className={`font-bold text-lg hover:underline ${
                                rep.party === 'D' ? 'text-blue-700' : rep.party === 'R' ? 'text-red-700' : 'text-purple-700'
                              }`}
                            >
                              {rep.firstName} {rep.lastName}
                            </Link>
                            <div className="text-sm text-gray-600">
                              District {rep.district}
                              {rep.committees.length > 0 && (
                                <span> • {rep.committees.slice(0, 1).map(c => c.Committee.name).join(', ')}</span>
                              )}
                            </div>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                            rep.party === 'D' ? 'bg-blue-200 text-blue-900' : 
                            rep.party === 'R' ? 'bg-red-200 text-red-900' : 
                            'bg-purple-200 text-purple-900'
                          }`}>
                            {rep.party}
                          </span>
                        </div>
                      ))}
                      {selectedStateData.representatives.length === 0 && (
                        <p className="text-gray-500">No representatives found in database</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* State Summary */}
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">State Summary</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Total Members:</span>{' '}
                      {selectedStateData.senators.length + selectedStateData.representatives.length}
                    </div>
                    <div>
                      <span className="font-medium">Democrats:</span>{' '}
                      {[...selectedStateData.senators, ...selectedStateData.representatives].filter(m => m.party === 'D').length}
                    </div>
                    <div>
                      <span className="font-medium">Republicans:</span>{' '}
                      {[...selectedStateData.senators, ...selectedStateData.representatives].filter(m => m.party === 'R').length}
                    </div>
                    <div>
                      <span className="font-medium">Independents:</span>{' '}
                      {[...selectedStateData.senators, ...selectedStateData.representatives].filter(m => m.party === 'I').length}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Overall Statistics */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Congressional Statistics</h2>
              
              {/* Senate Statistics */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Senate (100 total)</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">
                      {members.filter(m => m.chamber === 'senate' && m.party === 'D').length}
                    </div>
                    <div className="text-sm text-gray-600">Democratic</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-red-600">
                      {members.filter(m => m.chamber === 'senate' && m.party === 'R').length}
                    </div>
                    <div className="text-sm text-gray-600">Republican</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-600">
                      {members.filter(m => m.chamber === 'senate' && m.party === 'I').length}
                    </div>
                    <div className="text-sm text-gray-600">Independent</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-gray-600">
                      {members.filter(m => m.chamber === 'senate' && m.party === 'U').length}
                    </div>
                    <div className="text-sm text-gray-600">Unknown</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-orange-600">
                      {Math.max(0, 100 - members.filter(m => m.chamber === 'senate').length)}
                    </div>
                    <div className="text-sm text-gray-600">Neither/Other</div>
                  </div>
                </div>
              </div>

              {/* House Statistics */}
              <div>
                <h3 className="text-xl font-semibold text-gray-800 mb-4">House of Representatives (435 total)</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">
                      {members.filter(m => m.chamber === 'house' && m.party === 'D').length}
                    </div>
                    <div className="text-sm text-gray-600">Democratic</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-red-600">
                      {members.filter(m => m.chamber === 'house' && m.party === 'R').length}
                    </div>
                    <div className="text-sm text-gray-600">Republican</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-600">
                      {members.filter(m => m.chamber === 'house' && m.party === 'I').length}
                    </div>
                    <div className="text-sm text-gray-600">Independent</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-gray-600">
                      {members.filter(m => m.chamber === 'house' && m.party === 'U').length}
                    </div>
                    <div className="text-sm text-gray-600">Unknown</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-orange-600">
                      {Math.max(0, 435 - members.filter(m => m.chamber === 'house').length)}
                    </div>
                    <div className="text-sm text-gray-600">Neither/Other</div>
                  </div>
                </div>
              </div>

              {/* Total Summary */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2">Total Congress Summary</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Total Members:</span>{' '}
                    {members.length} / 535
                  </div>
                  <div>
                    <span className="font-medium">Senate:</span>{' '}
                    {members.filter(m => m.chamber === 'senate').length} / 100
                  </div>
                  <div>
                    <span className="font-medium">House:</span>{' '}
                    {members.filter(m => m.chamber === 'house').length} / 435
                  </div>
                  <div>
                    <span className="font-medium">States Covered:</span>{' '}
                    {new Set(members.map(m => m.state)).size} / 50
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* List View - Existing StateMap Component */
          <div className="space-y-8">
            {/* You can import and use your existing StateMap component here */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <p className="text-gray-600">List view with all states and members (your existing StateMap component can be placed here)</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
