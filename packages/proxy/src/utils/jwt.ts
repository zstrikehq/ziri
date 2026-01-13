// JWT token utilities

import jwt from 'jsonwebtoken'
import { getMasterKey } from './master-key.js'
import { createHash } from 'crypto'

const JWT_SECRET_KEY = 'jwt-secret' // Separate from master key, can be configurable later
const ACCESS_TOKEN_EXPIRY = '1h' // 1 hour
const REFRESH_TOKEN_EXPIRY = '7d' // 7 days

export interface TokenPayload {
  userId: string
  email?: string
  role?: string
  name?: string
}

/**
 * Generate JWT secret from master key (or use separate secret)
 */
function getJwtSecret(): string {
  // Use master key as base for JWT secret (or can be separate)
  const masterKey = getMasterKey()
  if (!masterKey) {
    throw new Error('Master key not found')
  }
  // Create a hash of master key for JWT secret (or use master key directly)
  return createHash('sha256').update(masterKey + JWT_SECRET_KEY).digest('hex')
}

/**
 * Generate access token
 */
export function generateAccessToken(payload: TokenPayload): string {
  const secret = getJwtSecret()
  return jwt.sign(payload, secret, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
    issuer: 'zs-ai-proxy'
  })
}

/**
 * Generate refresh token
 */
export function generateRefreshToken(payload: TokenPayload): string {
  const secret = getJwtSecret()
  return jwt.sign(payload, secret, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
    issuer: 'zs-ai-proxy'
  })
}

/**
 * Verify and decode access token
 */
export function verifyAccessToken(token: string): TokenPayload {
  const secret = getJwtSecret()
  try {
    const decoded = jwt.verify(token, secret, {
      issuer: 'zs-ai-proxy'
    }) as TokenPayload
    return decoded
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token expired')
    }
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token')
    }
    throw error
  }
}

/**
 * Verify and decode refresh token
 */
export function verifyRefreshToken(token: string): TokenPayload {
  const secret = getJwtSecret()
  try {
    const decoded = jwt.verify(token, secret, {
      issuer: 'zs-ai-proxy'
    }) as TokenPayload
    return decoded
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Refresh token expired')
    }
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid refresh token')
    }
    throw error
  }
}

/**
 * Hash refresh token for storage
 */
export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}
