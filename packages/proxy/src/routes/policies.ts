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
 */
router.get('/', requireAdmin, async (req: Request, res: Response) => {
  try {
    const db = getDatabase()
    const rows = db.prepare(`
      SELECT content, description, status 
      FROM schema_policy 
      WHERE obj_type = 'policy'
      ORDER BY created_at ASC
    `).all() as { content: string; description: string | null; status: number }[]

    const policies = rows.map(row => ({
      policy: row.content,
      description: row.description || '',
      isActive: row.status === 1
    }))
    
    res.json({
      data: {
        policies
      }
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
