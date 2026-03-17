import { Router } from 'express'
import * as llmService from '../services/llm-service.js'
import { costEstimatorService } from '../services/cost-estimator-service.js'
import { mapChatRouteError } from './shared/llm-error-mapping.js'
import { handleLlmRequest, type LlmPreparedRequest, type LlmUsage } from './shared/llm-route-orchestrator.js'
import { resolveProvider } from '../services/provider-service.js'

const router: Router = Router()

const OPENAI_COMPATIBLE_PROVIDERS = new Set([
  'openai', 'google', 'xai', 'mistral', 'moonshot', 'deepseek', 'dashscope', 'openrouter', 'vertex_ai'
])

interface ChatPreparedRequest extends LlmPreparedRequest {
  messages: any[]
  otherParams: Record<string, any>
}

router.post('/completions', async (req, res) => {
  await handleLlmRequest<ChatPreparedRequest>(req, res, {
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

      const resolved = resolveProvider(String(provider))
      if (!resolved) {
        return {
          status: 400,
          body: {
            error: `Unknown provider '${provider}'`,
            code: 'PROVIDER_NOT_FOUND',
            requestId
          }
        }
      }

      const canonicalProvider = resolved.name

      const estimation = await estimateChatCost(canonicalProvider, model, messages, request.body?.max_tokens)

      return {
        prepared: {
          provider: canonicalProvider,
          model,
          messages,
          otherParams,
          estimatedCost: estimation.estimatedCost,
          estimation,
          isEmergency: Boolean(otherParams.isEmergency)
        }
      }
    },
    invokeProvider: async prepared => {
      return llmService.chatCompletions({
        provider: prepared.provider,
        model: prepared.model,
        messages: prepared.messages,
        ...prepared.otherParams
      })
    },
    getUsage: (response, prepared) => extractUsage(response, prepared.provider),
    computeActualCost: async ({ prepared, response, usage, modelUsed }) => {
      const { pricingService } = await import('../services/pricing-service.js')
      const costCalc = await pricingService.calculateCost(
        prepared.provider,
        modelUsed,
        usage.inputTokens,
        usage.outputTokens,
        usage.cachedTokens
      )
      return costCalc.totalCost
    },
    mapError: message => mapChatRouteError(message || '')
  })
})

export default router

function extractUsage(response: any, provider: string): LlmUsage {
  if (provider === 'anthropic') {
    return {
      inputTokens: response.usage?.input_tokens || 0,
      outputTokens: response.usage?.output_tokens || 0,
      totalTokens: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0),
      cachedTokens: response.usage?.cache_read_input_tokens || 0,
    }
  }

  if (provider === 'vertex_ai' || provider === 'google') {
    const usage = response.usageMetadata || response.usage
    const input = usage?.promptTokenCount ?? usage?.inputTokenCount ?? usage?.prompt_tokens ?? 0
    const output = usage?.candidatesTokenCount ?? usage?.outputTokenCount ?? usage?.completion_tokens ?? 0
    return {
      inputTokens: input,
      outputTokens: output,
      totalTokens: (usage?.totalTokenCount ?? 0) || usage?.total_tokens || input + output,
      cachedTokens: response.usage?.prompt_tokens_details?.cached_tokens ?? 0,
    }
  }

  if (OPENAI_COMPATIBLE_PROVIDERS.has(provider)) {
    return {
      inputTokens: response.usage?.prompt_tokens || 0,
      outputTokens: response.usage?.completion_tokens || 0,
      totalTokens: response.usage?.total_tokens || 0,
      cachedTokens: response.usage?.prompt_tokens_details?.cached_tokens || 0,
    }
  }

  return {
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    cachedTokens: 0
  }
}

async function estimateChatCost(provider: string, model: string, messages: any[], maxTokens?: number) {
  try {
    return await costEstimatorService.estimateCost(provider, model, messages, maxTokens)
  } catch {
    return {
      estimatedInputTokens: 0,
      estimatedOutputTokens: 0,
      estimatedCost: 0,
      confidence: 'low' as const
    }
  }
}
