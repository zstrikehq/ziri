// User management routes (admin only - requires master key)

import { Router, type Request, type Response } from 'express'
import { requireAdmin } from '../middleware/auth.js'
import * as userService from '../services/user-service.js'

const router = Router()

// All routes require admin authentication
router.use(requireAdmin)

/**
 * GET /api/users
 * List all users
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const users = userService.listUsers()
    res.json({ users })
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
    const { email, name } = req.body
    
    if (!email || !name) {
      res.status(400).json({
        error: 'email and name are required',
        code: 'MISSING_FIELDS'
      })
      return
    }
    
    const result = await userService.createUser({ email, name })
    
    res.status(201).json({
      user: result.user,
      password: result.password, // Show password once
      message: 'User created successfully. Save the password - it won\'t be shown again!'
    })
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
    const newPassword = await userService.resetUserPassword(userId)
    
    res.json({
      password: newPassword, // Show password once
      message: 'Password reset successfully. Save the password - it won\'t be shown again!'
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
      code: 'RESET_ERROR'
    })
  }
})

export default router
