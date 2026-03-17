import { Router } from 'express'
import * as llmService from '../services/llm-service.js'
import { costEstimatorService } from '../services/cost-estimator-service.js'
import { modelCapabilityService } from '../services/model-capability-service.js'
import { mapStandardLlmRouteError } from './shared/llm-error-mapping.js'
import { handleLlmRequest, type LlmPreparedRequest } from './shared/llm-route-orchestrator.js'
import { resolveProvider } from '../services/provider-service.js'

const router: Router = Router()

interface EmbeddingPreparedRequest extends LlmPreparedRequest {
  input: string | string[]
  otherParams: Record<string, any>
}

router.post('/', async (req, res) => {
  await handleLlmRequest<EmbeddingPreparedRequest>(req, res, {
    action: 'embedding',
    validate: async (request, requestId) => {
      const { provider, model, input, ...otherParams } = request.body || {}

      if (!provider || !model || typeof input === 'undefined') {
        return {
          status: 400,
          body: {
            error: 'provider, model, and input are required',
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

      const capability = modelCapabilityService.checkModelAction(canonicalProvider, model, 'embedding')
      if (!capability.supported) {
        return {
          status: 400,
          body: {
            error: capability.error?.message || 'Model does not support embeddings',
            code: capability.error?.code || 'ACTION_NOT_SUPPORTED',
            requestId
          }
        }
      }

      const estimation = await estimateEmbeddingCost(canonicalProvider, model, input)

      return {
        prepared: {
          provider: canonicalProvider,
          model,
          input,
          otherParams,
          estimatedCost: estimation.estimatedCost,
          estimation,
          isEmergency: Boolean(otherParams.isEmergency)
        }
      }
    },
    invokeProvider: async prepared => {
      return llmService.createEmbeddings({
        provider: prepared.provider,
        model: prepared.model,
        input: prepared.input,
        ...prepared.otherParams
      })
    },
    getUsage: response => ({
      inputTokens: response.usage?.prompt_tokens || 0,
      outputTokens: 0,
      totalTokens: response.usage?.prompt_tokens || 0,
      cachedTokens: 0
    }),
    computeActualCost: async ({ prepared, modelUsed, usage }) => {
      const { pricingService } = await import('../services/pricing-service.js')
      const costCalc = await pricingService.calculateCost(
        prepared.provider,
        modelUsed,
        usage.inputTokens,
        0,
        0
      )
      return costCalc.totalCost
    },
    mapError: mapStandardLlmRouteError
  })
})

export default router

async function estimateEmbeddingCost(provider: string, model: string, input: string | string[]) {
  try {
    const messagesLike = Array.isArray(input)
      ? input.map(text => ({ role: 'user', content: text }))
      : [{ role: 'user', content: String(input) }]

    return await costEstimatorService.estimateCost(
      provider,
      model,
      messagesLike,
      undefined
    )
  } catch (error: any) {
    console.warn('failed to estimate embeddings cost:', error.message)
    return {
      estimatedInputTokens: 0,
      estimatedOutputTokens: 0,
      estimatedCost: 0,
      confidence: 'low' as const
    }
  }
}
