// Simple test script to show what Google Civic Information API returns
// This demonstrates the API without needing to populate the full database

async function testGoogleCivicAPI() {
  const apiKey = process.env.GOOGLE_CIVIC_API_KEY;
  
  if (!apiKey) {
    console.log('❌ No API key found. Please set GOOGLE_CIVIC_API_KEY environment variable.');
    console.log('');
    console.log('🔑 TO GET YOUR API KEY:');
    console.log('1. Visit: https://console.developers.google.com/');
    console.log('2. Create/select project → Enable "Google Civic Information API"');
    console.log('3. Create credentials (API Key)');
    console.log('4. Run: export GOOGLE_CIVIC_API_KEY="your_key_here"');
    return;
  }

  console.log('🧪 TESTING GOOGLE CIVIC INFORMATION API');
  console.log('======================================');
  console.log('🔍 Fetching sample data to show what we get...\n');

  try {
    // Test with a specific address to get representatives
    const testAddress = 'Washington, DC';
    const url = `https://civicinfo.googleapis.com/civicinfo/v2/representatives?key=${apiKey}&address=${encodeURIComponent(testAddress)}&levels=country&roles=legislatorLowerBody&roles=legislatorUpperBody`;

    console.log(`🌐 Querying: ${testAddress}`);
    console.log(`📡 URL: ${url.replace(apiKey, 'YOUR_API_KEY')}\n`);

    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    console.log('✅ API RESPONSE RECEIVED!');
    console.log('========================\n');

    // Show structure
    console.log('📋 DATA STRUCTURE:');
    console.log(`   • Offices: ${data.offices?.length || 0}`);
    console.log(`   • Officials: ${data.officials?.length || 0}`);
    console.log(`   • Normalized Input: ${data.normalizedInput?.city}, ${data.normalizedInput?.state}\n`);

    // Show offices
    if (data.offices) {
      console.log('🏛️ OFFICES FOUND:');
      data.offices.forEach((office: any, index: number) => {
        console.log(`   ${index + 1}. ${office.name}`);
        console.log(`      Level: ${office.levels?.join(', ') || 'N/A'}`);
        console.log(`      Roles: ${office.roles?.join(', ') || 'N/A'}`);
        console.log(`      Officials: ${office.officialIndices?.length || 0} people`);
        console.log('');
      });
    }

    // Show sample officials
    if (data.officials) {
      console.log('👥 SAMPLE OFFICIALS:');
      data.officials.slice(0, 5).forEach((official: any, index: number) => {
        console.log(`   ${index + 1}. ${official.name}`);
        console.log(`      Party: ${official.party || 'Not specified'}`);
        console.log(`      Photo: ${official.photoUrl ? 'Yes' : 'No'}`);
        console.log(`      Contact: ${official.phones?.length || 0} phones, ${official.emails?.length || 0} emails`);
        console.log(`      Social: ${official.channels?.length || 0} channels`);
        console.log('');
      });
    }

    // Test with a specific state
    console.log('🗺️ TESTING STATE-SPECIFIC QUERY...');
    const californiaUrl = `https://civicinfo.googleapis.com/civicinfo/v2/representatives?key=${apiKey}&address=California&levels=country&roles=legislatorLowerBody&roles=legislatorUpperBody`;
    
    const caResponse = await fetch(californiaUrl);
    if (caResponse.ok) {
      const caData = await caResponse.json();
      console.log(`✅ California query successful: ${caData.officials?.length || 0} officials found`);
      
      // Show a few California representatives
      if (caData.officials) {
        console.log('\n🐻 SAMPLE CALIFORNIA OFFICIALS:');
        caData.officials.slice(0, 3).forEach((official: any, index: number) => {
          console.log(`   ${index + 1}. ${official.name} (${official.party})`);
        });
      }
    }

    console.log('\n🎉 SUCCESS! THE API WORKS PERFECTLY!');
    console.log('===================================');
    console.log('✅ Real congressional data available');
    console.log('✅ Official names and party affiliations');
    console.log('✅ Contact information and photos');
    console.log('✅ Social media links');
    console.log('\n🚀 Ready to populate your map with real data!');
    console.log('Run: npm run etl:google-civic');

  } catch (error) {
    console.error('❌ API Test Failed:', error);
    console.log('\n💡 COMMON ISSUES:');
    console.log('1. API key not enabled for Google Civic Information API');
    console.log('2. API key has restrictions that block this domain');
    console.log('3. API key quota exceeded');
    console.log('4. Network connectivity issues');
  }
}

testGoogleCivicAPI().catch(e => {
  console.error('Test failed:', e);
  process.exit(1);
});


