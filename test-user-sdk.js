import { UserSDK } from './packages/sdk/dist/user.js'

// Configuration - replace with your actual values
const config = {
  apiKey: process.env.API_KEY || 'sk-zs-user-9259215e3f452dfd-1bfdf4eaae0f2477',  // Your API key
  proxyUrl: process.env.PROXY_URL || 'http://localhost:3100',  // Proxy server URL
  userId: process.env.USER_ID || 'user-9259215e3f452dfd',  // User ID (optional, can be extracted from API key)
  password: process.env.USER_PASSWORD || 'bJJbXVEAbJK6dsrJ'  // User password for login
}

async function testSDK() {
  try {
    console.log('🧪 Testing User SDK (Local Build)\n')
    console.log('=' .repeat(60))
    
    // Step 1: Initialize SDK
    console.log('1️⃣  Initializing User SDK...')
    const sdk = new UserSDK(config)
    console.log('   ✅ SDK initialized')
    console.log(`   Proxy URL: ${config.proxyUrl}`)
    console.log(`   API Key: ${config.apiKey.substring(0, 20)}...\n`)
    
    // Step 2: Make chat completion request
    // SDK will automatically:
    // - Login if password provided (or use existing tokens)
    // - Include JWT token and API key in request
    // - Handle token refresh if needed
    console.log('2️⃣  Making chat completion request...')
    console.log('   Provider: openai')
    console.log('   Model: gpt-3.5-turbo\n')
    
    const response = await sdk.chatCompletions({
      provider: 'openai',
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'user', content: 'Hello, how are you?' }
      ],
      temperature: 0.7,
      max_tokens: 100
    })
    
    console.log('   ✅ Request successful!')
    console.log('   Response:', JSON.stringify(response, null, 2).substring(0, 200) + '...\n')
    
    // Step 3: Test another request (should use cached token)
    console.log('3️⃣  Making second request (should use cached token)...')
    const response2 = await sdk.chatCompletions({
      provider: 'openai',
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'user', content: 'What is 2+2?' }
      ]
    })
    
    console.log('   ✅ Second request successful (token reused)\n')
    
    // Cleanup
    console.log('4️⃣  Cleaning up...')
    sdk.destroy()
    console.log('   ✅ SDK destroyed\n')
    
    console.log('=' .repeat(60))
    console.log('✅ SDK test completed successfully!')
    console.log('=' .repeat(60))
    
  } catch (error) {
    console.error('\n❌ Test failed:', error)
    if (error.response) {
      console.error('   Status:', error.response.status)
      console.error('   Response:', await error.response.text())
    }
    console.error(error.stack)
    process.exit(1)
  }
}

testSDK()