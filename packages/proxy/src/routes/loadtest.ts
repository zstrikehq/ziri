import { Router } from 'express'
import { handleLlmRequest, type LlmPreparedRequest } from './shared/llm-route-orchestrator.js'
import { mapChatRouteError } from './shared/llm-error-mapping.js'

const router: Router = Router()

interface MockChatPreparedRequest extends LlmPreparedRequest {
  messages: any[]
  otherParams: Record<string, any>
}

/**
 * Mock endpoint for load testing the proxy pipeline:
 * - Authenticates via X-API-Key (same as gateway endpoints)
 * - Runs rate limiting, queueing, spend reservation, Cedar authorization, audit logging, cost tracking
 * - Does NOT call any external provider
 *
 * Intended for `wrk`/k6/etc. Not for production use.
 */
router.post('/mock-chat/completions', async (req, res) => {
  await handleLlmRequest<MockChatPreparedRequest>(req, res, {
    action: 'completion',
    validate: async (request, requestId) => {
      const { provider, model, messages, ...otherParams } = request.body || {}

      if (!provider || !model || !Array.isArray(messages) || messages.length === 0) {
        return {
          status: 400,
          body: {
            error: 'provider, model, and messages are required',
            code: 'MISSING_FIELDS',
            requestId
          }
        }
      }

      return {
        prepared: {
          provider: String(provider),
          model: String(model),
          messages,
          otherParams,
          estimatedCost: 0,
          isEmergency: Boolean(otherParams.isEmergency)
        }
      }
    },
    invokeProvider: async prepared => {
      const nowSeconds = Math.floor(Date.now() / 1000)
      const requestedSleepMs = Number(prepared.otherParams?.mockSleepMs || 0)
      const sleepMs = Number.isFinite(requestedSleepMs) ? Math.max(0, Math.min(5_000, requestedSleepMs)) : 0
      if (sleepMs > 0) await new Promise(resolve => setTimeout(resolve, sleepMs))

      const contentSize = Number(prepared.otherParams?.mockContentBytes || 0)
      const bytes = Number.isFinite(contentSize) ? Math.max(0, Math.min(32_768, contentSize)) : 0
      const content = bytes > 0 ? 'x'.repeat(bytes) : 'ok'

      return {
        id: `mock-${nowSeconds}`,
        object: 'chat.completion',
        created: nowSeconds,
        model: prepared.model,
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content },
            finish_reason: 'stop'
          }
        ],
        usage: {
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0
        }
      }
    },
    getUsage: response => ({
      inputTokens: response.usage?.prompt_tokens || 0,
      outputTokens: response.usage?.completion_tokens || 0,
      totalTokens: response.usage?.total_tokens || 0,
      cachedTokens: 0
    }),
    computeActualCost: async () => 0,
    mapError: message => mapChatRouteError(message || '')
  })
})

export default router

