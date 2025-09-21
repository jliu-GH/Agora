import { PrismaClient } from '@prisma/client';
import { CongressApiClient } from './congress-api';

const prisma = new PrismaClient();

async function fixMissingBillData() {
  console.log('🔧 Fixing Missing Bill Data');
  console.log('============================\n');

  try {
    // Find bills with missing or placeholder data
    const allBills = await prisma.bill.findMany({
      select: { id: true, title: true, summary: true, status: true, congress: true, chamber: true }
    });

    const problematicBills = allBills.filter(bill => 
      !bill.title || 
      bill.title.trim() === '' || 
      bill.title === 'Title not available' ||
      !bill.summary || 
      bill.summary.trim() === '' || 
      bill.summary === 'Summary not available'
    );

    console.log(`📊 Found ${problematicBills.length} bills with missing data\n`);

    if (problematicBills.length === 0) {
      console.log('✅ All bills have complete data!');
      return;
    }

    const apiClient = new CongressApiClient();
    let fixedCount = 0;
    let removedCount = 0;

    for (const bill of problematicBills) {
      console.log(`🔍 Processing ${bill.id}...`);
      
      try {
        // Parse bill ID to get type and number
        const billMatch = bill.id.match(/^([a-z]+)(\d+)-(\d+)$/);
        if (!billMatch) {
          console.log(`   ❌ Invalid bill ID format: ${bill.id}`);
          continue;
        }

        const [, type, number, congress] = billMatch;
        
        // Try to fetch detailed data from Congress API
        const detailedBill = await apiClient.getBillDetails(
          parseInt(congress), 
          type, 
          number
        );

        if (detailedBill && detailedBill.title) {
          // Update with real data from API
          await prisma.bill.update({
            where: { id: bill.id },
            data: {
              title: detailedBill.title,
              summary: detailedBill.summary?.text || generateFallbackSummary(detailedBill.title, type),
              status: detailedBill.latestAction?.text || bill.status,
              updatedAt: new Date()
            }
          });
          console.log(`   ✅ Fixed with API data: ${detailedBill.title.substring(0, 60)}...`);
          fixedCount++;
        } else {
          // Check if this might be a reserved/invalid bill number
          if (isLikelyReservedBill(bill.id)) {
            // Remove reserved/invalid bills from database
            await prisma.bill.delete({
              where: { id: bill.id }
            });
            console.log(`   🗑️ Removed reserved/invalid bill: ${bill.id}`);
            removedCount++;
          } else {
            // Apply fallback improvements
            const improvedTitle = generateFallbackTitle(bill.id, type);
            const improvedSummary = generateFallbackSummary(improvedTitle, type);
            
            await prisma.bill.update({
              where: { id: bill.id },
              data: {
                title: improvedTitle,
                summary: improvedSummary,
                updatedAt: new Date()
              }
            });
            console.log(`   🔧 Applied fallback data: ${improvedTitle}`);
            fixedCount++;
          }
        }
      } catch (error) {
        console.log(`   ❌ Error processing ${bill.id}: ${error instanceof Error ? error.message : error}`);
      }
    }

    console.log('\n🎉 DATA CLEANUP COMPLETE!');
    console.log('=========================');
    console.log(`📊 Bills processed: ${problematicBills.length}`);
    console.log(`✅ Bills fixed: ${fixedCount}`);
    console.log(`🗑️ Bills removed: ${removedCount}`);
    console.log(`📈 Success rate: ${((fixedCount + removedCount) / problematicBills.length * 100).toFixed(1)}%`);
    
  } catch (error) {
    console.error('❌ Fatal error during data cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

function isLikelyReservedBill(billId: string): boolean {
  // Check for common patterns of reserved bills
  const reservedPatterns = [
    /^hr\./, // Bills with dots (often invalid format)
    /^[hs]r?\d{4,}-/, // Very high numbers that are often reserved
  ];
  
  return reservedPatterns.some(pattern => pattern.test(billId));
}

function generateFallbackTitle(billId: string, type: string): string {
  const billMatch = billId.match(/^([a-z]+)(\d+)-(\d+)$/);
  if (!billMatch) return `Congressional ${type.toUpperCase()} ${billId}`;
  
  const [, billType, number, congress] = billMatch;
  const chamberName = billType.startsWith('h') ? 'House' : 'Senate';
  const billTypeName = billType.includes('res') ? 'Resolution' : 'Bill';
  
  return `${chamberName} ${billTypeName} ${number} - ${congress}th Congress`;
}

function generateFallbackSummary(title: string, type: string): string {
  const billType = type.includes('res') ? 'resolution' : 'bill';
  return `This ${billType} is currently being processed and detailed summary information is not yet available. Please check the official Congress.gov page for the most up-to-date information.`;
}

fixMissingBillData().catch(e => {
  console.error(e);
  process.exit(1);
});


