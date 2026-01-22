// Provider management routes (admin only - requires master key)

import { Router, type Request, type Response } from 'express'
import { requireAdmin } from '../middleware/auth.js'
import * as providerService from '../services/provider-service.js'

const router: Router = Router()

// All routes require admin authentication
router.use(requireAdmin)

/**
 * GET /api/providers
 * List all providers with optional search, limit, and offset
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const {
      search,
      limit,
      offset,
      sortBy,
      sortOrder
    } = req.query
    
    const result = providerService.listProviders({
      search: search as string | undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      offset: offset ? parseInt(offset as string, 10) : undefined,
      sortBy: sortBy as string | undefined || null,
      sortOrder: (sortOrder === 'asc' || sortOrder === 'desc') ? sortOrder as 'asc' | 'desc' : null
    })
    
    res.json({
      providers: result.data,
      total: result.total
    })
  } catch (error: any) {
    console.error('[PROVIDERS] List error:', error)
    res.status(500).json({
      error: 'Failed to list providers',
      code: 'LIST_ERROR'
    })
  }
})

/**
 * GET /api/providers/:name
 * Get provider by name
 */
router.get('/:name', (req: Request, res: Response) => {
  try {
    const { name } = req.params
    const provider = providerService.getProvider(name)
    
    if (!provider) {
      res.status(404).json({
        error: 'Provider not found',
        code: 'PROVIDER_NOT_FOUND'
      })
      return
    }
    
    res.json({ provider })
  } catch (error: any) {
    console.error('[PROVIDERS] Get error:', error)
    res.status(500).json({
      error: 'Failed to get provider',
      code: 'GET_ERROR'
    })
  }
})

/**
 * POST /api/providers
 * Create or update a provider
 */
router.post('/', (req: Request, res: Response) => {
  try {
    const { name, apiKey, metadata } = req.body
    
    if (!name || !apiKey) {
      res.status(400).json({
        error: 'name and apiKey are required',
        code: 'MISSING_FIELDS'
      })
      return
    }
    
    const provider = providerService.createOrUpdateProvider({ name, apiKey, metadata })
    
    res.json({ provider })
  } catch (error: any) {
    console.error('[PROVIDERS] Create/Update error:', error)
    
    if (error.message.includes('Invalid API key')) {
      res.status(400).json({
        error: error.message,
        code: 'INVALID_API_KEY'
      })
      return
    }
    
    res.status(500).json({
      error: 'Failed to create/update provider',
      code: 'CREATE_ERROR'
    })
  }
})

/**
 * DELETE /api/providers/:name
 * Delete provider
 */
router.delete('/:name', (req: Request, res: Response) => {
  try {
    const { name } = req.params
    providerService.deleteProvider(name)
    
    res.json({ success: true })
  } catch (error: any) {
    console.error('[PROVIDERS] Delete error:', error)
    
    if (error.message === 'Provider not found') {
      res.status(404).json({
        error: error.message,
        code: 'PROVIDER_NOT_FOUND'
      })
      return
    }
    
    res.status(500).json({
      error: 'Failed to delete provider',
      code: 'DELETE_ERROR'
    })
  }
})

/**
 * POST /api/providers/:name/test
 * Test provider connection
 */
router.post('/:name/test', async (req: Request, res: Response) => {
  try {
    const { name } = req.params
    const result = await providerService.testProviderApiKey(name)
    
    if (result.success) {
      res.json({ success: true, message: 'Provider connection successful' })
    } else {
      res.status(400).json({
        error: result.error || 'Provider connection failed',
        code: 'CONNECTION_FAILED'
      })
    }
  } catch (error: any) {
    console.error('[PROVIDERS] Test error:', error)
    res.status(500).json({
      error: 'Failed to test provider',
      code: 'TEST_ERROR'
    })
  }
})

export default router
