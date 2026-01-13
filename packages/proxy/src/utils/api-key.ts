// API key utilities

import { createHash } from 'crypto'
import { randomBytes } from 'crypto'

/**
 * Generate API key with format: sk-zs-{userId}-{hash}
 */
export function generateApiKey(userId: string): string {
  const hash = randomBytes(8).toString('hex')
  return `sk-zs-${userId}-${hash}`
}

/**
 * Extract userId from API key
 * Format: sk-zs-{userId}-{hash}
 * Note: userId can contain hyphens, so we need to extract everything between 'sk-zs-' and the last '-{hash}'
 */
export function extractUserIdFromApiKey(apiKey: string): string | null {
  if (!apiKey.startsWith('sk-zs-')) {
    return null
  }
  
  // Remove 'sk-zs-' prefix
  const withoutPrefix = apiKey.substring(6)
  
  // Find the last hyphen (which separates userId from hash)
  // The hash is always 16 hex characters (8 bytes = 16 hex chars)
  const lastHyphenIndex = withoutPrefix.lastIndexOf('-')
  
  if (lastHyphenIndex === -1 || lastHyphenIndex === 0) {
    return null
  }
  
  // Extract userId (everything before the last hyphen)
  const userId = withoutPrefix.substring(0, lastHyphenIndex)
  
  // Verify the hash part exists and is valid (16 hex characters)
  const hashPart = withoutPrefix.substring(lastHyphenIndex + 1)
  if (hashPart.length !== 16 || !/^[0-9a-f]+$/.test(hashPart)) {
    return null
  }
  
  return userId
}

/**
 * Validate API key format
 */
export function validateApiKeyFormat(apiKey: string): boolean {
  return apiKey.startsWith('sk-zs-') && apiKey.split('-').length >= 4
}

/**
 * Hash API key for storage
 */
export function hashApiKey(apiKey: string): string {
  return createHash('sha256').update(apiKey).digest('hex')
}
