#!/usr/bin/env tsx

/**
 * Update Bills Script
 * Scrapes the latest bills from congress.gov and updates the database
 */

import { scrapeBillsFromCongress } from './congress-bills';

async function main() {
  console.log('🏛️ Starting Congress.gov Bill Scraper...\n');
  
  const args = process.argv.slice(2);
  const limit = args[0] ? parseInt(args[0]) : 50;
  
  if (isNaN(limit) || limit < 1 || limit > 200) {
    console.error('❌ Invalid limit. Please provide a number between 1 and 200.');
    process.exit(1);
  }
  
  console.log(`📊 Scraping ${limit} most recent bills from congress.gov...`);
  console.log('⏳ This may take a few minutes...\n');
  
  try {
    const startTime = Date.now();
    
    const bills = await scrapeBillsFromCongress(limit);
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(1);
    
    console.log(`\n✅ Scraping completed successfully!`);
    console.log(`📈 Results:`);
    console.log(`   • Bills scraped: ${bills.length}`);
    console.log(`   • Time taken: ${duration} seconds`);
    console.log(`   • Average: ${(bills.length / parseFloat(duration)).toFixed(1)} bills/second`);
    
    if (bills.length > 0) {
      console.log(`\n📋 Sample bills scraped:`);
      bills.slice(0, 5).forEach((bill, index) => {
        console.log(`   ${index + 1}. ${bill.title} (${bill.status})`);
      });
      
      if (bills.length > 5) {
        console.log(`   ... and ${bills.length - 5} more bills`);
      }
    }
    
    console.log(`\n🎯 Your bills page should now show the latest legislation from Congress!`);
    console.log(`   Visit: http://localhost:3001/bills`);
    
  } catch (error) {
    console.error('❌ Error during bill scraping:', error);
    process.exit(1);
  }
}

// Handle script arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
🏛️ Congress.gov Bill Scraper

Usage:
  tsx etl/update-bills.ts [limit]

Arguments:
  limit    Number of bills to scrape (default: 50, max: 200)

Examples:
  tsx etl/update-bills.ts         # Scrape 50 bills
  tsx etl/update-bills.ts 100     # Scrape 100 bills
  tsx etl/update-bills.ts 25      # Scrape 25 bills

This script will:
1. Scrape the most recent bills from congress.gov
2. Extract titles, summaries, sponsors, and status
3. Save them to your database in the same format as existing bills
4. Update your /bills page with fresh legislative data

The scraper respects rate limits and includes retry logic for reliability.
  `);
  process.exit(0);
}

// Run the main function
main().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
