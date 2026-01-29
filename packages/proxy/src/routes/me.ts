 
 

import { Router, type Request, type Response } from 'express'
import { requireAuth, type AuthenticatedRequest } from '../middleware/jwt-auth.js'
import { getDatabase } from '../db/index.js'
import { decrypt } from '../utils/encryption.js'
import { serviceFactory } from '../services/service-factory.js'

const router: Router = Router()

 
router.use(requireAuth)

 
router.get('/', (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getDatabase()
    const user = db.prepare('SELECT * FROM auth WHERE id = ?').get(req.userId) as any
    
    if (!user) {
      res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      })
      return
    }
    
 
    let decryptedEmail: string
    try {
      decryptedEmail = decrypt(user.email)
    } catch (error: any) {
      decryptedEmail = user.email
    }
    
    res.json({
      userId: user.id,
      email: decryptedEmail,
      name: user.name || '',
      role: user.id === 'admin' ? 'admin' : 'user',
      status: user.status,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      lastLogin: user.last_sign_in || null
    })
  } catch (error: any) {
    console.error('[ME] Get user error:', error)
    res.status(500).json({
      error: 'Failed to get user info',
      code: 'GET_ERROR'
    })
  }
})

 
router.get('/keys', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId
    if (!userId) {
      res.status(401).json({
        error: 'User ID not found in token',
        code: 'INVALID_TOKEN'
      })
      return
    }
    
    const parseDecimal = (value: any): number => {
      if (typeof value === 'number') return value
      if (typeof value === 'string') return parseFloat(value) || 0
      if (value && typeof value === 'object' && value.__extn && value.__extn.fn === 'decimal') {
        return parseFloat(value.__extn.arg) || 0
      }
      return 0
    }
    
    const entityStore = serviceFactory.getEntityStore()
    const allEntitiesResult = await entityStore.getEntities()
    const allEntities = allEntitiesResult.data
    
    const userKeyEntity = allEntities.find(e =>
      e.uid.type === 'UserKey' &&
      (e.attrs as any).user &&
      (e.attrs as any).user.__entity &&
      (e.attrs as any).user.__entity.id === userId
    )
    
    if (!userKeyEntity) {
      res.json({
        data: []
      })
      return
    }
    
    const db = getDatabase()
    const dbKey = db.prepare('SELECT key_value FROM user_agent_keys WHERE auth_id = ? ORDER BY created_at DESC LIMIT 1').get(userId) as { key_value: string } | undefined
    
    let decryptedKey: string | null = null
    if (dbKey) {
      try {
        decryptedKey = decrypt(dbKey.key_value)
      } catch (error: any) {
        console.warn('[ME] Failed to decrypt API key:', error.message)
      }
    }
    
    const attrs = userKeyEntity.attrs || {}
    
    res.json({
      data: [{
        ...userKeyEntity,
        apiKey: decryptedKey,
        // Parse and include spend values in a format the UI can use
        currentDailySpend: parseDecimal(attrs.current_daily_spend),
        currentMonthlySpend: parseDecimal(attrs.current_monthly_spend),
        lastDailyReset: attrs.last_daily_reset || '',
        lastMonthlyReset: attrs.last_monthly_reset || ''
      }]
    })
  } catch (error: any) {
    console.error('[ME] Get keys error:', error)
    res.status(500).json({
      error: 'Failed to get user keys',
      code: 'GET_KEYS_ERROR'
    })
  }
})

 
router.get('/usage', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId
    if (!userId) {
      res.status(401).json({
        error: 'User ID not found in token',
        code: 'INVALID_TOKEN'
      })
      return
    }
    
    const db = getDatabase()
    
    const entityStore = serviceFactory.getEntityStore()
    const allEntitiesResult = await entityStore.getEntities()
    const allEntities = allEntitiesResult.data
    
    const userKeyEntity = allEntities.find(e =>
      e.uid.type === 'UserKey' &&
      (e.attrs as any).user &&
      (e.attrs as any).user.__entity &&
      (e.attrs as any).user.__entity.id === userId
    )
    
    if (!userKeyEntity) {
      res.json({
        currentDailySpend: 0,
        dailySpendLimit: 0,
        currentMonthlySpend: 0,
        monthlySpendLimit: 0,
        totalRequests: 0,
        totalTokens: 0,
        lastDailyReset: '',
        lastMonthlyReset: ''
      })
      return
    }
    
    const parseDecimal = (value: any): number => {
      if (typeof value === 'number') return value
      if (typeof value === 'string') return parseFloat(value) || 0
      if (value && typeof value === 'object' && value.__extn && value.__extn.fn === 'decimal') {
        return parseFloat(value.__extn.arg) || 0
      }
      return 0
    }
    
    const attrs = userKeyEntity.attrs || {}
    
    // Get all API keys for this user to calculate totals
    const userKeys = db.prepare('SELECT id FROM user_agent_keys WHERE auth_id = ?').all(userId) as Array<{ id: string }>
    const executionKeys = userKeys.map(k => k.id)
    
    // Calculate total requests (permitted requests only)
    let totalRequests = 0
    if (executionKeys.length > 0) {
      const placeholders = executionKeys.map(() => '?').join(',')
      const requestsResult = db.prepare(`
        SELECT COUNT(*) as count 
        FROM audit_logs 
        WHERE auth_id = ? AND decision = 'permit'
      `).get(userId) as { count: number } | undefined
      totalRequests = requestsResult?.count || 0
    }
    
    // Calculate total tokens from cost_tracking
    let totalTokens = 0
    if (executionKeys.length > 0) {
      const placeholders = executionKeys.map(() => '?').join(',')
      try {
        const tokensResult = db.prepare(`
          SELECT COALESCE(SUM(total_tokens), 0) as sum 
          FROM cost_tracking 
          WHERE execution_key IN (${placeholders})
        `).get(...executionKeys) as { sum: number | null } | undefined
        totalTokens = tokensResult?.sum || 0
      } catch (error: any) {
        // cost_tracking table might not exist, ignore
        console.warn('[ME] Failed to get total tokens:', error.message)
      }
    }
    
    res.json({
      currentDailySpend: parseDecimal(attrs.current_daily_spend),
      dailySpendLimit: 0,
      currentMonthlySpend: parseDecimal(attrs.current_monthly_spend),
      monthlySpendLimit: 0,
      totalRequests,
      totalTokens,
      lastDailyReset: attrs.last_daily_reset || '',
      lastMonthlyReset: attrs.last_monthly_reset || ''
    })
  } catch (error: any) {
    console.error('[ME] Get usage error:', error)
    res.status(500).json({
      error: 'Failed to get usage stats',
      code: 'GET_USAGE_ERROR'
    })
  }
})

export default router
