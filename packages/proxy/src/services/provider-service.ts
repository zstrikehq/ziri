// Provider service - business logic for LLM provider management

import { getDatabase } from '../db/index.js'
import { encrypt, decrypt } from '../utils/encryption.js'
import { validateProviderApiKey } from '@zs-ai/config'

export interface ProviderMetadata {
  name: string
  displayName: string
  baseUrl: string
  models: string[]
  defaultModel: string
}

export interface Provider {
  id: number
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
  const existing = db.prepare('SELECT * FROM provider_keys WHERE provider_name = ?').get(providerName) as any
  
  if (existing) {
    // Update existing provider
    db.prepare(`
      UPDATE provider_keys 
      SET encrypted_api_key = ?, metadata = ?, updated_at = CURRENT_TIMESTAMP
      WHERE provider_name = ?
    `).run(encryptedApiKey, JSON.stringify(metadata), providerName)
  } else {
    // Create new provider
    db.prepare(`
      INSERT INTO provider_keys (provider_name, encrypted_api_key, metadata)
      VALUES (?, ?, ?)
    `).run(providerName, encryptedApiKey, JSON.stringify(metadata))
  }
  
  return getProvider(providerName)!
}

/**
 * List all providers
 */
export function listProviders(): Provider[] {
  const db = getDatabase()
  const providers = db.prepare('SELECT * FROM provider_keys ORDER BY created_at DESC').all() as any[]
  return providers.map(mapDbProviderToProvider)
}

/**
 * Get provider by name
 */
export function getProvider(name: string): Provider | null {
  const db = getDatabase()
  const provider = db.prepare('SELECT * FROM provider_keys WHERE provider_name = ?').get(name.toLowerCase()) as any
  return provider ? mapDbProviderToProvider(provider) : null
}

/**
 * Get provider API key (decrypted)
 */
export function getProviderApiKey(name: string): string | null {
  const db = getDatabase()
  const provider = db.prepare('SELECT encrypted_api_key FROM provider_keys WHERE provider_name = ?').get(name.toLowerCase()) as any
  
  if (!provider) {
    return null
  }
  
  try {
    return decrypt(provider.encrypted_api_key)
  } catch (error) {
    console.error(`[PROVIDER] Failed to decrypt API key for ${name}:`, error)
    return null
  }
}

/**
 * Delete provider
 */
export function deleteProvider(name: string): void {
  const db = getDatabase()
  const result = db.prepare('DELETE FROM provider_keys WHERE provider_name = ?').run(name.toLowerCase())
  
  if (result.changes === 0) {
    throw new Error('Provider not found')
  }
}

/**
 * Test provider connection
 */
export async function testProviderConnection(name: string): Promise<{ success: boolean; error?: string }> {
  const provider = getProvider(name)
  if (!provider) {
    return { success: false, error: 'Provider not found' }
  }
  
  const apiKey = getProviderApiKey(name)
  if (!apiKey) {
    return { success: false, error: 'Provider API key not found or decryption failed' }
  }
  
  try {
    // Test connection by calling provider's models endpoint
    const testUrl = provider.baseUrl.includes('anthropic') 
      ? `${provider.baseUrl}/messages` // Anthropic doesn't have /models endpoint
      : `${provider.baseUrl}/models`
    
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (response.ok) {
      return { success: true }
    } else {
      const errorText = await response.text()
      return { success: false, error: `Provider returned ${response.status}: ${errorText}` }
    }
  } catch (error: any) {
    return { success: false, error: error.message || 'Connection failed' }
  }
}

/**
 * Map database provider to Provider interface
 */
function mapDbProviderToProvider(dbProvider: any): Provider {
  const metadata = dbProvider.metadata ? JSON.parse(dbProvider.metadata) : {}
  
  return {
    id: dbProvider.id,
    name: dbProvider.provider_name,
    displayName: metadata.displayName || dbProvider.provider_name,
    baseUrl: metadata.baseUrl || '',
    models: metadata.models || [],
    defaultModel: metadata.defaultModel || '',
    hasCredentials: !!dbProvider.encrypted_api_key,
    createdAt: dbProvider.created_at,
    updatedAt: dbProvider.updated_at
  }
}
