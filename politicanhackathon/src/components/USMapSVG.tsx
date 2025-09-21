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

// Simplified SVG paths for US states (these are simplified but recognizable shapes)
const statePaths: Record<string, string> = {
  'AL': 'M 400 350 L 420 340 L 440 360 L 430 380 L 410 370 Z',
  'AK': 'M 50 50 L 80 45 L 85 70 L 60 75 Z',
  'AZ': 'M 200 300 L 250 290 L 260 350 L 210 360 Z',
  'AR': 'M 350 320 L 380 310 L 390 350 L 360 360 Z',
  'CA': 'M 50 250 L 120 240 L 130 350 L 60 360 Z',
  'CO': 'M 250 280 L 290 270 L 300 320 L 260 330 Z',
  'CT': 'M 500 200 L 520 195 L 525 210 L 505 215 Z',
  'DE': 'M 520 250 L 540 245 L 545 260 L 525 265 Z',
  'FL': 'M 450 400 L 520 380 L 530 450 L 460 470 Z',
  'GA': 'M 420 350 L 450 340 L 460 380 L 430 390 Z',
  'HI': 'M 100 450 L 130 440 L 135 470 L 105 480 Z',
  'ID': 'M 150 200 L 200 190 L 210 250 L 160 260 Z',
  'IL': 'M 350 250 L 390 240 L 400 290 L 360 300 Z',
  'IN': 'M 380 260 L 410 250 L 420 290 L 390 300 Z',
  'IA': 'M 320 220 L 360 210 L 370 250 L 330 260 Z',
  'KS': 'M 280 280 L 320 270 L 330 310 L 290 320 Z',
  'KY': 'M 400 280 L 430 270 L 440 310 L 410 320 Z',
  'LA': 'M 350 380 L 390 370 L 400 410 L 360 420 Z',
  'ME': 'M 550 100 L 580 95 L 585 130 L 555 135 Z',
  'MD': 'M 500 250 L 530 245 L 535 270 L 505 275 Z',
  'MA': 'M 520 180 L 550 175 L 555 200 L 525 205 Z',
  'MI': 'M 400 200 L 430 190 L 440 230 L 410 240 Z',
  'MN': 'M 300 150 L 340 140 L 350 180 L 310 190 Z',
  'MS': 'M 350 350 L 380 340 L 390 380 L 360 390 Z',
  'MO': 'M 320 280 L 360 270 L 370 310 L 330 320 Z',
  'MT': 'M 200 150 L 250 140 L 260 190 L 210 200 Z',
  'NE': 'M 280 240 L 320 230 L 330 270 L 290 280 Z',
  'NV': 'M 120 250 L 160 240 L 170 290 L 130 300 Z',
  'NH': 'M 520 160 L 550 155 L 555 180 L 525 185 Z',
  'NJ': 'M 510 220 L 540 215 L 545 240 L 515 245 Z',
  'NM': 'M 200 320 L 250 310 L 260 360 L 210 370 Z',
  'NY': 'M 480 180 L 520 170 L 530 220 L 490 230 Z',
  'NC': 'M 450 300 L 480 290 L 490 330 L 460 340 Z',
  'ND': 'M 280 120 L 320 110 L 330 150 L 290 160 Z',
  'OH': 'M 400 240 L 430 230 L 440 270 L 410 280 Z',
  'OK': 'M 300 320 L 340 310 L 350 350 L 310 360 Z',
  'OR': 'M 80 200 L 130 190 L 140 240 L 90 250 Z',
  'PA': 'M 450 220 L 480 210 L 490 250 L 460 260 Z',
  'RI': 'M 530 200 L 550 195 L 555 210 L 535 215 Z',
  'SC': 'M 450 330 L 480 320 L 490 360 L 460 370 Z',
  'SD': 'M 280 180 L 320 170 L 330 210 L 290 220 Z',
  'TN': 'M 380 300 L 410 290 L 420 330 L 390 340 Z',
  'TX': 'M 250 350 L 320 340 L 330 400 L 260 410 Z',
  'UT': 'M 180 280 L 220 270 L 230 310 L 190 320 Z',
  'VT': 'M 500 160 L 530 155 L 535 180 L 505 185 Z',
  'VA': 'M 450 280 L 480 270 L 490 310 L 460 320 Z',
  'WA': 'M 80 150 L 130 140 L 140 190 L 90 200 Z',
  'WV': 'M 420 260 L 450 250 L 460 290 L 430 300 Z',
  'WI': 'M 350 180 L 390 170 L 400 210 L 360 220 Z',
  'WY': 'M 200 220 L 250 210 L 260 260 L 210 270 Z',
};

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

export default function USMapSVG() {
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
    
    // Mock governor data for all 50 states
    const governors: Record<string, { name: string; party: string }> = {
      'AL': { name: 'Kay Ivey', party: 'R' }, 'AK': { name: 'Mike Dunleavy', party: 'R' },
      'AZ': { name: 'Katie Hobbs', party: 'D' }, 'AR': { name: 'Sarah Huckabee Sanders', party: 'R' },
      'CA': { name: 'Gavin Newsom', party: 'D' }, 'CO': { name: 'Jared Polis', party: 'D' },
      'CT': { name: 'Ned Lamont', party: 'D' }, 'DE': { name: 'John Carney', party: 'D' },
      'FL': { name: 'Ron DeSantis', party: 'R' }, 'GA': { name: 'Brian Kemp', party: 'R' },
      'HI': { name: 'Josh Green', party: 'D' }, 'ID': { name: 'Brad Little', party: 'R' },
      'IL': { name: 'J.B. Pritzker', party: 'D' }, 'IN': { name: 'Eric Holcomb', party: 'R' },
      'IA': { name: 'Kim Reynolds', party: 'R' }, 'KS': { name: 'Laura Kelly', party: 'D' },
      'KY': { name: 'Andy Beshear', party: 'D' }, 'LA': { name: 'Jeff Landry', party: 'R' },
      'ME': { name: 'Janet Mills', party: 'D' }, 'MD': { name: 'Wes Moore', party: 'D' },
      'MA': { name: 'Maura Healey', party: 'D' }, 'MI': { name: 'Gretchen Whitmer', party: 'D' },
      'MN': { name: 'Tim Walz', party: 'D' }, 'MS': { name: 'Tate Reeves', party: 'R' },
      'MO': { name: 'Mike Parson', party: 'R' }, 'MT': { name: 'Greg Gianforte', party: 'R' },
      'NE': { name: 'Jim Pillen', party: 'R' }, 'NV': { name: 'Joe Lombardo', party: 'R' },
      'NH': { name: 'Chris Sununu', party: 'R' }, 'NJ': { name: 'Phil Murphy', party: 'D' },
      'NM': { name: 'Michelle Lujan Grisham', party: 'D' }, 'NY': { name: 'Kathy Hochul', party: 'D' },
      'NC': { name: 'Roy Cooper', party: 'D' }, 'ND': { name: 'Doug Burgum', party: 'R' },
      'OH': { name: 'Mike DeWine', party: 'R' }, 'OK': { name: 'Kevin Stitt', party: 'R' },
      'OR': { name: 'Tina Kotek', party: 'D' }, 'PA': { name: 'Josh Shapiro', party: 'D' },
      'RI': { name: 'Dan McKee', party: 'D' }, 'SC': { name: 'Henry McMaster', party: 'R' },
      'SD': { name: 'Kristi Noem', party: 'R' }, 'TN': { name: 'Bill Lee', party: 'R' },
      'TX': { name: 'Greg Abbott', party: 'R' }, 'UT': { name: 'Spencer Cox', party: 'R' },
      'VT': { name: 'Phil Scott', party: 'R' }, 'VA': { name: 'Glenn Youngkin', party: 'R' },
      'WA': { name: 'Jay Inslee', party: 'D' }, 'WV': { name: 'Jim Justice', party: 'R' },
      'WI': { name: 'Tony Evers', party: 'D' }, 'WY': { name: 'Mark Gordon', party: 'R' }
    };

    return {
      state: stateCode,
      name: stateNames[stateCode] || stateCode,
      representatives,
      senators,
      governor: governors[stateCode],
    };
  };

  const getStateColor = (stateCode: string): string => {
    const stateData = getStateData(stateCode);
    const totalMembers = stateData.representatives.length + stateData.senators.length;
    
    if (totalMembers === 0) return '#e5e7eb'; // Gray for no data
    if (selectedState === stateCode) return '#3b82f6'; // Blue for selected
    if (hoveredState === stateCode) return '#60a5fa'; // Light blue for hover
    
    // Color based on party majority
    const democrats = stateData.representatives.filter(m => m.party === 'D').length + 
                     stateData.senators.filter(m => m.party === 'D').length;
    const republicans = stateData.representatives.filter(m => m.party === 'R').length + 
                       stateData.senators.filter(m => m.party === 'R').length;
    
    if (democrats > republicans) return '#dc2626'; // Red for Republican majority
    if (republicans > democrats) return '#dc2626'; // Red for Republican majority
    return '#6b7280'; // Gray for tie
  };

  const getStateStrokeColor = (stateCode: string): string => {
    if (selectedState === stateCode) return '#1d4ed8';
    if (hoveredState === stateCode) return '#3b82f6';
    return '#ffffff';
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
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Interactive US Congressional Map</h2>
        <p className="text-gray-600">Click on any state to view its representatives, senators, and governor</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-md p-6">
            <svg viewBox="0 0 600 500" className="w-full h-auto">
              {/* Background */}
              <rect width="600" height="500" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1" />
              
              {/* State shapes */}
              {Object.entries(statePaths).map(([stateCode, path]) => (
                <g key={stateCode}>
                  <path
                    d={path}
                    fill={getStateColor(stateCode)}
                    stroke={getStateStrokeColor(stateCode)}
                    strokeWidth={selectedState === stateCode ? 3 : 1}
                    className="cursor-pointer transition-all duration-200 hover:opacity-80"
                    onClick={() => setSelectedState(selectedState === stateCode ? null : stateCode)}
                    onMouseEnter={() => setHoveredState(stateCode)}
                    onMouseLeave={() => setHoveredState(null)}
                  />
                  
                  {/* State label */}
                  <text
                    x={getStateCenter(stateCode).x}
                    y={getStateCenter(stateCode).y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="text-white font-bold text-xs drop-shadow-lg pointer-events-none"
                  >
                    {stateCode}
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

function getStateCenter(stateCode: string): { x: number; y: number } {
  // Approximate centers for state labels
  const centers: Record<string, { x: number; y: number }> = {
    'AL': { x: 420, y: 365 }, 'AK': { x: 67, y: 62 }, 'AZ': { x: 230, y: 325 },
    'AR': { x: 370, y: 335 }, 'CA': { x: 95, y: 305 }, 'CO': { x: 275, y: 295 },
    'CT': { x: 512, y: 202 }, 'DE': { x: 532, y: 255 }, 'FL': { x: 490, y: 425 },
    'GA': { x: 440, y: 365 }, 'HI': { x: 117, y: 455 }, 'ID': { x: 180, y: 225 },
    'IL': { x: 375, y: 270 }, 'IN': { x: 400, y: 275 }, 'IA': { x: 345, y: 235 },
    'KS': { x: 305, y: 295 }, 'KY': { x: 420, y: 295 }, 'LA': { x: 375, y: 395 },
    'ME': { x: 567, y: 112 }, 'MD': { x: 517, y: 257 }, 'MA': { x: 537, y: 187 },
    'MI': { x: 420, y: 215 }, 'MN': { x: 325, y: 165 }, 'MS': { x: 375, y: 365 },
    'MO': { x: 345, y: 295 }, 'MT': { x: 230, y: 170 }, 'NE': { x: 305, y: 255 },
    'NV': { x: 145, y: 270 }, 'NH': { x: 537, y: 167 }, 'NJ': { x: 527, y: 227 },
    'NM': { x: 230, y: 340 }, 'NY': { x: 505, y: 195 }, 'NC': { x: 470, y: 315 },
    'ND': { x: 305, y: 135 }, 'OH': { x: 420, y: 255 }, 'OK': { x: 325, y: 335 },
    'OR': { x: 110, y: 220 }, 'PA': { x: 470, y: 235 }, 'RI': { x: 542, y: 202 },
    'SC': { x: 470, y: 345 }, 'SD': { x: 305, y: 195 }, 'TN': { x: 400, y: 315 },
    'TX': { x: 290, y: 375 }, 'UT': { x: 205, y: 295 }, 'VT': { x: 517, y: 167 },
    'VA': { x: 470, y: 295 }, 'WA': { x: 110, y: 170 }, 'WV': { x: 435, y: 275 },
    'WI': { x: 375, y: 195 }, 'WY': { x: 230, y: 240 }
  };
  return centers[stateCode] || { x: 300, y: 250 };
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
