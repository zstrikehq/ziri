 

import { Router, type Request, type Response } from 'express'
import { requireAdmin } from '../middleware/auth.js'
import { costTrackingService } from '../services/cost-tracking-service.js'
import { logInternalOutcome } from '../utils/internal-audit-helpers.js'

const router: Router = Router()

 
router.use(requireAdmin)

 
router.get('/summary', async (req: Request, res: Response) => {
  const actionStart = Date.now()
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

    void logInternalOutcome(req, {
      status: 'success',
      code: 'COSTS_VIEWED',
      actionDurationMs: Date.now() - actionStart
    })
  } catch (error: any) {
    console.error('[COSTS] Summary error:', error)
    res.status(500).json({
      error: 'Failed to get cost summary',
      code: 'COSTS_SUMMARY_ERROR'
    })

    void logInternalOutcome(req, {
      status: 'failed',
      code: 'COSTS_VIEW_ERROR',
      message: error.message,
      actionDurationMs: Date.now() - actionStart
    })
  }
})

export default router
