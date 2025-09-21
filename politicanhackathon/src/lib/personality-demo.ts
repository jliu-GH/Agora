/**
 * Demonstration script showing how the enhanced personality system works
 * This shows the difference between generic and personalized AI representatives
 */

import { personalityEngine } from './personality-engine';
import { speechScraper } from './speech-scraper';
import { debateSystem } from './debate-system';

export class PersonalityDemo {
  
  async demonstratePersonalityDifferences() {
    console.log('🎭 Personality System Demo\n');
    
    // Example: Compare AOC vs. Ted Cruz on climate change
    await this.compareRepresentatives('aoc-ny14', 'cruz-tx-senate', 'climate change');
    
    // Example: Show personality evolution over time
    await this.showPersonalityEvolution('aoc-ny14');
  }
  
  private async compareRepresentatives(memberA: string, memberB: string, topic: string) {
    console.log(`\n🔍 Comparing personalities: ${memberA} vs ${memberB} on "${topic}"\n`);
    
    // Get personality profiles
    const profileA = await personalityEngine.getPersonalityProfile(memberA);
    const profileB = await personalityEngine.getPersonalityProfile(memberB);
    
    if (profileA) {
      console.log(`📊 ${profileA.name} Personality Profile:`);
      console.log(`   Communication Style: ${profileA.communicationStyle.formality}, ${profileA.communicationStyle.directness}`);
      console.log(`   Common Phrases: ${profileA.speechPatterns.commonPhrases.slice(0, 3).join(', ')}`);
      console.log(`   Current Mood: ${profileA.dynamicTraits.current_mood}`);
      console.log(`   Confidence Score: ${profileA.confidence_score}/1.0\n`);
    }
    
    if (profileB) {
      console.log(`📊 ${profileB.name} Personality Profile:`);
      console.log(`   Communication Style: ${profileB.communicationStyle.formality}, ${profileB.communicationStyle.directness}`);
      console.log(`   Common Phrases: ${profileB.speechPatterns.commonPhrases.slice(0, 3).join(', ')}`);
      console.log(`   Current Mood: ${profileB.dynamicTraits.current_mood}`);
      console.log(`   Confidence Score: ${profileB.confidence_score}/1.0\n`);
    }
    
    // Generate sample responses to show personality differences
    console.log('💬 Sample responses to climate change question:\n');
    
    if (profileA) {
      const promptA = personalityEngine.generatePersonalityPrompt(profileA);
      console.log(`${profileA.name} would likely respond:`);
      console.log('   "Look, this is exactly what I\'ve been talking about - climate change is an existential threat, and we need bold action NOW. I\'ve seen the flooding in my district, I\'ve talked to families who can\'t afford their rising energy bills..."');
      console.log('   [Uses passionate tone, personal anecdotes, urgent language]\n');
    }
    
    if (profileB) {
      const promptB = personalityEngine.generatePersonalityPrompt(profileB);
      console.log(`${profileB.name} would likely respond:`);
      console.log('   "Well, let me tell you something - the climate has always been changing. What we need is American energy independence, not job-killing regulations that hurt our economy. The free market will drive innovation..."');
      console.log('   [Uses skeptical tone, economic focus, traditional conservative framing]\n');
    }
  }
  
  private async showPersonalityEvolution(memberId: string) {
    console.log(`\n📈 Personality Evolution Demo for ${memberId}\n`);
    
    // Get current profile
    let profile = await personalityEngine.getPersonalityProfile(memberId);
    
    if (!profile) {
      console.log('No profile found, creating initial profile...');
      profile = await speechScraper.updatePersonalityFromScraping(memberId);
    }
    
    if (profile) {
      console.log('📅 Current Personality State:');
      console.log(`   Last Updated: ${profile.lastUpdated}`);
      console.log(`   Recent Focus: ${profile.dynamicTraits.recent_focus_areas.join(', ')}`);
      console.log(`   Current Mood: ${profile.dynamicTraits.current_mood}`);
      console.log(`   Signature Expressions: ${profile.speechPatterns.signature_expressions.join(', ')}\n`);
      
      // Simulate scraping update
      console.log('🔄 Simulating web scraping update...');
      const updatedProfile = await speechScraper.updatePersonalityFromScraping(memberId);
      
      if (updatedProfile) {
        console.log('✅ Profile updated!');
        console.log(`   Confidence improved: ${profile.confidence_score} → ${updatedProfile.confidence_score}`);
        console.log(`   New statements found: ${updatedProfile.recentStatements.length}`);
        console.log(`   Updated mood: ${profile.dynamicTraits.current_mood} → ${updatedProfile.dynamicTraits.current_mood}\n`);
      }
    }
  }
  
  async demonstrateRealTimeUpdates() {
    console.log('⚡ Real-Time Personality Updates Demo\n');
    
    // Show how personalities can be updated based on recent events
    const scenarios = [
      {
        event: 'Major climate bill vote',
        members: ['aoc-ny14', 'cruz-tx-senate'],
        expectedChanges: ['mood shift', 'new talking points', 'updated focus areas']
      },
      {
        event: 'Infrastructure spending debate',
        members: ['pelosi-ca12', 'mcconnell-ky-senate'],
        expectedChanges: ['emphasis on local benefits', 'fiscal responsibility messaging']
      }
    ];
    
    for (const scenario of scenarios) {
      console.log(`📢 Scenario: ${scenario.event}`);
      console.log(`   Affected members: ${scenario.members.join(', ')}`);
      console.log(`   Expected changes: ${scenario.expectedChanges.join(', ')}\n`);
      
      // In a real implementation, this would trigger scraping of recent statements
      // related to the event and update personality profiles accordingly
    }
  }
  
  generateImplementationGuide() {
    return `
# 🤖 Enhanced Personality System Implementation Guide

## Overview
This system creates authentic AI representatives by combining:
1. **Individual personality profiles** for each politician
2. **Web scraping** of recent statements and speeches  
3. **Dynamic updates** based on current events and positions
4. **Speech pattern analysis** to capture unique communication styles

## Key Components

### 1. PersonalityEngine
- Stores and manages individual personality profiles
- Generates custom prompts for each representative
- Tracks confidence scores and update history

### 2. SpeechScraper  
- Scrapes official websites, social media, press releases
- Analyzes speech patterns and extracts personality traits
- Updates profiles with recent statements and mood changes

### 3. Enhanced Debate System
- Uses personality profiles to generate authentic responses
- Falls back to generic system if no profile available
- Integrates scraped data into conversation context

## Usage Examples

### Create/Update Personality Profile
\`\`\`javascript
// Update personality from web scraping
const profile = await speechScraper.updatePersonalityFromScraping('member-id');

// Get existing profile
const profile = await personalityEngine.getPersonalityProfile('member-id');
\`\`\`

### Use in Debate System
\`\`\`javascript
// Personality automatically loaded when choosing representative
await debateSystem.chooseRep('member-id', memberData);

// System generates responses using personalized prompts
const response = await debateSystem.processUserInput('What about climate change?');
\`\`\`

### API Endpoints
\`\`\`javascript
// Update personality via API
POST /api/personality
{ "action": "update", "memberId": "member-id" }

// Get personality profile
GET /api/personality?memberId=member-id
\`\`\`

## Benefits

### 🎯 Authenticity
- Each representative has unique speech patterns
- Based on real statements and voting records
- Captures personality nuances beyond party lines

### 📈 Dynamic Updates  
- Stays current with recent positions and statements
- Adapts to changing political landscape
- Reflects evolving communication styles

### 🎭 Rich Personalities
- Captures formality level, directness, emotionality
- Includes regional dialect and signature expressions
- Models personal anecdote usage and debate style

### 📚 Educational Value
- Students learn how politicians actually communicate
- Demonstrates authentic political discourse
- Shows diversity of thought within parties

## Future Enhancements

### Real-Time Integration
- Monitor C-SPAN for live speeches
- Track social media for instant updates
- Alert system for major position changes

### Advanced Analysis
- Sentiment analysis of statements
- Topic modeling for issue evolution
- Predictive modeling for future positions

### Multi-Modal Learning
- Video analysis for gestures and tone
- Audio analysis for speech patterns
- Visual analysis for setting preferences
`;
  }
}

export const personalityDemo = new PersonalityDemo();
