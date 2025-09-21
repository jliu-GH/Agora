import { CongressApiClient } from './congress-api';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function findMemberByName(name: string): Promise<string | null> {
  const cleanName = name.replace(/(Rep\.|Sen\.)\s*/, '').trim();
  const parts = cleanName.split(' ');
  
  if (parts.length >= 2) {
    const member = await prisma.member.findFirst({
      where: {
        OR: [
          { firstName: { contains: parts[0] } },
          { lastName: { contains: parts[parts.length - 1] } }
        ]
      },
      select: { id: true }
    });
    if (member) return member.id;
  }
  
  const memberByLastName = await prisma.member.findFirst({
    where: { lastName: { contains: cleanName.split(' ').pop()! } },
    select: { id: true }
  });
  if (memberByLastName) return memberByLastName.id;

  return null;
}

async function fetch50RecentBills() {
  console.log('🏛️ Fetching 50 Most Recent Bills from Congress.gov API');
  console.log('===================================================\n');

  const client = new CongressApiClient();
  
  try {
    // Fetch 50 bills from the API
    const bills = await client.getRecentBills(119, 50);
    
    console.log(`✅ Successfully fetched ${bills.length} bills from Congress.gov API\n`);
    
    if (bills.length === 0) {
      console.log('❌ No bills fetched. Please check your API key.');
      return;
    }

    // Process and save bills to database
    let savedCount = 0;
    let errorCount = 0;

    for (const bill of bills) {
      try {
        // Convert to Prisma format
        const billData = client.convertToPrismaFormat(bill);
        
        // Find sponsor if available
        let sponsorId: string | null = null;
        if (bill.sponsors && bill.sponsors.length > 0) {
          const sponsorName = bill.sponsors[0].fullName;
          sponsorId = await findMemberByName(sponsorName);
          if (!sponsorId) {
            console.warn(`   ⚠️ Sponsor "${sponsorName}" not found in database`);
          }
        }

        // Save bill to database (simple version without nested actions to avoid schema issues)
        const savedBill = await prisma.bill.upsert({
          where: { id: billData.id },
          update: {
            title: billData.title,
            summary: billData.summary,
            status: billData.status,
            sponsorId: sponsorId,
            updatedAt: new Date(),
          },
          create: {
            id: billData.id,
            congress: billData.congress,
            chamber: billData.chamber,
            title: billData.title,
            summary: billData.summary,
            status: billData.status,
            sponsorId: sponsorId,
            createdAt: billData.createdAt,
            updatedAt: billData.updatedAt,
          }
        });
        
        console.log(`✅ ${savedBill.id}: ${savedBill.title.substring(0, 80)}...`);
        savedCount++;
        
      } catch (error) {
        console.error(`❌ Error saving ${bill.type}${bill.number}:`, error instanceof Error ? error.message : error);
        errorCount++;
      }
    }

    console.log('\n🎉 FETCH COMPLETE!');
    console.log('==================');
    console.log(`📊 Bills processed: ${bills.length}`);
    console.log(`✅ Successfully saved: ${savedCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📈 Success rate: ${((savedCount / bills.length) * 100).toFixed(1)}%`);
    
    console.log('\n🌐 Your bills are now available at:');
    console.log('   http://localhost:3000/bills');
    
    console.log('\n📋 Some notable bills that were added:');
    const sampleBills = bills.slice(0, 5);
    sampleBills.forEach(bill => {
      console.log(`   • ${bill.title || 'Title pending'} (${bill.type.toUpperCase()} ${bill.number})`);
    });

  } catch (error) {
    console.error('❌ Fatal error during bill fetching:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

fetch50RecentBills().catch(e => {
  console.error(e);
  process.exit(1);
});


