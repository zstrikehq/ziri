// Express server setup

import express, { type Express } from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { existsSync } from 'fs'
import { errorHandler, notFoundHandler } from './middleware/error-handler.js'
import { findFreePort } from './utils/port-finder.js'
import { config } from './index.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

let app: Express | null = null
let server: any = null

export async function createServer(): Promise<Express> {
  if (app) {
    return app
  }

  app = express()

  // Middleware
  app.use(cors())
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
  })

  // API routes (before static files)
  const authRoutes = (await import('./routes/auth.js')).default
  app.use('/api/auth', authRoutes)
  
  const userRoutes = (await import('./routes/users.js')).default
  app.use('/api/users', userRoutes)
  
  const keyRoutes = (await import('./routes/keys.js')).default
  app.use('/api/keys', keyRoutes)
  
  const providerRoutes = (await import('./routes/providers.js')).default
  app.use('/api/providers', providerRoutes)
  
  const chatRoutes = (await import('./routes/chat.js')).default
  app.use('/api/chat', chatRoutes)

  // Serve UI static files (after API routes)
  const possibleUiPaths = [
    path.resolve(__dirname, '../../ui/.output/public'),
    path.resolve(__dirname, '../../../packages/ui/.output/public'),
    path.resolve(process.cwd(), 'packages/ui/.output/public'),
  ]
  
  let uiPath: string | null = null
  for (const possiblePath of possibleUiPaths) {
    if (existsSync(possiblePath)) {
      uiPath = possiblePath
      break
    }
  }
  
  if (uiPath) {
    // Serve static files
    app.use(express.static(uiPath))
    
    // SPA fallback - serve index.html for all non-API routes
    app.get('*', (req, res, next) => {
      // Skip API routes
      if (req.path.startsWith('/api/')) {
        return next()
      }
      // Serve index.html for SPA routing
      res.sendFile(path.join(uiPath!, 'index.html'))
    })
    
    console.log(`[SERVER] UI served from: ${uiPath}`)
  } else {
    console.warn('[SERVER] UI not found. Build UI first: npm run build:ui')
  }

  // Error handling (must be last)
  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}

export async function startServer(): Promise<{ port: number; url: string }> {
  const app = await createServer()
  
  // Find free port
  let port: number
  try {
    port = await findFreePort(config.port)
  } catch (error) {
    console.error('[SERVER] Failed to find free port:', error)
    throw error
  }
  
  return new Promise((resolve, reject) => {
    // Try to listen on the found port (use 127.0.0.1 to match port finder)
    server = app.listen(port, '127.0.0.1', () => {
      const url = `http://localhost:${port}`
      console.log('='.repeat(70))
      console.log('🚀 PROXY SERVER STARTED')
      console.log('='.repeat(70))
      console.log(`Server URL: ${url}`)
      console.log(`API Endpoints: ${url}/api/*`)
      console.log(`Health Check: ${url}/health`)
      console.log('='.repeat(70))
      console.log('')
      
      resolve({ port, url })
    })
    
    server.on('error', (error: NodeJS.ErrnoException) => {
      // If port is still in use, try to find another one
      if (error.code === 'EADDRINUSE') {
        console.log(`[SERVER] Port ${port} became unavailable, finding new port...`)
        findFreePort(port + 1).then((newPort) => {
          // Retry with new port
          if (server) {
            server.close()
          }
          server = app.listen(newPort, '127.0.0.1', () => {
            const url = `http://localhost:${newPort}`
            console.log('='.repeat(70))
            console.log('🚀 PROXY SERVER STARTED')
            console.log('='.repeat(70))
            console.log(`Server URL: ${url}`)
            console.log(`API Endpoints: ${url}/api/*`)
            console.log(`Health Check: ${url}/health`)
            console.log('='.repeat(70))
            console.log('')
            resolve({ port: newPort, url })
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

export function stopServer(): Promise<void> {
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
