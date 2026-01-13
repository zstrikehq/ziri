// Test CLI Config Management
import { getConfig, saveConfig } from './packages/cli/dist/config.js'

console.log('🖥️  Testing CLI Config Management...\n')

// Test 1: Get config (should be empty initially)
console.log('1. Getting config...')
const config = getConfig()
console.log('   Current config:', JSON.stringify(config, null, 2))

// Test 2: Set config
console.log('\n2. Setting test config...')
const testConfig = {
  backendUrl: 'http://localhost:4000',
  projectId: 'test-proj-123'
}
saveConfig(testConfig)
console.log('   ✅ Config saved')

// Test 3: Get config again
console.log('\n3. Getting config again...')
const newConfig = getConfig()
console.log('   Updated config:', JSON.stringify(newConfig, null, 2))

// Verify
if (newConfig.backendUrl === testConfig.backendUrl) {
  console.log('\n✅ CLI config test passed!')
} else {
  console.error('\n❌ Config not saved correctly')
  process.exit(1)
}
