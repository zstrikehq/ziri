 

import { Router, type Request, type Response } from 'express'
import { requireAdmin } from '../middleware/auth.js'
import * as userService from '../services/user-service.js'
import { logInternalOutcome } from '../utils/internal-audit-helpers.js'

const router: Router = Router()

 
router.use(requireAdmin)

 
router.get('/', async (req: Request, res: Response) => {
  const actionStart = Date.now()
  try {
    const {
      search,
      limit,
      offset,
      sortBy,
      sortOrder
    } = req.query
    
    const result = userService.listUsers({
      search: search as string | undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      offset: offset ? parseInt(offset as string, 10) : undefined,
      sortBy: sortBy as string | undefined || null,
      sortOrder: (sortOrder === 'asc' || sortOrder === 'desc') ? sortOrder as 'asc' | 'desc' : null
    })
    
    await logInternalOutcome(req, {
      status: 'success',
      code: '200',
      message: `Retrieved ${result.data.length} users`,
      actionDurationMs: Date.now() - actionStart
    })
    
    res.json({
      users: result.data,
      total: result.total
    })
  } catch (error: any) {
    await logInternalOutcome(req, {
      status: 'failed',
      code: '500',
      message: error.message || 'Failed to list users',
      actionDurationMs: Date.now() - actionStart
    })
    
    console.error('[USERS] List error:', error)
    res.status(500).json({
      error: 'Failed to list users',
      code: 'LIST_ERROR'
    })
  }
})

 
router.get('/:userId', async (req: Request, res: Response) => {
  const actionStart = Date.now()
  try {
    const { userId } = req.params
    const user = userService.getUserById(userId)
    
    if (!user) {
      await logInternalOutcome(req, {
        status: 'failed',
        code: '404',
        message: 'User not found',
        resourceId: userId,
        actionDurationMs: Date.now() - actionStart
      })
      
      res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      })
      return
    }
    
    await logInternalOutcome(req, {
      status: 'success',
      code: '200',
      message: 'Retrieved user',
      resourceId: userId,
      actionDurationMs: Date.now() - actionStart
    })
    
    res.json({ user })
  } catch (error: any) {
    await logInternalOutcome(req, {
      status: 'failed',
      code: '500',
      message: error.message || 'Failed to get user',
      resourceId: req.params.userId,
      actionDurationMs: Date.now() - actionStart
    })
    
    console.error('[USERS] Get error:', error)
    res.status(500).json({
      error: 'Failed to get user',
      code: 'GET_ERROR'
    })
  }
})

 
router.post('/', async (req: Request, res: Response) => {
  const actionStart = Date.now()
  try {
    const { email, name, group, isAgent, limitRequestsPerMinute, createApiKey } = req.body
    
    console.log(`[USERS] Create user request - createApiKey value:`, createApiKey, `type:`, typeof createApiKey)
    
    if (!email || !name) {
      res.status(400).json({
        error: 'email and name are required',
        code: 'MISSING_FIELDS'
      })
      return
    }
    
    const shouldCreateApiKey = createApiKey === true || createApiKey === 'true'
    console.log(`[USERS] Should create API key:`, shouldCreateApiKey)
    
    const result = await userService.createUser({ 
      email, 
      name, 
      group,
      isAgent: isAgent ?? false,
      limitRequestsPerMinute: limitRequestsPerMinute || 100,
      createApiKey: shouldCreateApiKey
    })
    
    if (result.emailSent) {
      res.status(201).json({
        user: result.user,
        message: 'User created successfully. Credentials have been sent to the user\'s email address.'
      })
    } else {
      res.status(201).json({
        user: result.user,
        password: result.password,
        message: 'User created successfully. Save the password - it won\'t be shown again! Email was not sent (email service not configured or failed).'
      })
    }

    await logInternalOutcome(req, {
      status: 'success',
      code: 'USER_CREATED',
      resourceId: result.user.userId,
      resourceDetails: {
        userId: result.user.userId,
        email: result.user.email,
        name: result.user.name
      },
      actionDurationMs: Date.now() - actionStart
    })
  } catch (error: any) {
    console.error('[USERS] Create error:', error)
    
    if (error.message.includes('already exists')) {
      res.status(409).json({
        error: error.message,
        code: 'USER_EXISTS'
      })

      await logInternalOutcome(req, {
        status: 'failed',
        code: 'USER_CREATE_EXISTS',
        message: error.message,
        actionDurationMs: Date.now() - actionStart
      })
      return
    }
    
    res.status(500).json({
      error: 'Failed to create user',
      code: 'CREATE_ERROR'
    })

    await logInternalOutcome(req, {
      status: 'failed',
      code: 'USER_CREATE_ERROR',
      message: error.message,
      actionDurationMs: Date.now() - actionStart
    })
  }
})

 
router.put('/:userId', async (req: Request, res: Response) => {
  const actionStart = Date.now()
  try {
    const { userId } = req.params
    const { email, name } = req.body
    
    const user = await userService.updateUser(userId, { email, name })
    
    res.json({ user })

    await logInternalOutcome(req, {
      status: 'success',
      code: 'USER_UPDATED',
      resourceId: user.userId,
      resourceDetails: {
        userId: user.userId,
        email: user.email,
        name: user.name
      },
      actionDurationMs: Date.now() - actionStart
    })
  } catch (error: any) {
    console.error('[USERS] Update error:', error)
    
    if (error.message === 'User not found') {
      res.status(404).json({
        error: error.message,
        code: 'USER_NOT_FOUND'
      })

      await logInternalOutcome(req, {
        status: 'failed',
        code: 'USER_UPDATE_NOT_FOUND',
        message: error.message,
        actionDurationMs: Date.now() - actionStart
      })
      return
    }
    
    if (error.message.includes('already in use')) {
      res.status(409).json({
        error: error.message,
        code: 'EMAIL_EXISTS'
      })

      await logInternalOutcome(req, {
        status: 'failed',
        code: 'USER_UPDATE_EMAIL_EXISTS',
        message: error.message,
        actionDurationMs: Date.now() - actionStart
      })
      return
    }
    
    res.status(500).json({
      error: 'Failed to update user',
      code: 'UPDATE_ERROR'
    })

    await logInternalOutcome(req, {
      status: 'failed',
      code: 'USER_UPDATE_ERROR',
      message: error.message,
      actionDurationMs: Date.now() - actionStart
    })
  }
})

 
router.delete('/:userId', async (req: Request, res: Response) => {
  const actionStart = Date.now()
  try {
    const { userId } = req.params
    await userService.deleteUser(userId)
    
    res.json({ success: true })

    await logInternalOutcome(req, {
      status: 'success',
      code: 'USER_DELETED',
      resourceId: userId,
      resourceDetails: { userId },
      actionDurationMs: Date.now() - actionStart
    })
  } catch (error: any) {
    console.error('[USERS] Delete error:', error)
    
    if (error.message === 'User not found') {
      res.status(404).json({
        error: error.message,
        code: 'USER_NOT_FOUND'
      })

      await logInternalOutcome(req, {
        status: 'failed',
        code: 'USER_DELETE_NOT_FOUND',
        message: error.message,
        actionDurationMs: Date.now() - actionStart
      })
      return
    }
    
    res.status(500).json({
      error: 'Failed to delete user',
      code: 'DELETE_ERROR'
    })

    await logInternalOutcome(req, {
      status: 'failed',
      code: 'USER_DELETE_ERROR',
      message: error.message,
      actionDurationMs: Date.now() - actionStart
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
        message: 'Password reset successfully. The new password has been sent to the user\'s email address.'
      })
    } else {
      res.json({
        password: result.password,
        emailSent: false,
        message: 'Password reset successfully. Save the password - it won\'t be shown again! Email was not sent (email service not configured or failed).'
      })
    }

    await logInternalOutcome(req, {
      status: 'success',
      code: 'USER_PASSWORD_RESET',
      resourceId: userId,
      resourceDetails: { userId },
      actionDurationMs: Date.now() - actionStart
    })
  } catch (error: any) {
    console.error('[USERS] Reset password error:', error)
    
    if (error.message === 'User not found') {
      res.status(404).json({
        error: error.message,
        code: 'USER_NOT_FOUND'
      })

      await logInternalOutcome(req, {
        status: 'failed',
        code: 'USER_PASSWORD_RESET_NOT_FOUND',
        message: error.message,
        actionDurationMs: Date.now() - actionStart
      })
      return
    }
    
    res.status(500).json({
      error: 'Failed to reset password',
      code: 'RESET_ERROR'
    })

    await logInternalOutcome(req, {
      status: 'failed',
      code: 'USER_PASSWORD_RESET_ERROR',
      message: error.message,
      actionDurationMs: Date.now() - actionStart
    })
  }
})

export default router
