import { Router, type Request, type Response } from 'express'
import { requireAdmin } from '../middleware/auth.js'
import { auditLogService } from '../services/audit-log-service.js'
import { logInternalOutcome } from '../utils/internal-audit-helpers.js'

const router: Router = Router()

router.use(requireAdmin)

router.get('/', async (req: Request, res: Response) => {
  const actionStart = Date.now()
  try {
    const {
      authId,
      apiKeyId,
      provider,
      model,
      decision,
      startDate,
      endDate,
      search,
      limit = '10',
      offset = '0',
      sortBy,
      sortOrder
    } = req.query

    const sortByValue = sortBy ? (sortBy as string) : null
    const sortOrderValue = (sortOrder === 'asc' || sortOrder === 'desc') ? sortOrder as 'asc' | 'desc' : null
    
    const result = await auditLogService.query({
      authId: authId as string,
      apiKeyId: apiKeyId as string,
      provider: provider as string,
      model: model as string,
      decision: decision as 'permit' | 'forbid',
      startDate: startDate as string,
      endDate: endDate as string,
      search: search as string,
      limit: parseInt(limit as string, 10),
      offset: parseInt(offset as string, 10),
      sortBy: sortByValue,
      sortOrder: sortOrderValue
    })

    res.json({
      data: result.data,
      count: result.data.length,
      total: result.total
    })

    void logInternalOutcome(req, {
      status: 'success',
      code: 'AUDIT_VIEWED',
      actionDurationMs: Date.now() - actionStart
    })
  } catch (error: any) {
    console.error('[AUDIT] Query error:', error)
    res.status(500).json({
      error: 'Failed to query audit logs',
      code: 'AUDIT_QUERY_ERROR'
    })

    void logInternalOutcome(req, {
      status: 'failed',
      code: 'AUDIT_VIEW_ERROR',
      message: error.message,
      actionDurationMs: Date.now() - actionStart
    })
  }
})

router.get('/statistics', async (req: Request, res: Response) => {
  const actionStart = Date.now()
  try {
    const { startDate, endDate } = req.query

    const stats = await auditLogService.getStatistics(
      startDate as string,
      endDate as string
    )

    res.json({ data: stats })

    void logInternalOutcome(req, {
      status: 'success',
      code: 'AUDIT_STATS_VIEWED',
      actionDurationMs: Date.now() - actionStart
    })
  } catch (error: any) {
    console.error('[AUDIT] Statistics error:', error)
    res.status(500).json({
      error: 'Failed to get audit statistics',
      code: 'AUDIT_STATS_ERROR'
    })

    void logInternalOutcome(req, {
      status: 'failed',
      code: 'AUDIT_STATS_ERROR',
      message: error.message,
      actionDurationMs: Date.now() - actionStart
    })
  }
})

export default router
