// Audit routes - query audit logs

import { Router, type Request, type Response } from 'express'
import { requireAdmin } from '../middleware/auth.js'
import { auditLogService } from '../services/audit-log-service.js'

const router: Router = Router()

// All routes require admin authentication
router.use(requireAdmin)

/**
 * GET /api/audit
 * Query audit logs with filters
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      authId,
      apiKeyId,
      provider,
      model,
      decision,
      startDate,
      endDate,
      limit = '100',
      offset = '0'
    } = req.query

    const logs = await auditLogService.query({
      authId: authId as string,
      apiKeyId: apiKeyId as string,
      provider: provider as string,
      model: model as string,
      decision: decision as 'permit' | 'forbid',
      startDate: startDate as string,
      endDate: endDate as string,
      limit: parseInt(limit as string, 10),
      offset: parseInt(offset as string, 10),
    })

    res.json({
      data: logs,
      count: logs.length
    })
  } catch (error: any) {
    console.error('[AUDIT] Query error:', error)
    res.status(500).json({
      error: 'Failed to query audit logs',
      code: 'AUDIT_QUERY_ERROR'
    })
  }
})

/**
 * GET /api/audit/statistics
 * Get audit statistics
 */
router.get('/statistics', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query

    const stats = await auditLogService.getStatistics(
      startDate as string,
      endDate as string
    )

    res.json({ data: stats })
  } catch (error: any) {
    console.error('[AUDIT] Statistics error:', error)
    res.status(500).json({
      error: 'Failed to get audit statistics',
      code: 'AUDIT_STATS_ERROR'
    })
  }
})

export default router
