// Proxy server entry point

import { initializeMasterKey } from './utils/master-key.js'
import { getDatabase, closeDatabase } from './db/index.js'
import { loadConfig } from './config.js'
import { startServer, stopServer } from './server.js'

// Initialize master key on startup
const masterKey = initializeMasterKey()

// Initialize database
getDatabase()

// Load configuration
const config = loadConfig()

console.log('[PROXY] Configuration loaded')
console.log(`[PROXY] Backend URL: ${config.backendUrl}`)
console.log(`[PROXY] Port: ${config.port}`)
if (config.pdpUrl) {
  console.log(`[PROXY] PDP URL: ${config.pdpUrl}`)
}

// Start server
startServer().catch((error) => {
  console.error('[PROXY] Failed to start server:', error)
  process.exit(1)
})

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n[PROXY] Shutting down...')
  await stopServer()
  closeDatabase()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('\n[PROXY] Shutting down...')
  await stopServer()
  closeDatabase()
  process.exit(0)
})

// Export for use in other modules
export { config, masterKey }
