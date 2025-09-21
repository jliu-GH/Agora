import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import WebPersonaBuilder from '@/lib/web-persona-builder';

const prisma = new PrismaClient();

// Simple in-memory cache to prevent multiple simultaneous requests
const memberCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const activeRequests = new Map<string, Promise<any>>();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: memberId } = await params;
    
    // Check cache first
    const cached = memberCache.get(memberId);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log(`📋 Returning cached data for ${memberId}`);
      return NextResponse.json({ member: cached.data });
    }
    
    // Check if there's already an active request for this member
    if (activeRequests.has(memberId)) {
      console.log(`⏳ Waiting for existing request for ${memberId}`);
      const result = await activeRequests.get(memberId);
      return NextResponse.json({ member: result });
    }
    
    // Create new request promise
    const requestPromise = fetchMemberData(memberId);
    activeRequests.set(memberId, requestPromise);
    
    try {
      const memberData = await requestPromise;
      // Cache the result
      memberCache.set(memberId, { data: memberData, timestamp: Date.now() });
      return NextResponse.json({ member: memberData });
    } finally {
      // Clean up active request
      activeRequests.delete(memberId);
    }
  } catch (error) {
    console.error("Error fetching member:", error);
    return NextResponse.json({ error: 'Failed to fetch member' }, { status: 500 });
  }
}

async function fetchMemberData(memberId: string) {
  // List of non-voting territorial delegates to exclude
  const nonVotingTerritories = [
    'American Samoa',       // AS
    'District of Columbia', // DC  
    'Guam',                // GU
    'Northern Mariana Islands', // MP
    'Puerto Rico',         // PR
    'Virgin Islands'       // VI
  ];

  // First try to get basic member data from database
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    include: {
      committees: {
        include: {
          Committee: true,
        },
      },
    },
  });

  if (!member) {
    throw new Error('Member not found');
  }

  // Check if this is a non-voting territorial delegate
  if (nonVotingTerritories.includes(member.state)) {
    throw new Error('Non-voting territorial delegates are not included');
  }

  // Enhance member profile with limited Wikipedia scraping for key members only
  let enhancedProfile = {
    ...member,
    // Ensure JSON fields are properly formatted
    keyPositions: member.keyPositions ? JSON.parse(member.keyPositions) : [],
    recentBills: member.recentBills ? JSON.parse(member.recentBills) : [],
    votingRecord: member.votingRecord ? JSON.parse(member.votingRecord) : [],
    contactInfo: member.contactInfo ? JSON.parse(member.contactInfo) : {}
  };

  // Check if we should do Wikipedia enhancement (only for members with insufficient data)
  const needsEnhancement = !member.bio || member.bio.length < 50 || 
                          !member.keyPositions || 
                          JSON.parse(member.keyPositions || '[]').length === 0;

  // COMPLETE LOADING: Always enhance with Wikipedia data for complete experience
  console.log(`📋 Enhancing profile for ${member.firstName} ${member.lastName} with Wikipedia data...`);
  
  try {
    const personaBuilder = new WebPersonaBuilder();
    await personaBuilder.initialize();
    
    const persona = await personaBuilder.buildPersona({
      id: member.id,
      firstName: member.firstName,
      lastName: member.lastName,
      party: member.party,
      state: member.state,
      chamber: member.chamber
    });
    
    // Use the nuclear-strength cleaning from WebPersonaBuilder (already cleaned in persona)
    // The persona.biography and persona.keyPositions are already cleaned by the WebPersonaBuilder.cleanText method
    const cleanedBiography = persona.biography; // Already cleaned by nuclear method
    const cleanedPositions = persona.keyPositions; // Already cleaned by nuclear method

    // Update enhanced profile with Wikipedia data
    enhancedProfile = {
      ...enhancedProfile,
      // Prioritize clean database data, fallback to cleaned Wikipedia if missing
      bio: enhancedProfile.bio && enhancedProfile.bio.length > 50 ? enhancedProfile.bio : cleanedBiography,
      politicalBackground: enhancedProfile.politicalBackground && enhancedProfile.politicalBackground.length > 50 ? enhancedProfile.politicalBackground : cleanedBiography,
      keyPositions: enhancedProfile.keyPositions && enhancedProfile.keyPositions.length > 0 ? enhancedProfile.keyPositions : cleanedPositions,
      committees: enhancedProfile.committees?.length > 0 ? enhancedProfile.committees : persona.committees.map(name => ({ 
        id: '', 
        committeeId: '', 
        memberId: member.id, 
        role: null, 
        Committee: { id: '', name } 
      })),
      achievements: persona.achievements || [],
      communicationStyle: persona.communicationStyle || 'measured and thoughtful',
      // Additional data for the UI
      headshotUrl: persona.headshotUrl,
      wikipediaData: {
        biography: cleanedBiography,
        positions: cleanedPositions,
        committees: persona.committees,
        achievements: persona.achievements,
        communicationStyle: persona.communicationStyle,
        headshotUrl: persona.headshotUrl
      }
    } as any; // Type assertion to allow additional properties

    console.log(`✅ Enhanced profile for ${member.firstName} ${member.lastName}`);
    
  } catch (error) {
    console.warn(`⚠️ Enhancement failed for ${member.firstName} ${member.lastName}:`, error);
  }

  return enhancedProfile;
}