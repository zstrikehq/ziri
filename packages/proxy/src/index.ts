import { closeDatabase } from './db/index.js'
import { loadConfig } from './config.js'
import { startServer, stopServer } from './server.js'

import { fileURLToPath } from 'url'
import { pathToFileURL } from 'url'

const config = loadConfig()

const __filename = fileURLToPath(import.meta.url)
const isMainModule = process.argv[1] &&
  (fileURLToPath(import.meta.url) === fileURLToPath(pathToFileURL(process.argv[1]).href) ||
   process.argv[1].endsWith('index.js') ||
   process.argv[1].endsWith('index.ts'))

if (isMainModule) {
  startServer().catch(err => { console.error('startup failed:', err); process.exit(1) })
}

async function shutdown() {
  await stopServer()
  const { eventEmitterService } = await import('./services/event-emitter-service.js')
  eventEmitterService.destroy()
  closeDatabase()
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

export { config }
