import { Router, type Request, type Response } from 'express'
import { requireAdmin } from '../middleware/auth.js'
import * as roleEntityService from '../services/role-entity-service.js'
import { logInternalAction } from '../utils/internal-audit-helpers.js'

const router: Router = Router()

router.use(requireAdmin)

router.get('/', async (req: Request, res: Response) => {
  try {
    const search = req.query.search as string | undefined
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : undefined
    const sortBy = (req.query.sortBy as string | undefined) || null
    const sortOrder = req.query.sortOrder === 'asc' || req.query.sortOrder === 'desc'
      ? (req.query.sortOrder as 'asc' | 'desc')
      : null
    const includeUsage = req.query.usage === 'true'
    const { roles, total } = await roleEntityService.listRoles({ search, limit, offset, sortBy, sortOrder })
    if (includeUsage) {
      const withUsage = await Promise.all(
        roles.map(async (r) => {
          const usage = await roleEntityService.getRoleUsage(r.id)
          return { id: r.id, usageCount: usage.count }
        })
      )
      return res.json({ roles: withUsage, total })
    }
    res.json({ roles, total })
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to list roles' })
  }
})

router.post('/', async (req: Request, res: Response) => {
  const actionStart = Date.now()
  try {
    const { id } = req.body
    if (!id || typeof id !== 'string') {
      res.status(400).json({ error: 'id is required' })
      return
    }
    const roleId = id.trim()
    await roleEntityService.createRole(roleId)
    res.status(201).json({ role: { id: roleId } })

    logInternalAction(req, {
      action: 'create_role',
      resourceType: 'roles',
      resourceId: roleId,
      actionDurationMs: Date.now() - actionStart
    })
  } catch (error: any) {
    if (error.message?.includes('already exists')) {
      res.status(409).json({ error: error.message })
      return
    }
    if (error.message?.includes('must contain only')) {
      res.status(400).json({ error: error.message })
      return
    }
    res.status(500).json({ error: error.message || 'Failed to create role' })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  const actionStart = Date.now()
  try {
    const id = req.params.id
    if (!id) {
      res.status(400).json({ error: 'id is required' })
      return
    }
    await roleEntityService.deleteRole(id)
    res.status(204).send()

    logInternalAction(req, {
      action: 'delete_role',
      resourceType: 'roles',
      resourceId: id,
      actionDurationMs: Date.now() - actionStart
    })
  } catch (error: any) {
    const statusCode = (error as any).statusCode ?? 500
    if (statusCode === 409) {
      res.status(409).json({ error: error.message })
      return
    }
    if (error.message?.includes('not found') || error.message?.includes('Entity not found')) {
      res.status(404).json({ error: error.message })
      return
    }
    res.status(500).json({ error: error.message || 'Failed to delete role' })
  }
})

export default router
