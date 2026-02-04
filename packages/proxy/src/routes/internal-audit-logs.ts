import { Router, type Request, type Response } from 'express'
import { requireAdmin } from '../middleware/auth.js'
import { internalAuditLogService } from '../services/internal-audit-log-service.js'
import { logInternalOutcome } from '../utils/internal-audit-helpers.js'

const router: Router = Router()

router.use(requireAdmin)

router.get('/', async (req: Request, res: Response) => {
  const actionStartTime = Date.now()
  try {
    const {
      search,
      decision,
      outcomeStatus,
      userId,
      action,
      resourceType,
      from,
      to,
      limit = '20',
      offset = '0',
      sortBy,
      sortOrder
    } = req.query

    const sortByValue = sortBy ? (sortBy as string) : null
    const sortOrderValue =
      sortOrder === 'asc' || sortOrder === 'desc' ? (sortOrder as 'asc' | 'desc') : null

    const result = await internalAuditLogService.query({
      search: search as string | undefined,
      decision: decision as 'permit' | 'forbid' | undefined,
      outcomeStatus: outcomeStatus as
        | 'success'
        | 'failed'
        | 'denied_before_action'
        | undefined,
      userId: userId as string | undefined,
      action: action as string | undefined,
      resourceType: resourceType as string | undefined,
      from: from as string | undefined,
      to: to as string | undefined,
      limit: parseInt(limit as string, 10),
      offset: parseInt(offset as string, 10),
      sortBy: sortByValue,
      sortOrder: sortOrderValue
    })

    const actionDurationMs = Date.now() - actionStartTime

    // COMMENTED OUT - Skip outcome logging for view_internal_audit action to prevent infinite loop
    // TODO: Re-enable when loop prevention is properly implemented
    // await logInternalOutcome(req, {
    //   status: 'success',
    //   code: '200',
    //   message: `Retrieved ${result.data.length} logs`,
    //   actionDurationMs
    // })

    res.json({
      items: result.data,
      total: result.total
    })
  } catch (error: any) {
    const actionDurationMs = Date.now() - actionStartTime
    console.error('[INTERNAL AUDIT] Query error:', error)
    
    // COMMENTED OUT - Skip outcome logging for view_internal_audit action to prevent infinite loop
    // TODO: Re-enable when loop prevention is properly implemented
    // await logInternalOutcome(req, {
    //   status: 'failed',
    //   code: '500',
    //   message: error.message || 'Failed to query internal audit logs',
    //   actionDurationMs
    // })

    res.status(500).json({
      error: 'Failed to query internal audit logs',
      code: 'INTERNAL_AUDIT_QUERY_ERROR'
    })
  }
})

export default router

