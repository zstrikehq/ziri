// Chat completions route (end-user)

import { Router, type Request, type Response } from 'express'
import { requireAuth, type AuthenticatedRequest } from '../middleware/jwt-auth.js'
import { extractUserIdFromApiKey, validateApiKeyFormat } from '../utils/api-key.js'
import * as keyService from '../services/key-service.js'
import * as pdpService from '../services/pdp-service.js'
import * as llmService from '../services/llm-service.js'

const router = Router()

// Require JWT authentication
router.use(requireAuth)

/**
 * POST /api/chat/completions
 * Make LLM chat completion request
 */
router.post('/completions', async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Get API key from header
    const apiKey = req.headers['x-api-key'] as string
    
    if (!apiKey) {
      res.status(400).json({
        error: 'API key required. Include X-API-Key header.',
        code: 'API_KEY_REQUIRED'
      })
      return
    }
    
    // Validate API key format
    if (!validateApiKeyFormat(apiKey)) {
      res.status(401).json({
        error: 'Invalid API key format',
        code: 'INVALID_API_KEY_FORMAT'
      })
      return
    }
    
    // Extract userId from API key
    const apiKeyUserId = extractUserIdFromApiKey(apiKey)
    if (!apiKeyUserId) {
      res.status(401).json({
        error: 'Invalid API key format',
        code: 'INVALID_API_KEY_FORMAT'
      })
      return
    }
    
    // Get userId from JWT token
    const tokenUserId = req.userId
    
    if (!tokenUserId) {
      res.status(401).json({
        error: 'Invalid token',
        code: 'INVALID_TOKEN'
      })
      return
    }
    
    // Ensure userIds match
    if (apiKeyUserId !== tokenUserId) {
      res.status(401).json({
        error: 'API key userId does not match token userId',
        code: 'USER_ID_MISMATCH'
      })
      return
    }
    
    // Validate API key exists and is active
    const isValid = keyService.validateApiKey(apiKey, tokenUserId)
    if (!isValid) {
      res.status(403).json({
        error: 'API key not found or has been revoked',
        code: 'API_KEY_INVALID'
      })
      return
    }
    
    // Get request body
    const { provider, model, messages, ...otherParams } = req.body
    
    if (!provider || !model || !messages) {
      res.status(400).json({
        error: 'provider, model, and messages are required',
        code: 'MISSING_FIELDS'
      })
      return
    }
    
    // Authorize request using PDP
    // Format principal, action, and resource as Cedar entity UIDs based on schema
    const principal = `User::"${tokenUserId}"`
    const action = 'Action::"completion"' // Based on schema: "completion" action
    const resource = `Resource::"${model}"` // Format: Resource::"modelName"
    
    // Cedar extension type helpers
    const toIp = (ip: string) => ({
      __extn: {
        fn: 'ip',
        arg: ip
      }
    })
    
    // Build context according to RequestContext schema
    const now = new Date()
    const hour = now.getUTCHours()
    const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getUTCDay()]
    
    const context = {
      ip_address: toIp(req.ip || '127.0.0.1'),
      request_time: now.toISOString(),
      hour: hour,
      model_name: model,
      is_emergency: false, // Default to false, can be overridden in request
      day_of_week: dayOfWeek
    }
    
    console.log('[CHAT] PDP authorization request:', {
      principal,
      action,
      resource,
      context,
      userId: tokenUserId,
      model
    })
    
    const authResult = await pdpService.authorizeRequest({
      principal,
      action,
      resource,
      context
    })
    
    if (authResult.decision !== 'Allow') {
      const errorReason = authResult.diagnostics?.errors?.[0] || 'Authorization denied'
      res.status(403).json({
        error: `Authorization denied: ${errorReason}`,
        code: 'AUTHORIZATION_DENIED',
        reason: errorReason
      })
      return
    }
    
    // Make LLM request
    const llmResponse = await llmService.chatCompletions({
      provider,
      model,
      messages,
      ...otherParams
    })
    
    res.json(llmResponse)
  } catch (error: any) {
    console.error('[CHAT] Completion error:', error)
    
    if (error.message.includes('not configured')) {
      res.status(404).json({
        error: error.message,
        code: 'PROVIDER_NOT_FOUND'
      })
      return
    }
    
    if (error.message.includes('API key not found')) {
      res.status(500).json({
        error: error.message,
        code: 'PROVIDER_KEY_MISSING'
      })
      return
    }
    
    if (error.message.includes('PDP')) {
      res.status(503).json({
        error: error.message,
        code: 'PDP_UNAVAILABLE'
      })
      return
    }
    
    if (error.message.includes('LLM provider')) {
      res.status(502).json({
        error: error.message,
        code: 'LLM_PROVIDER_ERROR'
      })
      return
    }
    
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    })
  }
})

export default router
