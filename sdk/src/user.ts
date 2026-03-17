export interface UserSDKConfig {
  apiKey: string
  proxyUrl?: string | URL
  fetch?: typeof fetch
  timeoutMs?: number
}

type UnknownRecord = Record<string, unknown>

export type ChatMessageRole = 'system' | 'user' | 'assistant' | (string & {})

export interface ChatMessage {
  role: ChatMessageRole
  content: string
}

export interface ChatCompletionParams extends UnknownRecord {
  provider: string
  model: string
  messages: ChatMessage[]
  ipAddress?: string
  context?: Record<string, unknown>
}

export interface EmbeddingsParams extends UnknownRecord {
  provider: string
  model: string
  input: string | string[] | Array<string | number[]>
}

export interface ImageGenerationParams extends UnknownRecord {
  provider: string
  model: string
  prompt: string
  n?: number
  size?: string
  quality?: string
  response_format?: 'url' | 'b64_json'
}

const DEFAULT_PROXY_URL = 'http://localhost:3100'
const DEFAULT_TIMEOUT_MS = 30_000

export class UserSDK {
  private readonly apiKey: string
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch
  private readonly timeoutMs: number

  constructor(config: UserSDKConfig) {
    const apiKey = config.apiKey?.trim()
    if (!apiKey) {
      throw new Error('apiKey is required')
    }
    this.validateApiKey(apiKey)

    const fetchImpl = config.fetch ?? globalThis.fetch
    if (typeof fetchImpl !== 'function') {
      throw new Error('global fetch is not available; pass a fetch implementation in config')
    }

    const proxyUrl = this.resolveProxyUrl(config.proxyUrl)

    this.apiKey = apiKey
    this.baseUrl = proxyUrl
    this.fetchImpl = fetchImpl
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS
  }

  async chatCompletions<T = unknown>(params: ChatCompletionParams): Promise<T> {
    const { provider, model, messages, ...extra } = params
    if (!provider) {
      throw new Error('provider is required')
    }
    if (!model) {
      throw new Error('model is required')
    }
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error('messages must be a non-empty array')
    }

    return this.request('/api/chat/completions', {
      provider,
      model,
      messages,
      ...extra
    })
  }

  async embeddings<T = unknown>(params: EmbeddingsParams): Promise<T> {
    const { provider, model, input, ...extra } = params
    if (!provider || !model) {
      throw new Error('provider and model are required for embeddings requests')
    }
    if (input === undefined) {
      throw new Error('input is required for embeddings requests')
    }

    return this.request('/api/embeddings', {
      provider,
      model,
      input,
      ...extra
    })
  }

  async images<T = unknown>(params: ImageGenerationParams): Promise<T> {
    const { provider, model, prompt, ...extra } = params
    if (!provider || !model) {
      throw new Error('provider and model are required for image generation requests')
    }
    if (!prompt) {
      throw new Error('prompt is required for image generation requests')
    }

    return this.request('/api/images/generations', {
      provider,
      model,
      prompt,
      ...extra
    })
  }

  private async request<T>(path: string, payload: UnknownRecord): Promise<T> {
    const url = this.buildUrl(path)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs)

    try {
      const response = await this.fetchImpl(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey
        },
        body: JSON.stringify(this.stripUndefined(payload)),
        signal: controller.signal
      })

      if (!response.ok) {
        const body = await response.text().catch(() => '')
        const message = body || response.statusText || 'unknown error'
        throw new Error(`Request failed: ${response.status} ${message}`.trim())
      }

      return response.json() as Promise<T>
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timed out after ${this.timeoutMs}ms`)
      }
      throw error
    } finally {
      clearTimeout(timeout)
    }
  }

  private stripUndefined(payload: UnknownRecord): UnknownRecord {
    const result: UnknownRecord = {}
    for (const [key, value] of Object.entries(payload)) {
      if (value !== undefined) {
        result[key] = value
      }
    }
    return result
  }

  private buildUrl(path: string): string {
    if (!path.startsWith('/')) {
      path = `/${path}`
    }
    return `${this.baseUrl}${path}`
  }

  private resolveProxyUrl(candidate?: string | URL): string {
    const raw = candidate ?? process.env.ZIRI_PROXY_URL ?? DEFAULT_PROXY_URL
    try {
      const url = raw instanceof URL ? raw : new URL(raw)
      return url.href.replace(/\/+$/, '')
    } catch (err) {
      throw new Error('proxyUrl must be an absolute URL')
    }
  }

  private validateApiKey(apiKey: string): void {
    if (!/^ziri_[0-9a-f]{32}$/.test(apiKey)) {
      throw new Error('Invalid API key format.')
    }
    const uuid = apiKey.slice('ziri_'.length)
    if (uuid[12] !== '4' || !/[89ab]/.test(uuid[16] || '')) {
      throw new Error('Invalid API key format.')
    }
  }
}
