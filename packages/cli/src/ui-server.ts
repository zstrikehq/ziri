import express, { type Request, type Response } from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { existsSync } from 'fs'
import {
  readConfig,
  writeConfig,
  listProviderMetadata,
  getProviderMetadata,
  setProviderMetadata,
  removeProviderMetadata,
  getProviderCredentials,
  setProviderCredentials,
  removeProviderCredentials,
  listProvidersWithCredentials,
  validateProviderApiKey,
  type ProviderMetadata
} from '@zs-ai/config'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export function startUIServer(port: number = 3000, host: string = 'localhost') {
  const app = express()
  
  // Get UI build path - try multiple possible locations
  const possiblePaths = [
    path.resolve(__dirname, '../../ui/.output/public'),  // Built UI
    path.resolve(__dirname, '../../../packages/ui/.output/public'),  // From dist
    path.resolve(process.cwd(), 'packages/ui/.output/public'),  // From project root
  ]
  
  let uiPath: string | null = null
  for (const possiblePath of possiblePaths) {
    if (existsSync(possiblePath)) {
      uiPath = possiblePath
      break
    }
  }
  
  if (!uiPath) {
    console.error('❌ UI not found. Please build the UI first:')
    console.error('   npm run build:ui')
    process.exit(1)
  }
  
  // API endpoint to read config file
  app.get('/api/config', (req: Request, res: Response) => {
    try {
      const config = readConfig()
      if (config) {
        res.json(config)
      } else {
        res.status(404).json({ error: 'Config file not found' })
      }
    } catch (error: any) {
      console.error('Error reading config:', error)
      res.status(500).json({ error: error.message || 'Failed to read config' })
    }
  })
  
  // API endpoint to write config file
  app.post('/api/config', express.json(), (req: Request, res: Response) => {
    try {
      const config = req.body
      writeConfig(config)
      res.json({ success: true, config })
    } catch (error: any) {
      console.error('Error writing config:', error)
      res.status(500).json({ error: error.message || 'Failed to write config' })
    }
  })

  // Provider management API endpoints
  // Get all providers (metadata only, not credentials)
  app.get('/api/providers', (req: Request, res: Response) => {
    try {
      const metadataList = listProviderMetadata()
      const masterKey = req.headers['x-master-key'] as string || process.env.ZS_AI_MASTER_KEY
      
      if (!masterKey) {
        res.status(401).json({ error: 'Master key required. Set X-Master-Key header or ZS_AI_MASTER_KEY env var' })
        return
      }
      
      const credentialsList = listProvidersWithCredentials(masterKey)
      
      // Merge metadata with hasCredentials flag
      const providers = Object.entries(metadataList).map(([name, metadata]) => ({
        ...metadata,
        hasCredentials: credentialsList.includes(name)
      }))
      
      res.json({ success: true, data: providers })
    } catch (error: any) {
      console.error('Error listing providers:', error)
      res.status(500).json({ error: error.message || 'Failed to list providers' })
    }
  })

  // Get single provider (metadata only)
  app.get('/api/providers/:name', (req: Request, res: Response) => {
    try {
      const name = req.params.name.toLowerCase()
      const metadata = getProviderMetadata(name)
      
      if (!metadata) {
        res.status(404).json({ error: `Provider '${name}' not found` })
        return
      }
      
      const masterKey = req.headers['x-master-key'] as string || process.env.ZS_AI_MASTER_KEY
      if (masterKey) {
        const credentials = getProviderCredentials(name, masterKey)
        metadata.hasCredentials = !!credentials
      }
      
      res.json({ success: true, data: metadata })
    } catch (error: any) {
      console.error('Error getting provider:', error)
      res.status(500).json({ error: error.message || 'Failed to get provider' })
    }
  })

  // Add or update provider
  app.post('/api/providers', express.json(), (req: Request, res: Response) => {
    try {
      const { name, apiKey, metadata: providerMetadata } = req.body
      
      if (!name || !apiKey) {
        res.status(400).json({ error: 'name and apiKey are required' })
        return
      }
      
      const providerName = name.toLowerCase()
      
      // Validate API key format
      const validation = validateProviderApiKey(providerName, apiKey)
      if (!validation.valid) {
        res.status(400).json({ error: validation.error })
        return
      }
      
      const masterKey = req.headers['x-master-key'] as string || process.env.ZS_AI_MASTER_KEY
      if (!masterKey) {
        res.status(401).json({ error: 'Master key required. Set X-Master-Key header or ZS_AI_MASTER_KEY env var' })
        return
      }
      
      // Provider metadata templates (same as CLI)
      const PROVIDER_TEMPLATES: Record<string, Omit<ProviderMetadata, 'hasCredentials'>> = {
        openai: {
          name: 'openai',
          displayName: 'OpenAI',
          baseUrl: 'https://api.openai.com/v1',
          models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo', 'gpt-3.5-turbo-16k'],
          defaultModel: 'gpt-4'
        },
        anthropic: {
          name: 'anthropic',
          displayName: 'Anthropic',
          baseUrl: 'https://api.anthropic.com/v1',
          models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
          defaultModel: 'claude-3-opus'
        }
      }
      
      // Use provided metadata or template
      const metadata: ProviderMetadata = providerMetadata || PROVIDER_TEMPLATES[providerName]
      
      if (!metadata) {
        res.status(400).json({ error: `Unknown provider '${providerName}'. Supported: ${Object.keys(PROVIDER_TEMPLATES).join(', ')}` })
        return
      }
      
      // Save metadata
      setProviderMetadata(providerName, { ...metadata, hasCredentials: true })
      
      // Save credentials (encrypted)
      setProviderCredentials(providerName, apiKey, masterKey)
      
      res.json({ success: true, data: { ...metadata, hasCredentials: true } })
    } catch (error: any) {
      console.error('Error adding provider:', error)
      res.status(500).json({ error: error.message || 'Failed to add provider' })
    }
  })

  // Remove provider
  app.delete('/api/providers/:name', (req: Request, res: Response) => {
    try {
      const name = req.params.name.toLowerCase()
      const metadata = getProviderMetadata(name)
      
      if (!metadata) {
        res.status(404).json({ error: `Provider '${name}' not found` })
        return
      }
      
      const masterKey = req.headers['x-master-key'] as string || process.env.ZS_AI_MASTER_KEY
      if (!masterKey) {
        res.status(401).json({ error: 'Master key required. Set X-Master-Key header or ZS_AI_MASTER_KEY env var' })
        return
      }
      
      removeProviderMetadata(name)
      removeProviderCredentials(name, masterKey)
      
      res.json({ success: true })
    } catch (error: any) {
      console.error('Error removing provider:', error)
      res.status(500).json({ error: error.message || 'Failed to remove provider' })
    }
  })

  // Test provider connection
  app.post('/api/providers/:name/test', (req: Request, res: Response) => {
    try {
      const name = req.params.name.toLowerCase()
      const metadata = getProviderMetadata(name)
      
      if (!metadata) {
        res.status(404).json({ error: `Provider '${name}' not found` })
        return
      }
      
      const masterKey = req.headers['x-master-key'] as string || process.env.ZS_AI_MASTER_KEY
      if (!masterKey) {
        res.status(401).json({ error: 'Master key required. Set X-Master-Key header or ZS_AI_MASTER_KEY env var' })
        return
      }
      
      const credentials = getProviderCredentials(name, masterKey)
      if (!credentials) {
        res.status(404).json({ error: `API key for '${name}' not configured` })
        return
      }
      
      // Test with a simple request (async)
      const testUrl = `${metadata.baseUrl}/models`
      fetch(testUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${credentials.apiKey}`,
          'Content-Type': 'application/json'
        }
      })
        .then(async (response) => {
          if (response.ok) {
            const data = await response.json() as { data?: unknown[] }
            res.json({ success: true, data: { status: 'connected', models: data.data?.length || 0 } })
          } else {
            const error = await response.text()
            res.status(500).json({ error: `Connection failed: ${response.status} ${error}` })
          }
        })
        .catch((error: any) => {
          res.status(500).json({ error: `Connection error: ${error.message}` })
        })
    } catch (error: any) {
      console.error('Error testing provider:', error)
      res.status(500).json({ error: error.message || 'Failed to test provider' })
    }
  })
  
  // Serve static UI files
  app.use(express.static(uiPath))
  
  // SPA fallback - serve index.html for all routes
  app.get('*', (req: Request, res: Response) => {
    res.sendFile(path.join(uiPath!, 'index.html'))
  })
  
  app.listen(port, host, () => {
    console.log(`✓ zs-ai UI running at http://${host}:${port}`)
    console.log(`✓ Press Ctrl+C to stop`)
  })
}
