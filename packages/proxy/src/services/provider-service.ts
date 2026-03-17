import { getDatabase } from '../db/index.js'
import { encrypt, decrypt } from '../utils/encryption.js'
import { validateProviderApiKey } from '../config/index.js'
import { randomBytes } from 'crypto'
import { paginatedQuery } from '../utils/query.js'

export interface ProviderMetadata {
  name: string
  displayName: string
  baseUrl: string
  models: string[]
  defaultModel: string
}

export interface Provider {
  id: string
  name: string
  displayName: string
  baseUrl: string
  models: string[]
  defaultModel: string
  hasCredentials: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateProviderInput {
  name: string
  apiKey: string
  metadata?: Partial<ProviderMetadata>
}

const TEMPLATES: Record<string, Omit<ProviderMetadata, 'name'>> = {
  openai: { displayName: 'OpenAI', baseUrl: 'https://api.openai.com/v1', models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo', 'gpt-3.5-turbo-16k'], defaultModel: 'gpt-4' },
  anthropic: { displayName: 'Anthropic', baseUrl: 'https://api.anthropic.com/v1', models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'], defaultModel: 'claude-3-opus' },
  google: {
    displayName: 'Google (Gemini)',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    models: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-pro', 'gemini-1.5-pro-latest', 'gemini-1.5-flash', 'gemini-1.5-flash-latest', 'gemini-1.5-flash-8b'],
    defaultModel: 'gemini-2.5-pro'
  },
  xai: { displayName: 'xAI (Grok)', baseUrl: 'https://api.x.ai/v1', models: ['grok-4', 'grok-4-fast-reasoning', 'grok-4-fast-non-reasoning', 'grok-3', 'grok-3-mini', 'grok-vision-beta'], defaultModel: 'grok-4' },
  mistral: { displayName: 'Mistral', baseUrl: 'https://api.mistral.ai/v1', models: ['mistral-large-3', 'mistral-large-latest', 'mistral-medium-2505', 'mistral-small', 'mistral-nemo', 'mistral-small-2503'], defaultModel: 'mistral-large-3' },
  moonshot: { displayName: 'Kimi (Moonshot)', baseUrl: 'https://api.moonshot.ai/v1', models: ['kimi-k2.5', 'kimi-k2-thinking', 'kimi-k2-thinking-turbo', 'kimi-k2-0905-preview', 'kimi-k2-0711-preview', 'kimi-k2-turbo-preview'], defaultModel: 'kimi-k2.5' },
  deepseek: { displayName: 'DeepSeek', baseUrl: 'https://api.deepseek.com', models: ['deepseek-chat', 'deepseek-reasoner', 'deepseek-v3.2', 'deepseek-v3', 'deepseek-r1', 'deepseek-coder'], defaultModel: 'deepseek-chat' },
  dashscope: { displayName: 'Qwen (DashScope)', baseUrl: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1', models: ['qwen-max', 'qwen-plus-latest', 'qwen-plus', 'qwen-turbo-latest', 'qwen-turbo', 'qwen3-max', 'qwen3-coder-plus', 'qwen3-coder-flash'], defaultModel: 'qwen-plus-latest' },
  openrouter: { displayName: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1', models: ['anthropic/claude-sonnet-4.5', 'anthropic/claude-3.5-sonnet', 'openai/gpt-4o', 'google/gemini-2.5-pro', 'deepseek/deepseek-chat', 'x-ai/grok-4', 'mistralai/mistral-large-2512', 'moonshotai/kimi-k2.5'], defaultModel: 'anthropic/claude-sonnet-4.5' },
  vertex_ai: {
    displayName: 'Vertex AI (Google Cloud)',
    baseUrl: 'https://us-central1-aiplatform.googleapis.com/v1/projects/{project}/locations/us-central1/publishers/google/models/{model}:generateContent',
    models: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash', 'chat-bison', 'code-bison', 'text-bison'],
    defaultModel: 'gemini-2.5-pro'
  }
}

const PROVIDER_COLUMNS: Record<string, string> = {
  name: 'provider', displayName: 'provider', createdAt: 'created_at', updatedAt: 'updated_at'
}

function rowToProvider(row: any): Provider {
  let meta: ProviderMetadata = { name: row.provider, displayName: row.provider, baseUrl: '', models: [], defaultModel: '' }
  if (row.metadata) {
    try { meta = { ...meta, ...JSON.parse(row.metadata) } } catch {}
  }
  return {
    id: row.id, name: row.provider,
    displayName: meta.displayName, baseUrl: meta.baseUrl, models: meta.models, defaultModel: meta.defaultModel,
    hasCredentials: !!row.api_key, createdAt: row.created_at, updatedAt: row.updated_at
  }
}

export function createOrUpdateProvider(input: CreateProviderInput): Provider {
  const db = getDatabase()
  const name = input.name.toLowerCase()

  const v = validateProviderApiKey(name, input.apiKey)
  if (!v.valid) throw new Error(v.error || 'Invalid API key format')

  const tmpl = TEMPLATES[name]
  const meta: ProviderMetadata = {
    name,
    displayName: input.metadata?.displayName || tmpl?.displayName || name,
    baseUrl: input.metadata?.baseUrl || tmpl?.baseUrl || '',
    models: input.metadata?.models || tmpl?.models || [],
    defaultModel: input.metadata?.defaultModel || tmpl?.defaultModel || ''
  }

  const enc = encrypt(input.apiKey)
  const existing = db.prepare('SELECT 1 FROM provider_keys WHERE provider = ?').get(name)

  if (existing) {
    db.prepare(`UPDATE provider_keys SET api_key = ?, metadata = ?, updated_at = datetime('now') WHERE provider = ?`)
      .run(enc, JSON.stringify(meta), name)
  } else {
    db.prepare(`INSERT INTO provider_keys (id, provider, api_key, metadata) VALUES (?,?,?,?)`)
      .run(`provider-${randomBytes(8).toString('hex')}`, name, enc, JSON.stringify(meta))
  }

  return getProvider(name)!
}

export function updateProvider(name: string, input: { apiKey?: string; displayName?: string }): Provider {
  const db = getDatabase()
  const row = db.prepare('SELECT * FROM provider_keys WHERE provider = ?').get(name.toLowerCase()) as any
  if (!row) {
    throw new Error('Provider not found')
  }

  let meta: ProviderMetadata = { name: row.provider, displayName: row.provider, baseUrl: '', models: [], defaultModel: '' }
  if (row.metadata) {
    try { meta = { ...meta, ...JSON.parse(row.metadata) } } catch {}
  }

  const nextMeta: ProviderMetadata = {
    ...meta,
    displayName: input.displayName && input.displayName.trim() ? input.displayName.trim() : meta.displayName
  }

  let enc = row.api_key
  if (input.apiKey && input.apiKey.trim()) {
    const v = validateProviderApiKey(name.toLowerCase(), input.apiKey)
    if (!v.valid) throw new Error(v.error || 'Invalid API key format')
    enc = encrypt(input.apiKey)
  }

  db.prepare(`UPDATE provider_keys SET api_key = ?, metadata = ?, updated_at = datetime('now') WHERE provider = ?`)
    .run(enc, JSON.stringify(nextMeta), name.toLowerCase())

  return getProvider(name)!
}

export function listProviders(params?: {
  search?: string; limit?: number; offset?: number
  sortBy?: string | null; sortOrder?: 'asc' | 'desc' | null
}): { data: Provider[]; total: number } {
  const db = getDatabase()

  const { rows, total } = paginatedQuery(db, 'provider_keys', '1=1', [], {
    search: params?.search,
    searchColumns: ['provider'],
    limit: params?.limit,
    offset: params?.offset,
    sortBy: params?.sortBy,
    sortOrder: params?.sortOrder,
    columnMap: PROVIDER_COLUMNS
  })

  let providers = rows.map(rowToProvider)

  // also match on displayName/baseUrl (in metadata, not indexed)
  if (params?.search) {
    const q = params.search.toLowerCase()
    const all = (db.prepare('SELECT * FROM provider_keys').all() as any[]).map(rowToProvider)
    providers = all.filter(p =>
      p.name.includes(q) || p.displayName.toLowerCase().includes(q) || p.baseUrl.toLowerCase().includes(q)
    )
    return { data: providers.slice(params?.offset || 0, (params?.offset || 0) + (params?.limit || 100)), total: providers.length }
  }

  return { data: providers, total }
}

export function getProvider(name: string): Provider | null {
  const row = getDatabase().prepare('SELECT * FROM provider_keys WHERE provider = ?').get(name.toLowerCase()) as any
  return row ? rowToProvider(row) : null
}

export function resolveProvider(input: string): Provider | null {
  const byId = getProvider(input)
  if (byId) return byId

  const { data } = listProviders()
  const match = data.find(p => p.displayName === input)
  return match || null
}

export function getProviderApiKey(name: string): string | null {
  const row = getDatabase().prepare('SELECT api_key FROM provider_keys WHERE provider = ?').get(name.toLowerCase()) as any
  if (!row?.api_key) return null
  try { return decrypt(row.api_key) } catch (err) {
    console.error(`couldn't decrypt key for ${name}:`, err)
    return null
  }
}

export function deleteProvider(name: string): void {
  const r = getDatabase().prepare('DELETE FROM provider_keys WHERE provider = ?').run(name.toLowerCase())
  if (r.changes === 0) throw new Error('Provider not found')
}

export async function testProviderApiKey(name: string): Promise<{ success: boolean; error?: string }> {
  const apiKey = getProviderApiKey(name)
  if (!apiKey) return { success: false, error: 'API key not found or decryption failed' }

  const provider = getProvider(name)
  if (!provider) return { success: false, error: 'Provider not found' }

  const openaiCompat = ['openai', 'google', 'xai', 'mistral', 'moonshot', 'deepseek', 'dashscope', 'openrouter']
  if (openaiCompat.includes(name.toLowerCase()) && provider.baseUrl) {
    try {
      const url = provider.baseUrl.replace(/\/?$/, '/models')
      const resp = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' } })
      if (resp.ok) return { success: true }
      const body = await resp.json().catch(() => ({})) as any
      return { success: false, error: body?.error?.message || 'Validation failed' }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }

  return { success: true }
}
