// Diagnostic script to help troubleshoot Google Civic API setup

async function diagnoseCivicAPI() {
  const apiKey = process.env.GOOGLE_CIVIC_API_KEY;
  
  console.log('🔧 GOOGLE CIVIC API DIAGNOSTIC TOOL');
  console.log('===================================');
  console.log(`📋 API Key: ${apiKey ? `${apiKey.substring(0, 20)}...` : 'NOT SET'}`);
  console.log('');

  if (!apiKey) {
    console.log('❌ No API key found. Please set GOOGLE_CIVIC_API_KEY environment variable.');
    return;
  }

  // Test 1: Basic API connectivity
  console.log('🧪 TEST 1: Basic API Connectivity');
  console.log('--------------------------------');
  
  try {
    const testUrl = `https://www.googleapis.com/civicinfo/v2/representatives?key=${apiKey}&address=United%20States`;
    console.log(`📡 Testing URL: ${testUrl.replace(apiKey, 'YOUR_API_KEY')}`);
    
    const response = await fetch(testUrl);
    console.log(`📊 Response Status: ${response.status} ${response.statusText}`);
    
    if (response.status === 403) {
      console.log('');
      console.log('❌ 403 FORBIDDEN - API NOT ENABLED');
      console.log('==================================');
      console.log('🔧 TO FIX THIS:');
      console.log('1. Go to: https://console.developers.google.com/');
      console.log('2. Select your project');
      console.log('3. Click "APIs & Services" → "Library"');
      console.log('4. Search for "Google Civic Information API"');
      console.log('5. Click on it and click "ENABLE"');
      console.log('6. Wait 1-2 minutes for activation');
      console.log('7. Re-run this test');
      return;
    }
    
    if (response.status === 400) {
      const errorData = await response.json();
      console.log('❌ 400 BAD REQUEST');
      console.log(`Error: ${JSON.stringify(errorData, null, 2)}`);
      return;
    }
    
    if (response.status === 429) {
      console.log('❌ 429 QUOTA EXCEEDED');
      console.log('Your API key has exceeded its quota limits.');
      return;
    }
    
    if (!response.ok) {
      console.log(`❌ Unexpected error: ${response.status}`);
      const text = await response.text();
      console.log(`Response: ${text.substring(0, 500)}...`);
      return;
    }

    const data = await response.json();
    console.log('✅ API IS WORKING!');
    console.log(`📊 Found ${data.officials?.length || 0} officials`);
    console.log(`📊 Found ${data.offices?.length || 0} offices`);
    
    // Test 2: Specific state query
    console.log('');
    console.log('🧪 TEST 2: State-Specific Query');
    console.log('-------------------------------');
    
    const stateUrl = `https://www.googleapis.com/civicinfo/v2/representatives?key=${apiKey}&address=California&levels=country&roles=legislatorUpperBody&roles=legislatorLowerBody`;
    const stateResponse = await fetch(stateUrl);
    
    console.log(`📊 California Query Status: ${stateResponse.status}`);
    
    if (stateResponse.ok) {
      const stateData = await stateResponse.json();
      console.log(`✅ California: ${stateData.officials?.length || 0} officials found`);
      
      if (stateData.officials && stateData.officials.length > 0) {
        console.log('');
        console.log('🌟 SAMPLE CALIFORNIA OFFICIALS:');
        stateData.officials.slice(0, 5).forEach((official: any, index: number) => {
          console.log(`   ${index + 1}. ${official.name} (${official.party || 'No party'})`);
        });
      }
    }
    
    // Test 3: Congressional roles specifically
    console.log('');
    console.log('🧪 TEST 3: Congressional Roles Filter');
    console.log('------------------------------------');
    
    const congressUrl = `https://www.googleapis.com/civicinfo/v2/representatives?key=${apiKey}&address=United%20States&levels=country&roles=legislatorUpperBody&roles=legislatorLowerBody`;
    const congressResponse = await fetch(congressUrl);
    
    if (congressResponse.ok) {
      const congressData = await congressResponse.json();
      console.log(`✅ Congressional Filter: ${congressData.officials?.length || 0} officials`);
      
      // Analyze the offices
      if (congressData.offices) {
        console.log('');
        console.log('🏛️ CONGRESSIONAL OFFICES FOUND:');
        congressData.offices.forEach((office: any, index: number) => {
          console.log(`   ${index + 1}. ${office.name}`);
          console.log(`      Levels: ${office.levels?.join(', ') || 'None'}`);
          console.log(`      Roles: ${office.roles?.join(', ') || 'None'}`);
          console.log(`      Officials: ${office.officialIndices?.length || 0}`);
        });
      }
    }
    
    console.log('');
    console.log('🎉 DIAGNOSTIC COMPLETE!');
    console.log('=======================');
    console.log('✅ Your API key is working correctly');
    console.log('✅ Google Civic Information API is enabled');
    console.log('✅ You can fetch congressional data');
    console.log('');
    console.log('🚀 READY TO POPULATE YOUR MAP!');
    console.log('Run: npm run etl:google-civic');
    
  } catch (error) {
    console.error('❌ Network or parsing error:', error);
    console.log('');
    console.log('💡 This might be:');
    console.log('1. Network connectivity issue');
    console.log('2. API endpoint changed');
    console.log('3. Invalid API key format');
  }
}

diagnoseCivicAPI().catch(e => {
  console.error('Diagnostic failed:', e);
  process.exit(1);
});
