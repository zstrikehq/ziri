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
import { spendResetService } from '../services/spend-reset-service.js'

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
    const userKeyId = await keyService.getUserKeyIdForUser(userId)
    if (!userKeyId) {
      res.status(403).json({
        error: 'UserKey entity not found for user',
        code: 'USER_KEY_NOT_FOUND',
        requestId
      })
      return
    }
    
    // Load UserKey entity
    const entityStore = serviceFactory.getEntityStore()
    const allEntities = await entityStore.getEntities()
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
    
    // 4. CHECK SPEND RESET (BEFORE Cedar auth)
    const spendResetResult = await spendResetService.checkAndResetSpend(userKeyEntity as any)
    const activeEntity = spendResetResult.updatedEntity || userKeyEntity
    
    // 5. Build Cedar authorization context (with updated spend values)
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
    const llmResponse = await llmService.chatCompletions({
      provider,
      model,
      messages,
      ...otherParams
    })
    const llmResponseTime = Date.now()
    
    // 10. Extract token usage from provider response
    const usage = extractUsage(llmResponse, provider)
    
    // 11. TRACK COST (calculates cost, saves entry, updates UserKey spend)
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
    
    // 14. Return response with metadata
    res.json({
      ...llmResponse,
      _meta: {
        requestId,
        cost: {
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          cachedTokens: usage.cachedTokens,
          totalCost: costCalc.totalCost,
        },
      },
    })
  } catch (error: any) {
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
