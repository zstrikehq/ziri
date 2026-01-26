// Chat completions route (end-user)
// NOTE: This endpoint uses API key authentication ONLY (no JWT required)
// API key is passed via X-API-Key header

import { Router, type Request, type Response } from 'express'
import { extractUserIdFromApiKey, validateApiKeyFormat, hashApiKey } from '../utils/api-key.js'
import * as keyService from '../services/key-service.js'
import { serviceFactory } from '../services/service-factory.js'
import * as llmService from '../services/llm-service.js'
import { getDatabase } from '../db/index.js'
import { auditLogService } from '../services/audit-log-service.js'
import { costTrackingService } from '../services/cost-tracking-service.js'
import { costEstimatorService } from '../services/cost-estimator-service.js'
import { spendResetService } from '../services/spend-reset-service.js'
import { rateLimiterService } from '../services/rate-limiter-service.js'
import { queueManagerService } from '../services/queue-manager-service.js'

const router: Router = Router()

/**
 * Extract token usage from provider response
 */
function extractUsage(response: any, provider: string): {
  inputTokens: number
  outputTokens: number
  totalTokens: number
  cachedTokens: number
} {
  if (provider === 'openai') {
    return {
      inputTokens: response.usage?.prompt_tokens || 0,
      outputTokens: response.usage?.completion_tokens || 0,
      totalTokens: response.usage?.total_tokens || 0,
      cachedTokens: response.usage?.prompt_tokens_details?.cached_tokens || 0,
    }
  } else if (provider === 'anthropic') {
    return {
      inputTokens: response.usage?.input_tokens || 0,
      outputTokens: response.usage?.output_tokens || 0,
      totalTokens: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0),
      cachedTokens: response.usage?.cache_read_input_tokens || 0,
    }
  }
  return { inputTokens: 0, outputTokens: 0, totalTokens: 0, cachedTokens: 0 }
}

/**
 * POST /api/chat/completions
 * Make LLM chat completion request
 * 
 * Authentication: API key only (via X-API-Key header)
 * No JWT token required - API key is the only authentication mechanism
 */
router.post('/completions', async (req: Request, res: Response) => {
  const requestStartTime = Date.now()
  let requestId: string | null = null
  let auditLogId: number | null = null
  let userKeyId: string | null = null
  let slotAcquired = false
  
  try {
    // 1. Generate request ID
    requestId = auditLogService.generateRequestId()
    
    // 2. Get API key from header
    const apiKey = req.headers['x-api-key'] as string
    
    if (!apiKey) {
      res.status(400).json({
        error: 'API key required. Include X-API-Key header.',
        code: 'API_KEY_REQUIRED',
        requestId
      })
      return
    }
    
    // Validate API key format
    if (!validateApiKeyFormat(apiKey)) {
      res.status(401).json({
        error: 'Invalid API key format',
        code: 'INVALID_API_KEY_FORMAT',
        requestId
      })
      return
    }
    
    // Extract userId from API key
    const userId = extractUserIdFromApiKey(apiKey)
    if (!userId) {
      res.status(401).json({
        error: 'Invalid API key format',
        code: 'INVALID_API_KEY_FORMAT',
        requestId
      })
      return
    }
    
    // Validate API key exists and get key record
    const keyHash = hashApiKey(apiKey)
    const db = getDatabase()
    
    // Get key from user_agent_keys table
    const dbKey = db.prepare('SELECT id, auth_id FROM user_agent_keys WHERE key_hash = ?').get(keyHash) as { id: string; auth_id: string } | undefined
    if (!dbKey || dbKey.auth_id !== userId) {
      res.status(403).json({
        error: 'API key not found or invalid',
        code: 'API_KEY_INVALID',
        requestId
      })
      return
    }
    
    const apiKeyId = dbKey.id
    
    // Get userKeyId from UserKey entity (find by user reference)
    const foundUserKeyId = await keyService.getUserKeyIdForUser(userId)
    if (!foundUserKeyId) {
      res.status(403).json({
        error: 'UserKey entity not found for user',
        code: 'USER_KEY_NOT_FOUND',
        requestId
      })
      return
    }
    userKeyId = foundUserKeyId
    
    // Load UserKey entity
    const entityStore = serviceFactory.getEntityStore()
    const allEntitiesResult = await entityStore.getEntities()
    const allEntities = allEntitiesResult.data
    const userKeyEntity = allEntities.find(e => 
      e.uid.type === 'UserKey' && 
      e.uid.id === userKeyId
    )
    
    if (!userKeyEntity) {
      res.status(403).json({
        error: 'UserKey entity not found',
        code: 'USER_KEY_NOT_FOUND',
        requestId
      })
      return
    }
    
    // 3. Get request body
    const { provider, model, messages, ...otherParams } = req.body
    
    if (!provider || !model || !messages) {
      res.status(400).json({
        error: 'provider, model, and messages are required',
        code: 'MISSING_FIELDS',
        requestId
      })
      return
    }
    
    // 3.1. Load User entity to get rate limit config
    const userEntity = allEntities.find(e => 
      e.uid.type === 'User' && 
      e.uid.id === userId
    )
    
    if (!userEntity) {
      res.status(403).json({
        error: 'User entity not found',
        code: 'USER_ENTITY_NOT_FOUND',
        requestId
      })
      return
    }
    
    // 3.2. CHECK RATE LIMIT (from User entity)
    const limitRequestsPerMinute = (userEntity.attrs as any).limit_requests_per_minute ?? null
    // Treat 0 as unlimited (null)
    const effectiveLimit = limitRequestsPerMinute === 0 ? null : limitRequestsPerMinute
    
    console.log(`[CHAT] Rate limit check: userId=${userId}, apiKeyId=${apiKeyId}, limitRequestsPerMinute=${limitRequestsPerMinute}, effectiveLimit=${effectiveLimit}`)
    
    const rateLimitResult = await rateLimiterService.checkRateLimit(
      'api_key',
      apiKeyId,
      { requestsPerMinute: effectiveLimit }
    )
    
    console.log(`[CHAT] Rate limit result: allowed=${rateLimitResult.allowed}, remaining=${rateLimitResult.remaining}, limit=${rateLimitResult.limit}`)
    
    // Set rate limit headers
    res.set('X-RateLimit-Limit', String(rateLimitResult.limit))
    res.set('X-RateLimit-Remaining', String(rateLimitResult.remaining))
    res.set('X-RateLimit-Reset', String(Math.floor(rateLimitResult.resetAt.getTime() / 1000)))
    
    if (!rateLimitResult.allowed) {
      res.set('Retry-After', String(rateLimitResult.retryAfterSeconds))
      res.status(429).json({
        error: 'Rate limit exceeded',
        code: 'RATE_LIMIT_EXCEEDED',
        requestId,
        retryAfter: rateLimitResult.retryAfterSeconds,
        resetAt: rateLimitResult.resetAt.toISOString(),
      })
      return
    }
    
    // 3.3. ESTIMATE COST (before queueing)
    let costEstimate
    try {
      costEstimate = await costEstimatorService.estimateCost(
        provider,
        model,
        messages,
        req.body.max_tokens
      )
      console.log(`[CHAT] Cost estimate: $${costEstimate.estimatedCost.toFixed(4)} (input: ${costEstimate.estimatedInputTokens}, output: ${costEstimate.estimatedOutputTokens}, confidence: ${costEstimate.confidence})`)
    } catch (error: any) {
      console.error(`[CHAT] Cost estimation failed:`, error)
      // Continue without estimation if it fails (non-critical)
      costEstimate = {
        estimatedInputTokens: 0,
        estimatedOutputTokens: 0,
        estimatedCost: 0,
        confidence: 'low' as const
      }
    }
    
    // 3.4. ACQUIRE QUEUE SLOT (will queue if at capacity)
    try {
      await queueManagerService.acquireSlot(
        userKeyId,
        requestId,
        {
          requestId,
          userKeyId,
          authId: userId,
          apiKeyId,
          provider,
          model,
          requestBody: req.body,
          estimatedCost: costEstimate.estimatedCost,
        }
      )
    } catch (error: any) {
      if (error.message.includes('Queue full')) {
        return res.status(503).json({
          error: 'Server busy - queue full',
          code: 'QUEUE_FULL',
          requestId,
        })
      }
      throw error
    }
    
    // Ensure slot is released on error
    slotAcquired = true
    
    // 4. CHECK SPEND RESET (BEFORE Cedar auth)
    const spendResetResult = await spendResetService.checkAndResetSpend(userKeyEntity as any)
    const activeEntity = spendResetResult.updatedEntity || userKeyEntity
    
    // 4.5. RESERVE ESTIMATED COST (temporarily inflate spend in database for authorization check)
    // This prevents users from exceeding limits by making concurrent requests
    // Uses FULL PRECISION values (like SpendUpdateService) - only rounds when storing to entity
    const { toDecimalFour } = await import('../utils/cedar.js')
    
    // Get current spend with FULL PRECISION from cost_tracking table (not from entity)
    // This matches the approach in SpendUpdateService to avoid rounding errors
    const userEntityId = (activeEntity.attrs as any).user?.__entity?.id
    if (!userEntityId) {
      throw new Error(`UserKey entity missing user reference: ${userKeyId}`)
    }
    
    // Declare variables outside if/else for later use
    let reservedDailySpend: number
    let reservedMonthlySpend: number
    let currentDailySpendFullPrecision: number
    let currentMonthlySpendFullPrecision: number
    
    // Get all execution keys for this user
    const executionKeys = db.prepare(`
      SELECT id FROM user_agent_keys WHERE auth_id = ?
    `).all(userEntityId) as { id: string }[]
    
    const executionKeyIds = executionKeys.map(k => k.id)
    
    if (executionKeyIds.length === 0) {
      console.warn(`[CHAT] No execution keys found for user ${userEntityId}, using entity values`)
      // Fallback to entity values if no execution keys
      const parseDecimal = (value: any): number => {
        if (!value) return 0
        if (typeof value === 'string') return parseFloat(value) || 0
        if (value.__extn && value.__extn.arg) return parseFloat(value.__extn.arg) || 0
        return 0
      }
      currentDailySpendFullPrecision = parseDecimal(activeEntity.attrs.current_daily_spend)
      currentMonthlySpendFullPrecision = parseDecimal(activeEntity.attrs.current_monthly_spend)
      reservedDailySpend = currentDailySpendFullPrecision + costEstimate.estimatedCost
      reservedMonthlySpend = currentMonthlySpendFullPrecision + costEstimate.estimatedCost
      
      console.log(`[CHAT] Cost reservation (fallback): estimated=$${costEstimate.estimatedCost}, daily: $${currentDailySpendFullPrecision} → $${reservedDailySpend}, monthly: $${currentMonthlySpendFullPrecision} → $${reservedMonthlySpend}`)
    } else {
      // Get last reset times from entity
      const lastDailyResetStr = activeEntity.attrs.last_daily_reset
      const lastMonthlyResetStr = activeEntity.attrs.last_monthly_reset
      
      // Calculate daily spend period
      const now = new Date()
      let dailyStartISO: string
      if (lastDailyResetStr) {
        const lastDailyReset = new Date(lastDailyResetStr)
        const resetDate = new Date(Date.UTC(
          lastDailyReset.getUTCFullYear(),
          lastDailyReset.getUTCMonth(),
          lastDailyReset.getUTCDate()
        ))
        dailyStartISO = resetDate.toISOString()
      } else {
        const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
        dailyStartISO = todayStart.toISOString()
      }
      
      // Calculate monthly spend period
      let monthlyStartISO: string
      if (lastMonthlyResetStr) {
        const lastMonthlyReset = new Date(lastMonthlyResetStr)
        const resetMonth = new Date(Date.UTC(
          lastMonthlyReset.getUTCFullYear(),
          lastMonthlyReset.getUTCMonth(),
          1
        ))
        monthlyStartISO = resetMonth.toISOString()
      } else {
        const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
        monthlyStartISO = monthStart.toISOString()
      }
      
      // Get current spend with FULL PRECISION from cost_tracking table
      const placeholders = executionKeyIds.map(() => '?').join(',')
      
      const dailySpendResult = db.prepare(`
        SELECT COALESCE(SUM(total_cost), 0) as total
        FROM cost_tracking
        WHERE execution_key IN (${placeholders})
          AND request_timestamp >= ?
          AND status = 'completed'
      `).get(...executionKeyIds, dailyStartISO) as { total: number }
      
      const monthlySpendResult = db.prepare(`
        SELECT COALESCE(SUM(total_cost), 0) as total
        FROM cost_tracking
        WHERE execution_key IN (${placeholders})
          AND request_timestamp >= ?
          AND status = 'completed'
      `).get(...executionKeyIds, monthlyStartISO) as { total: number }
      
      // Full precision values (no rounding yet)
      currentDailySpendFullPrecision = dailySpendResult.total || 0
      currentMonthlySpendFullPrecision = monthlySpendResult.total || 0
      
      // Calculate reserved spend with FULL PRECISION
      reservedDailySpend = currentDailySpendFullPrecision + costEstimate.estimatedCost
      reservedMonthlySpend = currentMonthlySpendFullPrecision + costEstimate.estimatedCost
      
      console.log(`[CHAT] Cost reservation (full precision): estimated=$${costEstimate.estimatedCost}, daily: $${currentDailySpendFullPrecision} → $${reservedDailySpend}, monthly: $${currentMonthlySpendFullPrecision} → $${reservedMonthlySpend}`)
    }
    
    // Temporarily update entity in database with reserved cost (authorization will read from DB)
    const entityWithReservation = {
      ...activeEntity,
      attrs: {
        ...activeEntity.attrs,
        current_daily_spend: toDecimalFour(reservedDailySpend),
        current_monthly_spend: toDecimalFour(reservedMonthlySpend),
      }
    }
    
    // Update entity in database temporarily (reuse existing db variable)
    const updateStmt = db.prepare(`
      UPDATE entities 
      SET ejson = ?, updated_at = datetime('now')
      WHERE etype = 'UserKey' AND eid = ?
    `)
    updateStmt.run(JSON.stringify(entityWithReservation), userKeyId)
    
    // Store original values for potential rollback (full precision)
    let costReserved = true
    
    // 5. Build Cedar authorization context (authorization will read entity with RESERVED spend from DB)
    const principal = `UserKey::"${userKeyId}"`
    const action = 'Action::"completion"'
    const resource = `Resource::"${model}"`
    
    // Cedar extension type helpers
    const toIp = (ip: string) => ({
      __extn: {
        fn: 'ip',
        arg: ip
      }
    })
    
    // Build context according to RequestContext schema
    const now = new Date()
    const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getUTCDay()]
    const hour = now.getUTCHours()
    const ipAddress = req.ip || '127.0.0.1'
    
    const context = {
      day_of_week: dayOfWeek,
      hour,
      ip_address: toIp(ipAddress),
      is_emergency: otherParams.isEmergency || false,
      model_name: model,
      model_provider: provider,
      request_time: now.toISOString()
    }
    
    // 6. Perform Cedar authorization (measure timing)
    const authStartTime = Date.now()
    const authService = serviceFactory.getAuthorizationService()
    const authResult = await authService.authorize({
      principal,
      action,
      resource,
      context
    })
    const authEndTime = Date.now()
    const authDurationMs = authEndTime - authStartTime
    
    // Extract diagnostics
    const decisionReason = authResult.diagnostics?.reason?.[0] || authResult.diagnostics?.errors?.[0] || undefined
    const policiesEvaluated = authResult.diagnostics?.reason || []
    const determiningPolicies = authResult.decision === 'Allow' ? policiesEvaluated : []
    
    // 7. LOG AUDIT ENTRY (ALWAYS - regardless of decision)
    auditLogId = await auditLogService.log({
      requestId,
      principal,
      principalType: 'UserKey',
      authId: userId,
      apiKeyId,
      action: 'completion',
      resource,
      provider,
      model,
      decision: authResult.decision === 'Allow' ? 'permit' : 'forbid',
      decisionReason,
      policiesEvaluated: policiesEvaluated as string[],
      determiningPolicies: determiningPolicies as string[],
      requestIp: ipAddress,
      userAgent: req.headers['user-agent'],
      requestMethod: req.method,
      requestPath: req.path,
      requestBodyHash: auditLogService.hashRequestBody(req.body),
      cedarContext: context,
      entitySnapshot: activeEntity.attrs,
      requestTimestamp: now.toISOString(),
      authStartTime: new Date(authStartTime).toISOString(),
      authEndTime: new Date(authEndTime).toISOString(),
      authDurationMs,
    })
    
    // 8. If denied, return 403
    if (authResult.decision !== 'Allow') {
      if (slotAcquired) {
        queueManagerService.releaseSlot(userKeyId, requestId)
        slotAcquired = false
      }
      res.status(403).json({
        error: `Authorization denied: ${decisionReason || 'Authorization denied'}`,
        code: 'AUTHORIZATION_DENIED',
        reason: decisionReason,
        requestId
      })
      return
    }
    
    // 9. Make LLM request
    const llmRequestStartTime = Date.now()
    let llmResponse: any
    try {
      llmResponse = await llmService.chatCompletions({
        provider,
        model,
        messages,
        ...otherParams
      })
    } catch (llmError: any) {
      // Release slot on LLM error
      if (slotAcquired) {
        queueManagerService.releaseSlot(userKeyId, requestId)
        slotAcquired = false
      }
      throw llmError
    }
    const llmResponseTime = Date.now()
    
    // 10. Extract token usage from provider response
    const usage = extractUsage(llmResponse, provider)
    
    // 11. TRACK COST (calculates cost, saves entry, updates UserKey spend)
    // Note: This will replace the reserved cost with actual cost
    const costTrackingId = await costTrackingService.trackCost({
      requestId,
      executionKey: apiKeyId,
      auditLogId,
      provider,
      providerRequestId: llmResponse.id, // chatcmpl-xxx or msg_xxx
      modelRequested: model,
      modelUsed: llmResponse.model,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      totalTokens: usage.totalTokens,
      cachedTokens: usage.cachedTokens,
      requestTimestamp: new Date(llmRequestStartTime).toISOString(),
      responseTimestamp: new Date(llmResponseTime).toISOString(),
      latencyMs: llmResponseTime - llmRequestStartTime,
      status: 'completed',
    })
    
    // 12. Update audit log with provider response info
    await auditLogService.updateWithProviderResponse(requestId, llmResponse.id, costTrackingId)
    
    // 13. Get cost calculation for response metadata
    const { pricingService } = await import('../services/pricing-service.js')
    const costCalc = await pricingService.calculateCost(
      provider,
      llmResponse.model || model,
      usage.inputTokens,
      usage.outputTokens,
      usage.cachedTokens
    )
    
    // 14. Release queue slot
    if (slotAcquired) {
      queueManagerService.releaseSlot(userKeyId, requestId)
      slotAcquired = false
    }
    
    // 15. Return response with metadata
    res.json({
      ...llmResponse,
      _meta: {
        requestId,
        cost: {
          estimated: costEstimate?.estimatedCost || 0,
          actual: costCalc.totalCost,
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          cachedTokens: usage.cachedTokens,
          totalCost: costCalc.totalCost,
          estimation: costEstimate ? {
            estimatedInputTokens: costEstimate.estimatedInputTokens,
            estimatedOutputTokens: costEstimate.estimatedOutputTokens,
            confidence: costEstimate.confidence,
          } : undefined,
        },
        timing: {
          totalMs: Date.now() - requestStartTime,
          authMs: authDurationMs,
          llmMs: llmResponseTime - llmRequestStartTime,
        },
      },
    })
  } catch (error: any) {
    // Release slot if still acquired
    if (requestId && slotAcquired) {
      try {
        const userKeyId = await keyService.getUserKeyIdForUser(extractUserIdFromApiKey(req.headers['x-api-key'] as string) || '')
        if (userKeyId) {
          queueManagerService.releaseSlot(userKeyId, requestId)
        }
      } catch {
        // Ignore errors during cleanup
      }
    }
    
    console.error('[CHAT] Completion error:', error)
    
    // Log error in audit log if we have a requestId
    if (requestId && auditLogId) {
      try {
        await auditLogService.updateWithProviderResponse(requestId, '', 0)
      } catch (e) {
        // Ignore audit log update errors
      }
    }
    
    if (error.message.includes('not configured')) {
      res.status(404).json({
        error: error.message,
        code: 'PROVIDER_NOT_FOUND',
        requestId: requestId || undefined
      })
      return
    }
    
    if (error.message.includes('API key not found')) {
      res.status(500).json({
        error: error.message,
        code: 'PROVIDER_KEY_MISSING',
        requestId: requestId || undefined
      })
      return
    }
    
    if (error.message.includes('PDP')) {
      res.status(503).json({
        error: error.message,
        code: 'PDP_UNAVAILABLE',
        requestId: requestId || undefined
      })
      return
    }
    
    if (error.message.includes('LLM provider')) {
      res.status(502).json({
        error: error.message,
        code: 'LLM_PROVIDER_ERROR',
        requestId: requestId || undefined
      })
      return
    }
    
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      requestId: requestId || undefined
    })
  }
})

export default router
