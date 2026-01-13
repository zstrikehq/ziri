// Provider credentials management with encryption

import { existsSync, readFileSync, writeFileSync, mkdirSync, chmodSync } from 'fs'
import { createCipheriv, createDecipheriv, randomBytes, pbkdf2Sync } from 'crypto'
import { join } from 'path'
import { getConfigDir } from './index.js'

export interface ProviderMetadata {
  name: string
  displayName: string
  baseUrl: string
  models: string[]
  defaultModel?: string
  hasCredentials?: boolean  // Flag indicating if credentials exist
}

export interface ProviderCredentials {
  apiKey: string
}

export interface ProviderConfig {
  metadata: ProviderMetadata
  credentials?: ProviderCredentials  // Optional, loaded separately
}

// Encryption configuration
const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const SALT_LENGTH = 32
const TAG_LENGTH = 16
const KEY_LENGTH = 32
const PBKDF2_ITERATIONS = 100000

// Get credentials file path
function getCredentialsPath(): string {
  const configDir = getConfigDir()
  return join(configDir, 'credentials.json')
}

// Derive encryption key from master key
function deriveKey(masterKey: string, salt: Buffer): Buffer {
  return pbkdf2Sync(masterKey, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha256')
}

// Encrypt credentials
export function encryptCredentials(credentials: Record<string, ProviderCredentials>, masterKey: string): string {
  try {
    const salt = randomBytes(SALT_LENGTH)
    const key = deriveKey(masterKey, salt)
    const iv = randomBytes(IV_LENGTH)
    
    const cipher = createCipheriv(ALGORITHM, key, iv)
    
    const plaintext = JSON.stringify(credentials)
    let encrypted = cipher.update(plaintext, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    const tag = cipher.getAuthTag()
    
    // Format: salt:iv:tag:encrypted
    const result = Buffer.concat([
      salt,
      iv,
      tag,
      Buffer.from(encrypted, 'hex')
    ]).toString('base64')
    
    return result
  } catch (error: any) {
    throw new Error(`Encryption failed: ${error.message}`)
  }
}

// Decrypt credentials
export function decryptCredentials(encryptedData: string, masterKey: string): Record<string, ProviderCredentials> {
  try {
    const buffer = Buffer.from(encryptedData, 'base64')
    
    const salt = buffer.subarray(0, SALT_LENGTH)
    const iv = buffer.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH)
    const tag = buffer.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH)
    const encrypted = buffer.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH)
    
    const key = deriveKey(masterKey, salt)
    
    const decipher = createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(tag)
    
    let decrypted = decipher.update(encrypted, undefined, 'utf8')
    decrypted += decipher.final('utf8')
    
    return JSON.parse(decrypted)
  } catch (error: any) {
    throw new Error(`Decryption failed: ${error.message}`)
  }
}

// Read master key from environment or generate prompt (for CLI)
export function getMasterKey(): string | null {
  // Try environment variable first
  const envKey = process.env.ZS_AI_MASTER_KEY
  if (envKey) {
    return envKey
  }
  
  // For CLI, we'll prompt for password and derive key
  // For now, return null to indicate we need a password
  return null
}

// Read encrypted credentials
export function readCredentials(masterKey: string): Record<string, ProviderCredentials> | null {
  const credentialsPath = getCredentialsPath()
  
  if (!existsSync(credentialsPath)) {
    return null
  }
  
  try {
    const encrypted = readFileSync(credentialsPath, 'utf-8')
    return decryptCredentials(encrypted, masterKey)
  } catch (error: any) {
    console.error('Failed to read credentials:', error.message)
    return null
  }
}

// Write encrypted credentials
export function writeCredentials(credentials: Record<string, ProviderCredentials>, masterKey: string): void {
  const credentialsPath = getCredentialsPath()
  const configDir = getConfigDir()
  
  // Ensure config directory exists
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true })
  }
  
  try {
    const encrypted = encryptCredentials(credentials, masterKey)
    writeFileSync(credentialsPath, encrypted, 'utf-8')
    // Set file permissions (Unix-like systems only)
    if (process.platform !== 'win32') {
      try {
        chmodSync(credentialsPath, 0o600)
      } catch (error) {
        // Ignore permission errors
      }
    }
  } catch (error: any) {
    console.error('Failed to write credentials:', error.message)
    throw error
  }
}

// Add or update provider credentials
export function setProviderCredentials(
  providerName: string,
  apiKey: string,
  masterKey: string
): void {
  const existing = readCredentials(masterKey) || {}
  existing[providerName] = { apiKey }
  writeCredentials(existing, masterKey)
}

// Get provider credentials
export function getProviderCredentials(
  providerName: string,
  masterKey: string
): ProviderCredentials | null {
  const credentials = readCredentials(masterKey)
  if (!credentials) {
    return null
  }
  return credentials[providerName] || null
}

// Remove provider credentials
export function removeProviderCredentials(
  providerName: string,
  masterKey: string
): void {
  const existing = readCredentials(masterKey)
  if (!existing || !existing[providerName]) {
    return
  }
  
  delete existing[providerName]
  writeCredentials(existing, masterKey)
}

// List all provider names that have credentials
export function listProvidersWithCredentials(masterKey: string): string[] {
  const credentials = readCredentials(masterKey)
  if (!credentials) {
    return []
  }
  return Object.keys(credentials)
}

// Test provider API key (basic validation - just checks format)
export function validateProviderApiKey(providerName: string, apiKey: string): { valid: boolean; error?: string } {
  if (!apiKey || apiKey.trim().length === 0) {
    return { valid: false, error: 'API key cannot be empty' }
  }
  
  // Basic format validation based on provider
  switch (providerName.toLowerCase()) {
    case 'openai':
      if (!apiKey.startsWith('sk-')) {
        return { valid: false, error: 'Invalid OpenAI API key format. Expected format: sk-...' }
      }
      break
    case 'anthropic':
      if (!apiKey.startsWith('sk-ant-')) {
        return { valid: false, error: 'Invalid Anthropic API key format. Expected format: sk-ant-...' }
      }
      break
    default:
      // Generic validation - at least 10 characters
      if (apiKey.length < 10) {
        return { valid: false, error: 'API key seems too short' }
      }
  }
  
  return { valid: true }
}
