import { aggregateBillsFromAllSources } from './multi-source-aggregator';

async function main() {
  console.log('🏛️ Multi-Source Congressional Bill Aggregator');
  console.log('============================================\n');
  
  const limit = parseInt(process.argv[2] || '25');
  console.log(`📊 Fetching ${limit} bills from multiple sources...`);
  
  const startTime = Date.now();
  
  try {
    const result = await aggregateBillsFromAllSources(limit);
    
    const endTime = Date.now();
    const timeTaken = (endTime - startTime) / 1000;
    
    console.log('\n🎉 AGGREGATION COMPLETE!');
    console.log('========================');
    console.log(`📈 Total bills collected: ${result.bills.length}`);
    console.log(`⏱️ Time taken: ${timeTaken.toFixed(1)} seconds`);
    console.log(`🔄 Sources used:`);
    
    result.sources.forEach(source => {
      const emoji = source.success ? '✅' : '❌';
      console.log(`   ${emoji} ${source.source}: ${source.count} bills`);
      if (source.error) {
        console.log(`      Error: ${source.error}`);
      }
    });
    
    console.log('\n🌐 Your bills are now available at:');
    console.log('   http://localhost:3000/bills');
    
    console.log('\n💡 To get API keys for better coverage:');
    console.log('   • Congress.gov API: https://api.congress.gov/sign-up/');
    console.log('   • ProPublica API: https://www.propublica.org/datastore/api/propublica-congress-api');
    
  } catch (error) {
    console.error('❌ Fatal error during aggregation:', error);
    process.exit(1);
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});


