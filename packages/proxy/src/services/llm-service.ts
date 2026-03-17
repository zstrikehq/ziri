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

const OPENAI_COMPATIBLE_IMAGE_PROVIDERS = new Set([
  'openai',
  'xai',
  'mistral',
  'moonshot',
  'deepseek',
  'dashscope',
])

function isOpenAiCompatibleImageProvider(providerName: string, baseUrl: string): boolean {
  if (OPENAI_COMPATIBLE_IMAGE_PROVIDERS.has(providerName.toLowerCase())) return true
  return /\/openai(\/|$)/i.test(baseUrl) || /openai/i.test(baseUrl)
}

async function callOpenAiCompatibleImages(
  provider: { baseUrl: string },
  apiKey: string,
  request: ImageGenerationRequest
): Promise<any> {
  const endpoint = `${provider.baseUrl}/images/generations`
  const { provider: _p, model, prompt, n, size, quality, response_format, ...rest } = request
  const requestBody: Record<string, any> = {
    model,
    prompt,
    ...(n !== undefined ? { n } : {}),
    ...(size !== undefined ? { size } : {}),
    ...(quality !== undefined ? { quality } : {}),
    ...(response_format !== undefined ? { response_format } : {}),
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

function normalizeOpenRouterImageResponse(result: any, request: ImageGenerationRequest): any {
  if (Array.isArray(result?.data) && result.data.length > 0) {
    return result
  }

  const images: Array<Record<string, any>> = []
  const seen = new Set<string>()

  const pushUrl = (url: string) => {
    if (!url || seen.has(`url:${url}`)) return
    seen.add(`url:${url}`)
    images.push({ url })
  }

  const pushB64 = (b64: string) => {
    if (!b64 || seen.has(`b64:${b64}`)) return
    seen.add(`b64:${b64}`)
    images.push({ b64_json: b64 })
  }

  const pushImage = (candidate: any) => {
    if (!candidate || typeof candidate !== 'object') return
    if (typeof candidate.url === 'string' && candidate.url.length > 0) {
      pushUrl(candidate.url)
      return
    }
    if (typeof candidate.b64_json === 'string' && candidate.b64_json.length > 0) {
      pushB64(candidate.b64_json)
      return
    }
    if (typeof candidate.image_url === 'string' && candidate.image_url.length > 0) {
      pushUrl(candidate.image_url)
      return
    }
    if (candidate.image_url && typeof candidate.image_url.url === 'string' && candidate.image_url.url.length > 0) {
      pushUrl(candidate.image_url.url)
      return
    }
    if (typeof candidate.image_base64 === 'string' && candidate.image_base64.length > 0) {
      pushB64(candidate.image_base64)
    }
  }

  const pushFromString = (value: unknown) => {
    if (typeof value !== 'string' || value.length === 0) return

    // Handle markdown/plain URLs in text content.
    const urlMatches = value.match(/https?:\/\/[^\s)'"`]+/g) || []
    for (const url of urlMatches) {
      pushUrl(url)
    }

    // Handle data URL payloads and convert to b64_json.
    const dataMatches = value.match(/data:image\/[a-zA-Z0-9.+-]+;base64,([A-Za-z0-9+/=]+)/g) || []
    for (const match of dataMatches) {
      const commaIndex = match.indexOf(',')
      if (commaIndex > -1) {
        pushB64(match.slice(commaIndex + 1))
      }
    }
  }

  for (const choice of result?.choices || []) {
    for (const img of choice?.message?.images || []) pushImage(img)

    const content = choice?.message?.content
    if (Array.isArray(content)) {
      for (const part of content) {
        pushImage(part)
        pushImage(part?.image)
        pushImage(part?.image_url)
        pushFromString(part?.text)
        pushFromString(part?.content)
      }
    } else {
      pushFromString(content)
    }
  }

  for (const outputItem of result?.output || []) {
    if (!Array.isArray(outputItem?.content)) continue
    for (const part of outputItem.content) {
      pushImage(part)
      pushImage(part?.image)
      pushImage(part?.image_url)
      pushFromString(part?.text)
      pushFromString(part?.content)
    }
  }

  if (images.length === 0) {
    throw new Error('LLM provider error: OpenRouter did not return image data for this model/request')
  }

  return {
    id: result?.id || `img-${Date.now()}`,
    object: 'image_generation',
    created: result?.created || Math.floor(Date.now() / 1000),
    model: result?.model || request.model,
    data: images,
    usage: result?.usage,
    pricing: result?.pricing,
  }
}

async function callOpenRouterImageViaChat(
  provider: { baseUrl: string },
  apiKey: string,
  request: ImageGenerationRequest
): Promise<any> {
  const endpoint = `${provider.baseUrl}/chat/completions`
  const { provider: _p, model, prompt, n, size, quality, response_format, ...rest } = request

  const baseBody: Record<string, any> = {
    model,
    messages: [{ role: 'user', content: prompt }],
    ...rest,
  }

  if (n !== undefined) baseBody.n = n
  if (size !== undefined) baseBody.size = size
  if (quality !== undefined) baseBody.quality = quality
  if (response_format !== undefined) baseBody.response_format = response_format

  const attempts: Array<Record<string, any>> = [
    // Primary: ask only for image output to maximize endpoint compatibility.
    { ...baseBody, modalities: ['image'] },
    // Fallback: allow provider default modality negotiation.
    { ...baseBody },
  ]

  let lastErrorText = ''
  let lastStatus = 500
  for (const requestBody of attempts) {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    })

    if (response.ok) {
      const result = await response.json()
      return normalizeOpenRouterImageResponse(result, request)
    }

    lastStatus = response.status
    lastErrorText = await response.text()

    // Retry on modality-endpoint mismatch only.
    if (!lastErrorText.includes('No endpoints found that support the requested output modalities')) {
      break
    }
  }

  throw new Error(`LLM provider error: ${lastStatus} ${lastErrorText}`)
}

async function callGoogleNativeImagen(
  provider: { baseUrl: string },
  apiKey: string,
  request: ImageGenerationRequest
): Promise<any> {
  const endpoint = `${provider.baseUrl.replace(/\/$/, '')}/images:generate`
  const { provider: _p, model, prompt, n, size, quality, response_format, ...rest } = request
  const requestBody: Record<string, any> = {
    model,
    prompt,
    ...(n !== undefined ? { n } : {}),
    ...(size !== undefined ? { size } : {}),
    ...(quality !== undefined ? { quality } : {}),
    ...(response_format !== undefined ? { response_format } : {}),
    ...rest,
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'x-api-key': apiKey,
    },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`LLM provider error: ${response.status} ${errorText}`)
  }

  return response.json()
}

export async function createImages(request: ImageGenerationRequest): Promise<any> {
  const provider = providerService.getProvider(request.provider)
  if (!provider) {
    throw new Error(`Provider '${request.provider}' not configured`)
  }

  const apiKey = providerService.getProviderApiKey(request.provider)
  if (!apiKey) {
    throw new Error(`Provider API key not found for '${request.provider}'`)
  }

  if (provider.name.toLowerCase() === 'openrouter') {
    return callOpenRouterImageViaChat(provider, apiKey, request)
  }

  if (isOpenAiCompatibleImageProvider(provider.name, provider.baseUrl)) {
    return callOpenAiCompatibleImages(provider, apiKey, request)
  }

  // Native image-generation API support for non OpenAI-compatible providers.
  if (provider.name.toLowerCase() === 'google') {
    return callGoogleNativeImagen(provider, apiKey, request)
  }

  throw new Error(
    `LLM provider error: image generation is not configured for provider '${provider.name}'`
  )
}


