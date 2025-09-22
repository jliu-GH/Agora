import { PrismaClient } from '@prisma/client';
import { cleanBillTitle, cleanBillSummary, formatBillDescription } from '../src/lib/html-cleaner';

const prisma = new PrismaClient();

interface BillToUpdate {
  id: string;
  title: string;
  summary: string;
}

async function cleanAllBillContent() {
  console.log('🧹 COMPREHENSIVE BILL CONTENT CLEANING');
  console.log('=====================================');
  
  try {
    // Get all bills with their current content
    console.log('📋 Fetching all bills from database...');
    const bills = await prisma.bill.findMany({
      select: {
        id: true,
        title: true,
        summary: true
      }
    });

    console.log(`📊 Found ${bills.length} bills to process`);
    
    if (bills.length === 0) {
      console.log('ℹ️ No bills found in database');
      return;
    }

    // Analyze current state
    const htmlBills = bills.filter(bill => 
      (bill.title && bill.title.includes('<')) ||
      (bill.summary && bill.summary.includes('<'))
    );

    console.log(`🔍 Analysis results:`);
    console.log(`   • Total bills: ${bills.length}`);
    console.log(`   • Bills with HTML content: ${htmlBills.length}`);
    console.log(`   • Clean bills: ${bills.length - htmlBills.length}`);

    if (htmlBills.length === 0) {
      console.log('✅ All bills already have clean content!');
      return;
    }

    console.log(`\n🧹 Cleaning ${htmlBills.length} bills with HTML content...`);
    
    let cleaned = 0;
    let errors = 0;

    for (const bill of bills) {
      try {
        const originalTitle = bill.title || '';
        const originalSummary = bill.summary || '';
        
        // Clean the content
        const cleanedTitle = cleanBillTitle(originalTitle);
        const cleanedSummary = formatBillDescription(originalSummary);
        
        // Only update if there's a meaningful change
        const titleChanged = originalTitle !== cleanedTitle && cleanedTitle !== 'Untitled Bill';
        const summaryChanged = originalSummary !== cleanedSummary && cleanedSummary !== 'No summary available.';
        
        if (titleChanged || summaryChanged) {
          const updateData: any = {};
          
          if (titleChanged) {
            updateData.title = cleanedTitle;
          }
          
          if (summaryChanged) {
            updateData.summary = cleanedSummary;
          }
          
          await prisma.bill.update({
            where: { id: bill.id },
            data: updateData
          });
          
          console.log(`✅ Cleaned bill ${bill.id}: ${cleanedTitle.substring(0, 50)}...`);
          cleaned++;
          
          // Show example of cleaning for first few bills
          if (cleaned <= 3) {
            console.log(`   📝 Title change: ${titleChanged ? 'YES' : 'NO'}`);
            console.log(`   📝 Summary change: ${summaryChanged ? 'YES' : 'NO'}`);
            if (summaryChanged) {
              console.log(`   📄 Original summary length: ${originalSummary.length} chars`);
              console.log(`   📄 Cleaned summary length: ${cleanedSummary.length} chars`);
            }
          }
        }
        
      } catch (error) {
        console.error(`❌ Error cleaning bill ${bill.id}:`, error);
        errors++;
      }
    }

    console.log(`\n🎉 CLEANING COMPLETED`);
    console.log(`=====================`);
    console.log(`✅ Bills successfully cleaned: ${cleaned}`);
    console.log(`❌ Errors encountered: ${errors}`);
    console.log(`📊 Total processed: ${bills.length}`);
    
    // Verify results
    console.log(`\n🔍 Verification check...`);
    const verificationBills = await prisma.bill.findMany({
      select: {
        id: true,
        title: true,
        summary: true
      },
      take: 5
    });

    console.log(`📋 Sample of cleaned bills:`);
    verificationBills.forEach((bill, index) => {
      const hasHtml = (bill.title && bill.title.includes('<')) || 
                     (bill.summary && bill.summary.includes('<'));
      console.log(`   ${index + 1}. ${bill.title?.substring(0, 60)}... ${hasHtml ? '⚠️ STILL HAS HTML' : '✅ CLEAN'}`);
    });

  } catch (error) {
    console.error('❌ Fatal error during bill content cleaning:', error);
  }
}

async function showBillContentExamples() {
  console.log('\n📋 BILL CONTENT EXAMPLES');
  console.log('========================');
  
  const sampleBills = await prisma.bill.findMany({
    select: {
      id: true,
      title: true,
      summary: true
    },
    take: 3
  });

  sampleBills.forEach((bill, index) => {
    console.log(`\n📄 Bill ${index + 1}: ${bill.id}`);
    console.log(`📰 Title: ${bill.title?.substring(0, 100)}...`);
    console.log(`📝 Summary: ${bill.summary?.substring(0, 200)}...`);
    
    const hasHtmlInTitle = bill.title && bill.title.includes('<');
    const hasHtmlInSummary = bill.summary && bill.summary.includes('<');
    
    if (hasHtmlInTitle || hasHtmlInSummary) {
      console.log(`⚠️ Contains HTML: ${hasHtmlInTitle ? 'Title' : ''} ${hasHtmlInSummary ? 'Summary' : ''}`);
    } else {
      console.log(`✅ Clean content`);
    }
  });
}

async function main() {
  console.log('🚀 Starting comprehensive bill content cleaning process...');
  
  try {
    await showBillContentExamples();
    await cleanAllBillContent();
    
    console.log('\n🎉 Bill content cleaning process completed successfully!');
    console.log('All bill titles and summaries should now be free of HTML formatting.');
    
  } catch (error) {
    console.error('❌ Error in main process:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch(console.error);
}
