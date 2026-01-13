// Authentication routes

import { Router, type Request, type Response } from 'express'
import { getDatabase } from '../db/index.js'
import { generateAccessToken, generateRefreshToken, verifyRefreshToken, hashRefreshToken, type TokenPayload } from '../utils/jwt.js'
import { getMasterKey } from '../utils/master-key.js'
import bcrypt from 'bcrypt'

const router = Router()

/**
 * POST /api/auth/admin/login
 * Admin login with username "admin" and master key as password
 */
router.post('/admin/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body
    
    if (!username || !password) {
      res.status(400).json({
        error: 'username and password are required',
        code: 'MISSING_CREDENTIALS'
      })
      return
    }
    
    // Check if username is "admin"
    if (username !== 'admin') {
      res.status(401).json({
        error: 'Invalid username or password',
        code: 'INVALID_CREDENTIALS'
      })
      return
    }
    
    // Verify password matches master key
    const masterKey = getMasterKey()
    if (!masterKey || password !== masterKey) {
      res.status(401).json({
        error: 'Invalid username or password',
        code: 'INVALID_CREDENTIALS'
      })
      return
    }
    
    // Generate admin token
    const tokenPayload: TokenPayload = {
      userId: 'admin',
      email: 'admin@zs-ai.local',
      role: 'admin',
      name: 'Administrator'
    }
    
    const accessToken = generateAccessToken(tokenPayload)
    const refreshToken = generateRefreshToken(tokenPayload)
    
    // Store refresh token hash in database (using admin as userId)
    const db = getDatabase()
    const tokenHash = hashRefreshToken(refreshToken)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days (sliding window)
    const absoluteExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days (absolute)
    const deviceId = req.body.deviceId || null // Optional device ID
    
    db.prepare(`
      INSERT INTO refresh_tokens (user_id, token_hash, expires_at, absolute_expires_at, device_id)
      VALUES (?, ?, ?, ?, ?)
    `).run('admin', tokenHash, expiresAt.toISOString(), absoluteExpiresAt.toISOString(), deviceId)
    
    res.json({
      accessToken,
      refreshToken,
      expiresIn: 3600, // 1 hour in seconds
      tokenType: 'Bearer',
      user: {
        userId: 'admin',
        email: 'admin@zs-ai.local',
        role: 'admin',
        name: 'Administrator'
      }
    })
  } catch (error: any) {
    console.error('[AUTH] Admin login error:', error)
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    })
  }
})

/**
 * POST /api/auth/login
 * Login with userId and password, get JWT tokens (for end users)
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { userId, password } = req.body
    
    if (!userId || !password) {
      res.status(400).json({
        error: 'userId and password are required',
        code: 'MISSING_CREDENTIALS'
      })
      return
    }
    
    const db = getDatabase()
    
    // Find user by userId
    const user = db.prepare('SELECT * FROM users WHERE user_id = ?').get(userId) as any
    
    if (!user) {
      res.status(401).json({
        error: 'Invalid userId or password',
        code: 'INVALID_CREDENTIALS'
      })
      return
    }
    
    // Check password
    const passwordMatch = await bcrypt.compare(password, user.password_hash)
    
    if (!passwordMatch) {
      res.status(401).json({
        error: 'Invalid userId or password',
        code: 'INVALID_CREDENTIALS'
      })
      return
    }
    
    // Check if user is active
    if (user.status !== 'active') {
      res.status(403).json({
        error: 'User account is not active',
        code: 'USER_INACTIVE'
      })
      return
    }
    
    // Generate tokens
    const tokenPayload: TokenPayload = {
      userId: user.user_id,
      email: user.email,
      role: user.role,
      name: user.name
    }
    
    const accessToken = generateAccessToken(tokenPayload)
    const refreshToken = generateRefreshToken(tokenPayload)
    
    // Store refresh token hash in database
    const tokenHash = hashRefreshToken(refreshToken)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days (sliding window)
    const absoluteExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days (absolute)
    const deviceId = req.body.deviceId || null // Optional device ID
    
    db.prepare(`
      INSERT INTO refresh_tokens (user_id, token_hash, expires_at, absolute_expires_at, device_id)
      VALUES (?, ?, ?, ?, ?)
    `).run(user.user_id, tokenHash, expiresAt.toISOString(), absoluteExpiresAt.toISOString(), deviceId)
    
    // Update last login
    db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE user_id = ?').run(user.user_id)
    
    res.json({
      accessToken,
      refreshToken,
      expiresIn: 3600, // 1 hour in seconds
      tokenType: 'Bearer'
    })
  } catch (error: any) {
    console.error('[AUTH] Login error:', error)
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    })
  }
})

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token (with rotation)
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body
    
    if (!refreshToken) {
      res.status(400).json({
        error: 'refreshToken is required',
        code: 'MISSING_REFRESH_TOKEN'
      })
      return
    }
    
    // Verify refresh token
    let payload: TokenPayload
    try {
      payload = verifyRefreshToken(refreshToken)
    } catch (error: any) {
      res.status(401).json({
        error: error.message || 'Invalid refresh token',
        code: 'INVALID_REFRESH_TOKEN'
      })
      return
    }
    
    // Check if refresh token exists in database
    const db = getDatabase()
    const tokenHash = hashRefreshToken(refreshToken)
    
    // Find token - check both sliding window and absolute expiry
    const storedToken = db.prepare(`
      SELECT * FROM refresh_tokens 
      WHERE token_hash = ? 
        AND revoked_at IS NULL 
        AND expires_at > CURRENT_TIMESTAMP
        AND (absolute_expires_at IS NULL OR absolute_expires_at > CURRENT_TIMESTAMP)
    `).get(tokenHash) as any
    
    if (!storedToken) {
      res.status(401).json({
        error: 'Refresh token not found or expired',
        code: 'REFRESH_TOKEN_INVALID'
      })
      return
    }
    
    // SECURITY: Check if token was already used (token reuse detection)
    if (storedToken.used_at) {
      console.error(`[AUTH] SECURITY BREACH: Token reuse detected for user ${payload.userId}, token hash: ${tokenHash.substring(0, 8)}...`)
      
      // Revoke ALL refresh tokens for this user (security measure)
      db.prepare(`
        UPDATE refresh_tokens 
        SET revoked_at = CURRENT_TIMESTAMP 
        WHERE user_id = ? AND revoked_at IS NULL
      `).run(payload.userId)
      
      res.status(401).json({
        error: 'Token reuse detected, all sessions invalidated. Please login again.',
        code: 'TOKEN_REUSE_DETECTED'
      })
      return
    }
    
    // Get user to ensure still active
    const user = db.prepare('SELECT * FROM users WHERE user_id = ?').get(payload.userId) as any
    
    if (!user || user.status !== 'active') {
      res.status(403).json({
        error: 'User account is not active',
        code: 'USER_INACTIVE'
      })
      return
    }
    
    // Mark old token as used
    db.prepare(`
      UPDATE refresh_tokens 
      SET used_at = CURRENT_TIMESTAMP 
      WHERE token_hash = ?
    `).run(tokenHash)
    
    // Generate new tokens
    const tokenPayload: TokenPayload = {
      userId: user.user_id,
      email: user.email,
      role: user.role,
      name: user.name
    }
    
    const newAccessToken = generateAccessToken(tokenPayload)
    const newRefreshToken = generateRefreshToken(tokenPayload)
    
    // Store new refresh token
    const newTokenHash = hashRefreshToken(newRefreshToken)
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days (sliding window)
    // Use original absolute_expires_at (or set to 30 days if not set)
    const newAbsoluteExpiresAt = storedToken.absolute_expires_at 
      ? new Date(storedToken.absolute_expires_at) 
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    
    db.prepare(`
      INSERT INTO refresh_tokens (user_id, token_hash, expires_at, absolute_expires_at, device_id)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      user.user_id, 
      newTokenHash, 
      newExpiresAt.toISOString(), 
      newAbsoluteExpiresAt.toISOString(),
      storedToken.device_id // Preserve device_id
    )
    
    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: 3600,
      tokenType: 'Bearer'
    })
  } catch (error: any) {
    console.error('[AUTH] Refresh error:', error)
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    })
  }
})

/**
 * POST /api/auth/logout
 * Revoke refresh token
 */
router.post('/logout', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body
    
    if (refreshToken) {
      const db = getDatabase()
      const tokenHash = hashRefreshToken(refreshToken)
      
      // Revoke refresh token
      db.prepare(`
        UPDATE refresh_tokens 
        SET revoked_at = CURRENT_TIMESTAMP 
        WHERE token_hash = ?
      `).run(tokenHash)
    }
    
    res.json({ success: true })
  } catch (error: any) {
    console.error('[AUTH] Logout error:', error)
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    })
  }
})

export default router
