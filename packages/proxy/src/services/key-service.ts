// Key service - business logic for API key management

import { getDatabase } from '../db/index.js'
import { generateApiKey, hashApiKey, extractUserIdFromApiKey } from '../utils/api-key.js'
import * as userService from './user-service.js'
import * as entityService from './entity-service.js'

export interface CreateKeyInput {
  userId: string
  // Entity attributes (moved from user creation)
  role?: string
  department?: string
  securityClearance?: number
  trainingCompleted?: boolean
  yearsOfService?: number
  // Spend limits
  dailySpendLimit?: number
  monthlySpendLimit?: number
}

export interface ApiKey {
  id: number
  userId: string
  apiKey: string
  status: string
  createdAt: string
  revokedAt?: string
}

/**
 * Create a new API key for a user
 */
export async function createKey(input: CreateKeyInput): Promise<{ apiKey: string; userId: string }> {
  const db = getDatabase()
  
  // Verify user exists
  const user = userService.getUserById(input.userId)
  if (!user) {
    throw new Error('User not found')
  }
  
  // Generate API key
  const apiKey = generateApiKey(input.userId)
  const keyHash = hashApiKey(apiKey)
  
  // Store in database
  db.prepare(`
    INSERT INTO api_keys (user_id, api_key, key_hash, status)
    VALUES (?, ?, ?, 'active')
  `).run(input.userId, apiKey, keyHash)
  
  // Create entity in Backend API
  try {
    await entityService.createEntityInBackend({
      userId: input.userId,
      role: input.role,
      department: input.department,
      securityClearance: input.securityClearance,
      trainingCompleted: input.trainingCompleted,
      yearsOfService: input.yearsOfService,
      dailySpendLimit: input.dailySpendLimit,
      monthlySpendLimit: input.monthlySpendLimit
    })
  } catch (error: any) {
    // If entity creation fails, rollback API key creation
    db.prepare('DELETE FROM api_keys WHERE key_hash = ?').run(keyHash)
    throw new Error(`Failed to create entity in Backend API: ${error.message}`)
  }
  
  return { apiKey, userId: input.userId }
}

/**
 * List all API keys
 */
export function listKeys(): ApiKey[] {
  const db = getDatabase()
  const keys = db.prepare('SELECT * FROM api_keys ORDER BY created_at DESC').all() as any[]
  return keys.map(mapDbKeyToKey)
}

/**
 * Get API key by key hash (for validation)
 */
export function getKeyByHash(keyHash: string): ApiKey | null {
  const db = getDatabase()
  const key = db.prepare('SELECT * FROM api_keys WHERE key_hash = ?').get(keyHash) as any
  return key ? mapDbKeyToKey(key) : null
}

/**
 * Get API key by API key string
 */
export function getKeyByApiKey(apiKey: string): ApiKey | null {
  const keyHash = hashApiKey(apiKey)
  return getKeyByHash(keyHash)
}

/**
 * Get keys for a specific user
 */
export function getKeysByUserId(userId: string): ApiKey[] {
  const db = getDatabase()
  const keys = db.prepare('SELECT * FROM api_keys WHERE user_id = ? ORDER BY created_at DESC').all(userId) as any[]
  return keys.map(mapDbKeyToKey)
}

/**
 * Rotate an API key (generate new key for same user)
 */
export function rotateKey(userId: string): { apiKey: string; userId: string } {
  const db = getDatabase()
  
  // Verify user exists
  const user = userService.getUserById(userId)
  if (!user) {
    throw new Error('User not found')
  }
  
  // Revoke all existing keys for this user
  db.prepare(`
    UPDATE api_keys 
    SET status = 'revoked', revoked_at = CURRENT_TIMESTAMP 
    WHERE user_id = ? AND status = 'active'
  `).run(userId)
  
  // Generate new API key
  const apiKey = generateApiKey(userId)
  const keyHash = hashApiKey(apiKey)
  
  // Store new key in database
  db.prepare(`
    INSERT INTO api_keys (user_id, api_key, key_hash, status)
    VALUES (?, ?, ?, 'active')
  `).run(userId, apiKey, keyHash)
  
  return { apiKey, userId }
}

/**
 * Delete an API key (and all keys for the user)
 */
export function deleteKey(userId: string): void {
  const db = getDatabase()
  
  const result = db.prepare('DELETE FROM api_keys WHERE user_id = ?').run(userId)
  
  if (result.changes === 0) {
    throw new Error('No keys found for user')
  }
}

/**
 * Validate API key (check if active and belongs to userId)
 */
export function validateApiKey(apiKey: string, userId: string): boolean {
  const key = getKeyByApiKey(apiKey)
  
  if (!key) {
    return false
  }
  
  if (key.status !== 'active') {
    return false
  }
  
  if (key.userId !== userId) {
    return false
  }
  
  return true
}

/**
 * Map database key to ApiKey interface
 */
function mapDbKeyToKey(dbKey: any): ApiKey {
  return {
    id: dbKey.id,
    userId: dbKey.user_id,
    apiKey: dbKey.api_key,
    status: dbKey.status,
    createdAt: dbKey.created_at,
    revokedAt: dbKey.revoked_at || undefined
  }
}
