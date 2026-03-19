import express, { type Express } from 'express'
import cors from 'cors'
import path from 'path'
import https from 'node:https'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { existsSync, readFileSync } from 'fs'
import { errorHandler, notFoundHandler } from './middleware/error-handler.js'
import { findFreePort } from './utils/port-finder.js'
import { loadConfig } from './config.js'
import { initializeEncryptionKey } from './utils/encryption-key.js'
import { getDatabase } from './db/index.js'
import { serviceFactory } from './services/service-factory.js'
import { initializeServerSession, getServerSessionId } from './utils/server-session.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

let app: Express | null = null
let server: any = null

const API_ROUTES: [string, string][] = [
  ['auth',               './routes/auth.js'],
  ['authz',              './routes/authz.js'],
  ['dashboard-users',    './routes/dashboard-users.js'],
  ['config',             './routes/config.js'],
  ['schema',             './routes/schema.js'],
  ['policies',           './routes/policies.js'],
  ['entities',           './routes/entities.js'],
  ['roles',              './routes/roles.js'],
  ['users',              './routes/users.js'],
  ['keys',               './routes/keys.js'],
  ['providers',          './routes/providers.js'],
  ['chat',               './routes/chat.js'],
  ['embeddings',         './routes/embeddings.js'],
  ['images',             './routes/images.js'],
  ['me',                 './routes/me.js'],
  ['stats',              './routes/stats.js'],
  ['audit',              './routes/audit.js'],
  ['internal-audit-logs','./routes/internal-audit-logs.js'],
  ['costs',              './routes/costs.js'],
  ['events',             './routes/events.js'],
  ['ai-policy',          './routes/ai-policy.js'],
  ['loadtest',           './routes/loadtest.js'],
]

export async function createServer(): Promise<Express> {
  if (app) return app

  app = express()
  app.use(cors())
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))

  // health
  const health = (_req: any, res: any) => res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    sessionId: getServerSessionId() || null
  })
  app.get('/health', health)
  app.get('/api/health', health)

  // mount all API routes
  for (const [name, mod] of API_ROUTES) {
    const router = (await import(mod)).default
    app.use(`/api/${name}`, router)
  }

  // serve the UI if a built copy exists
  const uiCandidates = [
    path.resolve(__dirname, '../ui'),
    path.resolve(__dirname, './ui'),
    path.resolve(__dirname, '../../ui/.output/public'),
    path.resolve(__dirname, '../../../packages/ui/.output/public'),
    path.resolve(process.cwd(), 'packages/ui/.output/public'),
    path.resolve(process.cwd(), 'dist/ui'),
  ]
  const uiPath = uiCandidates.find(p => existsSync(p))

  if (uiPath) {
    app.use(express.static(uiPath))
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) return next()
      res.sendFile(path.join(uiPath, 'index.html'))
    })
    console.log(`UI served from ${uiPath}`)
  } else {
    console.warn('UI build not found. Run: npm run build:ui')
  }

  app.use(notFoundHandler)
  app.use(errorHandler)
  return app
}

let initialized = false

async function ensureInitialization() {
  if (initialized) return

  initializeEncryptionKey()
  getDatabase()
  serviceFactory.initialize()

  const sessionId = initializeServerSession()
  console.log(`session ${sessionId}`)

  const { initializeAdminUser, initializeInternalAuth } = await import('./db/index.js')

  await initializeAdminUser().catch(err => {
    console.warn('could not init admin user:', err)
  })

  // internal authz is required — let it throw
  await initializeInternalAuth()

  import('./db/seed.js').then(({ seedDefaults }) => seedDefaults()).catch(err => {
    console.warn('seed failed:', err)
  })

  initialized = true
}

function tryCreateHttpsServer(app: Express, config: ReturnType<typeof loadConfig>) {
  if (!config.ssl?.enabled) return null

  const { cert, key } = config.ssl
  if (!existsSync(cert) || !existsSync(key)) {
    console.error(`SSL cert/key missing (cert: ${existsSync(cert)}, key: ${existsSync(key)}), falling back to HTTP`)
    return null
  }
  return https.createServer({ cert: readFileSync(cert), key: readFileSync(key) }, app)
}

function printBanner(config: ReturnType<typeof loadConfig>, url: string) {
  const lines = [
    `ziri local — ${url}`,
    config.ssl?.enabled ? '  ssl: on' : null,
    config.publicUrl && config.publicUrl !== url ? `  public: ${config.publicUrl}` : null,
    `  email: ${config.email?.enabled ? config.email.provider || 'manual' : 'off'}`,
  ].filter(Boolean)
  console.log(lines.join('\n'))
}

export async function startServer(): Promise<{ port: number; url: string }> {
  await ensureInitialization()

  const app = await createServer()
  const config = loadConfig()
  const host = config.host || '127.0.0.1'
  const port = await findFreePort(config.port)

  const httpsServer = tryCreateHttpsServer(app, config)
  const protocol = httpsServer ? 'https' : 'http'
  const displayHost = host === '0.0.0.0' ? 'localhost' : host
  const url = `${protocol}://${displayHost}:${port}`

  const listen = (p: number) => new Promise<{ port: number; url: string }>((resolve, reject) => {
    const target = httpsServer || app
    server = (target as any).listen(p, host, () => {
      printBanner(config, `${protocol}://${displayHost}:${p}`)
      resolve({ port: p, url: `${protocol}://${displayHost}:${p}` })
    })
    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        server?.close()
        findFreePort(p + 1).then(listen).then(resolve).catch(reject)
      } else {
        reject(err)
      }
    })
  })

  return listen(port)
}

export async function stopServer(): Promise<void> {
  try {
    const { queueManagerService } = await import('./services/queue-manager-service.js')
    await queueManagerService.closeAll()
  } catch (err: any) {
    console.warn('queue close error:', err.message)
  }

  return new Promise(resolve => {
    if (!server) return resolve()
    server.close(() => { server = null; resolve() })
  })
}

export { app }
