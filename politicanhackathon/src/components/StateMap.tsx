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

// US states in a more traditional grid layout
const stateLayout = [
  // Row 1 - Northern states
  ['AK', 'WA', 'MT', 'ND', 'MN', 'WI', 'MI', 'ME', 'VT', 'NH'],
  // Row 2 - Upper Midwest and Northeast
  ['', 'OR', 'ID', 'WY', 'SD', 'IA', 'IL', 'IN', 'OH', 'PA', 'NY', 'MA', 'CT', 'RI'],
  // Row 3 - Central states
  ['', 'CA', 'NV', 'UT', 'CO', 'NE', 'MO', 'KY', 'WV', 'VA', 'MD', 'DE', 'NJ'],
  // Row 4 - Southern states
  ['', '', 'AZ', 'NM', 'TX', 'OK', 'AR', 'TN', 'NC', 'SC', 'GA', 'FL'],
  // Row 5 - Deep South
  ['', '', '', '', 'LA', 'MS', 'AL', 'GA', 'SC', 'FL'],
  // Row 6 - Hawaii
  ['', '', '', '', '', '', '', '', '', 'HI']
];

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

export default function StateMap() {
  const [members, setMembers] = useState<Member[]>([]);
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
        <h2 className="text-2xl font-bold text-gray-900 mb-2">US Congressional Map</h2>
        <p className="text-gray-600">Click on any state to view its representatives, senators, and governor</p>
      </div>

      <div className="space-y-8">
        {/* House of Representatives List */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-gray-900">House of Representatives</h3>
            <p className="text-gray-600">All House representatives by state</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Object.keys(stateNames).map((stateCode) => {
              const stateData = getStateData(stateCode);
              const representatives = stateData.representatives;
              
              if (representatives.length === 0) return null;
              
              return (
                <div key={`house-list-${stateCode}`} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-lg text-gray-900">{stateNames[stateCode]}</h4>
                    <span className="text-sm text-gray-500">{representatives.length} members</span>
                  </div>
                  
                  <div className="space-y-2">
                            {representatives.map((rep) => (
                              <div key={rep.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                <div>
                                  <a 
                                    href={`/member/${rep.id}`}
                                    className={`font-bold text-base hover:underline ${
                                      rep.party === 'D' ? 'text-blue-700' : rep.party === 'R' ? 'text-red-700' : 'text-purple-700'
                                    }`}
                                  >
                                    {rep.firstName} {rep.lastName}
                                  </a>
                                  <span className="text-sm text-gray-600 ml-2 font-medium">District {rep.district}</span>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                                  rep.party === 'D' ? 'bg-blue-200 text-blue-900' : rep.party === 'R' ? 'bg-red-200 text-red-900' : 'bg-purple-200 text-purple-900'
                                }`}>
                                  {rep.party}
                                </span>
                              </div>
                            ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Senate List */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-gray-900">Senate</h3>
            <p className="text-gray-600">All senators by state</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Object.keys(stateNames).map((stateCode) => {
              const stateData = getStateData(stateCode);
              const senators = stateData.senators;
              
              if (senators.length === 0) return null;
              
              return (
                <div key={`senate-list-${stateCode}`} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-lg text-gray-900">{stateNames[stateCode]}</h4>
                    <span className="text-sm text-gray-500">{senators.length} members</span>
                  </div>
                  
                  <div className="space-y-2">
                            {senators.map((senator) => (
                              <div key={senator.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                <div>
                                  <a 
                                    href={`/member/${senator.id}`}
                                    className={`font-bold text-base hover:underline ${
                                      senator.party === 'D' ? 'text-blue-700' : senator.party === 'R' ? 'text-red-700' : 'text-purple-700'
                                    }`}
                                  >
                                    {senator.firstName} {senator.lastName}
                                  </a>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                                  senator.party === 'D' ? 'bg-blue-200 text-blue-900' : senator.party === 'R' ? 'bg-red-200 text-red-900' : 'bg-purple-200 text-purple-900'
                                }`}>
                                  {senator.party}
                                </span>
                              </div>
                            ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

                {/* Summary Stats */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Summary</h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {members.filter(m => m.chamber === 'house' && m.party === 'D').length}
                      </div>
                      <div className="text-sm text-gray-600">Democratic House Members</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {members.filter(m => m.chamber === 'house' && m.party === 'R').length}
                      </div>
                      <div className="text-sm text-gray-600">Republican House Members</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {members.filter(m => m.chamber === 'house' && m.party === 'I').length}
                      </div>
                      <div className="text-sm text-gray-600">Independent House Members</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-600">
                        {members.filter(m => m.chamber === 'house').length}
                      </div>
                      <div className="text-sm text-gray-600">Total House Members</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {members.filter(m => m.chamber === 'senate' && m.party === 'D').length}
                      </div>
                      <div className="text-sm text-gray-600">Democratic Senators</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {members.filter(m => m.chamber === 'senate' && m.party === 'R').length}
                      </div>
                      <div className="text-sm text-gray-600">Republican Senators</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {members.filter(m => m.chamber === 'senate' && m.party === 'I').length}
                      </div>
                      <div className="text-sm text-gray-600">Independent Senators</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-600">
                        {members.filter(m => m.chamber === 'senate').length}
                      </div>
                      <div className="text-sm text-gray-600">Total Senators</div>
                    </div>
                  </div>
                </div>
      </div>
    </div>
  );
}

