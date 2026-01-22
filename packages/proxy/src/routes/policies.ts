// Policy routes - manage Cedar policies (local mode)

import { Router, type Request, type Response } from 'express'
import { requireAdmin } from '../middleware/auth.js'
import { serviceFactory } from '../services/service-factory.js'
import { getDatabase } from '../db/index.js'

const router: Router = Router()

/**
 * GET /api/policies
 * Get all policies (active and inactive) for admin management
 * Note: Authorization engine will still only evaluate active policies
 * Supports search, limit, offset, and effect filter
 */
router.get('/', requireAdmin, async (req: Request, res: Response) => {
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
    
    // Build WHERE clause
    let whereClause = "WHERE obj_type = 'policy'"
    const args: any[] = []
    
    // Build ORDER BY clause
    let orderByClause = 'ORDER BY created_at ASC' // Default sort
    if (sortBy && sortOrder && (sortOrder === 'asc' || sortOrder === 'desc')) {
      // Map frontend column names to database column names
      const columnMap: Record<string, string> = {
        'description': 'description',
        'status': 'status',
        'effect': 'content', // Effect is derived from content, but we'll sort by content
        'createdAt': 'created_at',
        'updatedAt': 'updated_at'
      }
      const dbColumn = columnMap[sortBy as string]
      if (dbColumn) {
        const order = sortOrder.toUpperCase()
        orderByClause = `ORDER BY ${dbColumn} ${order}`
      }
    }
    
    // Get total count first
    let countSql = `SELECT COUNT(*) as total FROM schema_policy ${whereClause}`
    const countResult = db.prepare(countSql).get(...args) as { total: number }
    let total = countResult.total
    
    // Get paginated data
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

    // Map policies
    let policies = rows.map(row => ({
      policy: row.content,
      description: row.description || '',
      isActive: row.status === 1,
      effect: row.content.toLowerCase().includes('permit(') ? 'permit' : 'forbid' as 'permit' | 'forbid'
    }))
    
    // Apply search filter (client-side since we need to search policy content)
    if (search) {
      const searchLower = (search as string).toLowerCase()
      policies = policies.filter(p => 
        p.description.toLowerCase().includes(searchLower) ||
        p.policy.toLowerCase().includes(searchLower)
      )
      // Recalculate total based on filtered results
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
    
    // Apply effect filter (permit/forbid) - extract from policy content
    if (effect && (effect === 'permit' || effect === 'forbid')) {
      policies = policies.filter(p => p.effect === effect)
      // Recalculate total if search was also applied
      if (search) {
        // Already filtered above, but need to re-filter by effect
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
    
    // Apply client-side sorting if sortBy is 'effect' (since effect is derived from content)
    if (sortBy === 'effect' && sortOrder && (sortOrder === 'asc' || sortOrder === 'desc')) {
      policies.sort((a, b) => {
        const comparison = a.effect.localeCompare(b.effect)
        return sortOrder === 'asc' ? comparison : -comparison
      })
    }
    
    res.json({
      data: {
        policies
      },
      total
    })
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to get policies',
      message: error.message
    })
  }
})

/**
 * POST /api/policies
 * Create a new policy
 */
router.post('/', requireAdmin, async (req: Request, res: Response) => {
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
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to create policy',
      message: error.message
    })
  }
})

/**
 * PUT /api/policies
 * Update a policy
 */
router.put('/', requireAdmin, async (req: Request, res: Response) => {
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
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to update policy',
      message: error.message
    })
  }
})

/**
 * PATCH /api/policies/status
 * Activate or deactivate a policy (toggle status)
 */
router.patch('/status', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { policy, isActive } = req.body as { policy?: string; isActive?: boolean }

    if (!policy || typeof isActive !== 'boolean') {
      res.status(400).json({
        error: 'policy and isActive (boolean) are required'
      })
      return
    }

    const db = getDatabase()
    
    // First check if policy exists (regardless of status)
    const existing = db.prepare(`
      SELECT id FROM schema_policy 
      WHERE obj_type = 'policy' AND content = ?
    `).get(policy) as { id: string } | undefined
    
    if (!existing) {
      res.status(404).json({
        error: 'Policy not found'
      })
      return
    }
    
    // Update status (allow updating regardless of current status)
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
      return
    }

    res.json({
      success: true,
      message: `Policy ${isActive ? 'activated' : 'deactivated'} successfully`
    })
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to update policy status',
      message: error.message
    })
  }
})

/**
 * DELETE /api/policies
 * Delete a policy
 */
router.delete('/', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { policy } = req.body
    
    if (!policy) {
      res.status(400).json({
        error: 'Policy is required'
      })
      return
    }
    
    const policyStore = serviceFactory.getPolicyStore()
    await policyStore.deletePolicy(policy)
    
    res.json({
      success: true,
      message: 'Policy deleted successfully'
    })
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to delete policy',
      message: error.message
    })
  }
})

export default router
