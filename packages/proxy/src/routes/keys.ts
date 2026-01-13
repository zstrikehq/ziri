// API key management routes (admin only - requires master key)

import { Router, type Request, type Response } from 'express'
import { requireAdmin } from '../middleware/auth.js'
import * as keyService from '../services/key-service.js'

const router = Router()

// All routes require admin authentication
router.use(requireAdmin)

/**
 * GET /api/keys
 * List all API keys
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const keys = keyService.listKeys()
    res.json({ keys })
  } catch (error: any) {
    console.error('[KEYS] List error:', error)
    res.status(500).json({
      error: 'Failed to list keys',
      code: 'LIST_ERROR'
    })
  }
})

/**
 * GET /api/keys/user/:userId
 * Get keys for a specific user
 */
router.get('/user/:userId', (req: Request, res: Response) => {
  try {
    const { userId } = req.params
    const keys = keyService.getKeysByUserId(userId)
    res.json({ keys })
  } catch (error: any) {
    console.error('[KEYS] Get user keys error:', error)
    res.status(500).json({
      error: 'Failed to get user keys',
      code: 'GET_ERROR'
    })
  }
})

/**
 * POST /api/keys
 * Create a new API key
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { 
      userId, 
      role, 
      department, 
      securityClearance, 
      trainingCompleted, 
      yearsOfService,
      dailySpendLimit, 
      monthlySpendLimit 
    } = req.body
    
    if (!userId) {
      res.status(400).json({
        error: 'userId is required',
        code: 'MISSING_USER_ID'
      })
      return
    }
    
    const result = await keyService.createKey({ 
      userId, 
      role, 
      department, 
      securityClearance, 
      trainingCompleted, 
      yearsOfService,
      dailySpendLimit, 
      monthlySpendLimit 
    })
    
    res.status(201).json({
      apiKey: result.apiKey,
      userId: result.userId,
      message: 'API key created successfully. Save the key - it won\'t be shown again!'
    })
  } catch (error: any) {
    console.error('[KEYS] Create error:', error)
    
    if (error.message === 'User not found') {
      res.status(404).json({
        error: error.message,
        code: 'USER_NOT_FOUND'
      })
      return
    }
    
    if (error.message.includes('Backend API')) {
      res.status(502).json({
        error: error.message,
        code: 'BACKEND_API_ERROR'
      })
      return
    }
    
    res.status(500).json({
      error: 'Failed to create key',
      code: 'CREATE_ERROR'
    })
  }
})

/**
 * POST /api/keys/:userId/rotate
 * Rotate an API key (generate new key for same user)
 */
router.post('/:userId/rotate', (req: Request, res: Response) => {
  try {
    const { userId } = req.params
    
    const result = keyService.rotateKey(userId)
    
    res.json({
      apiKey: result.apiKey,
      userId: result.userId,
      message: 'API key rotated successfully. Save the new key - it won\'t be shown again!'
    })
  } catch (error: any) {
    console.error('[KEYS] Rotate error:', error)
    
    if (error.message === 'User not found') {
      res.status(404).json({
        error: error.message,
        code: 'USER_NOT_FOUND'
      })
      return
    }
    
    res.status(500).json({
      error: 'Failed to rotate key',
      code: 'ROTATE_ERROR'
    })
  }
})

/**
 * DELETE /api/keys/:userId
 * Delete all API keys for a user
 */
router.delete('/:userId', (req: Request, res: Response) => {
  try {
    const { userId } = req.params
    keyService.deleteKey(userId)
    
    res.json({ success: true })
  } catch (error: any) {
    console.error('[KEYS] Delete error:', error)
    
    if (error.message === 'No keys found for user') {
      res.status(404).json({
        error: error.message,
        code: 'KEY_NOT_FOUND'
      })
      return
    }
    
    res.status(500).json({
      error: 'Failed to delete key',
      code: 'DELETE_ERROR'
    })
  }
})

export default router
