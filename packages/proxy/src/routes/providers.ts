import { Router, type Request, type Response } from 'express'
import { requireAdmin } from '../middleware/auth.js'
import * as providerService from '../services/provider-service.js'
import { logInternalOutcome } from '../utils/internal-audit-helpers.js'

const router: Router = Router()

router.use(requireAdmin)

router.get('/', async (req: Request, res: Response) => {
  const actionStart = Date.now()
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
    
    await logInternalOutcome(req, {
      status: 'success',
      code: '200',
      message: `Retrieved ${result.data.length} providers`,
      actionDurationMs: Date.now() - actionStart
    })
    
    res.json({
      providers: result.data,
      total: result.total
    })
  } catch (error: any) {
    await logInternalOutcome(req, {
      status: 'failed',
      code: '500',
      message: error.message || 'Failed to list providers',
      actionDurationMs: Date.now() - actionStart
    })
    
    console.error('[PROVIDERS] List error:', error)
    res.status(500).json({
      error: 'Failed to list providers',
      code: 'LIST_ERROR'
    })
  }
})

router.get('/:name', async (req: Request, res: Response) => {
  const actionStart = Date.now()
  try {
    const { name } = req.params
    const provider = providerService.getProvider(name)
    
    if (!provider) {
      await logInternalOutcome(req, {
        status: 'failed',
        code: '404',
        message: 'Provider not found',
        resourceId: name,
        actionDurationMs: Date.now() - actionStart
      })
      
      res.status(404).json({
        error: 'Provider not found',
        code: 'PROVIDER_NOT_FOUND'
      })
      return
    }
    
    await logInternalOutcome(req, {
      status: 'success',
      code: '200',
      message: 'Retrieved provider',
      resourceId: name,
      actionDurationMs: Date.now() - actionStart
    })
    
    res.json({ provider })
  } catch (error: any) {
    await logInternalOutcome(req, {
      status: 'failed',
      code: '500',
      message: error.message || 'Failed to get provider',
      resourceId: req.params.name,
      actionDurationMs: Date.now() - actionStart
    })
    
    console.error('[PROVIDERS] Get error:', error)
    res.status(500).json({
      error: 'Failed to get provider',
      code: 'GET_ERROR'
    })
  }
})

router.post('/', (req: Request, res: Response) => {
  const actionStart = Date.now()
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

    void logInternalOutcome(req, {
      status: 'success',
      code: 'PROVIDER_CREATED_OR_UPDATED',
      resourceId: provider.name,
      resourceDetails: {
        id: provider.id,
        name: provider.name,
        displayName: provider.displayName
      },
      actionDurationMs: Date.now() - actionStart
    })
  } catch (error: any) {
    console.error('[PROVIDERS] Create/Update error:', error)
    
    if (error.message.includes('Invalid API key')) {
      res.status(400).json({
        error: error.message,
        code: 'INVALID_API_KEY'
      })

      void logInternalOutcome(req, {
        status: 'failed',
        code: 'PROVIDER_CREATE_INVALID_API_KEY',
        message: error.message,
        actionDurationMs: Date.now() - actionStart
      })
      return
    }
    
    res.status(500).json({
      error: 'Failed to create/update provider',
      code: 'CREATE_ERROR'
    })

    void logInternalOutcome(req, {
      status: 'failed',
      code: 'PROVIDER_CREATE_ERROR',
      message: error.message,
      actionDurationMs: Date.now() - actionStart
    })
  }
})

router.delete('/:name', (req: Request, res: Response) => {
  const actionStart = Date.now()
  try {
    const { name } = req.params
    providerService.deleteProvider(name)
    
    res.json({ success: true })

    void logInternalOutcome(req, {
      status: 'success',
      code: 'PROVIDER_DELETED',
      resourceId: name,
      resourceDetails: { name },
      actionDurationMs: Date.now() - actionStart
    })
  } catch (error: any) {
    console.error('[PROVIDERS] Delete error:', error)
    
    if (error.message === 'Provider not found') {
      res.status(404).json({
        error: error.message,
        code: 'PROVIDER_NOT_FOUND'
      })

      void logInternalOutcome(req, {
        status: 'failed',
        code: 'PROVIDER_DELETE_NOT_FOUND',
        message: error.message,
        actionDurationMs: Date.now() - actionStart
      })
      return
    }
    
    res.status(500).json({
      error: 'Failed to delete provider',
      code: 'DELETE_ERROR'
    })

    void logInternalOutcome(req, {
      status: 'failed',
      code: 'PROVIDER_DELETE_ERROR',
      message: error.message,
      actionDurationMs: Date.now() - actionStart
    })
  }
})

router.post('/:name/test', async (req: Request, res: Response) => {
  const actionStart = Date.now()
  try {
    const { name } = req.params
    const result = await providerService.testProviderApiKey(name)
    
    if (result.success) {
      res.json({ success: true, message: 'Provider connection successful' })

      await logInternalOutcome(req, {
        status: 'success',
        code: 'PROVIDER_TESTED',
        resourceId: name,
        resourceDetails: { name },
        actionDurationMs: Date.now() - actionStart
      })
    } else {
      res.status(400).json({
        error: result.error || 'Provider connection failed',
        code: 'CONNECTION_FAILED'
      })

      await logInternalOutcome(req, {
        status: 'failed',
        code: 'PROVIDER_TEST_FAILED',
        message: result.error || 'Provider connection failed',
        resourceId: name,
        actionDurationMs: Date.now() - actionStart
      })
    }
  } catch (error: any) {
    console.error('[PROVIDERS] Test error:', error)
    res.status(500).json({
      error: 'Failed to test provider',
      code: 'TEST_ERROR'
    })

    await logInternalOutcome(req, {
      status: 'failed',
      code: 'PROVIDER_TEST_ERROR',
      message: error.message,
      resourceId: req.params.name,
      actionDurationMs: Date.now() - actionStart
    })
  }
})

export default router
