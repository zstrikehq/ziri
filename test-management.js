// Test Management SDK
// For local testing - use relative paths
// When published, these would be: import { ManagementSDK } from '@zs-ai/sdk'
import { ManagementSDK } from './packages/sdk/dist/management.js'
import { M2MAuthProvider } from './packages/auth-plugin/dist/index.js'

// Replace with your actual credentials
const config = {
  backendUrl: process.env.BACKEND_URL || 'https://api-dev.authzebra.com',
  orgId: process.env.ORG_ID || 'org_c027b71487051e',
  projectId: process.env.PROJECT_ID || 'prj_36y4VTwptiEvQJbegXu6qOs3582',
  clientId: process.env.CLIENT_ID || '0d34ddf29c0344b28c451daa4d4a4c0d',
  clientSecret: process.env.CLIENT_SECRET || 'Iju2gg4Dc6hld5swFNNO2pIunxozhIgs5mFcBqzHmA8KHnbBfe'
}

// SDK can auto-load from config file, or accept explicit config
const auth = new M2MAuthProvider(config)
const sdk = new ManagementSDK({
  backendUrl: config.backendUrl,
  projectId: config.projectId,
  orgId: config.orgId,
  clientId: config.clientId,
  clientSecret: config.clientSecret,
  authProvider: auth
})

// Alternative: SDK can auto-load from config file
// const sdk = new ManagementSDK() // Will read from ~/.zs-ai/config.json

async function test() {
  try {
    console.log('📋 Testing Management SDK...\n')

    // Test 1: List Keys
    console.log('1. Listing keys...')
    const keys = await sdk.listKeys()
    console.log(`   ✅ Found ${keys.length} keys`)
    if (keys.length > 0) {
      console.log(`   Sample: ${keys[0].userId} (${keys[0].status})`)
    }

    // Test 2: List Policies
    console.log('\n2. Listing policies...')
    const policies = await sdk.listPolicies()
    console.log(`   ✅ Found ${policies.length} policies`)
    if (policies.length > 0) {
      console.log(`   Sample: ${policies[0].description}`)
    }

    // Test 3: Get Schema
    console.log('\n3. Getting schema...')
    const schema = await sdk.getSchema()
    console.log(`   ✅ Schema version: ${schema.version}`)

    // Test 4: Create Test Key (optional - uncomment to test)
    /*
    console.log('\n4. Creating test key...')
    const testUserId = `test-${Date.now()}`
    const { userId, apiKey } = await sdk.createKey({
      userId: testUserId,
      name: 'Test User',
      email: 'test@example.com',
      role: 'engineer',
      department: 'Testing',
      dailySpendLimit: 10.00,
      monthlySpendLimit: 100.00
    })
    console.log(`   ✅ Key created: ${userId}`)
    console.log(`   API Key: ${apiKey}`)

    // Test 5: Get Created Key
    console.log('\n5. Getting created key...')
    const key = await sdk.getKey(userId)
    console.log(`   ✅ Key retrieved: ${key.name} (${key.email})`)

    // Test 6: Revoke Test Key (cleanup)
    console.log('\n6. Revoking test key...')
    await sdk.revokeKey(userId)
    console.log('   ✅ Key revoked')
    */

    console.log('\n✅ Management SDK test passed!')
  } catch (error) {
    console.error('\n❌ Test failed:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

test()
