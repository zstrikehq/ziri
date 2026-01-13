// LLM provider service - makes requests to LLM providers

import * as providerService from './provider-service.js'

export interface ChatCompletionRequest {
  provider: string
  model: string
  messages: Array<{ role: string; content: string }>
  temperature?: number
  max_tokens?: number
  [key: string]: any
}

export interface ChatCompletionResponse {
  id: string
  object: string
  created: number
  model: string
  choices: Array<{
    index: number
    message: {
      role: string
      content: string
    }
    finish_reason: string
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

/**
 * Make chat completion request to LLM provider
 */
export async function chatCompletions(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
  // Get provider
  const provider = providerService.getProvider(request.provider)
  if (!provider) {
    throw new Error(`Provider '${request.provider}' not configured`)
  }
  
  // Get provider API key
  const apiKey = providerService.getProviderApiKey(request.provider)
  if (!apiKey) {
    throw new Error(`Provider API key not found for '${request.provider}'`)
  }
  
  // Determine endpoint based on provider
  let endpoint: string
  let requestBody: any
  
  if (provider.baseUrl.includes('anthropic')) {
    // Anthropic uses /messages endpoint with different format
    endpoint = `${provider.baseUrl}/messages`
    requestBody = {
      model: request.model,
      max_tokens: request.max_tokens || 1024,
      messages: request.messages.map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
      }))
    }
  } else {
    // OpenAI and others use /chat/completions
    endpoint = `${provider.baseUrl}/chat/completions`
    requestBody = {
      model: request.model,
      messages: request.messages,
      temperature: request.temperature,
      max_tokens: request.max_tokens,
      ...Object.fromEntries(
        Object.entries(request).filter(([key]) => 
          !['provider', 'model', 'messages'].includes(key)
        )
      )
    }
  }
  
  // Make request to LLM provider
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      ...(provider.baseUrl.includes('anthropic') && {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      })
    },
    body: JSON.stringify(requestBody)
  })
  
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`LLM provider error: ${response.status} ${errorText}`)
  }
  
  const result = await response.json() as any
  
  // Normalize response format (Anthropic uses different format)
  if (provider.baseUrl.includes('anthropic')) {
    // Convert Anthropic response to OpenAI format
    const anthropicResult = result as {
      id?: string
      model: string
      content: Array<{ text?: string } | string>
      stop_reason?: string
      usage?: {
        input_tokens?: number
        output_tokens?: number
      }
    }
    return {
      id: anthropicResult.id || `chatcmpl-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: anthropicResult.model,
      choices: anthropicResult.content.map((content: any, index: number) => ({
        index,
        message: {
          role: 'assistant',
          content: content.text || content
        },
        finish_reason: anthropicResult.stop_reason || 'stop'
      })),
      usage: {
        prompt_tokens: anthropicResult.usage?.input_tokens || 0,
        completion_tokens: anthropicResult.usage?.output_tokens || 0,
        total_tokens: (anthropicResult.usage?.input_tokens || 0) + (anthropicResult.usage?.output_tokens || 0)
      }
    } as ChatCompletionResponse
  }
  
  return result as ChatCompletionResponse
}
