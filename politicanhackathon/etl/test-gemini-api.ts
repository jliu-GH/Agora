import { GoogleGenerativeAI } from '@google/generative-ai';

async function testGeminiAPI() {
  console.log('🧪 TESTING GEMINI API...');
  console.log('========================');
  
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY;
  
  if (!apiKey) {
    console.log('❌ No Gemini API key found in environment variables');
    console.log('💡 Please set GEMINI_API_KEY or GOOGLE_GEMINI_API_KEY');
    console.log('🔗 Get one from: https://makersuite.google.com/app/apikey');
    return false;
  }

  try {
    console.log('🔑 API key found, testing connection...');
    
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = "Hello! Can you respond with 'Gemini API is working correctly' if you receive this message?";
    
    console.log('📡 Sending test prompt...');
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log('✅ Gemini API Response:', text);
    console.log('🎉 Gemini API is working correctly!');
    
    return true;
  } catch (error) {
    console.log('❌ Gemini API test failed:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        console.log('💡 This looks like an API key issue. Please check:');
        console.log('   1. Your API key is correct');
        console.log('   2. The API key has the correct permissions');
        console.log('   3. Billing is enabled for your Google Cloud project');
      }
    }
    
    return false;
  }
}

// Allow this to be run directly
if (require.main === module) {
  testGeminiAPI().catch(console.error);
}

export { testGeminiAPI };
