// Cost estimator service - estimates cost before making LLM request

import { pricingService } from './pricing-service.js'

interface CostEstimate {
  estimatedInputTokens: number
  estimatedOutputTokens: number
  estimatedCost: number
  confidence: 'high' | 'medium' | 'low'
}

export class CostEstimatorService {
  private readonly CHARS_PER_TOKEN: Record<string, number> = {
    'gpt': 4,
    'claude': 3.5,
    'default': 4,
  }

  private readonly OUTPUT_RATIOS: Record<string, number> = {
    'gpt-4': 1.5,
    'gpt-4o': 1.5,
    'gpt-4o-mini': 1.5,
    'gpt-3.5-turbo': 1.0,
    'claude-3-opus': 2.0,
    'claude-3-sonnet': 1.5,
    'claude-3-haiku': 1.0,
    'default': 1.0,
  }

  private readonly SAFETY_BUFFER = 1.3 // 30% buffer

  /**
   * Estimate the cost of a request before sending to LLM
   * Uses input size and model characteristics to predict total cost
   */
  async estimateCost(
    provider: string,
    model: string,
    messages: Array<{ role: string; content: string | any }>,
    maxTokens?: number
  ): Promise<CostEstimate> {
    // 1. Calculate input tokens
    const totalChars = this.countMessageCharacters(messages)
    const charsPerToken = this.getCharsPerToken(provider)
    const estimatedInputTokens = Math.ceil(totalChars / charsPerToken)

    // 2. Estimate output tokens
    let estimatedOutputTokens: number
    
    if (maxTokens) {
      // If max_tokens is specified, use it as upper bound
      estimatedOutputTokens = maxTokens
    } else {
      // Otherwise, estimate based on model and input size
      const outputRatio = this.getOutputRatio(model)
      estimatedOutputTokens = Math.ceil(estimatedInputTokens * outputRatio)
      
      // Cap at reasonable maximum (4096 for most models)
      estimatedOutputTokens = Math.min(estimatedOutputTokens, 4096)
    }

    // 3. Calculate base cost
    const costResult = await pricingService.calculateCost(
      provider,
      model,
      estimatedInputTokens,
      estimatedOutputTokens,
      0 // No cached tokens for estimation
    )

    // 4. Apply safety buffer
    const estimatedCost = costResult.totalCost * this.SAFETY_BUFFER

    // 5. Determine confidence level
    const confidence = this.determineConfidence(maxTokens, estimatedInputTokens)

    return {
      estimatedInputTokens,
      estimatedOutputTokens,
      estimatedCost, // Full precision - will be rounded only when storing to entity
      confidence,
    }
  }

  /**
   * Count total characters in messages
   */
  private countMessageCharacters(
    messages: Array<{ role: string; content: string | any }>
  ): number {
    let totalChars = 0

    for (const message of messages) {
      // Add role overhead (~4 tokens per message for formatting)
      totalChars += 16

      if (typeof message.content === 'string') {
        totalChars += message.content.length
      } else if (Array.isArray(message.content)) {
        // Handle multi-modal content (text + images)
        for (const part of message.content) {
          if (part.type === 'text') {
            totalChars += part.text?.length || 0
          } else if (part.type === 'image_url') {
            // Images are ~765 tokens for low detail, ~1105 for high
            totalChars += 4000 // Conservative estimate
          }
        }
      } else if (message.content && typeof message.content === 'object') {
        totalChars += JSON.stringify(message.content).length
      }
    }

    return totalChars
  }

  /**
   * Get characters per token ratio for provider
   */
  private getCharsPerToken(provider: string): number {
    const key = provider.toLowerCase()
    if (key.includes('openai') || key.includes('gpt')) {
      return this.CHARS_PER_TOKEN['gpt']
    }
    if (key.includes('anthropic') || key.includes('claude')) {
      return this.CHARS_PER_TOKEN['claude']
    }
    return this.CHARS_PER_TOKEN['default']
  }

  /**
   * Get expected output ratio for model
   */
  private getOutputRatio(model: string): number {
    const modelLower = model.toLowerCase()
    
    for (const [key, ratio] of Object.entries(this.OUTPUT_RATIOS)) {
      if (modelLower.includes(key)) {
        return ratio
      }
    }
    
    return this.OUTPUT_RATIOS['default']
  }

  /**
   * Determine confidence level of estimate
   */
  private determineConfidence(
    maxTokens: number | undefined,
    inputTokens: number
  ): 'high' | 'medium' | 'low' {
    if (maxTokens) {
      // If max_tokens specified, we have high confidence in upper bound
      return 'high'
    }
    if (inputTokens < 1000) {
      // Small inputs are harder to predict output size
      return 'medium'
    }
    return 'low'
  }
}

// Export singleton instance
export const costEstimatorService = new CostEstimatorService()
