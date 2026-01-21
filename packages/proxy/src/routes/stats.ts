// Stats routes - overview statistics for dashboard

import { Router, type Request, type Response } from 'express'
import { requireAdmin } from '../middleware/auth.js'
import { getDatabase } from '../db/index.js'
import { auditLogService } from '../services/audit-log-service.js'
import { costTrackingService } from '../services/cost-tracking-service.js'

const router: Router = Router()

// All routes require admin authentication
router.use(requireAdmin)

/**
 * GET /api/stats/overview
 * Get overview statistics for dashboard
 */
router.get('/overview', (req: Request, res: Response) => {
  try {
    const db = getDatabase()
    
    // Total requests
    const totalRequests = db.prepare('SELECT COUNT(*) as count FROM audit_logs').get() as { count: number }
    
    // Permit/Forbid counts
    const permitCount = db.prepare('SELECT COUNT(*) as count FROM audit_logs WHERE decision = ?').get('permit') as { count: number }
    const forbidCount = db.prepare('SELECT COUNT(*) as count FROM audit_logs WHERE decision = ?').get('forbid') as { count: number }
    
    // Total cost
    const totalCost = db.prepare('SELECT SUM(total_cost) as sum FROM cost_tracking').get() as { sum: number | null }
    
    res.json({
      totalRequests: totalRequests.count || 0,
      permitCount: permitCount.count || 0,
      forbidCount: forbidCount.count || 0,
      totalCost: totalCost.sum || 0,
    })
  } catch (error: any) {
    console.error('[STATS] Overview error:', error)
    res.status(500).json({
      error: 'Failed to get overview statistics',
      code: 'STATS_ERROR'
    })
  }
})

export default router
