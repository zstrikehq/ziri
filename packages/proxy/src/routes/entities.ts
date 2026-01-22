// Entity routes - manage Cedar entities (local mode)

import { Router, type Request, type Response } from 'express'
import { requireAdmin } from '../middleware/auth.js'
import { serviceFactory } from '../services/service-factory.js'

const router: Router = Router()

/**
 * GET /api/entities
 * Get all entities (or filter by UID)
 * Optionally include API keys if includeApiKeys=true
 * Supports search, limit, offset, and entityType parameters
 */
router.get('/', requireAdmin, async (req: Request, res: Response) => {
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
    
    // If API keys requested, fetch them from database and attach to entities
    if (includeApiKeys) {
      const { getDatabase } = await import('../db/index.js')
      const db = getDatabase()
      const entitiesWithKeys = await Promise.all(entities.map(async entity => {
        // Attach API keys for UserKey entities (not Key entities anymore)
        if (entity.uid.type === 'UserKey') {
          // userKeyId is the entity UID id
          const userKeyId = entity.uid.id
          // Get the active API key linked to this UserKey (should only be one now)
          // Find auth_id from UserKey entity's user reference
          const userEntityId = (entity.attrs as any).user?.__entity?.id
          if (userEntityId) {
            const dbKey = db.prepare('SELECT id, key_value, key_hash FROM user_agent_keys WHERE auth_id = ? ORDER BY created_at DESC LIMIT 1').get(userEntityId) as { id: string; key_value: string; key_hash: string } | undefined
            if (dbKey) {
              // Decrypt API key
              const { decrypt } = await import('../utils/encryption.js')
              const decryptedKey = decrypt(dbKey.key_value)
              return {
                ...entity,
                apiKey: decryptedKey,
                keyHash: dbKey.key_hash,
                executionKey: dbKey.id, // user_agent_keys.id for cost tracking
                userKeyId: userKeyId
              }
            }
          }
          // Return entity without API key if not found
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
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to get entities',
      message: error.message
    })
  }
})

/**
 * PUT /api/entities
 * Update an entity
 * Requires full entity body (same as create)
 */
router.put('/', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { entity, status } = req.body
    
    if (!entity) {
      res.status(400).json({
        error: 'Entity is required'
      })
      return
    }
    
    // Validate entity structure
    if (!entity.uid || !entity.uid.type || !entity.uid.id) {
      res.status(400).json({
        error: 'Entity must have uid with type and id'
      })
      return
    }
    
    const entityStore = serviceFactory.getEntityStore()
    const entityStatus = status !== undefined ? status : 1 // Default to active
    
    await entityStore.updateEntity(entity, entityStatus)
    
    res.json({
      success: true,
      message: 'Entity updated successfully'
    })
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to update entity',
      message: error.message
    })
  }
})

export default router
