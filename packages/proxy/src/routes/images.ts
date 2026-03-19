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
  imageSize?: string
  imageQuality?: string
  otherParams: Record<string, any>
  pricingRow?: {
    price_per_image: number
    max_images_per_request: number
  }
}

const PROVIDER_IMAGE_REQUIREMENTS: Record<string, Array<'size' | 'quality'>> = {
  // Keep this map explicit so mandatory image options are provider-specific.
  openai: ['size'],
}

function toOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

function getResponseCost(response: any): number | null {
  const candidates = [
    response?.usage?.total_cost,
    response?.usage?.cost,
    response?.usage?.cost_details?.upstream_inference_cost,
    response?.usage?.cost_details?.upstream_inference_prompt_cost,
    response?.usage?.cost_details?.upstream_inference_completions_cost,
    response?.pricing?.total_cost,
    response?.pricing?.cost,
    response?.cost,
    response?._meta?.cost?.totalCost,
  ]

  for (const candidate of candidates) {
    const numeric = asNumber(candidate)
    if (numeric !== null && numeric >= 0) return numeric
  }

  return null
}

function getImageUsageFromResponse(response: any) {
  const inputTokens = Math.max(
    0,
    Math.floor(
      asNumber(response?.usage?.prompt_tokens)
      ?? asNumber(response?.usage?.input_tokens)
      ?? 0
    )
  )

  const outputTokens = Math.max(
    0,
    Math.floor(
      asNumber(response?.usage?.completion_tokens)
      ?? asNumber(response?.usage?.output_tokens)
      ?? 0
    )
  )

  const cachedTokens = Math.max(
    0,
    Math.floor(
      asNumber(response?.usage?.prompt_tokens_details?.cached_tokens)
      ?? asNumber(response?.usage?.cached_tokens)
      ?? 0
    )
  )

  const totalTokens = Math.max(
    inputTokens + outputTokens,
    Math.floor(asNumber(response?.usage?.total_tokens) ?? 0)
  )

  return {
    inputTokens,
    outputTokens,
    totalTokens,
    cachedTokens,
  }
}

function getGeneratedImageCount(response: any, fallback: number): number {
  if (Array.isArray(response?.data) && response.data.length > 0) {
    return response.data.length
  }
  const fromUsage = asNumber(response?.usage?.num_images)
  if (fromUsage !== null && fromUsage > 0) return Math.floor(fromUsage)
  return Math.max(1, fallback)
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
        size: rawImageSize,
        quality: rawImageQuality,
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
      const db = getDatabase()
      const modelAlias = db.prepare(`
        SELECT canonical_model
        FROM model_aliases
        WHERE provider = ? AND alias = ?
        LIMIT 1
      `).get(canonicalProvider, String(model)) as { canonical_model: string } | undefined
      const canonicalModel = modelAlias?.canonical_model || String(model)

      const normalizedN = Number.isFinite(Number(n)) ? Math.max(1, Math.floor(Number(n))) : 1
      const imageSize = toOptionalString(rawImageSize)
      const imageQuality = toOptionalString(rawImageQuality)

      const requiredParams = PROVIDER_IMAGE_REQUIREMENTS[canonicalProvider] || []
      if (requiredParams.includes('size') && !imageSize) {
        return {
          status: 400,
          body: {
            error: `Field 'size' is required for provider '${canonicalProvider}'`,
            code: 'MISSING_IMAGE_SIZE',
            requestId
          }
        }
      }
      if (requiredParams.includes('quality') && !imageQuality) {
        return {
          status: 400,
          body: {
            error: `Field 'quality' is required for provider '${canonicalProvider}'`,
            code: 'MISSING_IMAGE_QUALITY',
            requestId
          }
        }
      }

      const capability = modelCapabilityService.checkModelAction(canonicalProvider, canonicalModel, 'image_generation')
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

      let pricingRow = db.prepare(`
        SELECT price_per_image, max_images_per_request
        FROM image_pricing
        WHERE provider = ? AND model = ? AND quality = ? AND size = ?
        ORDER BY effective_from DESC
        LIMIT 1
      `).get(canonicalProvider, model, imageQuality, imageSize) as {
        price_per_image: number
        max_images_per_request: number
      } | undefined

      if (!pricingRow && imageSize) {
        pricingRow = db.prepare(`
          SELECT price_per_image, max_images_per_request
          FROM image_pricing
          WHERE provider = ? AND model = ? AND size = ?
          ORDER BY effective_from DESC
          LIMIT 1
        `).get(canonicalProvider, canonicalModel, imageSize) as {
          price_per_image: number
          max_images_per_request: number
        } | undefined
      }

      if (!pricingRow && imageQuality) {
        pricingRow = db.prepare(`
          SELECT price_per_image, max_images_per_request
          FROM image_pricing
          WHERE provider = ? AND model = ? AND quality = ?
          ORDER BY effective_from DESC
          LIMIT 1
        `).get(canonicalProvider, canonicalModel, imageQuality) as {
          price_per_image: number
          max_images_per_request: number
        } | undefined
      }

      if (!pricingRow) {
        pricingRow = db.prepare(`
          SELECT price_per_image, max_images_per_request
          FROM image_pricing
          WHERE provider = ? AND model = ?
          ORDER BY effective_from DESC
          LIMIT 1
        `).get(canonicalProvider, canonicalModel) as {
          price_per_image: number
          max_images_per_request: number
        } | undefined
      }

      if (pricingRow && normalizedN > (pricingRow.max_images_per_request || 1)) {
        return {
          status: 400,
          body: {
            error: `Requested number of images (${normalizedN}) exceeds maximum allowed (${pricingRow.max_images_per_request})`,
            code: 'IMAGE_REQUEST_TOO_LARGE',
            requestId
          }
        }
      }

      return {
        prepared: {
          provider: canonicalProvider,
          model: canonicalModel,
          prompt,
          n: normalizedN,
          imageSize,
          imageQuality,
          otherParams,
          pricingRow,
          estimatedCost: pricingRow ? normalizedN * pricingRow.price_per_image : 0,
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
        ...(prepared.imageSize !== undefined ? { size: prepared.imageSize } : {}),
        ...(prepared.imageQuality !== undefined ? { quality: prepared.imageQuality } : {}),
        ...prepared.otherParams
      })
    },
    getUsage: response => getImageUsageFromResponse(response),
    getProviderRequestId: response => response.id || randomUUID(),
    computeActualCost: async ({ prepared, response }) => {
      const responseCost = getResponseCost(response)
      if (responseCost !== null) return responseCost

      if (prepared.pricingRow) {
        const actualN = getGeneratedImageCount(response, prepared.n)
        return actualN * prepared.pricingRow.price_per_image
      }

      return prepared.estimatedCost
    },
    mapError: mapStandardLlmRouteError
  })
})

export default router
