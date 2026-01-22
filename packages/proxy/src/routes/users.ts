// User management routes (admin only - requires master key)

import { Router, type Request, type Response } from 'express'
import { requireAdmin } from '../middleware/auth.js'
import * as userService from '../services/user-service.js'

const router: Router = Router()

// All routes require admin authentication
router.use(requireAdmin)

/**
 * GET /api/users
 * List all users with optional search, limit, and offset
 */
router.get('/', (req: Request, res: Response) => {
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
    
    res.json({
      users: result.data,
      total: result.total
    })
  } catch (error: any) {
    console.error('[USERS] List error:', error)
    res.status(500).json({
      error: 'Failed to list users',
      code: 'LIST_ERROR'
    })
  }
})

/**
 * GET /api/users/:userId
 * Get user by userId
 */
router.get('/:userId', (req: Request, res: Response) => {
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
    
    res.json({ user })
  } catch (error: any) {
    console.error('[USERS] Get error:', error)
    res.status(500).json({
      error: 'Failed to get user',
      code: 'GET_ERROR'
    })
  }
})

/**
 * POST /api/users
 * Create a new user
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { email, name, department, isAgent, limitRequestsPerMinute } = req.body
    
    if (!email || !name || !department) {
      res.status(400).json({
        error: 'email, name, and department are required',
        code: 'MISSING_FIELDS'
      })
      return
    }
    
    const result = await userService.createUser({ 
      email, 
      name, 
      department,
      isAgent: isAgent ?? false,
      limitRequestsPerMinute: limitRequestsPerMinute || 100
    })
    
    if (result.emailSent) {
      res.status(201).json({
        user: result.user,
        message: 'User created successfully. Credentials have been sent to the user\'s email address.'
      })
    } else {
      res.status(201).json({
        user: result.user,
        password: result.password, // Show password if email not sent
        message: 'User created successfully. Save the password - it won\'t be shown again! Email was not sent (email service not configured or failed).'
      })
    }
  } catch (error: any) {
    console.error('[USERS] Create error:', error)
    
    if (error.message.includes('already exists')) {
      res.status(409).json({
        error: error.message,
        code: 'USER_EXISTS'
      })
      return
    }
    
    res.status(500).json({
      error: 'Failed to create user',
      code: 'CREATE_ERROR'
    })
  }
})

/**
 * PUT /api/users/:userId
 * Update user
 */
router.put('/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params
    const { email, name } = req.body
    
    const user = await userService.updateUser(userId, { email, name })
    
    res.json({ user })
  } catch (error: any) {
    console.error('[USERS] Update error:', error)
    
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
      code: 'UPDATE_ERROR'
    })
  }
})

/**
 * DELETE /api/users/:userId
 * Delete user (with cascade: keys → entities → refresh tokens)
 */
router.delete('/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params
    await userService.deleteUser(userId)
    
    res.json({ success: true })
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
      code: 'DELETE_ERROR'
    })
  }
})

/**
 * POST /api/users/:userId/reset-password
 * Reset user password
 */
router.post('/:userId/reset-password', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params
    const result = await userService.resetUserPassword(userId)
    
    if (result.emailSent) {
      res.json({
        password: undefined, // Don't send password if email was sent
        emailSent: true,
        message: 'Password reset successfully. The new password has been sent to the user\'s email address.'
      })
    } else {
      res.json({
        password: result.password, // Show password if email not sent
        emailSent: false,
        message: 'Password reset successfully. Save the password - it won\'t be shown again! Email was not sent (email service not configured or failed).'
      })
    }
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
      code: 'RESET_ERROR'
    })
  }
})

export default router
