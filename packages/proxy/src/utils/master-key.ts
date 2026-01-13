// Master key generation and management

import { randomBytes } from 'crypto'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { getConfigDir } from '@zs-ai/config'

const CONFIG_DIR = getConfigDir()
const MASTER_KEY_FILE = join(CONFIG_DIR, 'master-key.txt')

/**
 * Generate a new master key (cryptographically secure)
 */
export function generateMasterKey(): string {
  // Generate 32 random bytes (256 bits)
  const key = randomBytes(32).toString('hex')
  return key
}

/**
 * Get master key from file or environment variable
 */
export function getMasterKey(): string | null {
  // Check environment variable first
  const envKey = process.env.ZS_AI_MASTER_KEY
  if (envKey) {
    return envKey
  }

  // Check file
  if (existsSync(MASTER_KEY_FILE)) {
    try {
      const key = readFileSync(MASTER_KEY_FILE, 'utf-8').trim()
      return key
    } catch (error) {
      console.error('[MASTER KEY] Error reading master key file:', error)
      return null
    }
  }

  return null
}

/**
 * Save master key to file
 */
export function saveMasterKey(key: string): void {
  // Ensure config directory exists
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true })
  }

  // Save to file
  writeFileSync(MASTER_KEY_FILE, key, { mode: 0o600 }) // Read/write for owner only
  console.log(`[MASTER KEY] Master key saved to: ${MASTER_KEY_FILE}`)
}

/**
 * Initialize master key (generate if doesn't exist)
 */
export function initializeMasterKey(): string {
  const existing = getMasterKey()
  
  if (existing) {
    console.log('[MASTER KEY] Using existing master key')
    console.log(`[MASTER KEY] Location: ${MASTER_KEY_FILE}`)
    console.log('[MASTER KEY] To view the key, open the file above or set ZS_AI_MASTER_KEY env var')
    return existing
  }

  // Generate new master key
  const newKey = generateMasterKey()
  saveMasterKey(newKey)
  
  console.log('='.repeat(70))
  console.log('🔑 MASTER KEY GENERATED')
  console.log('='.repeat(70))
  console.log(`Master Key: ${newKey}`)
  console.log(`Location: ${MASTER_KEY_FILE}`)
  console.log('')
  console.log('⚠️  IMPORTANT: Save this master key now - it won\'t be shown again!')
  console.log('⚠️  This key is required for all admin operations.')
  console.log('⚠️  Store it securely - you can also set ZS_AI_MASTER_KEY env var.')
  console.log('='.repeat(70))
  console.log('')
  
  return newKey
}
