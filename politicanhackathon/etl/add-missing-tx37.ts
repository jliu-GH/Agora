import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addMissingTexasDistrict37() {
  console.log('🔍 ADDING MISSING TEXAS DISTRICT 37...');
  console.log('=====================================');
  
  try {
    // Check if TX district 37 already exists
    const existing = await prisma.member.findFirst({
      where: {
        state: 'TX',
        district: '37',
        chamber: 'house'
      }
    });
    
    if (existing) {
      console.log('✅ Texas District 37 already exists:', existing.firstName, existing.lastName);
      return;
    }
    
    // Add Lloyd Doggett for Texas District 37
    const newMember = await prisma.member.create({
      data: {
        id: 'TX_H37_Doggett',
        firstName: 'Lloyd',
        lastName: 'Doggett',
        state: 'TX',
        district: '37',
        party: 'D',
        chamber: 'house',
        dwNominate: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    
    console.log('✅ Added Texas District 37:', newMember.firstName, newMember.lastName);
    
    // Final verification
    const totalMembers = await prisma.member.count();
    const houseMembersCount = await prisma.member.count({ where: { chamber: 'house' } });
    const senateMembersCount = await prisma.member.count({ where: { chamber: 'senate' } });
    const texasHouseCount = await prisma.member.count({ 
      where: { state: 'TX', chamber: 'house' } 
    });
    
    console.log('\n🎉 FINAL VERIFICATION:');
    console.log('======================');
    console.log(`✅ Total Members: ${totalMembers}`);
    console.log(`🏛️ House: ${houseMembersCount}`);
    console.log(`🏛️ Senate: ${senateMembersCount}`);
    console.log(`🤠 Texas House: ${texasHouseCount}`);
    
    if (houseMembersCount === 435 && senateMembersCount === 100) {
      console.log('\n🌟 PERFECT! Complete congressional dataset achieved!');
      console.log('🎯 All 535 members (435 House + 100 Senate) are now in the database!');
    } else {
      console.log(`\n⚠️ Still need ${435 - houseMembersCount} more House members`);
    }
    
  } catch (error) {
    console.error('❌ Error adding Texas District 37:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addMissingTexasDistrict37();


