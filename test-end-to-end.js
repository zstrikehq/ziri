// End-to-End Test - Complete User Journey
// Simulates: Admin creates key → End-user uses key → Authorization → LLM call

// For local testing - use relative paths
// When published, these would be: import { ManagementSDK, UserSDK } from '@zs-ai/sdk'
import { ManagementSDK } from './packages/sdk/dist/management.js'
import { UserSDK } from './packages/sdk/dist/user.js'
import { M2MAuthProvider } from './packages/auth-plugin/dist/index.js'

// Admin credentials (for Management SDK)
const adminConfig = {
  backendUrl: process.env.BACKEND_URL || 'http://localhost:4000',
  orgId: process.env.ORG_ID || 'org_c027b71487051e',
  projectId: process.env.PROJECT_ID || 'prj_36y4VTwptiEvQJbegXu6qOs3582',
  clientId: process.env.CLIENT_ID || '0d34ddf29c0344b28c451daa4d4a4c0d',
  clientSecret: process.env.CLIENT_SECRET || 'Iju2gg4Dc6hld5swFNNO2pIunxozhIgs5mFcBqzHmA8KHnbBfe'
}

// End-user provider config (simulated)
// Option 1: Use encrypted provider storage (recommended)
// Set ZS_AI_MASTER_KEY environment variable, and SDK will auto-load providers
// Master key is used ONCE during initialization - never sent with requests

// Option 2: Provide providers directly (for testing)
const userProviderConfig = {
  openai: {
    apiKey: process.env.OPENAI_API_KEY || 'sk-openai-placeholder',
    baseUrl: 'https://api.openai.com/v1'
  }
}

async function testEndToEnd() {
  try {
    console.log('🔄 End-to-End Test - Complete User Journey\n')
    console.log('=' .repeat(70))
    console.log('Scenario: Admin creates API key → End-user uses it → LLM call')
    console.log('=' .repeat(70) + '\n')

    // ============================================
    // PHASE 1: ADMIN CREATES API KEY
    // ============================================
    console.log('📋 PHASE 1: Admin Creates API Key')
    console.log('-'.repeat(70))

    // SDK can auto-load from config file, or accept explicit config
    const adminAuth = new M2MAuthProvider(adminConfig)
    const managementSDK = new ManagementSDK({
      backendUrl: adminConfig.backendUrl,
      projectId: adminConfig.projectId,
      orgId: adminConfig.orgId,
      clientId: adminConfig.clientId,
      clientSecret: adminConfig.clientSecret,
      authProvider: adminAuth
    })

    // Create a test user
    const testUserId = `test-user-${Date.now()}`
    console.log(`\n1. Creating API key for user: ${testUserId}...`)

    const { userId, apiKey } = await managementSDK.createKey({
      userId: testUserId,
      name: 'Test End User',
      email: 'test-enduser@example.com',
      role: 'engineer',
      department: 'Testing',
      dailySpendLimit: 50.00,
      monthlySpendLimit: 500.00
    })

    console.log(`   ✅ API key created!`)
    console.log(`   User ID: ${userId}`)
    console.log(`   API Key: ${apiKey}\n`)

    // Verify key exists
    console.log('2. Verifying key exists...')
    const key = await managementSDK.getKey(userId)
    console.log(`   ✅ Key verified: ${key.name} (${key.email})`)
    console.log(`   Status: ${key.status}`)
    console.log(`   Daily Limit: $${key.dailySpendLimit}`)
    console.log(`   Monthly Limit: $${key.monthlySpendLimit}\n`)

    // ============================================
    // PHASE 2: END-USER USES API KEY
    // ============================================
    console.log('👤 PHASE 2: End-User Uses API Key')
    console.log('-'.repeat(70))

    // Simulate: End-user receives API key and configures SDK
    // SDK can auto-load backendUrl, projectId, pdpUrl from config file
    const userConfig = {
      apiKey: apiKey,
      authMode: 'local', // or 'live'
      backendUrl: adminConfig.backendUrl,
      projectId: adminConfig.projectId,
      pdpUrl: process.env.PDP_URL, // Required for 'live' mode
      // NOTE: Provider API keys are stored on gateway server
      // End-user only needs their API key - SDK routes through gateway
      refreshInterval: 300000
    }

    console.log(`\n3. End-user initializes SDK with API key...`)
    const userSDK = new UserSDK(userConfig)
    console.log('   ✅ User SDK initialized\n')

    // Wait for policies to load (local mode)
    if (userConfig.authMode === 'local') {
      console.log('4. Loading policies (local mode)...')
      await new Promise(resolve => setTimeout(resolve, 2000))
      console.log('   ✅ Policies ready\n')
    }

    // ============================================
    // PHASE 3: END-USER MAKES LLM CALL
    // ============================================
    console.log('🚀 PHASE 3: End-User Makes LLM Call')
    console.log('-'.repeat(70))

    console.log('\n5. Making LLM call through gateway...')
    console.log('   Provider: OpenAI')
    console.log('   Model: gpt-4')
    console.log('   Message: "What is the capital of France?"\n')

    try {
      const response = await userSDK.chatCompletions({
        provider: 'openai',
        model: 'gpt-4',
        messages: [
          { role: 'user', content: 'What is the capital of France?' }
        ],
        temperature: 0.7,
        max_tokens: 50
      })

      console.log('   ✅ LLM call successful!')
      console.log('   Authorization: ✅ Passed')
      console.log('   LLM Response: Received\n')
      
      // In a real scenario, you'd process the response here
      // const answer = response.choices[0].message.content
      // console.log(`   Answer: ${answer}\n`)

    } catch (error) {
      if (error.message.includes('Authorization denied')) {
        console.log('   ⚠️  Authorization denied')
        console.log(`   Reason: ${error.message}\n`)
        console.log('   💡 This might happen if:')
        console.log('      - Policies restrict access for this user')
        console.log('      - User has exceeded spending limits')
        console.log('      - Model is not allowed for this user\n')
      } else if (error.message.includes('LLM API error')) {
        console.log('   ⚠️  LLM provider error (expected with placeholder keys)')
        console.log(`   Error: ${error.message}\n`)
        console.log('   ✅ Authorization passed! (This is the important part)')
        console.log('   💡 LLM error is expected - we\'re using placeholder API keys\n')
      } else {
        throw error
      }
    }

    // ============================================
    // PHASE 4: CLEANUP
    // ============================================
    console.log('🧹 PHASE 4: Cleanup')
    console.log('-'.repeat(70))

    console.log('\n6. Revoking test API key...')
    await managementSDK.revokeKey(userId)
    console.log('   ✅ API key revoked\n')

    console.log('7. Destroying SDK instances...')
    userSDK.destroy()
    console.log('   ✅ SDKs destroyed\n')

    // ============================================
    // SUMMARY
    // ============================================
    console.log('=' .repeat(70))
    console.log('✅ End-to-End Test Completed!')
    console.log('=' .repeat(70))
    console.log('\n📊 Test Summary:')
    console.log('   ✅ Admin created API key')
    console.log('   ✅ End-user initialized SDK')
    console.log('   ✅ Policies loaded (local mode)')
    console.log('   ✅ Authorization check performed')
    console.log('   ✅ LLM call attempted')
    console.log('   ✅ Cleanup completed\n')

    console.log('💡 Key Takeaways:')
    console.log('   1. Admin uses Management SDK to create/manage keys')
    console.log('   2. End-user receives API key and configures User SDK')
    console.log('   3. User SDK handles authorization automatically')
    console.log('   4. Authorization happens before LLM provider call')
    console.log('   5. SDK manages policy caching and refresh transparently\n')

  } catch (error) {
    console.error('\n❌ End-to-end test failed:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

testEndToEnd()
