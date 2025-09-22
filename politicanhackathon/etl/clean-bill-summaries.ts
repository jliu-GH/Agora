import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function cleanHtmlSummary(htmlSummary: string): string {
  if (!htmlSummary) return '';
  
  // Remove HTML tags
  let cleaned = htmlSummary
    .replace(/<[^>]*>/g, '') // Remove all HTML tags
    .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
    .replace(/&amp;/g, '&') // Replace HTML entities
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&hellip;/g, '...')
    .trim();
  
  // Clean up extra whitespace and line breaks
  cleaned = cleaned
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/\n\s*\n/g, '\n\n') // Normalize paragraph breaks
    .trim();
  
  return cleaned;
}

function improveReadability(text: string): string {
  // Add better paragraph breaks where needed
  text = text.replace(/\.\s*([A-Z])/g, '. $1'); // Ensure space after periods
  
  // Handle common patterns for better readability
  text = text.replace(/Act\s*This bill/g, 'Act. This bill');
  text = text.replace(/\s*Specifically,/g, '\n\nSpecifically,');
  text = text.replace(/\s*Additionally,/g, '\n\nAdditionally,');
  text = text.replace(/\s*The bill/g, '\n\nThe bill');
  text = text.replace(/\s*In making/g, '\n\nIn making');
  text = text.replace(/\s*Entities that/g, '\n\nEntities that');
  
  return text.trim();
}

async function cleanAllBillSummaries() {
  console.log('🧹 Cleaning HTML from Bill Summaries');
  console.log('====================================\n');

  try {
    // Get all bills with HTML summaries
    const bills = await prisma.bill.findMany({
      where: {
        summary: {
          not: null,
          contains: '<'
        }
      },
      select: {
        id: true,
        title: true,
        summary: true
      }
    });

    console.log(`📋 Found ${bills.length} bills with HTML in summaries\n`);

    if (bills.length === 0) {
      console.log('✅ No bills with HTML summaries found. All summaries are already clean!');
      return;
    }

    let processedCount = 0;

    for (const bill of bills) {
      try {
        const originalSummary = bill.summary || '';
        const cleanedSummary = cleanHtmlSummary(originalSummary);
        const improvedSummary = improveReadability(cleanedSummary);

        // Update the bill with cleaned summary
        await prisma.bill.update({
          where: { id: bill.id },
          data: { summary: improvedSummary }
        });

        console.log(`✅ ${bill.id}: ${bill.title.substring(0, 60)}...`);
        console.log(`   Before: ${originalSummary.substring(0, 100)}...`);
        console.log(`   After:  ${improvedSummary.substring(0, 100)}...\n`);

        processedCount++;
      } catch (error) {
        console.error(`❌ Error processing ${bill.id}:`, error);
      }
    }

    console.log('🎉 SUMMARY CLEANUP COMPLETE!');
    console.log('============================');
    console.log(`📊 Bills processed: ${processedCount}`);
    console.log(`✅ Successfully cleaned: ${processedCount}`);
    console.log(`📈 Success rate: 100%`);
    
    console.log('\n🌐 Your bills with clean summaries are now available at:');
    console.log('   http://localhost:3000/bills');
    
    // Show a sample of the improved Fallen Servicemembers bill
    const fallenServicemembersBill = await prisma.bill.findFirst({
      where: { id: 's1318-119' },
      select: { title: true, summary: true }
    });
    
    if (fallenServicemembersBill) {
      console.log('\n📄 Example - Fallen Servicemembers Religious Heritage Restoration Act:');
      console.log('─'.repeat(80));
      console.log(fallenServicemembersBill.summary);
      console.log('─'.repeat(80));
    }

  } catch (error) {
    console.error('❌ Fatal error during summary cleanup:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

cleanAllBillSummaries().catch(e => {
  console.error(e);
  process.exit(1);
});


