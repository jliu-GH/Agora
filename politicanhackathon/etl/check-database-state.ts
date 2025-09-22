import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDatabaseState() {
  console.log('🔍 CHECKING CURRENT DATABASE STATE...');
  console.log('=====================================');
  
  try {
    // Get total counts
    const totalMembers = await prisma.member.count();
    const houseMembers = await prisma.member.count({ where: { chamber: 'house' } });
    const senateMembers = await prisma.member.count({ where: { chamber: 'senate' } });
    
    console.log(`📊 TOTAL COUNTS:`);
    console.log(`   Total Members: ${totalMembers}`);
    console.log(`   House: ${houseMembers}`);
    console.log(`   Senate: ${senateMembers}`);
    
    // Get counts by state
    const stateCounts = await prisma.member.groupBy({
      by: ['state'],
      _count: {
        id: true
      },
      orderBy: {
        state: 'asc'
      }
    });
    
    console.log(`\n🗺️ MEMBERS BY STATE:`);
    stateCounts.forEach(state => {
      console.log(`   ${state.state}: ${state._count.id} members`);
    });
    
    // Get counts by state and chamber
    const detailedCounts = await prisma.member.groupBy({
      by: ['state', 'chamber'],
      _count: {
        id: true
      },
      orderBy: [
        { state: 'asc' },
        { chamber: 'asc' }
      ]
    });
    
    console.log(`\n📋 DETAILED BREAKDOWN:`);
    const stateGroups: { [key: string]: { house: number; senate: number } } = {};
    
    detailedCounts.forEach(item => {
      if (!stateGroups[item.state]) {
        stateGroups[item.state] = { house: 0, senate: 0 };
      }
      stateGroups[item.state][item.chamber as 'house' | 'senate'] = item._count.id;
    });
    
    Object.entries(stateGroups).forEach(([state, counts]) => {
      console.log(`   ${state}: ${counts.house} House + ${counts.senate} Senate = ${counts.house + counts.senate} total`);
    });
    
    // Show empty states
    const allStates = [
      'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
      'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
      'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
      'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
      'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
    ];
    
    const statesWithMembers = new Set(stateCounts.map(s => s.state));
    const emptyStates = allStates.filter(state => !statesWithMembers.has(state));
    
    console.log(`\n❌ EMPTY STATES (${emptyStates.length}):`);
    if (emptyStates.length > 0) {
      console.log(`   ${emptyStates.join(', ')}`);
    } else {
      console.log(`   None - all states have members!`);
    }
    
  } catch (error) {
    console.error('❌ Error checking database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabaseState();


