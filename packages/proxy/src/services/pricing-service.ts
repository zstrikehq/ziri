// Pricing service - calculates costs based on model pricing data

import type Database from 'better-sqlite3'
import { getDatabase } from '../db/index.js'
import { FALLBACK_PRICING } from '../db/seed-pricing.js'

interface ModelPricing {
  id: number
  provider: string
  model: string
  input_cost_per_token: number
  output_cost_per_token: number
  cache_read_cost_per_token: number | null
  max_input_tokens: number | null
  max_output_tokens: number | null
  supports_vision: number
  supports_function_calling: number
  supports_streaming: number
}

interface CostCalculation {
  inputCost: number
  outputCost: number
  cacheSavings: number
  totalCost: number
  pricingSource: 'database' | 'fallback'
  inputRateUsed: number
  outputRateUsed: number
  pricingId?: number
}

export class PricingService {
  private db: Database.Database
  private cache: Map<string, ModelPricing> = new Map()
  private cacheTimestamp: number = 0
  private readonly CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

  constructor(db?: Database.Database) {
    this.db = db || getDatabase()
  }

  async getPricing(provider: string, model: string): Promise<ModelPricing | null> {
    // Check cache freshness
    if (Date.now() - this.cacheTimestamp > this.CACHE_TTL_MS) {
      this.cache.clear()
      this.cacheTimestamp = Date.now()
    }

    const cacheKey = `${provider}:${model}`
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!
    }

    // 1. Try exact match
    let pricing = await this.findPricing(provider, model)

    // 2. Try alias resolution
    if (!pricing) {
      const alias = this.db.prepare(
        'SELECT canonical_model FROM model_aliases WHERE alias = ? AND provider = ?'
      ).get(model, provider) as { canonical_model: string } | undefined

      if (alias) {
        pricing = await this.findPricing(provider, alias.canonical_model)
      }
    }

    // 3. Try partial matching (for date-suffixed models)
    if (!pricing) {
      pricing = await this.findPartialMatch(provider, model)
    }

    if (pricing) {
      this.cache.set(cacheKey, pricing)
    }

    return pricing
  }

  async calculateCost(
    provider: string,
    model: string,
    inputTokens: number,
    outputTokens: number,
    cachedTokens: number = 0
  ): Promise<CostCalculation> {
    const pricing = await this.getPricing(provider, model)

    if (pricing) {
      const inputCost = inputTokens * pricing.input_cost_per_token
      const outputCost = outputTokens * pricing.output_cost_per_token
      
      let cacheSavings = 0
      if (cachedTokens > 0 && pricing.cache_read_cost_per_token) {
        const fullInputCost = cachedTokens * pricing.input_cost_per_token
        const cachedCost = cachedTokens * pricing.cache_read_cost_per_token
        cacheSavings = fullInputCost - cachedCost
      }

      return {
        inputCost,
        outputCost,
        cacheSavings,
        totalCost: inputCost + outputCost - cacheSavings,
        pricingSource: 'database',
        inputRateUsed: pricing.input_cost_per_token,
        outputRateUsed: pricing.output_cost_per_token,
        pricingId: pricing.id,
      }
    }

    // Fallback pricing
    const fallback = FALLBACK_PRICING[provider as keyof typeof FALLBACK_PRICING] 
      || FALLBACK_PRICING.openai

    return {
      inputCost: inputTokens * fallback.input_cost_per_token,
      outputCost: outputTokens * fallback.output_cost_per_token,
      cacheSavings: 0,
      totalCost: (inputTokens * fallback.input_cost_per_token) + (outputTokens * fallback.output_cost_per_token),
      pricingSource: 'fallback',
      inputRateUsed: fallback.input_cost_per_token,
      outputRateUsed: fallback.output_cost_per_token,
    }
  }

  private async findPricing(provider: string, model: string): Promise<ModelPricing | null> {
    const stmt = this.db.prepare(`
      SELECT * FROM model_pricing 
      WHERE provider = ? AND model = ? 
      AND effective_from <= datetime('now')
      AND (effective_until IS NULL OR effective_until > datetime('now'))
      ORDER BY effective_from DESC
      LIMIT 1
    `)
    return stmt.get(provider, model) as ModelPricing | null
  }

  private async findPartialMatch(provider: string, model: string): Promise<ModelPricing | null> {
    // Try to match without date suffix (e.g., gpt-4o-2024-08-06 -> gpt-4o)
    const baseModel = model.replace(/-\d{4}-\d{2}-\d{2}$/, '')
    if (baseModel !== model) {
      return this.findPricing(provider, baseModel)
    }
    return null
  }

  clearCache(): void {
    this.cache.clear()
    this.cacheTimestamp = 0
  }
}

// Export singleton instance
export const pricingService = new PricingService()
