import { Router, type Request, type Response } from 'express'
import { requireAdmin } from '../middleware/auth.js'
import * as providerService from '../services/provider-service.js'
import { logInternalAction } from '../utils/internal-audit-helpers.js'
import { wrap } from '../utils/route.js'

const router: Router = Router()

router.use(requireAdmin)

router.get('/', wrap(async (req, res) => {
  const { search, limit, offset, sortBy, sortOrder } = req.query
  const result = providerService.listProviders({
    search: search as string | undefined,
    limit: limit ? parseInt(limit as string, 10) : undefined,
    offset: offset ? parseInt(offset as string, 10) : undefined,
    sortBy: sortBy as string | undefined || null,
    sortOrder: (sortOrder === 'asc' || sortOrder === 'desc') ? sortOrder : null
  })
  res.json({ providers: result.data, total: result.total })
}))

router.get('/:name', wrap(async (req, res) => {
  const provider = providerService.getProvider(req.params.name)
  if (!provider) {
    res.status(404).json({ error: 'Provider not found' })
    return
  }
  res.json({ provider })
}))

router.post('/', (req: Request, res: Response) => {
  const t0 = Date.now()
  const { name, apiKey, metadata } = req.body

  if (!name || !apiKey) {
    res.status(400).json({ error: 'name and apiKey are required' })
    return
  }

  try {
    const provider = providerService.createOrUpdateProvider({ name, apiKey, metadata })
    res.json({ provider })

    logInternalAction(req, {
      action: 'create_provider',
      resourceType: 'provider',
      resourceId: provider.name,
      decisionReason: res.locals.decisionReason ?? null,
      actionDurationMs: Date.now() - t0
    })
  } catch (err: any) {
    if (err.message.includes('Invalid API key')) {
      res.status(400).json({ error: err.message })
      return
    }
    console.error('provider create/update failed:', err)
    res.status(500).json({ error: 'Failed to save provider' })
  }
})

router.put('/:name', (req: Request, res: Response) => {
  const t0 = Date.now()
  const { apiKey, displayName } = req.body

  if (!apiKey && (!displayName || !String(displayName).trim())) {
    res.status(400).json({ error: 'Nothing to update' })
    return
  }

  try {
    const provider = providerService.updateProvider(req.params.name, { apiKey, displayName })
    res.json({ provider })

    logInternalAction(req, {
      action: 'update_provider',
      resourceType: 'provider',
      resourceId: provider.name,
      decisionReason: res.locals.decisionReason ?? null,
      actionDurationMs: Date.now() - t0
    })
  } catch (err: any) {
    if (err.message === 'Provider not found' || err.message.startsWith('Invalid API key')) {
      res.status(400).json({ error: err.message })
      return
    }
    console.error('provider update failed:', err)
    res.status(500).json({ error: 'Failed to update provider' })
  }
})

router.delete('/:name', (req: Request, res: Response) => {
  const t0 = Date.now()
  try {
    providerService.deleteProvider(req.params.name)
    res.json({ success: true })

    logInternalAction(req, {
      action: 'delete_provider',
      resourceType: 'provider',
      resourceId: req.params.name,
      decisionReason: res.locals.decisionReason ?? null,
      actionDurationMs: Date.now() - t0
    })
  } catch (err: any) {
    if (err.message === 'Provider not found') {
      res.status(404).json({ error: err.message })
      return
    }
    console.error('provider delete failed:', err)
    res.status(500).json({ error: 'Failed to delete provider' })
  }
})

router.post('/:name/test', wrap(async (req, res) => {
  const t0 = Date.now()
  const result = await providerService.testProviderApiKey(req.params.name)

  if (!result.success) {
    res.status(400).json({ error: result.error || 'Connection failed' })
    return
  }

  res.json({ success: true, message: 'Provider connection successful' })
  logInternalAction(req, {
    action: 'test_provider',
    resourceType: 'provider',
    resourceId: req.params.name,
    decisionReason: res.locals.decisionReason ?? null,
    actionDurationMs: Date.now() - t0
  })
}))

export default router
