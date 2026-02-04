import express, { type Express } from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { existsSync } from 'fs'
import { errorHandler, notFoundHandler } from './middleware/error-handler.js'
import { findFreePort } from './utils/port-finder.js'
import { loadConfig } from './config.js'
import { initializeEncryptionKey } from './utils/encryption-key.js'
import { initializeRootKey } from './utils/root-key.js'
import { getDatabase } from './db/index.js'
import { serviceFactory } from './services/service-factory.js'
import { initializeServerSession, getServerSessionId } from './utils/server-session.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

let app: Express | null = null
let server: any = null

export async function createServer(): Promise<Express> {
  if (app) {
    return app
  }

  app = express()

  app.use(cors())
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))

  const healthHandler = async (req: any, res: any) => {
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      sessionId: getServerSessionId() || null
    })
  }
  
  app.get('/health', healthHandler)
  app.get('/api/health', healthHandler)

  const authRoutes = (await import('./routes/auth.js')).default
  app.use('/api/auth', authRoutes)
  
  const authzRoutes = (await import('./routes/authz.js')).default
  app.use('/api/authz', authzRoutes)
  
  const dashboardUserRoutes = (await import('./routes/dashboard-users.js')).default
  app.use('/api/dashboard-users', dashboardUserRoutes)
  
  const configRoutes = (await import('./routes/config.js')).default
  app.use('/api/config', configRoutes)
  
  const schemaRoutes = (await import('./routes/schema.js')).default
  app.use('/api/schema', schemaRoutes)
  
  const policiesRoutes = (await import('./routes/policies.js')).default
  app.use('/api/policies', policiesRoutes)
  
  const entitiesRoutes = (await import('./routes/entities.js')).default
  app.use('/api/entities', entitiesRoutes)
  
  const userRoutes = (await import('./routes/users.js')).default
  app.use('/api/users', userRoutes)
  
  const keyRoutes = (await import('./routes/keys.js')).default
  app.use('/api/keys', keyRoutes)
  
  const providerRoutes = (await import('./routes/providers.js')).default
  app.use('/api/providers', providerRoutes)
  
  const chatRoutes = (await import('./routes/chat.js')).default
  app.use('/api/chat', chatRoutes)
  
  const embeddingsRoutes = (await import('./routes/embeddings.js')).default
  app.use('/api/embeddings', embeddingsRoutes)
  
  const imagesRoutes = (await import('./routes/images.js')).default
  app.use('/api/images', imagesRoutes)
  
  const meRoutes = (await import('./routes/me.js')).default
  app.use('/api/me', meRoutes)
  
  const statsRoutes = (await import('./routes/stats.js')).default
  app.use('/api/stats', statsRoutes)
  
  const auditRoutes = (await import('./routes/audit.js')).default
  app.use('/api/audit', auditRoutes)
  
  const internalAuditLogsRoutes = (await import('./routes/internal-audit-logs.js')).default
  app.use('/api/internal-audit-logs', internalAuditLogsRoutes)
  
  const costsRoutes = (await import('./routes/costs.js')).default
  app.use('/api/costs', costsRoutes)

  const eventsRoutes = (await import('./routes/events.js')).default
  app.use('/api/events', eventsRoutes)

  const aiPolicyRoutes = (await import('./routes/ai-policy.js')).default
  app.use('/api/ai-policy', aiPolicyRoutes)

  const possibleUiPaths = [
    path.resolve(__dirname, '../ui'),
    path.resolve(__dirname, './ui'),
    path.resolve(__dirname, '../../ui/.output/public'),
    path.resolve(__dirname, '../../../packages/ui/.output/public'),
    path.resolve(process.cwd(), 'packages/ui/.output/public'),
    path.resolve(process.cwd(), 'dist/ui'),
  ]
  
  let uiPath: string | null = null
  for (const possiblePath of possibleUiPaths) {
    if (existsSync(possiblePath)) {
      uiPath = possiblePath
      break
    }
  }
  
  if (uiPath) {
    app.use(express.static(uiPath))
    
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) {
        return next()
      }
      res.sendFile(path.join(uiPath!, 'index.html'))
    })
    
    console.log(`[SERVER] UI served from: ${uiPath}`)
  } else {
    console.warn('[SERVER] UI not found. Build UI first: npm run build:ui')
  }

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}

let initialized = false

async function ensureInitialization() {
  if (initialized) return
  
  initializeRootKey()
  initializeEncryptionKey()
  getDatabase()
  serviceFactory.initialize()
  const sessionId = initializeServerSession()
  console.log(`[PROXY] Server session initialized: ${sessionId}`)
  
  const { initializeAdminUser, initializeInternalAuth } = await import('./db/index.js')
  await initializeAdminUser().catch((error) => {
    console.warn('[PROXY] Failed to initialize admin user:', error)
  })
  

  await initializeInternalAuth().catch((error) => {
    console.error('[PROXY] Failed to initialize internal authorization:', error)
    throw error // This is critical, so we should fail startup if it fails
  })
  
  const config = loadConfig()
  if (config.mode === 'local') {
    import('./db/seed.js').then(({ seedDefaults }) => {
      seedDefaults().catch((error: any) => {
        console.warn('[PROXY] Failed to seed default data:', error)
      })
    }).catch((error) => {
      console.warn('[PROXY] Failed to load seed defaults:', error)
    })
  }
  
  initialized = true
}

export async function startServer(): Promise<{ port: number; url: string }> {
  await ensureInitialization()
  
  const app = await createServer()
  const config = loadConfig()
  
  const host = config.host || '127.0.0.1'
  
  let port: number
  try {
    port = await findFreePort(config.port)
  } catch (error) {
    console.error('[SERVER] Failed to find free port:', error)
    throw error
  }
  
      const localUrl = `http://${host === '0.0.0.0' ? 'localhost' : host}:${port}`
      const serverConfig = loadConfig()
      const publicUrl = serverConfig.publicUrl || localUrl
      
      return new Promise((resolve, reject) => {
        server = app.listen(port, host, () => {
          console.log('='.repeat(70))
                console.log('🚀 ZIRI PROXY SERVER')
          console.log('='.repeat(70))
          console.log(`Mode: ${serverConfig.mode || 'local'}`)
          console.log(`Local URL: ${localUrl}`)
          if (serverConfig.publicUrl && serverConfig.publicUrl !== localUrl) {
            console.log(`Public URL: ${publicUrl}`)
            console.log('')
            console.log('⚠️  Share this Public URL with users for API access')
          }
          console.log(`API Endpoints: ${localUrl}/api/*`)
          console.log(`Health Check: ${localUrl}/health`)
          console.log('')
          if (serverConfig.email?.enabled) {
            console.log(`📧 Email: Enabled (${serverConfig.email.provider || 'manual'})`)
          } else {
            console.log('📧 Email: Disabled')
          }
          console.log('='.repeat(70))
          console.log('')
          
          resolve({ port, url: localUrl })
        })
        
        server.on('error', (error: NodeJS.ErrnoException) => {
          if (error.code === 'EADDRINUSE') {
            console.log(`[SERVER] Port ${port} became unavailable, finding new port...`)
            findFreePort(port + 1).then((newPort) => {
              if (server) {
                server.close()
              }
              const newLocalUrl = `http://${host === '0.0.0.0' ? 'localhost' : host}:${newPort}`
              const retryConfig = loadConfig()
              server = app.listen(newPort, host, () => {
                console.log('='.repeat(70))
                console.log('🚀 ZIRI PROXY SERVER')
                console.log('='.repeat(70))
                console.log(`Mode: ${retryConfig.mode || 'local'}`)
                console.log(`Local URL: ${newLocalUrl}`)
                if (retryConfig.publicUrl && retryConfig.publicUrl !== newLocalUrl) {
                  console.log(`Public URL: ${retryConfig.publicUrl}`)
                  console.log('')
                  console.log('⚠️  Share this Public URL with users for API access')
                }
                console.log(`API Endpoints: ${newLocalUrl}/api/*`)
                console.log(`Health Check: ${newLocalUrl}/health`)
                console.log('')
                if (retryConfig.email?.enabled) {
                  console.log(`📧 Email: Enabled (${retryConfig.email.provider || 'manual'})`)
                } else {
                  console.log('📧 Email: Disabled')
                }
                console.log('='.repeat(70))
                console.log('')
                resolve({ port: newPort, url: newLocalUrl })
              })
            }).catch((findError) => {
              reject(new Error(`Failed to find available port: ${findError.message}`))
            })
          } else {
            reject(error)
          }
        })
      })
}

export async function stopServer(): Promise<void> {
  try {
    const { queueManagerService } = await import('./services/queue-manager-service.js')
    console.log('[SERVER] Closing queues...')
    await queueManagerService.closeAll()
    console.log('[SERVER] Queues closed')
  } catch (error: any) {
    console.warn('[SERVER] Error closing queues:', error.message)
  }
  
  return new Promise((resolve) => {
    if (server) {
      server.close(() => {
        server = null
        console.log('[SERVER] Server stopped')
        resolve()
      })
    } else {
      resolve()
    }
  })
}

export { app }
