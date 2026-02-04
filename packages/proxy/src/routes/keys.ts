 

import { Router, type Request, type Response } from 'express'
import { requireAdmin } from '../middleware/auth.js'
import * as keyService from '../services/key-service.js'
import { logInternalOutcome } from '../utils/internal-audit-helpers.js'

const router: Router = Router()

 
router.use(requireAdmin)

 
router.get('/', async (req: Request, res: Response) => {
  const actionStart = Date.now()
  try {
    const keys = keyService.listKeys()
    
    await logInternalOutcome(req, {
      status: 'success',
      code: '200',
      message: `Retrieved ${keys.length} keys`,
      actionDurationMs: Date.now() - actionStart
    })
    
    res.json({ keys })
  } catch (error: any) {
    await logInternalOutcome(req, {
      status: 'failed',
      code: '500',
      message: error.message || 'Failed to list keys',
      actionDurationMs: Date.now() - actionStart
    })
    
    console.error('[KEYS] List error:', error)
    res.status(500).json({
      error: 'Failed to list keys',
      code: 'LIST_ERROR'
    })
  }
})

 
router.get('/user/:userId', async (req: Request, res: Response) => {
  const actionStart = Date.now()
  try {
    const { userId } = req.params
    const keys = keyService.getKeysByUserId(userId)
    
    await logInternalOutcome(req, {
      status: 'success',
      code: '200',
      message: `Retrieved ${keys.length} keys for user`,
      resourceId: userId,
      actionDurationMs: Date.now() - actionStart
    })
    
    res.json({ keys })
  } catch (error: any) {
    await logInternalOutcome(req, {
      status: 'failed',
      code: '500',
      message: error.message || 'Failed to get user keys',
      resourceId: req.params.userId,
      actionDurationMs: Date.now() - actionStart
    })
    
    console.error('[KEYS] Get user keys error:', error)
    res.status(500).json({
      error: 'Failed to get user keys',
      code: 'GET_ERROR'
    })
  }
})

 
router.post('/', async (req: Request, res: Response) => {
  const actionStart = Date.now()
  try {
    const { userId } = req.body
    
    if (!userId) {
      res.status(400).json({
        error: 'userId is required',
        code: 'MISSING_USER_ID'
      })
      return
    }
    
    const result = await keyService.createKey({ 
      userId
 
    })
    
    res.status(201).json({
      apiKey: result.apiKey,
      userId: result.userId,
      message: 'API key created successfully. Save the key - it won\'t be shown again!'
    })

    await logInternalOutcome(req, {
      status: 'success',
      code: 'KEY_CREATED',
      resourceId: result.userId,
      resourceDetails: {
        userId: result.userId
      },
      actionDurationMs: Date.now() - actionStart
    })
  } catch (error: any) {
    console.error('[KEYS] Create error:', error)
    
    if (error.message === 'User not found') {
      res.status(404).json({
        error: error.message,
        code: 'USER_NOT_FOUND'
      })

      await logInternalOutcome(req, {
        status: 'failed',
        code: 'KEY_CREATE_USER_NOT_FOUND',
        message: error.message,
        actionDurationMs: Date.now() - actionStart
      })
      return
    }
    
    if (error.message.includes('Backend API')) {
      res.status(502).json({
        error: error.message,
        code: 'BACKEND_API_ERROR'
      })

      await logInternalOutcome(req, {
        status: 'failed',
        code: 'KEY_CREATE_BACKEND_API_ERROR',
        message: error.message,
        actionDurationMs: Date.now() - actionStart
      })
      return
    }
    
    res.status(500).json({
      error: 'Failed to create key',
      code: 'CREATE_ERROR'
    })

    await logInternalOutcome(req, {
      status: 'failed',
      code: 'KEY_CREATE_ERROR',
      message: error.message,
      actionDurationMs: Date.now() - actionStart
    })
  }
})

 
router.post('/:userId/rotate', async (req: Request, res: Response) => {
  const actionStart = Date.now()
  try {
    const { userId } = req.params
    
    const result = await keyService.rotateKey(userId)
    
    res.json({
      apiKey: result.apiKey,
      userId: result.userId,
      message: 'API key rotated successfully. Save the new key - it won\'t be shown again!'
    })

    await logInternalOutcome(req, {
      status: 'success',
      code: 'KEY_ROTATED',
      resourceId: result.userId,
      resourceDetails: {
        userId: result.userId
      },
      actionDurationMs: Date.now() - actionStart
    })
  } catch (error: any) {
    console.error('[KEYS] Rotate error:', error)
    
    if (error.message === 'User not found') {
      res.status(404).json({
        error: error.message,
        code: 'USER_NOT_FOUND'
      })

      await logInternalOutcome(req, {
        status: 'failed',
        code: 'KEY_ROTATE_USER_NOT_FOUND',
        message: error.message,
        actionDurationMs: Date.now() - actionStart
      })
      return
    }
    
    res.status(500).json({
      error: 'Failed to rotate key',
      code: 'ROTATE_ERROR'
    })

    await logInternalOutcome(req, {
      status: 'failed',
      code: 'KEY_ROTATE_ERROR',
      message: error.message,
      actionDurationMs: Date.now() - actionStart
    })
  }
})

 
router.delete('/:userId', async (req: Request, res: Response) => {
  const actionStart = Date.now()
  try {
    const { userId } = req.params
    await keyService.deleteKeysByUserId(userId)
    
    res.json({ success: true })

    await logInternalOutcome(req, {
      status: 'success',
      code: 'KEYS_DELETED_BY_USER',
      resourceId: userId,
      resourceDetails: { userId },
      actionDurationMs: Date.now() - actionStart
    })
  } catch (error: any) {
    console.error('[KEYS] Delete error:', error)
    
    if (error.message === 'No keys found for user') {
      res.status(404).json({
        error: error.message,
        code: 'KEY_NOT_FOUND'
      })

      await logInternalOutcome(req, {
        status: 'failed',
        code: 'KEYS_DELETE_BY_USER_NOT_FOUND',
        message: error.message,
        actionDurationMs: Date.now() - actionStart
      })
      return
    }
    
    res.status(500).json({
      error: 'Failed to delete key',
      code: 'DELETE_ERROR'
    })

    await logInternalOutcome(req, {
      status: 'failed',
      code: 'KEYS_DELETE_BY_USER_ERROR',
      message: error.message,
      actionDurationMs: Date.now() - actionStart
    })
  }
})

 
router.delete('/id/:keyId', async (req: Request, res: Response) => {
  const actionStart = Date.now()
  try {
    const { keyId } = req.params
    keyService.deleteKeyById(keyId)
    
    res.json({ success: true })

    await logInternalOutcome(req, {
      status: 'success',
      code: 'KEY_DELETED',
      resourceId: keyId,
      resourceDetails: { keyId },
      actionDurationMs: Date.now() - actionStart
    })
  } catch (error: any) {
    console.error('[KEYS] Delete by ID error:', error)
    
    if (error.message === 'API key not found') {
      res.status(404).json({
        error: error.message,
        code: 'KEY_NOT_FOUND'
      })

      await logInternalOutcome(req, {
        status: 'failed',
        code: 'KEY_DELETE_NOT_FOUND',
        message: error.message,
        actionDurationMs: Date.now() - actionStart
      })
      return
    }
    
    res.status(500).json({
      error: 'Failed to delete key',
      code: 'DELETE_ERROR'
    })

    await logInternalOutcome(req, {
      status: 'failed',
      code: 'KEY_DELETE_ERROR',
      message: error.message,
      actionDurationMs: Date.now() - actionStart
    })
  }
})

export default router
