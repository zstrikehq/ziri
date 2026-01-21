// Cost routes - query cost tracking data

import { Router, type Request, type Response } from 'express'
import { requireAdmin } from '../middleware/auth.js'
import { costTrackingService } from '../services/cost-tracking-service.js'

const router: Router = Router()

// All routes require admin authentication
router.use(requireAdmin)

/**
 * GET /api/costs/summary
 * Get cost summary with optional grouping
 */
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const {
      executionKey,
      provider,
      model,
      startDate,
      endDate,
      groupBy
    } = req.query

    const summary = await costTrackingService.getCostSummary({
      executionKey: executionKey as string,
      provider: provider as string,
      model: model as string,
      startDate: startDate as string,
      endDate: endDate as string,
      groupBy: groupBy as 'day' | 'week' | 'month' | 'provider' | 'model' | 'user',
    })

    res.json({ data: summary })
  } catch (error: any) {
    console.error('[COSTS] Summary error:', error)
    res.status(500).json({
      error: 'Failed to get cost summary',
      code: 'COSTS_SUMMARY_ERROR'
    })
  }
})

export default router
