#!/usr/bin/env tsx

/**
 * Complete Congress.gov Scraper CLI v2
 * Production-ready scraper with multiple strategies and comprehensive error handling
 */

import { scrapeCongressBillsV2 } from './congress-scraper-v2';

async function main() {
  console.log('🏛️ Congress.gov Complete Web Scraper v2\n');
  
  const args = process.argv.slice(2);
  const limit = args[0] ? parseInt(args[0]) : 25;
  
  if (isNaN(limit) || limit < 1 || limit > 200) {
    console.error('❌ Invalid limit. Please provide a number between 1 and 200.');
    console.error('Usage: npm run etl:scrape-v2 [limit]');
    process.exit(1);
  }
  
  console.log(`🎯 Target: ${limit} most recent bills from congress.gov`);
  console.log('🔄 Using multiple scraping strategies for maximum success');
  console.log('⏳ This will take several minutes due to rate limiting...\n');
  
  try {
    const startTime = Date.now();
    
    console.log('🚀 Phase 1: Multi-strategy bill discovery');
    console.log('   • Advanced search with multiple selectors');
    console.log('   • Simple listing approach');
    console.log('   • RSS/XML feed parsing');
    console.log('   • Fallback strategies\n');
    
    const bills = await scrapeCongressBillsV2(limit);
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(1);
    
    console.log(`\n🎉 SCRAPING COMPLETED SUCCESSFULLY!`);
    console.log(`\n📊 FINAL RESULTS:`);
    console.log(`   📋 Bills scraped: ${bills.length}`);
    console.log(`   ⏱️  Total time: ${duration} seconds`);
    console.log(`   📈 Average rate: ${(bills.length / parseFloat(duration)).toFixed(2)} bills/second`);
    
    if (bills.length > 0) {
      console.log(`\n📋 SAMPLE OF SCRAPED BILLS:`);
      bills.slice(0, 8).forEach((bill, index) => {
        const chamber = bill.chamber === 'house' ? 'H.R.' : 'S.';
        const billNum = bill.id.split('-')[0].replace(/[a-z]/g, '');
        console.log(`   ${index + 1}. ${chamber}${billNum} - ${bill.title}`);
        console.log(`      Status: ${bill.status} | Subjects: ${bill.subjects.slice(0, 3).join(', ')}`);
      });
      
      if (bills.length > 8) {
        console.log(`   ... and ${bills.length - 8} more bills`);
      }
      
      console.log(`\n📊 BILL BREAKDOWN:`);
      const houseBills = bills.filter(b => b.chamber === 'house').length;
      const senateBills = bills.filter(b => b.chamber === 'senate').length;
      console.log(`   🏛️ House bills: ${houseBills}`);
      console.log(`   🏛️ Senate bills: ${senateBills}`);
      
      const statusCounts: { [key: string]: number } = {};
      bills.forEach(bill => {
        statusCounts[bill.status] = (statusCounts[bill.status] || 0) + 1;
      });
      
      console.log(`\n📈 STATUS DISTRIBUTION:`);
      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`   • ${status}: ${count} bills`);
      });
      
      const subjectCounts: { [key: string]: number } = {};
      bills.forEach(bill => {
        bill.subjects.forEach(subject => {
          subjectCounts[subject] = (subjectCounts[subject] || 0) + 1;
        });
      });
      
      console.log(`\n🏷️ TOP SUBJECTS:`);
      Object.entries(subjectCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .forEach(([subject, count]) => {
          console.log(`   • ${subject}: ${count} bills`);
        });
    }
    
    console.log(`\n🎯 NEXT STEPS:`);
    console.log(`   1. Visit your bills page: http://localhost:3001/bills`);
    console.log(`   2. Filter by chamber, status, or subject`);
    console.log(`   3. Click through to Congress.gov for full details`);
    console.log(`   4. Run again anytime to get the latest bills`);
    
    if (bills.length < limit) {
      console.log(`\n⚠️  NOTE: Found ${bills.length} bills out of ${limit} requested.`);
      console.log(`   This is normal - congress.gov may have fewer recent bills available.`);
      console.log(`   The scraper tried multiple strategies to maximize results.`);
    }
    
  } catch (error) {
    console.error('\n❌ SCRAPING FAILED:', error);
    console.error('\n🔧 TROUBLESHOOTING TIPS:');
    console.error('   1. Check your internet connection');
    console.error('   2. Try a smaller limit (e.g., 10-15 bills)');
    console.error('   3. Congress.gov may be temporarily unavailable');
    console.error('   4. Run with --verbose for detailed error logs');
    process.exit(1);
  }
}

// Handle help and verbose flags
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
🏛️ Congress.gov Complete Web Scraper v2

DESCRIPTION:
  Production-ready scraper that uses multiple strategies to extract
  the most recent bills from congress.gov with comprehensive error handling.

USAGE:
  npm run etl:scrape-v2 [limit]
  npx tsx etl/scrape-congress-v2.ts [limit]

ARGUMENTS:
  limit    Number of bills to scrape (default: 25, max: 200)

EXAMPLES:
  npm run etl:scrape-v2           # Scrape 25 bills (recommended)
  npm run etl:scrape-v2 50        # Scrape 50 bills
  npm run etl:scrape-v2 10        # Quick test with 10 bills

FEATURES:
  ✅ Multiple scraping strategies for maximum success rate
  ✅ Advanced search with flexible selectors
  ✅ RSS/XML feed parsing as fallback
  ✅ Comprehensive error handling and retries
  ✅ Rate limiting to respect congress.gov servers
  ✅ Automatic deduplication of results
  ✅ Enhanced bill details extraction
  ✅ Smart subject categorization
  ✅ Database integration with your existing schema

STRATEGIES USED:
  1. Advanced Search: Uses congress.gov search with multiple selector strategies
  2. Simple Listing: Browses bill listings with flexible parsing
  3. RSS Feeds: Parses XML feeds for recent bill updates
  4. Fallback Methods: Additional strategies if primary methods fail

RATE LIMITING:
  The scraper includes 3-second delays between requests to be respectful
  to congress.gov servers. This means scraping will take time but be reliable.

OUTPUT:
  Bills are automatically saved to your database and will appear on your
  bills page at http://localhost:3001/bills mixed with existing content.

RELIABILITY:
  The scraper tries multiple approaches and gracefully handles failures.
  Even if some strategies fail, you'll get results from successful ones.
  `);
  process.exit(0);
}

// Set verbose logging if requested
if (process.argv.includes('--verbose') || process.argv.includes('-v')) {
  process.env.DEBUG = 'true';
}

// Run the main function
main().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
