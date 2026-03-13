import type { Request, Response } from 'express'
import { hashApiKey, validateApiKeyFormat } from '../../utils/api-key.js'
import * as keyService from '../../services/key-service.js'
import { serviceFactory } from '../../services/service-factory.js'
import { getDatabase } from '../../db/index.js'
import { auditLogService } from '../../services/audit-log-service.js'
import { rateLimiterService } from '../../services/rate-limiter-service.js'
import type { Entity } from '../../services/interfaces.js'

interface UserEntity extends Entity {
  uid: {
    type: 'User'
    id: string
  }
  attrs: Entity['attrs'] & {
    limit_requests_per_minute?: number | null
  }
}

interface UserKeyEntity extends Entity {
  uid: {
    type: 'UserKey'
    id: string
  }
  attrs: Entity['attrs'] & {
    status?: 'active' | 'disabled' | 'deleted'
  }
}

export interface LlmPreflightResult {
  requestId: string
  apiKey: string
  userId: string
  apiKeyId: string
  userKeyId: string
  userKeyEntity: UserKeyEntity
  allEntities: Entity[]
  db: ReturnType<typeof getDatabase>
}

export async function runLlmPreflight(req: Request, res: Response): Promise<LlmPreflightResult | null> {
  const requestId = auditLogService.generateRequestId()
  const apiKey = req.headers['x-api-key'] as string

  if (!apiKey) {
    res.status(400).json({
      error: 'API key required. Include X-API-Key header.',
      code: 'API_KEY_REQUIRED',
      requestId
    })
    return null
  }

  if (!validateApiKeyFormat(apiKey)) {
    res.status(401).json({
      error: 'Invalid API key format',
      code: 'INVALID_API_KEY_FORMAT',
      requestId
    })
    return null
  }

  const keyHash = hashApiKey(apiKey)
  const db = getDatabase()
  const dbKey = db.prepare("SELECT id, auth_id FROM user_agent_keys WHERE key_hash = ? AND status = 'active'").get(keyHash) as { id: string; auth_id: string } | undefined
  if (!dbKey) {
    res.status(403).json({
      error: 'API key not found or invalid',
      code: 'API_KEY_INVALID',
      requestId
    })
    return null
  }
  const userId = dbKey.auth_id

  const authRow = db.prepare('SELECT role, status FROM auth WHERE id = ?').get(userId) as { role: string | null; status: number } | undefined
  if (authRow?.role != null && authRow.status === 2) {
    res.status(403).json({
      error: 'Dashboard user account is disabled. API key is not valid.',
      code: 'DASHBOARD_USER_DISABLED',
      requestId
    })
    return null
  }

  const foundUserKeyId = await keyService.getUserKeyIdForUser(userId)
  if (!foundUserKeyId) {
    res.status(403).json({
      error: 'UserKey entity not found for user',
      code: 'USER_KEY_NOT_FOUND',
      requestId
    })
    return null
  }

  const entityStore = serviceFactory.getEntityStore()
  const allEntitiesResult = await entityStore.getEntities()
  const allEntities = allEntitiesResult.data
  const userKeyEntity = allEntities.find(e => isUserKeyEntity(e, foundUserKeyId))

  if (!userKeyEntity) {
    res.status(403).json({
      error: 'UserKey entity not found',
      code: 'USER_KEY_NOT_FOUND',
      requestId
    })
    return null
  }

  const keyStatus = userKeyEntity.attrs.status
  if (keyStatus === 'disabled' || keyStatus === 'deleted') {
    res.status(403).json({
      error: 'API key is disabled or has been deleted',
      code: 'API_KEY_REVOKED_OR_DISABLED',
      requestId
    })
    return null
  }

  return {
    requestId,
    apiKey,
    userId,
    apiKeyId: dbKey.id,
    userKeyId: foundUserKeyId,
    userKeyEntity,
    allEntities,
    db
  }
}

export async function enforceUserRateLimit(
  res: Response,
  params: {
    userId: string
    apiKeyId: string
    allEntities: Entity[]
    requestId: string
  }
): Promise<UserEntity | null> {
  const userEntity = params.allEntities.find(entity => isUserEntity(entity, params.userId))

  if (!userEntity) {
    res.status(403).json({
      error: 'User entity not found',
      code: 'USER_ENTITY_NOT_FOUND',
      requestId: params.requestId
    })
    return null
  }

  const limitRequestsPerMinute = userEntity.attrs.limit_requests_per_minute ?? null
  const effectiveLimit = limitRequestsPerMinute === 0 ? null : limitRequestsPerMinute
  const rateLimitResult = await rateLimiterService.checkRateLimit(
    'api_key',
    params.apiKeyId,
    { requestsPerMinute: effectiveLimit }
  )

  res.set('X-RateLimit-Limit', String(rateLimitResult.limit))
  res.set('X-RateLimit-Remaining', String(rateLimitResult.remaining))
  res.set('X-RateLimit-Reset', String(Math.floor(rateLimitResult.resetAt.getTime() / 1000)))

  if (!rateLimitResult.allowed) {
    res.set('Retry-After', String(rateLimitResult.retryAfterSeconds))
    res.status(429).json({
      error: 'Rate limit exceeded',
      code: 'RATE_LIMIT_EXCEEDED',
      requestId: params.requestId,
      retryAfter: rateLimitResult.retryAfterSeconds,
      resetAt: rateLimitResult.resetAt.toISOString(),
    })
    return null
  }

  return userEntity
}

function isUserEntity(entity: Entity, userId: string): entity is UserEntity {
  return entity.uid.type === 'User' && entity.uid.id === userId
}

function isUserKeyEntity(entity: Entity, userKeyId: string): entity is UserKeyEntity {
  return entity.uid.type === 'UserKey' && entity.uid.id === userKeyId
}
