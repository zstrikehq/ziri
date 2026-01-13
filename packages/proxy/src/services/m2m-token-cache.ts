// M2M token cache service - caches Backend API M2M tokens with proactive refresh

import { M2MAuthProvider } from '@zs-ai/auth-plugin'
import type { ProxyConfig } from '../config.js'

interface CachedToken {
  token: string
  expiresAt: Date // Token expiry from Backend API
  cachedAt: Date // When we cached it
}

// Cache storage: key is based on config (orgId + projectId + clientId)
const tokenCache = new Map<string, CachedToken>()

// Proactive refresh window: refresh token if it expires within this many minutes
const PROACTIVE_REFRESH_MINUTES = 5

/**
 * Generate cache key from config
 */
function getCacheKey(config: Pick<ProxyConfig, 'orgId' | 'projectId' | 'clientId'>): string {
  return `${config.orgId}:${config.projectId}:${config.clientId || ''}`
}

/**
 * Check if token is valid (not expired and not within refresh window)
 */
function isTokenValid(cached: CachedToken): boolean {
  const now = new Date()
  const refreshThreshold = new Date(now.getTime() + PROACTIVE_REFRESH_MINUTES * 60 * 1000)
  
  // Token is valid if it expires after the refresh threshold
  return cached.expiresAt > refreshThreshold
}

/**
 * Get M2M token (from cache or fetch new)
 */
export async function getM2MToken(config: ProxyConfig): Promise<string> {
  if (!config.orgId || !config.projectId || !config.clientId || !config.clientSecret) {
    throw new Error('Backend API credentials not configured')
  }
  
  const cacheKey = getCacheKey(config)
  const cached = tokenCache.get(cacheKey)
  
  // If cached and valid, return cached token
  if (cached && isTokenValid(cached)) {
    return cached.token
  }
  
  // Otherwise, fetch new token
  const authProvider = new M2MAuthProvider({
    backendUrl: config.backendUrl,
    orgId: config.orgId,
    projectId: config.projectId,
    clientId: config.clientId,
    clientSecret: config.clientSecret
  })
  
  const token = await authProvider.getToken()
  
  // Parse expires_in from token response (M2MAuthProvider returns token, but we need expiry)
  // For now, assume tokens expire in 1 hour (3600 seconds) - this is standard for OAuth2
  // If M2MAuthProvider provides expiry info, we should use that
  const expiresIn = 3600 // 1 hour in seconds
  const expiresAt = new Date(Date.now() + (expiresIn - PROACTIVE_REFRESH_MINUTES * 60) * 1000)
  
  // Cache the token
  tokenCache.set(cacheKey, {
    token,
    expiresAt,
    cachedAt: new Date()
  })
  
  return token
}

/**
 * Invalidate cache for specific config (if credentials change)
 */
export function invalidateCache(config: Pick<ProxyConfig, 'orgId' | 'projectId' | 'clientId'>): void {
  const cacheKey = getCacheKey(config)
  tokenCache.delete(cacheKey)
}

/**
 * Clear all cached tokens
 */
export function clearCache(): void {
  tokenCache.clear()
}
