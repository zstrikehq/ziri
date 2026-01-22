// Provider service - business logic for LLM provider management
// Uses new provider_keys table with encryption

import { getDatabase } from '../db/index.js'
import { encrypt, decrypt } from '../utils/encryption.js'
import { validateProviderApiKey } from '@zs-ai/config'
import { randomBytes } from 'crypto'

export interface ProviderMetadata {
  name: string
  displayName: string
  baseUrl: string
  models: string[]
  defaultModel: string
}

export interface Provider {
  id: string // provider_keys.id (TEXT)
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

// Provider templates
const PROVIDER_TEMPLATES: Record<string, Omit<ProviderMetadata, 'name'>> = {
  openai: {
    displayName: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo', 'gpt-3.5-turbo-16k'],
    defaultModel: 'gpt-4'
  },
  anthropic: {
    displayName: 'Anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
    defaultModel: 'claude-3-opus'
  }
}

/**
 * Create or update a provider
 */
export function createOrUpdateProvider(input: CreateProviderInput): Provider {
  const db = getDatabase()
  const providerName = input.name.toLowerCase()
  
  // Validate API key format
  const validation = validateProviderApiKey(providerName, input.apiKey)
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid API key format')
  }
  
  // Use template or provided metadata
  const template = PROVIDER_TEMPLATES[providerName]
  const metadata: ProviderMetadata = {
    name: providerName,
    displayName: input.metadata?.displayName || template?.displayName || providerName,
    baseUrl: input.metadata?.baseUrl || template?.baseUrl || '',
    models: input.metadata?.models || template?.models || [],
    defaultModel: input.metadata?.defaultModel || template?.defaultModel || ''
  }
  
  // Encrypt API key
  const encryptedApiKey = encrypt(input.apiKey)
  
  // Check if provider exists
  const existing = db.prepare('SELECT * FROM provider_keys WHERE provider = ?').get(providerName) as any
  
  if (existing) {
    // Update existing provider
    db.prepare(`
      UPDATE provider_keys 
      SET api_key = ?, metadata = ?, updated_at = datetime('now')
      WHERE provider = ?
    `).run(encryptedApiKey, JSON.stringify(metadata), providerName)
  } else {
    // Create new provider
    const providerId = `provider-${randomBytes(8).toString('hex')}`
    db.prepare(`
      INSERT INTO provider_keys (id, provider, api_key, metadata)
      VALUES (?, ?, ?, ?)
    `).run(providerId, providerName, encryptedApiKey, JSON.stringify(metadata))
  }
  
  return getProvider(providerName)!
}

/**
 * List all providers with optional search, limit, offset, and sorting
 */
export function listProviders(params?: {
  search?: string
  limit?: number
  offset?: number
  sortBy?: string | null
  sortOrder?: 'asc' | 'desc' | null
}): { data: Provider[]; total: number } {
  const db = getDatabase()
  
  // Build WHERE clause
  let whereClause = 'WHERE 1=1'
  const args: any[] = []
  
  if (params?.search) {
    const searchPattern = `%${params.search}%`
    // Search across provider name, displayName (in metadata), and baseUrl (in metadata)
    // Since metadata is JSON, we'll search provider name first, then filter by metadata
    whereClause += ' AND provider LIKE ?'
    args.push(searchPattern)
  }
  
  // Build ORDER BY clause
  let orderByClause = 'ORDER BY created_at DESC' // Default sort
  if (params?.sortBy && params?.sortOrder) {
    // Map frontend column names to database column names
    const columnMap: Record<string, string> = {
      'name': 'provider',
      'displayName': 'provider', // Will sort by provider name (displayName is in metadata)
      'createdAt': 'created_at',
      'updatedAt': 'updated_at'
    }
    const dbColumn = columnMap[params.sortBy]
    if (dbColumn) {
      const order = params.sortOrder.toUpperCase()
      orderByClause = `ORDER BY ${dbColumn} ${order}`
    }
  }
  
  // Get total count (before metadata filtering)
  const countSql = `SELECT COUNT(*) as total FROM provider_keys ${whereClause}`
  const countResult = db.prepare(countSql).get(...args) as { total: number }
  let total = countResult.total
  
  // Get paginated data
  const limit = params?.limit || 100
  const offset = params?.offset || 0
  const dataSql = `SELECT * FROM provider_keys ${whereClause} ${orderByClause} LIMIT ? OFFSET ?`
  const providers = db.prepare(dataSql).all(...args, limit, offset) as any[]
  
  // Map providers
  let mappedProviders = providers.map(mapDbProviderToProvider)
  
  // If search provided, also filter by metadata fields (displayName, baseUrl)
  if (params?.search) {
    const searchLower = params.search.toLowerCase()
    mappedProviders = mappedProviders.filter(provider => 
      provider.name.toLowerCase().includes(searchLower) ||
      provider.displayName.toLowerCase().includes(searchLower) ||
      provider.baseUrl.toLowerCase().includes(searchLower)
    )
    // Recalculate total based on filtered results
    const allProviders = db.prepare('SELECT * FROM provider_keys').all() as any[]
    const allMapped = allProviders.map(mapDbProviderToProvider)
    const filtered = allMapped.filter(provider => 
      provider.name.toLowerCase().includes(searchLower) ||
      provider.displayName.toLowerCase().includes(searchLower) ||
      provider.baseUrl.toLowerCase().includes(searchLower)
    )
    
    // If sorting is applied, re-sort the filtered results
    if (params?.sortBy && params?.sortOrder) {
      const sortKey = params.sortBy as keyof Provider
      mappedProviders.sort((a, b) => {
        const aVal = a[sortKey]
        const bVal = b[sortKey]
        if (aVal === undefined || aVal === null) return 1
        if (bVal === undefined || bVal === null) return -1
        // Handle string comparison
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          const comparison = aVal.toLowerCase().localeCompare(bVal.toLowerCase())
          return params.sortOrder === 'asc' ? comparison : -comparison
        }
        const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
        return params.sortOrder === 'asc' ? comparison : -comparison
      })
    }
    
    return { data: mappedProviders, total: filtered.length }
  }
  
  return { data: mappedProviders, total }
}

/**
 * Get provider by name
 */
export function getProvider(name: string): Provider | null {
  const db = getDatabase()
  const provider = db.prepare('SELECT * FROM provider_keys WHERE provider = ?').get(name.toLowerCase()) as any
  return provider ? mapDbProviderToProvider(provider) : null
}

/**
 * Get provider API key (decrypted)
 */
export function getProviderApiKey(name: string): string | null {
  const db = getDatabase()
  const provider = db.prepare('SELECT api_key FROM provider_keys WHERE provider = ?').get(name.toLowerCase()) as any
  
  if (!provider || !provider.api_key) {
    return null
  }
  
  try {
    return decrypt(provider.api_key)
  } catch (error: any) {
    console.error(`[PROVIDER] Failed to decrypt API key for ${name}:`, error)
    return null
  }
}

/**
 * Delete provider
 */
export function deleteProvider(name: string): void {
  const db = getDatabase()
  const result = db.prepare('DELETE FROM provider_keys WHERE provider = ?').run(name.toLowerCase())
  if (result.changes === 0) {
    throw new Error('Provider not found')
  }
}

/**
 * Test provider API key (validate it works)
 */
export async function testProviderApiKey(name: string): Promise<{ success: boolean; error?: string }> {
  const apiKey = getProviderApiKey(name)
  
  if (!apiKey) {
    return { success: false, error: 'Provider API key not found or decryption failed' }
  }
  
  // Try to make a test request to the provider
  const provider = getProvider(name)
  if (!provider) {
    return { success: false, error: 'Provider not found' }
  }
  
  try {
    // For OpenAI, test with a simple models request
    if (name.toLowerCase() === 'openai') {
      const response = await fetch(`${provider.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        return { success: true }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' })) as any
        return { success: false, error: errorData?.error?.message || 'API key validation failed' }
      }
    }
    
    // For other providers, return success if key exists and is valid format
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to validate API key' }
  }
}

/**
 * Map database provider to Provider interface
 */
function mapDbProviderToProvider(dbProvider: any): Provider {
  let metadata: ProviderMetadata = {
    name: dbProvider.provider,
    displayName: dbProvider.provider,
    baseUrl: '',
    models: [],
    defaultModel: ''
  }
  
  // Parse metadata JSON
  if (dbProvider.metadata) {
    try {
      const parsed = JSON.parse(dbProvider.metadata)
      metadata = { ...metadata, ...parsed }
    } catch (error: any) {
      console.warn(`[PROVIDER] Failed to parse metadata for ${dbProvider.provider}:`, error.message)
    }
  }
  
  return {
    id: dbProvider.id,
    name: dbProvider.provider,
    displayName: metadata.displayName,
    baseUrl: metadata.baseUrl,
    models: metadata.models,
    defaultModel: metadata.defaultModel,
    hasCredentials: !!dbProvider.api_key,
    createdAt: dbProvider.created_at,
    updatedAt: dbProvider.updated_at
  }
}
