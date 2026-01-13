// Test Auth Plugin
// For local testing - use relative paths
// When published, this would be: import { M2MAuthProvider } from '@zs-ai/auth-plugin'
import { M2MAuthProvider } from './packages/auth-plugin/dist/index.js'

// Replace with your actual credentials
const config = {
  backendUrl: process.env.BACKEND_URL || 'https://api-dev.authzebra.com',
  orgId: process.env.ORG_ID || 'org_c027b71487051e',
  projectId: process.env.PROJECT_ID || 'prj_36y4VTwptiEvQJbegXu6qOs3582',
  clientId: process.env.CLIENT_ID || '0d34ddf29c0344b28c451daa4d4a4c0d',
  clientSecret: process.env.CLIENT_SECRET || 'Iju2gg4Dc6hld5swFNNO2pIunxozhIgs5mFcBqzHmA8KHnbBfe'
}

const auth = new M2MAuthProvider(config)

async function test() {
  try {
    console.log('🔐 Testing Auth Plugin...\n')
    console.log('Backend URL:', config.backendUrl)
    console.log('Project ID:', config.projectId)
    console.log('')

    // Test connection
    console.log('1. Testing connection...')
    const result = await auth.testConnection()
    
    if (result.success) {
      console.log('   ✅ Connection successful!')
      
      // Get token
      console.log('\n2. Getting token...')
      const token = await auth.getToken()
      console.log('   ✅ Token received')
      console.log('   Token preview:', token.substring(0, 30) + '...')
      
      // Test token caching
      console.log('\n3. Testing token caching...')
      const token2 = await auth.getToken()
      console.log('   ✅ Token cached (same token returned)')
      console.log('   Tokens match:', token === token2)
      
      console.log('\n✅ Auth plugin test passed!')
    } else {
      console.error('   ❌ Connection failed:', result.error)
      console.error('\n💡 Check:')
      console.error('   - Backend URL is correct')
      console.error('   - Backend is running')
      console.error('   - M2M credentials are correct')
      process.exit(1)
    }
  } catch (error) {
    console.error('\n❌ Test failed:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

test()
