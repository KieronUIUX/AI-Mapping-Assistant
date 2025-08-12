// Simple test script to verify AI integration
// Run this after setting up your OpenAI API key

const testAI = async () => {
  try {
    const response = await fetch('http://localhost:8888/.netlify/functions/ai-chat-simple', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: "Hello! Can you help me map some CSV columns?",
        csvColumns: ["customer_name", "email", "phone", "address"],
        captions: ["Customer Name", "Email Address", "Phone Number", "Street Address"],
        currentMappings: {}
      }),
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ AI Response:', data.content);
      if (data.mappingSuggestion) {
        console.log('✅ Mapping Suggestion:', data.mappingSuggestion);
      }
    } else {
      console.log('❌ Error:', response.status, response.statusText);
    }
  } catch (error) {
    console.log('❌ Connection error:', error.message);
  }
};

console.log('🧪 Testing AI Integration...');
console.log('Make sure to:');
console.log('1. Create a .env file with your OPENAI_API_KEY');
console.log('2. Run: netlify dev');
console.log('3. Then run this test script\n');

testAI();
