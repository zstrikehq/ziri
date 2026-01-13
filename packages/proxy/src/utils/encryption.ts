// Encryption utilities for provider API keys

import { createCipheriv, createDecipheriv, randomBytes, pbkdf2Sync } from 'crypto'
import { getMasterKey } from './master-key.js'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const SALT_LENGTH = 32
const TAG_LENGTH = 16
const KEY_LENGTH = 32
const ITERATIONS = 100000

/**
 * Derive encryption key from master key
 */
function deriveKey(masterKey: string, salt: Buffer): Buffer {
  return pbkdf2Sync(masterKey, salt, ITERATIONS, KEY_LENGTH, 'sha256')
}

/**
 * Encrypt data using master key
 */
export function encrypt(plaintext: string): string {
  const masterKey = getMasterKey()
  if (!masterKey) {
    throw new Error('Master key not found')
  }
  
  const salt = randomBytes(SALT_LENGTH)
  const iv = randomBytes(IV_LENGTH)
  const key = deriveKey(masterKey, salt)
  
  const cipher = createCipheriv(ALGORITHM, key, iv)
  
  let encrypted = cipher.update(plaintext, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  
  const tag = cipher.getAuthTag()
  
  // Combine: salt + iv + tag + encrypted
  const combined = Buffer.concat([
    salt,
    iv,
    tag,
    Buffer.from(encrypted, 'hex')
  ])
  
  return combined.toString('base64')
}

/**
 * Decrypt data using master key
 */
export function decrypt(encryptedData: string): string {
  const masterKey = getMasterKey()
  if (!masterKey) {
    throw new Error('Master key not found')
  }
  
  const combined = Buffer.from(encryptedData, 'base64')
  
  const salt = combined.subarray(0, SALT_LENGTH)
  const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH)
  const tag = combined.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH)
  const encrypted = combined.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH)
  
  const key = deriveKey(masterKey, salt)
  
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)
  
  let decrypted = decipher.update(encrypted, undefined, 'utf8')
  decrypted += decipher.final('utf8')
  
  return decrypted
}
