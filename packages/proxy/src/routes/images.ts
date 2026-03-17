import { Router } from 'express'
import { randomUUID } from 'crypto'
import { getDatabase } from '../db/index.js'
import * as llmService from '../services/llm-service.js'
import { modelCapabilityService } from '../services/model-capability-service.js'
import { mapStandardLlmRouteError } from './shared/llm-error-mapping.js'
import { handleLlmRequest, type LlmPreparedRequest } from './shared/llm-route-orchestrator.js'
import { resolveProvider } from '../services/provider-service.js'

const router: Router = Router()

interface ImagePreparedRequest extends LlmPreparedRequest {
  prompt: string
  n: number
  imageSize: string
  imageQuality: string
  otherParams: Record<string, any>
}

router.post('/', async (req, res) => {
  await handleLlmRequest<ImagePreparedRequest>(req, res, {
    action: 'image_generation',
    validate: (request, requestId) => {
      const {
        provider,
        model,
        prompt,
        n = 1,
        size: imageSize = '1024x1024',
        quality: imageQuality = 'standard',
        ...otherParams
      } = request.body || {}

      if (!provider || !model || !prompt) {
        return {
          status: 400,
          body: {
            error: 'provider, model, and prompt are required',
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

      const capability = modelCapabilityService.checkModelAction(canonicalProvider, model, 'image_generation')
      if (!capability.supported) {
        return {
          status: 400,
          body: {
            error: capability.error?.message || 'Model does not support image generation',
            code: capability.error?.code || 'ACTION_NOT_SUPPORTED',
            requestId
          }
        }
      }

      const db = getDatabase()
      const pricingRow = db.prepare(`
        SELECT price_per_image, max_images_per_request
        FROM image_pricing
        WHERE provider = ? AND model = ? AND quality = ? AND size = ?
        ORDER BY effective_from DESC
        LIMIT 1
      `).get(canonicalProvider, model, imageQuality, imageSize) as {
        price_per_image: number
        max_images_per_request: number
      } | undefined

      if (!pricingRow) {
        return {
          status: 400,
          body: {
            error: `Image pricing not configured for model '${model}' (${imageQuality}, ${imageSize})`,
            code: 'IMAGE_CONFIG_NOT_FOUND',
            requestId
          }
        }
      }

      if (n > (pricingRow.max_images_per_request || 1)) {
        return {
          status: 400,
          body: {
            error: `Requested number of images (${n}) exceeds maximum allowed (${pricingRow.max_images_per_request})`,
            code: 'IMAGE_REQUEST_TOO_LARGE',
            requestId
          }
        }
      }

      return {
        prepared: {
          provider: canonicalProvider,
          model,
          prompt,
          n,
          imageSize,
          imageQuality,
          otherParams,
          estimatedCost: n * pricingRow.price_per_image,
          isEmergency: Boolean(otherParams.isEmergency)
        }
      }
    },
    invokeProvider: async prepared => {
      return llmService.createImages({
        provider: prepared.provider,
        model: prepared.model,
        prompt: prepared.prompt,
        n: prepared.n,
        size: prepared.imageSize,
        quality: prepared.imageQuality,
        ...prepared.otherParams
      })
    },
    getUsage: () => ({
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      cachedTokens: 0
    }),
    getProviderRequestId: response => response.id || randomUUID(),
    computeActualCost: async ({ prepared }) => prepared.estimatedCost,
    mapError: mapStandardLlmRouteError
  })
})

export default router
