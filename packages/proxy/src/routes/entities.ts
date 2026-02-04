import { Router, type Request, type Response } from 'express'
import { requireAdmin } from '../middleware/auth.js'
import { serviceFactory } from '../services/service-factory.js'
import { logInternalOutcome } from '../utils/internal-audit-helpers.js'

const router: Router = Router()

router.get('/', requireAdmin, async (req: Request, res: Response) => {
  const actionStart = Date.now()
  try {
    const uid = req.query.uid as string | undefined
    const includeApiKeys = req.query.includeApiKeys === 'true'
    const {
      search,
      limit,
      offset,
      entityType,
      sortBy,
      sortOrder
    } = req.query
    
    const entityStore = serviceFactory.getEntityStore()
    const result = await entityStore.getEntities(uid, {
      search: search as string | undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      offset: offset ? parseInt(offset as string, 10) : undefined,
      entityType: entityType as string | undefined,
      sortBy: sortBy as string | undefined || null,
      sortOrder: (sortOrder === 'asc' || sortOrder === 'desc') ? sortOrder as 'asc' | 'desc' : null
    })
    
    const entities = result.data
    
    if (includeApiKeys) {
      const { getDatabase } = await import('../db/index.js')
      const db = getDatabase()
      const entitiesWithKeys = await Promise.all(entities.map(async entity => {
        if (entity.uid.type === 'UserKey') {
          const userKeyId = entity.uid.id
          const userEntityId = (entity.attrs as any).user?.__entity?.id
          if (userEntityId) {
            const dbKey = db.prepare('SELECT id, key_value, key_hash FROM user_agent_keys WHERE auth_id = ? ORDER BY created_at DESC LIMIT 1').get(userEntityId) as { id: string; key_value: string; key_hash: string } | undefined
            if (dbKey) {
              const { decrypt } = await import('../utils/encryption.js')
              const decryptedKey = decrypt(dbKey.key_value)
              return {
                ...entity,
                apiKey: decryptedKey,
                keyHash: dbKey.key_hash,
                executionKey: dbKey.id,
                userKeyId: userKeyId
              }
            }
          }
          return {
            ...entity,
            apiKey: null,
            keyHash: null,
            executionKey: null,
            userKeyId: userKeyId
          }
        }
        return entity
      }))
      
      res.json({
        data: entitiesWithKeys,
        total: result.total
      })
    } else {
      res.json({
        data: entities,
        total: result.total
      })
    }

    await logInternalOutcome(req, {
      status: 'success',
      code: '200',
      message: `Retrieved ${result.data.length} entities`,
      actionDurationMs: Date.now() - actionStart
    })
  } catch (error: any) {
    await logInternalOutcome(req, {
      status: 'failed',
      code: '500',
      message: error.message || 'Failed to get entities',
      actionDurationMs: Date.now() - actionStart
    })

    res.status(500).json({
      error: 'Failed to get entities',
      message: error.message
    })
  }
})

router.put('/', requireAdmin, async (req: Request, res: Response) => {
  const actionStart = Date.now()
  try {
    const { entity, status } = req.body
    
    if (!entity) {
      res.status(400).json({
        error: 'Entity is required'
      })
      return
    }
    
    if (!entity.uid || !entity.uid.type || !entity.uid.id) {
      res.status(400).json({
        error: 'Entity must have uid with type and id'
      })
      return
    }
    
    const entityStore = serviceFactory.getEntityStore()
    const entityStatus = status !== undefined ? status : 1
    
    await entityStore.updateEntity(entity, entityStatus)
    
    await logInternalOutcome(req, {
      status: 'success',
      code: '200',
      message: 'Entity updated successfully',
      actionDurationMs: Date.now() - actionStart
    })

    res.json({
      success: true,
      message: 'Entity updated successfully'
    })
  } catch (error: any) {
    await logInternalOutcome(req, {
      status: 'failed',
      code: '500',
      message: error.message || 'Failed to update entity',
      actionDurationMs: Date.now() - actionStart
    })

    res.status(500).json({
      error: 'Failed to update entity',
      message: error.message
    })
  }
})

export default router
