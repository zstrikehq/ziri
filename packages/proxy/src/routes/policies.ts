import { Router, type Request, type Response } from 'express'
import { requireAdmin } from '../middleware/auth.js'
import { serviceFactory } from '../services/service-factory.js'
import { getDatabase } from '../db/index.js'
import { getPolicyTemplates } from '../services/policy-template-service.js'
import { logInternalOutcome } from '../utils/internal-audit-helpers.js'

const router: Router = Router()

router.get('/', requireAdmin, async (req: Request, res: Response) => {
  const actionStart = Date.now()
  try {
    const {
      search,
      limit,
      offset,
      effect,
      sortBy,
      sortOrder
    } = req.query
    
    const db = getDatabase()
    
    let whereClause = "WHERE obj_type = 'policy'"
    const args: any[] = []
    
    let orderByClause = 'ORDER BY created_at ASC'
    if (sortBy && sortOrder && (sortOrder === 'asc' || sortOrder === 'desc')) {
      const columnMap: Record<string, string> = {
        'description': 'description',
        'status': 'status',
        'effect': 'content',
        'createdAt': 'created_at',
        'updatedAt': 'updated_at'
      }
      const dbColumn = columnMap[sortBy as string]
      if (dbColumn) {
        const order = sortOrder.toUpperCase()
        orderByClause = `ORDER BY ${dbColumn} ${order}`
      }
    }
    
    let countSql = `SELECT COUNT(*) as total FROM schema_policy ${whereClause}`
    const countResult = db.prepare(countSql).get(...args) as { total: number }
    let total = countResult.total
    
    const limitValue = limit ? parseInt(limit as string, 10) : 100
    const offsetValue = offset ? parseInt(offset as string, 10) : 0
    const dataSql = `
      SELECT content, description, status, created_at, updated_at
      FROM schema_policy 
      ${whereClause}
      ${orderByClause}
      LIMIT ? OFFSET ?
    `
    const rows = db.prepare(dataSql).all(...args, limitValue, offsetValue) as { content: string; description: string | null; status: number; created_at: string; updated_at: string }[]

    let policies = rows.map(row => ({
      policy: row.content,
      description: row.description || '',
      isActive: row.status === 1,
      effect: row.content.toLowerCase().includes('permit(') ? 'permit' : 'forbid' as 'permit' | 'forbid'
    }))
    
    if (search) {
      const searchLower = (search as string).toLowerCase()
      policies = policies.filter(p => 
        p.description.toLowerCase().includes(searchLower) ||
        p.policy.toLowerCase().includes(searchLower)
      )
 
      const allRows = db.prepare(`
        SELECT content, description, status 
        FROM schema_policy 
        ${whereClause}
        ORDER BY created_at ASC
      `).all(...args) as { content: string; description: string | null; status: number }[]
      const allPolicies = allRows.map(row => ({
        policy: row.content,
        description: row.description || '',
        isActive: row.status === 1,
        effect: row.content.toLowerCase().includes('permit(') ? 'permit' : 'forbid' as 'permit' | 'forbid'
      }))
      const filtered = allPolicies.filter(p => 
        p.description.toLowerCase().includes(searchLower) ||
        p.policy.toLowerCase().includes(searchLower)
      )
      total = filtered.length
    }
    
    if (effect && (effect === 'permit' || effect === 'forbid')) {
      policies = policies.filter(p => p.effect === effect)
      if (search) {
        const allRows = db.prepare(`
          SELECT content, description, status 
          FROM schema_policy 
          ${whereClause}
          ORDER BY created_at ASC
        `).all(...args) as { content: string; description: string | null; status: number }[]
        const allPolicies = allRows.map(row => ({
          policy: row.content,
          description: row.description || '',
          isActive: row.status === 1,
          effect: row.content.toLowerCase().includes('permit(') ? 'permit' : 'forbid' as 'permit' | 'forbid'
        }))
        const searchLower = (search as string).toLowerCase()
        const filtered = allPolicies.filter(p => 
          (p.description.toLowerCase().includes(searchLower) ||
          p.policy.toLowerCase().includes(searchLower)) &&
          p.effect === effect
        )
        total = filtered.length
      } else {
        const allRows = db.prepare(`
          SELECT content, description, status 
          FROM schema_policy 
          ${whereClause}
          ORDER BY created_at ASC
        `).all(...args) as { content: string; description: string | null; status: number }[]
        const allPolicies = allRows.map(row => ({
          policy: row.content,
          description: row.description || '',
          isActive: row.status === 1,
          effect: row.content.toLowerCase().includes('permit(') ? 'permit' : 'forbid' as 'permit' | 'forbid'
        }))
        const filtered = allPolicies.filter(p => p.effect === effect)
        total = filtered.length
      }
    }
    
    if (sortBy === 'effect' && sortOrder && (sortOrder === 'asc' || sortOrder === 'desc')) {
      policies.sort((a, b) => {
        const comparison = a.effect.localeCompare(b.effect)
        return sortOrder === 'asc' ? comparison : -comparison
      })
    }
    
    await logInternalOutcome(req, {
      status: 'success',
      code: '200',
      message: `Retrieved ${policies.length} policies`,
      actionDurationMs: Date.now() - actionStart
    })
    
    res.json({
      data: {
        policies
      },
      total
    })
  } catch (error: any) {
    await logInternalOutcome(req, {
      status: 'failed',
      code: '500',
      message: error.message || 'Failed to get policies',
      actionDurationMs: Date.now() - actionStart
    })
    
    res.status(500).json({
      error: 'Failed to get policies',
      message: error.message
    })
  }
})

router.post('/', requireAdmin, async (req: Request, res: Response) => {
  const actionStart = Date.now()
  try {
    const { policy, description } = req.body
    
    if (!policy || !description) {
      res.status(400).json({
        error: 'Policy and description are required'
      })
      return
    }
    
    const policyStore = serviceFactory.getPolicyStore()
    await policyStore.createPolicy(policy, description)
    
    res.json({
      success: true,
      message: 'Policy created successfully'
    })

    await logInternalOutcome(req, {
      status: 'success',
      code: 'POLICY_CREATED',
      resourceId: undefined,
      resourceDetails: {
        description
      },
      actionDurationMs: Date.now() - actionStart
    })
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to create policy',
      message: error.message
    })

    await logInternalOutcome(req, {
      status: 'failed',
      code: 'POLICY_CREATE_ERROR',
      message: error.message,
      actionDurationMs: Date.now() - actionStart
    })
  }
})

router.put('/', requireAdmin, async (req: Request, res: Response) => {
  const actionStart = Date.now()
  try {
    const { oldPolicy, policy, description } = req.body
    
    if (!oldPolicy || !policy || !description) {
      res.status(400).json({
        error: 'oldPolicy, policy, and description are required'
      })
      return
    }
    
    const policyStore = serviceFactory.getPolicyStore()
    await policyStore.updatePolicy(oldPolicy, policy, description)
    
    res.json({
      success: true,
      message: 'Policy updated successfully'
    })

    await logInternalOutcome(req, {
      status: 'success',
      code: 'POLICY_UPDATED',
      resourceDetails: {
        description
      },
      actionDurationMs: Date.now() - actionStart
    })
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to update policy',
      message: error.message
    })

    await logInternalOutcome(req, {
      status: 'failed',
      code: 'POLICY_UPDATE_ERROR',
      message: error.message,
      actionDurationMs: Date.now() - actionStart
    })
  }
})

router.patch('/status', requireAdmin, async (req: Request, res: Response) => {
  const actionStart = Date.now()
  try {
    const { policy, isActive } = req.body as { policy?: string; isActive?: boolean }

    if (!policy || typeof isActive !== 'boolean') {
      res.status(400).json({
        error: 'policy and isActive (boolean) are required'
      })
      return
    }

    const db = getDatabase()
    
    const existing = db.prepare(`
      SELECT id FROM schema_policy 
      WHERE obj_type = 'policy' AND content = ?
    `).get(policy) as { id: string } | undefined
    
    if (!existing) {
      res.status(404).json({
        error: 'Policy not found'
      })

      await logInternalOutcome(req, {
        status: 'failed',
        code: 'POLICY_STATUS_NOT_FOUND',
        message: 'Policy not found',
        actionDurationMs: Date.now() - actionStart
      })
      return
    }
    
    const newStatus = isActive ? 1 : 0
    const result = db.prepare(`
      UPDATE schema_policy
      SET status = ?, updated_at = datetime('now')
      WHERE obj_type = 'policy' AND content = ?
    `).run(newStatus, policy)

    if (result.changes === 0) {
      res.status(404).json({
        error: 'Policy not found'
      })

      await logInternalOutcome(req, {
        status: 'failed',
        code: 'POLICY_STATUS_NOT_FOUND',
        message: 'Policy not found',
        actionDurationMs: Date.now() - actionStart
      })
      return
    }
    
    res.json({
      success: true,
      message: `Policy ${isActive ? 'activated' : 'deactivated'} successfully`
    })

    await logInternalOutcome(req, {
      status: 'success',
      code: 'POLICY_STATUS_PATCHED',
      resourceDetails: {
        isActive
      },
      actionDurationMs: Date.now() - actionStart
    })
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to update policy status',
      message: error.message
    })

    await logInternalOutcome(req, {
      status: 'failed',
      code: 'POLICY_STATUS_ERROR',
      message: error.message,
      actionDurationMs: Date.now() - actionStart
    })
  }
})

router.delete('/', requireAdmin, async (req: Request, res: Response) => {
  const actionStart = Date.now()
  try {
    const { policy } = req.body
    
    if (!policy) {
      res.status(400).json({
        error: 'Policy is required'
      })

      await logInternalOutcome(req, {
        status: 'failed',
        code: 'POLICY_DELETE_MISSING',
        message: 'Policy is required',
        actionDurationMs: Date.now() - actionStart
      })
      return
    }
    
    const policyStore = serviceFactory.getPolicyStore()
    await policyStore.deletePolicy(policy)
    
    res.json({
      success: true,
      message: 'Policy deleted successfully'
    })

    await logInternalOutcome(req, {
      status: 'success',
      code: 'POLICY_DELETED',
      actionDurationMs: Date.now() - actionStart
    })
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to delete policy',
      message: error.message
    })

    await logInternalOutcome(req, {
      status: 'failed',
      code: 'POLICY_DELETE_ERROR',
      message: error.message,
      actionDurationMs: Date.now() - actionStart
    })
  }
})

router.get('/templates', requireAdmin, async (req: Request, res: Response) => {
  const actionStart = Date.now()
  try {
    const templates = getPolicyTemplates()
    
    await logInternalOutcome(req, {
      status: 'success',
      code: '200',
      message: `Retrieved ${templates.length} policy templates`,
      actionDurationMs: Date.now() - actionStart
    })
    
    res.json({
      templates
    })
  } catch (error: any) {
    await logInternalOutcome(req, {
      status: 'failed',
      code: '500',
      message: error.message || 'Failed to get policy templates',
      actionDurationMs: Date.now() - actionStart
    })
    
    res.status(500).json({
      error: 'Failed to get policy templates',
      message: error.message
    })
  }
})

export default router
