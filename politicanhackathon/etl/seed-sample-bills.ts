#!/usr/bin/env tsx

/**
 * Seed Sample Bills Script
 * Adds sample bills in the congress.gov format to the database for testing
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const sampleBills = [
  {
    id: 'hr7024-119',
    congress: 119,
    chamber: 'house',
    title: 'Tax Relief for American Families and Workers Act of 2025',
    summary: 'A bill to provide tax relief for American families and workers, including an expansion of the child tax credit and important business tax provisions to encourage investment and economic growth.',
    status: 'Passed House',
    sponsorId: null, // Will try to find matching sponsor
    sponsorName: 'Jason Smith',
    introducedDate: '2025-01-09',
    lastAction: '2025-01-31',
    lastActionText: 'Passed House by recorded vote: 357-70',
    timeline: [
      { date: '2025-01-09', action: 'Introduced in House', chamber: 'house', stage: 'introduced' },
      { date: '2025-01-15', action: 'Referred to House Committee on Ways and Means', chamber: 'house', stage: 'committee' },
      { date: '2025-01-24', action: 'Committee Markup', chamber: 'house', stage: 'committee' },
      { date: '2025-01-31', action: 'Passed House by recorded vote: 357-70', chamber: 'house', stage: 'floor' }
    ],
    subjects: ['Economy', 'Taxation', 'Families', 'Business']
  },
  {
    id: 'hr529-119',
    congress: 119,
    chamber: 'house', 
    title: 'Laken Riley Act',
    summary: 'A bill to require the detention of aliens who have been charged with theft, burglary, larceny, or shoplifting until they are removed from the United States.',
    status: 'Passed House',
    sponsorId: null,
    sponsorName: 'Mike Collins',
    introducedDate: '2025-01-13',
    lastAction: '2025-03-07',
    lastActionText: 'Passed House by recorded vote: 251-170',
    timeline: [
      { date: '2025-01-13', action: 'Introduced in House', chamber: 'house', stage: 'introduced' },
      { date: '2025-01-17', action: 'Referred to House Committee on Judiciary', chamber: 'house', stage: 'committee' },
      { date: '2025-03-05', action: 'Committee Markup', chamber: 'house', stage: 'committee' },
      { date: '2025-03-07', action: 'Passed House by recorded vote: 251-170', chamber: 'house', stage: 'floor' }
    ],
    subjects: ['Immigration', 'Law Enforcement', 'Criminal Justice']
  },
  {
    id: 's47-119',
    congress: 119,
    chamber: 'senate',
    title: 'Laken Riley Act',
    summary: 'A bill to require the detention of aliens who have been charged with theft, burglary, larceny, or shoplifting until they are removed from the United States.',
    status: 'Passed Senate',
    sponsorId: null,
    sponsorName: 'Katie Britt',
    introducedDate: '2025-01-09',
    lastAction: '2025-03-10',
    lastActionText: 'Passed Senate by recorded vote: 64-35',
    timeline: [
      { date: '2025-01-09', action: 'Introduced in Senate', chamber: 'senate', stage: 'introduced' },
      { date: '2025-01-13', action: 'Referred to Senate Committee on Judiciary', chamber: 'senate', stage: 'committee' },
      { date: '2025-03-08', action: 'Committee Markup', chamber: 'senate', stage: 'committee' },
      { date: '2025-03-10', action: 'Passed Senate by recorded vote: 64-35', chamber: 'senate', stage: 'floor' }
    ],
    subjects: ['Immigration', 'Law Enforcement', 'Criminal Justice']
  },
  {
    id: 'hr1-119',
    congress: 119,
    chamber: 'house',
    title: 'Lower Energy Costs Act',
    summary: 'A bill to increase domestic energy production, reduce energy costs for American families, and strengthen America\'s energy security and independence.',
    status: 'Passed House',
    sponsorId: null,
    sponsorName: 'Byron Donalds',
    introducedDate: '2025-01-03',
    lastAction: '2025-01-28',
    lastActionText: 'Passed House by recorded vote: 220-205',
    timeline: [
      { date: '2025-01-03', action: 'Introduced in House', chamber: 'house', stage: 'introduced' },
      { date: '2025-01-07', action: 'Referred to House Committee on Energy and Commerce', chamber: 'house', stage: 'committee' },
      { date: '2025-01-22', action: 'Committee Markup', chamber: 'house', stage: 'committee' },
      { date: '2025-01-28', action: 'Passed House by recorded vote: 220-205', chamber: 'house', stage: 'floor' }
    ],
    subjects: ['Energy', 'Oil and Gas', 'Economic Policy']
  },
  {
    id: 'hr5-119',
    congress: 119,
    chamber: 'house',
    title: 'Protect Our Communities from DUI Act',
    summary: 'A bill to authorize the revocation or denial of passports to individuals convicted of driving under the influence of alcohol or drugs.',
    status: 'Passed House',
    sponsorId: null,
    sponsorName: 'Elise Stefanik',
    introducedDate: '2025-01-03',
    lastAction: '2025-01-15',
    lastActionText: 'Passed House by recorded vote: 274-150',
    timeline: [
      { date: '2025-01-03', action: 'Introduced in House', chamber: 'house', stage: 'introduced' },
      { date: '2025-01-09', action: 'Referred to House Committee on Judiciary', chamber: 'house', stage: 'committee' },
      { date: '2025-01-14', action: 'Committee Markup', chamber: 'house', stage: 'committee' },
      { date: '2025-01-15', action: 'Passed House by recorded vote: 274-150', chamber: 'house', stage: 'floor' }
    ],
    subjects: ['Transportation', 'Criminal Justice', 'Public Safety']
  }
];

async function seedSampleBills() {
  console.log('🌱 Seeding sample bills to database...\n');
  
  let savedCount = 0;
  
  for (const billData of sampleBills) {
    try {
      // Try to find sponsor by name
      let sponsorId = billData.sponsorId;
      if (!sponsorId && billData.sponsorName) {
        const sponsor = await findMemberByName(billData.sponsorName);
        sponsorId = sponsor?.id || null;
      }
      
      // Create/update the bill
      const bill = await prisma.bill.upsert({
        where: { id: billData.id },
        update: {
          title: billData.title,
          summary: billData.summary,
          status: billData.status,
          sponsorId,
          updatedAt: new Date()
        },
        create: {
          id: billData.id,
          congress: billData.congress,
          chamber: billData.chamber,
          title: billData.title,
          summary: billData.summary,
          status: billData.status,
          sponsorId,
          createdAt: new Date(billData.introducedDate),
          updatedAt: new Date(billData.lastAction)
        }
      });
      
      // Add timeline actions
      for (const timelineItem of billData.timeline) {
        await prisma.billAction.upsert({
          where: { 
            id: `${billData.id}-${timelineItem.date}-${timelineItem.stage}` 
          },
          update: {
            date: new Date(timelineItem.date),
            chamber: timelineItem.chamber,
            stage: timelineItem.stage,
            text: timelineItem.action,
            sourceUrl: `https://www.congress.gov/bill/${billData.congress}th-congress/${billData.chamber}-bill/${billData.id.split('-')[0].replace(/[a-z]/g, '')}`
          },
          create: {
            id: `${billData.id}-${timelineItem.date}-${timelineItem.stage}`,
            billId: billData.id,
            date: new Date(timelineItem.date),
            chamber: timelineItem.chamber,
            stage: timelineItem.stage,
            text: timelineItem.action,
            sourceUrl: `https://www.congress.gov/bill/${billData.congress}th-congress/${billData.chamber}-bill/${billData.id.split('-')[0].replace(/[a-z]/g, '')}`
          }
        });
      }
      
      console.log(`✅ Saved: ${billData.title} (${billData.id})`);
      if (sponsorId) {
        const sponsor = await prisma.member.findUnique({ where: { id: sponsorId } });
        console.log(`   👤 Sponsor: ${sponsor?.firstName} ${sponsor?.lastName}`);
      } else {
        console.log(`   ⚠️ Sponsor "${billData.sponsorName}" not found in database`);
      }
      
      savedCount++;
      
    } catch (error) {
      console.error(`❌ Error saving bill ${billData.id}:`, error);
    }
  }
  
  console.log(`\n🎉 Successfully saved ${savedCount} bills to the database!`);
  console.log('📊 Your bills page should now show these recent bills from Congress.');
  console.log('🌐 Visit: http://localhost:3001/bills');
  
  await prisma.$disconnect();
}

async function findMemberByName(sponsorName: string): Promise<{id: string} | null> {
  try {
    // Clean up sponsor name
    const cleanName = sponsorName.replace(/^(Rep\.|Sen\.|Mr\.|Ms\.|Mrs\.)\s*/i, '').trim();
    
    // Try last name, first name format
    const [lastName, firstName] = cleanName.split(',').map(s => s?.trim());
    
    if (firstName && lastName) {
      const member = await prisma.member.findFirst({
        where: {
          firstName: { contains: firstName, mode: 'insensitive' },
          lastName: { contains: lastName, mode: 'insensitive' }
        },
        select: { id: true }
      });
      if (member) return member;
    }
    
    // Try first name last name format
    const parts = cleanName.split(' ');
    if (parts.length >= 2) {
      const member = await prisma.member.findFirst({
        where: {
          OR: [
            {
              firstName: { contains: parts[0], mode: 'insensitive' },
              lastName: { contains: parts[parts.length - 1], mode: 'insensitive' }
            },
            {
              firstName: { contains: parts[parts.length - 1], mode: 'insensitive' },
              lastName: { contains: parts[0], mode: 'insensitive' }
            }
          ]
        },
        select: { id: true }
      });
      return member;
    }
    
    return null;
  } catch (error) {
    console.error('Error finding member by name:', error);
    return null;
  }
}

// Run the seeding
seedSampleBills().catch((error) => {
  console.error('❌ Seeding failed:', error);
  process.exit(1);
});
