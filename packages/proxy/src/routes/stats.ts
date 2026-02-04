 

import { Router, type Request, type Response } from 'express'
import { requireAdmin } from '../middleware/auth.js'
import { getDatabase } from '../db/index.js'
import { auditLogService } from '../services/audit-log-service.js'
import { costTrackingService } from '../services/cost-tracking-service.js'
import { logInternalOutcome } from '../utils/internal-audit-helpers.js'

const router: Router = Router()

 
router.use(requireAdmin)

 
router.get('/overview', (req: Request, res: Response) => {
  const actionStart = Date.now()
  try {
    const db = getDatabase()
    
 
    const totalRequests = db.prepare('SELECT COUNT(*) as count FROM audit_logs').get() as { count: number }
    
 
    const permitCount = db.prepare('SELECT COUNT(*) as count FROM audit_logs WHERE decision = ?').get('permit') as { count: number }
    const forbidCount = db.prepare('SELECT COUNT(*) as count FROM audit_logs WHERE decision = ?').get('forbid') as { count: number }
    
 
    const totalCost = db.prepare('SELECT SUM(total_cost) as sum FROM cost_tracking').get() as { sum: number | null }
    
    res.json({
      totalRequests: totalRequests.count || 0,
      permitCount: permitCount.count || 0,
      forbidCount: forbidCount.count || 0,
      totalCost: totalCost.sum || 0,
    })

    void logInternalOutcome(req, {
      status: 'success',
      code: 'STATS_VIEWED',
      actionDurationMs: Date.now() - actionStart
    })
  } catch (error: any) {
    console.error('[STATS] Overview error:', error)
    res.status(500).json({
      error: 'Failed to get overview statistics',
      code: 'STATS_ERROR'
    })

    void logInternalOutcome(req, {
      status: 'failed',
      code: 'STATS_VIEW_ERROR',
      message: error.message,
      actionDurationMs: Date.now() - actionStart
    })
  }
})

export default router
