import { NextRequest, NextResponse } from "next/server";
import { speechScraper } from "@/lib/speech-scraper";
import { personalityEngine } from "@/lib/personality-engine";

export async function POST(req: NextRequest) {
  try {
    const { action, memberId } = await req.json();

    switch (action) {
      case 'update':
        if (!memberId) {
          return NextResponse.json({ error: 'Member ID required' }, { status: 400 });
        }
        
        console.log(`Updating personality profile for member ${memberId}`);
        const updatedProfile = await speechScraper.updatePersonalityFromScraping(memberId);
        
        if (!updatedProfile) {
          return NextResponse.json({ error: 'Failed to update personality profile' }, { status: 500 });
        }
        
        return NextResponse.json({ 
          message: 'Personality profile updated successfully',
          profile: updatedProfile,
          confidence: updatedProfile.confidence_score
        });

      case 'get':
        if (!memberId) {
          return NextResponse.json({ error: 'Member ID required' }, { status: 400 });
        }
        
        const profile = await personalityEngine.getPersonalityProfile(memberId);
        
        if (!profile) {
          return NextResponse.json({ error: 'Personality profile not found' }, { status: 404 });
        }
        
        return NextResponse.json({ profile });

      case 'update_all':
        // Update personalities for all members (use carefully)
        return NextResponse.json({ 
          message: 'Bulk update not implemented yet - use individual updates for safety' 
        }, { status: 501 });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Personality API error:', error);
    return NextResponse.json({ 
      error: 'Failed to process personality request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const memberId = searchParams.get('memberId');
    
    if (!memberId) {
      return NextResponse.json({ error: 'Member ID required' }, { status: 400 });
    }
    
    const profile = await personalityEngine.getPersonalityProfile(memberId);
    
    if (!profile) {
      return NextResponse.json({ error: 'Personality profile not found' }, { status: 404 });
    }
    
    return NextResponse.json({ profile });
  } catch (error) {
    console.error('Error fetching personality profile:', error);
    return NextResponse.json({ error: 'Failed to fetch personality profile' }, { status: 500 });
  }
}
