// Proxy server entry point

import { initializeMasterKey } from './utils/master-key.js'
import { initializeEncryptionKey } from './utils/encryption-key.js'
import { getDatabase, closeDatabase } from './db/index.js'
import { loadConfig } from './config.js'
import { startServer, stopServer } from './server.js'
import { serviceFactory } from './services/service-factory.js'
import { seedDefaults } from './db/seed.js'

// Initialize master key on startup
const masterKey = initializeMasterKey()

// Initialize encryption key on startup (for data encryption)
const encryptionKey = initializeEncryptionKey()

// Initialize server session (for restart detection)
import('./utils/server-session.js').then(({ initializeServerSession }) => {
  const sessionId = initializeServerSession()
  console.log(`[PROXY] Server session initialized: ${sessionId}`)
}).catch((error) => {
  console.warn('[PROXY] Failed to initialize server session:', error)
})

// Initialize database
getDatabase()

// Load configuration
const config = loadConfig()

console.log('[PROXY] Configuration loaded')
console.log(`[PROXY] Mode: ${config.mode || 'local'}`)
console.log(`[PROXY] Port: ${config.port}`)
console.log(`[PROXY] Host: ${config.host || '127.0.0.1'}`)
if (config.publicUrl) {
  console.log(`[PROXY] Public URL: ${config.publicUrl}`)
}
if (config.mode === 'live') {
  if (config.backendUrl) {
    console.log(`[PROXY] Backend URL: ${config.backendUrl}`)
  }
  if (config.pdpUrl) {
    console.log(`[PROXY] PDP URL: ${config.pdpUrl}`)
  }
}

// Initialize service factory
serviceFactory.initialize()

// Initialize admin user with master key as password
import('./db/index.js').then(({ initializeAdminUser }) => {
  initializeAdminUser().catch((error) => {
    console.warn('[PROXY] Failed to initialize admin user:', error)
    // Continue anyway - admin can still use master key fallback
  })
}).catch((error) => {
  console.warn('[PROXY] Failed to load admin user initialization:', error)
})

// Seed default Cedar data (only in local mode, and only if tables are empty)
if (config.mode === 'local') {
  seedDefaults().catch((error) => {
    console.warn('[PROXY] Failed to seed default data:', error)
    // Continue anyway - seeding is best effort
  })
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
