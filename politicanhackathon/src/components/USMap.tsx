'use client';

import { useState, useEffect } from 'react';

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

// Simplified US state coordinates for the map
const stateCoordinates: Record<string, { x: number; y: number; width: number; height: number }> = {
  'CA': { x: 50, y: 200, width: 80, height: 120 },
  'TX': { x: 200, y: 250, width: 100, height: 100 },
  'NY': { x: 400, y: 150, width: 60, height: 80 },
  'FL': { x: 450, y: 350, width: 80, height: 60 },
  'IL': { x: 300, y: 200, width: 60, height: 80 },
  'OH': { x: 350, y: 180, width: 50, height: 60 },
  'WA': { x: 50, y: 50, width: 80, height: 80 },
  'NV': { x: 100, y: 200, width: 60, height: 80 },
};

export default function USMap() {
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [hoveredState, setHoveredState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
    
    // Mock governor data
    const governors: Record<string, { name: string; party: string }> = {
      'CA': { name: 'Gavin Newsom', party: 'D' },
      'TX': { name: 'Greg Abbott', party: 'R' },
      'NY': { name: 'Kathy Hochul', party: 'D' },
      'FL': { name: 'Ron DeSantis', party: 'R' },
      'IL': { name: 'J.B. Pritzker', party: 'D' },
      'OH': { name: 'Mike DeWine', party: 'R' },
      'WA': { name: 'Jay Inslee', party: 'D' },
      'NV': { name: 'Joe Lombardo', party: 'R' },
    };

    return {
      state: stateCode,
      name: getStateName(stateCode),
      representatives,
      senators,
      governor: governors[stateCode],
    };
  };

  const getStateName = (stateCode: string): string => {
    const stateNames: Record<string, string> = {
      'CA': 'California',
      'TX': 'Texas',
      'NY': 'New York',
      'FL': 'Florida',
      'IL': 'Illinois',
      'OH': 'Ohio',
      'WA': 'Washington',
      'NV': 'Nevada',
    };
    return stateNames[stateCode] || stateCode;
  };

  const getStateColor = (stateCode: string): string => {
    const stateData = getStateData(stateCode);
    const totalMembers = stateData.representatives.length + stateData.senators.length;
    
    if (totalMembers === 0) return '#e5e7eb';
    if (selectedState === stateCode) return '#3b82f6';
    if (hoveredState === stateCode) return '#60a5fa';
    
    // Color based on party majority
    const democrats = stateData.representatives.filter(m => m.party === 'D').length + 
                     stateData.senators.filter(m => m.party === 'D').length;
    const republicans = stateData.representatives.filter(m => m.party === 'R').length + 
                       stateData.senators.filter(m => m.party === 'R').length;
    
    if (democrats > republicans) return '#dc2626';
    if (republicans > democrats) return '#dc2626';
    return '#6b7280';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading map data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Interactive Congressional Map</h2>
        <p className="text-gray-600">Click on a state to view its representatives and senators</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-md p-6">
            <svg viewBox="0 0 600 500" className="w-full h-auto">
              {/* Background */}
              <rect width="600" height="500" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1" />
              
              {/* State shapes */}
              {Object.entries(stateCoordinates).map(([stateCode, coords]) => (
                <g key={stateCode}>
                  <rect
                    x={coords.x}
                    y={coords.y}
                    width={coords.width}
                    height={coords.height}
                    fill={getStateColor(stateCode)}
                    stroke="#ffffff"
                    strokeWidth="2"
                    className="cursor-pointer transition-all duration-200 hover:opacity-80"
                    onClick={() => setSelectedState(selectedState === stateCode ? null : stateCode)}
                    onMouseEnter={() => setHoveredState(stateCode)}
                    onMouseLeave={() => setHoveredState(null)}
                  />
                  
                  {/* State label */}
                  <text
                    x={coords.x + coords.width / 2}
                    y={coords.y + coords.height / 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="text-white font-bold text-sm drop-shadow-lg pointer-events-none"
                  >
                    {stateCode}
                  </text>
                  
                  {/* State name */}
                  <text
                    x={coords.x + coords.width / 2}
                    y={coords.y + coords.height / 2 + 15}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="text-white font-medium text-xs drop-shadow-lg pointer-events-none"
                  >
                    {getStateName(stateCode)}
                  </text>
                </g>
              ))}
            </svg>
            
            {/* Legend */}
            <div className="mt-4 flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-600 rounded"></div>
                <span>Republican Majority</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-600 rounded"></div>
                <span>Democratic Majority</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gray-400 rounded"></div>
                <span>No Data</span>
              </div>
            </div>
          </div>
        </div>

        {/* State Info Panel */}
        <div className="lg:col-span-1">
          {selectedState ? (
            <StateInfoPanel stateData={getStateData(selectedState)} />
          ) : hoveredState ? (
            <StateInfoPanel stateData={getStateData(hoveredState)} />
          ) : (
            <div className="bg-gray-50 rounded-lg p-6 text-center">
              <div className="text-gray-500">
                <svg className="mx-auto h-12 w-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                <p className="text-lg font-medium">Select a State</p>
                <p className="text-sm">Click on a state to view its congressional delegation</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StateInfoPanel({ stateData }: { stateData: StateData }) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-xl font-bold text-gray-900 mb-4">{stateData.name}</h3>
      
      {/* Governor */}
      {stateData.governor && (
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Governor</h4>
          <div className="flex items-center gap-2">
            <span className="font-medium">{stateData.governor.name}</span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              stateData.governor.party === 'D' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
            }`}>
              {stateData.governor.party}
            </span>
          </div>
        </div>
      )}

      {/* Senators */}
      {stateData.senators.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Senators</h4>
          <div className="space-y-2">
            {stateData.senators.map((senator) => (
              <div key={senator.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div>
                  <span className="font-medium">{senator.firstName} {senator.lastName}</span>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  senator.party === 'D' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
                }`}>
                  {senator.party}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Representatives */}
      {stateData.representatives.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Representatives</h4>
          <div className="space-y-2">
            {stateData.representatives.map((rep) => (
              <div key={rep.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div>
                  <span className="font-medium">{rep.firstName} {rep.lastName}</span>
                  <span className="text-sm text-gray-500 ml-2">District {rep.district}</span>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  rep.party === 'D' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
                }`}>
                  {rep.party}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Committees */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Committee Assignments</h4>
        <div className="space-y-1">
          {Array.from(new Set(
            [...stateData.senators, ...stateData.representatives]
              .flatMap(member => member.committees.map(c => c.Committee.name))
          )).map((committee, index) => (
            <div key={index} className="text-sm text-gray-600 bg-gray-50 px-2 py-1 rounded">
              {committee}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
