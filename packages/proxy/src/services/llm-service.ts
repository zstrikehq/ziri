 

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

 
export async function chatCompletions(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
 
  const provider = providerService.getProvider(request.provider)
  if (!provider) {
    throw new Error(`Provider '${request.provider}' not configured`)
  }
  
 
  const apiKey = providerService.getProviderApiKey(request.provider)
  if (!apiKey) {
    throw new Error(`Provider API key not found for '${request.provider}'`)
  }
  
 
  let endpoint: string
  let requestBody: any
  
  if (provider.baseUrl.includes('anthropic')) {
 
    endpoint = `${provider.baseUrl}/messages`
    

    const systemMessages: string[] = []
    const conversationMessages: Array<{ role: 'user' | 'assistant'; content: string }> = []
    
    for (const msg of request.messages) {
      if (msg.role === 'system') {
        systemMessages.push(msg.content)
      } else {
        conversationMessages.push({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content
        })
      }
    }
    
    requestBody = {
      model: request.model,
      max_completion_tokens: request.max_tokens || 2048,
      messages: conversationMessages
    }
    

    if (systemMessages.length > 0) {
      requestBody.system = systemMessages.join('\n\n')
    }
    

    if (request.temperature !== undefined) {
      requestBody.temperature = request.temperature
    }
  } else {
 
    endpoint = `${provider.baseUrl}/chat/completions`
    

    const requiresMaxCompletionTokens = request.model.includes('gpt-5') || request.model.includes('o1') || request.model.includes('o3')
    
    requestBody = {
      model: request.model,
      messages: request.messages,
      temperature: request.temperature,
      ...(requiresMaxCompletionTokens 
        ? { max_completion_tokens: request.max_tokens || 2048 }
        : { max_tokens: request.max_tokens || 2048 }
      ),
      ...Object.fromEntries(
        Object.entries(request).filter(([key]) => 
          !['provider', 'model', 'messages', 'max_tokens'].includes(key)
        )
      )
    }
  }
  
 
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
  
 
  if (provider.baseUrl.includes('anthropic')) {
 
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

export interface EmbeddingsRequest {
  provider: string
  model: string
  input: string | string[] | Array<string | number[]>
  [key: string]: any
}

export async function createEmbeddings(request: EmbeddingsRequest): Promise<any> {
  const provider = providerService.getProvider(request.provider)
  if (!provider) {
    throw new Error(`Provider '${request.provider}' not configured`)
  }

  if (!provider.baseUrl.includes('openai')) {
    throw new Error('LLM provider error: embeddings currently supported only for OpenAI-compatible providers')
  }

  const apiKey = providerService.getProviderApiKey(request.provider)
  if (!apiKey) {
    throw new Error(`Provider API key not found for '${request.provider}'`)
  }

  const endpoint = `${provider.baseUrl}/embeddings`
  const { provider: _p, model, input, ...rest } = request
  const requestBody = {
    model,
    input,
    ...rest,
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`LLM provider error: ${response.status} ${errorText}`)
  }

  return response.json()
}

export interface ImageGenerationRequest {
  provider: string
  model: string
  prompt: string
  n?: number
  size?: string
  quality?: string
  response_format?: 'url' | 'b64_json'
  [key: string]: any
}

export async function createImages(request: ImageGenerationRequest): Promise<any> {
  const provider = providerService.getProvider(request.provider)
  if (!provider) {
    throw new Error(`Provider '${request.provider}' not configured`)
  }

  if (!provider.baseUrl.includes('openai')) {
    throw new Error('LLM provider error: image generation currently supported only for OpenAI-compatible providers')
  }

  const apiKey = providerService.getProviderApiKey(request.provider)
  if (!apiKey) {
    throw new Error(`Provider API key not found for '${request.provider}'`)
  }

  const endpoint = `${provider.baseUrl}/images/generations`
  const { provider: _p, model, prompt, n, size, quality, response_format, ...rest } = request
  const requestBody = {
    model,
    prompt,
    n,
    size,
    quality,
    response_format,
    ...rest,
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`LLM provider error: ${response.status} ${errorText}`)
  }

  return response.json()
}


