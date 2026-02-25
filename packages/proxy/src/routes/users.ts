import { Router, type Request, type Response } from 'express'
import { requireAdmin, type AdminRequest } from '../middleware/auth.js'
import * as userService from '../services/user-service.js'
import * as dashboardUserService from '../services/dashboard-user-service.js'
import * as keyService from '../services/key-service.js'
import { internalAuthorizationService } from '../services/internal/internal-authorization-service.js'
import { logInternalAction } from '../utils/internal-audit-helpers.js'
import { SUCCESS_MESSAGES } from '../utils/success-messages.js'
import type { User } from '../services/user-service.js'

const router: Router = Router()

 
router.use(requireAdmin)

 
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      search,
      limit,
      offset,
      sortBy,
      sortOrder,
      forApiKeys
    } = req.query
    

    let result: { data: User[]; total: number }
    if (forApiKeys === 'true') {
      const [accessResult, dashboardResult] = await Promise.all([
        userService.listUsers({
          search: search as string | undefined,
          limit: 1000,
          offset: 0,
          sortBy: sortBy as string | undefined || null,
          sortOrder: (sortOrder === 'asc' || sortOrder === 'desc') ? sortOrder as 'asc' | 'desc' : null
        }),
        dashboardUserService.listDashboardUsers({
          search: search as string | undefined,
          limit: 1000,
          offset: 0,
          sortBy: sortBy as string | undefined || null,
          sortOrder: (sortOrder === 'asc' || sortOrder === 'desc') ? sortOrder as 'asc' | 'desc' : null
        })
      ])
      const accessUsers = accessResult.data
      const dashboardUsersAsUser: User[] = dashboardResult.data.map(d => ({
        id: d.userId,
        userId: d.userId,
        email: d.email,
        name: d.name,
        tenant: undefined,
        isAgent: false,
        status: d.status,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
        lastSignIn: d.lastSignIn
      }))
      const merged = [...accessUsers, ...dashboardUsersAsUser]
      const total = merged.length
      const lim = limit ? parseInt(limit as string, 10) : 100
      const off = offset ? parseInt(offset as string, 10) : 0
      const paginated = merged.slice(off, off + lim)
      result = { data: paginated, total }
    } else {
      result = userService.listUsers({
        search: search as string | undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        offset: offset ? parseInt(offset as string, 10) : undefined,
        sortBy: sortBy as string | undefined || null,
        sortOrder: (sortOrder === 'asc' || sortOrder === 'desc') ? sortOrder as 'asc' | 'desc' : null
      })
    }
    const usersWithRole = await Promise.all(
      result.data.map(async (u) => ({
        ...u,
        roleId: await userService.getRoleIdForUser(u.userId)
      }))
    )
    res.json({
      users: usersWithRole,
      total: result.total
    })
  } catch (error: any) {
    
    console.error('[USERS] List error:', error)
    res.status(500).json({
      error: 'Failed to list users',
      code: 'LIST_ERROR',
      ...(process.env.NODE_ENV !== 'production' && { detail: error.message })
    })
  }
})

 
router.get('/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params
    const user = userService.getUserById(userId)
    
    if (!user) {
      res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      })
      return
    }
    const roleId = await userService.getRoleIdForUser(userId)
    res.json({ user: { ...user, roleId } })
  } catch (error: any) {
    
    console.error('[USERS] Get error:', error)
    res.status(500).json({
      error: 'Failed to get user',
      code: 'GET_ERROR',
      ...(process.env.NODE_ENV !== 'production' && { detail: error.message })
    })
  }
})

 
router.post('/', async (req: AdminRequest, res: Response) => {
  const actionStart = Date.now()
  try {
    const { email, name, tenant, isAgent, limitRequestsPerMinute, createApiKey, roleId } = req.body

    if (!email || !name) {
      res.status(400).json({
        error: 'email and name are required',
        code: 'MISSING_FIELDS'
      })
      return
    }

    const shouldCreateApiKey = createApiKey === true || createApiKey === 'true'

    if (shouldCreateApiKey && req.admin) {
      const principal = `DashboardUser::"${req.admin.userId}"`
      const authzResult = await internalAuthorizationService.authorize({
        principal,
        action: 'Action::"create_key"',
        resourceType: 'keys',
        context: {}
      })
      if (!authzResult.allowed) {
        res.status(403).json({
          error: 'Access denied',
          code: 'ACCESS_DENIED',
          reason: authzResult.reason
        })
        return
      }
    }

    const result = await userService.createUser({ 
      email, 
      name, 
      tenant,
      isAgent: isAgent ?? false,
      limitRequestsPerMinute: limitRequestsPerMinute || 100,
      createApiKey: shouldCreateApiKey,
      roleId: roleId || undefined
    })
    
    if (result.emailSent) {
      res.status(201).json({
        user: result.user,
        apiKey: result.apiKey,
        message: SUCCESS_MESSAGES.USER_CREATED_EMAIL_SENT
      })
    } else {
      res.status(201).json({
        user: result.user,
        password: result.password,
        apiKey: result.apiKey,
        message: SUCCESS_MESSAGES.USER_CREATED_EMAIL_NOT_SENT
      })
    }

    logInternalAction(req, {
      action: 'create_user',
      resourceType: 'user',
      resourceId: result.user.userId,
      actionDurationMs: Date.now() - actionStart
    })
    if (result.apiKey) {
      logInternalAction(req, {
        action: 'create_key',
        resourceType: 'api_key',
        resourceId: result.user.userId,
        actionDurationMs: Date.now() - actionStart
      })
    }
  } catch (error: any) {
    console.error('[USERS] Create error:', error)
    
    if (error.message && error.message.startsWith('Role not found')) {
      res.status(400).json({
        error: error.message,
        code: 'ROLE_NOT_FOUND'
      })
      return
    }

    if (error.message.includes('already exists')) {
      res.status(409).json({
        error: error.message,
        code: 'USER_EXISTS'
      })

      return
    }
    
    res.status(500).json({
      error: 'Failed to create user',
      code: 'CREATE_ERROR',
      ...(process.env.NODE_ENV !== 'production' && { detail: error.message })
    })

  }
})

 
router.put('/:userId', async (req: Request, res: Response) => {
  const actionStart = Date.now()
  try {
    const { userId } = req.params
    const { email, name, tenant, isAgent, limitRequestsPerMinute, roleId } = req.body
    
    const user = await userService.updateUser(userId, { email, name, tenant, isAgent, limitRequestsPerMinute, roleId })
    
    res.json({ user })

    logInternalAction(req, {
      action: 'update_user',
      resourceType: 'user',
      resourceId: user.userId,
      actionDurationMs: Date.now() - actionStart
    })
  } catch (error: any) {
    console.error('[USERS] Update error:', error)
    
    if (error.message && error.message.startsWith('Role not found')) {
      res.status(400).json({
        error: error.message,
        code: 'ROLE_NOT_FOUND'
      })
      return
    }

    if (error.message === 'User not found') {
      res.status(404).json({
        error: error.message,
        code: 'USER_NOT_FOUND'
      })

      return
    }
    
    if (error.message.includes('already in use')) {
      res.status(409).json({
        error: error.message,
        code: 'EMAIL_EXISTS'
      })

      return
    }
    
    res.status(500).json({
      error: 'Failed to update user',
      code: 'UPDATE_ERROR',
      ...(process.env.NODE_ENV !== 'production' && { detail: error.message })
    })

  }
})

 
router.delete('/:userId', async (req: AdminRequest, res: Response) => {
  const actionStart = Date.now()
  try {
    const { userId } = req.params
    const keysBeforeDelete = keyService.getKeysByUserId(userId)
    const hadKeys = keysBeforeDelete.length > 0

    if (hadKeys && req.admin) {
      const principal = `DashboardUser::"${req.admin.userId}"`
      const authzResult = await internalAuthorizationService.authorize({
        principal,
        action: 'Action::"delete_keys_by_user"',
        resourceType: 'keys',
        context: {}
      })
      if (!authzResult.allowed) {
        res.status(403).json({
          error: 'Access denied',
          code: 'ACCESS_DENIED',
          reason: authzResult.reason
        })
        return
      }
    }

    await userService.deleteUser(userId)

    res.json({ success: true })

    logInternalAction(req, {
      action: 'delete_user',
      resourceType: 'user',
      resourceId: userId,
      actionDurationMs: Date.now() - actionStart
    })
    if (hadKeys) {
      logInternalAction(req, {
        action: 'delete_keys',
        resourceType: 'api_key',
        resourceId: userId,
        actionDurationMs: Date.now() - actionStart
      })
    }
  } catch (error: any) {
    console.error('[USERS] Delete error:', error)
    
    if (error.message === 'User not found') {
      res.status(404).json({
        error: error.message,
        code: 'USER_NOT_FOUND'
      })

      return
    }
    
    res.status(500).json({
      error: 'Failed to delete user',
      code: 'DELETE_ERROR',
      ...(process.env.NODE_ENV !== 'production' && { detail: error.message })
    })

  }
})

 
router.post('/:userId/reset-password', async (req: Request, res: Response) => {
  const actionStart = Date.now()
  try {
    const { userId } = req.params
    const result = await userService.resetUserPassword(userId)
    
    if (result.emailSent) {
      res.json({
        password: undefined,
        emailSent: true,
        message: SUCCESS_MESSAGES.USER_PASSWORD_RESET_EMAIL_SENT
      })
    } else {
      res.json({
        password: result.password,
        emailSent: false,
        message: SUCCESS_MESSAGES.USER_PASSWORD_RESET_EMAIL_NOT_SENT
      })
    }

    logInternalAction(req, {
      action: 'reset_password',
      resourceType: 'user',
      resourceId: userId,
      actionDurationMs: Date.now() - actionStart
    })
  } catch (error: any) {
    console.error('[USERS] Reset password error:', error)
    
    if (error.message === 'User not found') {
      res.status(404).json({
        error: error.message,
        code: 'USER_NOT_FOUND'
      })

      return
    }
    
    res.status(500).json({
      error: 'Failed to reset password',
      code: 'RESET_ERROR',
      ...(process.env.NODE_ENV !== 'production' && { detail: error.message })
    })

  }
})

export default router
