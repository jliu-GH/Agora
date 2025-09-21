'use client';

import React, { useState, useEffect } from 'react';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';

// US states topology URL (simplified version for better performance)
const geoUrl = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";

// State abbreviation mapping
const stateAbbreviations: Record<string, string> = {
  "Alabama": "AL", "Alaska": "AK", "Arizona": "AZ", "Arkansas": "AR", "California": "CA",
  "Colorado": "CO", "Connecticut": "CT", "Delaware": "DE", "Florida": "FL", "Georgia": "GA",
  "Hawaii": "HI", "Idaho": "ID", "Illinois": "IL", "Indiana": "IN", "Iowa": "IA",
  "Kansas": "KS", "Kentucky": "KY", "Louisiana": "LA", "Maine": "ME", "Maryland": "MD",
  "Massachusetts": "MA", "Michigan": "MI", "Minnesota": "MN", "Mississippi": "MS", "Missouri": "MO",
  "Montana": "MT", "Nebraska": "NE", "Nevada": "NV", "New Hampshire": "NH", "New Jersey": "NJ",
  "New Mexico": "NM", "New York": "NY", "North Carolina": "NC", "North Dakota": "ND", "Ohio": "OH",
  "Oklahoma": "OK", "Oregon": "OR", "Pennsylvania": "PA", "Rhode Island": "RI", "South Carolina": "SC",
  "South Dakota": "SD", "Tennessee": "TN", "Texas": "TX", "Utah": "UT", "Vermont": "VT",
  "Virginia": "VA", "Washington": "WA", "West Virginia": "WV", "Wisconsin": "WI", "Wyoming": "WY"
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

interface InteractiveUSMapProps {
  selectedState?: string;
  onStateClick?: (stateCode: string) => void;
  stateData?: Record<string, any>;
  showTooltip?: boolean;
  colorScheme?: 'political' | 'data' | 'population';
}

export function InteractiveUSMap({ 
  selectedState, 
  onStateClick, 
  stateData = {}, 
  showTooltip = true,
  colorScheme = 'political'
}: InteractiveUSMapProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredState, setHoveredState] = useState<string | null>(null);
  const [tooltipContent, setTooltipContent] = useState<string>('');

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

  const getStateCode = (geoName: string): string => {
    return stateAbbreviations[geoName] || geoName;
  };

  const getStateMembers = (stateCode: string) => {
    return members.filter(member => member.state === stateCode);
  };

  const getStateFill = (stateCode: string): string => {
    if (selectedState === stateCode) {
      return "#3b82f6"; // Blue for selected state
    }

    if (hoveredState === stateCode) {
      return "#60a5fa"; // Lighter blue for hovered state
    }

    // Color by political leaning
    if (colorScheme === 'political') {
      const stateMembers = getStateMembers(stateCode);
      if (stateMembers.length === 0) return "#f3f4f6";

      const republicans = stateMembers.filter(m => m.party === 'R').length;
      const democrats = stateMembers.filter(m => m.party === 'D').length;
      
      if (republicans > democrats) {
        return "#fecaca"; // Light red for Republican-leaning
      } else if (democrats > republicans) {
        return "#bfdbfe"; // Light blue for Democrat-leaning
      } else {
        return "#e5e7eb"; // Gray for balanced/unknown
      }
    }

    // Custom data coloring
    if (stateData[stateCode]) {
      return "#e5e7eb"; // Light gray for states with data
    }
    
    return "#f3f4f6"; // Default light gray
  };

  const getStateStroke = (stateCode: string): string => {
    if (selectedState === stateCode) {
      return "#1d4ed8"; // Darker blue for selected state border
    }
    if (hoveredState === stateCode) {
      return "#3b82f6"; // Blue for hovered state border
    }
    return "#d1d5db"; // Default gray border
  };

  const handleMouseEnter = (geo: any) => {
    const stateCode = getStateCode(geo.properties.name);
    setHoveredState(stateCode);
    
    if (showTooltip) {
      const stateMembers = getStateMembers(stateCode);
      const representatives = stateMembers.filter(m => m.chamber === 'house');
      const senators = stateMembers.filter(m => m.chamber === 'senate');
      
      const tooltip = `${stateNames[stateCode] || stateCode}\n${representatives.length} Representatives, ${senators.length} Senators`;
      setTooltipContent(tooltip);
    }
  };

  const handleMouseLeave = () => {
    setHoveredState(null);
    setTooltipContent('');
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
    <div className="w-full relative">
      <ComposableMap 
        projection="geoAlbersUsa"
        projectionConfig={{
          scale: 1000,
        }}
        width={950}
        height={580}
        className="w-full h-auto"
      >
        <Geographies geography={geoUrl}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const stateCode = getStateCode(geo.properties.name);
              
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  onClick={() => onStateClick && onStateClick(stateCode)}
                  onMouseEnter={() => handleMouseEnter(geo)}
                  onMouseLeave={handleMouseLeave}
                  fill={getStateFill(stateCode)}
                  stroke={getStateStroke(stateCode)}
                  strokeWidth={selectedState === stateCode ? 2 : hoveredState === stateCode ? 1.5 : 1}
                  className="cursor-pointer transition-all duration-200 outline-none focus:outline-none"
                  style={{
                    default: {
                      outline: "none",
                    },
                    hover: {
                      outline: "none",
                    },
                    pressed: {
                      outline: "none",
                    },
                  }}
                />
              );
            })
          }
        </Geographies>
      </ComposableMap>
      
      {/* Tooltip */}
      {showTooltip && tooltipContent && (
        <div className="absolute top-4 left-4 bg-black bg-opacity-75 text-white p-2 rounded text-sm pointer-events-none">
          {tooltipContent.split('\n').map((line, index) => (
            <div key={index}>{line}</div>
          ))}
        </div>
      )}
      
      {/* Map legend */}
      <div className="mt-4 flex flex-wrap justify-center gap-4">
        <div className="flex items-center space-x-4 text-sm text-gray-600">
          {colorScheme === 'political' && (
            <>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-red-200 border border-red-300 rounded"></div>
                <span>Republican-leaning</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-blue-200 border border-blue-300 rounded"></div>
                <span>Democrat-leaning</span>
              </div>
            </>
          )}
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-blue-500 border border-blue-600 rounded"></div>
            <span>Selected State</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-gray-200 border border-gray-300 rounded"></div>
            <span>Other States</span>
          </div>
        </div>
      </div>
      
      {/* Instructions */}
      <div className="mt-2 text-center text-xs text-gray-500">
        Click on any state to view its congressional delegation and legislative activity
      </div>
    </div>
  );
}


