 
 

import { Router, type Request, type Response } from 'express'
import { getDatabase } from '../db/index.js'
import { generateAccessToken, generateRefreshToken, verifyRefreshToken, hashRefreshToken, type TokenPayload } from '../utils/jwt.js'
import { getMasterKey } from '../utils/master-key.js'
import { decrypt, hash as hashEmail } from '../utils/encryption.js'
import bcrypt from 'bcrypt'

const router: Router = Router()

 
router.post('/admin/login', async (req: Request, res: Response) => {
  try {
    const { username, password, email } = req.body
    
 
    const identifier = username || email
    
    if (!identifier || !password) {
      res.status(400).json({
        error: 'username/email and password are required',
        code: 'MISSING_CREDENTIALS'
      })
      return
    }
    
    const db = getDatabase()
    
 
 
    let user = db.prepare('SELECT * FROM auth WHERE id = ?').get(identifier) as any
    
 
    if (!user) {
      const emailHash = hashEmail(identifier)
      user = db.prepare('SELECT * FROM auth WHERE email_hash = ?').get(emailHash) as any
    }
    
 
 
    if (user && user.id === 'admin') {
 
      if (user.status !== 1) {
        res.status(403).json({
          error: 'Admin account is not active',
          code: 'ACCOUNT_INACTIVE'
        })
        return
      }
      
      const passwordMatch = await bcrypt.compare(password, user.password)
      
      if (!passwordMatch) {
        res.status(401).json({
          error: 'Invalid username/email or password',
          code: 'INVALID_CREDENTIALS'
        })
        return
      }
      
 
      let decryptedEmail: string
      try {
        decryptedEmail = decrypt(user.email)
      } catch (error: any) {
        decryptedEmail = user.email
      }
      
 
      const tokenPayload: TokenPayload = {
        userId: user.id,
        email: decryptedEmail,
        role: 'admin',
        name: user.name || 'Administrator'
      }
      
      const accessToken = generateAccessToken(tokenPayload)
      const refreshToken = generateRefreshToken(tokenPayload)
      
 
      const tokenHash = hashRefreshToken(refreshToken)
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      const absoluteExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      const deviceId = req.body.deviceId || null
      
      db.prepare(`
        INSERT INTO refresh_tokens (auth_id, token_hash, expires_at, absolute_expires_at, device_id)
        VALUES (?, ?, ?, ?, ?)
      `).run(user.id, tokenHash, expiresAt.toISOString(), absoluteExpiresAt.toISOString(), deviceId)
      
 
      db.prepare('UPDATE auth SET last_sign_in = datetime(\'now\') WHERE id = ?').run(user.id)
      
      res.json({
        accessToken,
        refreshToken,
        expiresIn: 3600,
        tokenType: 'Bearer',
        user: {
          userId: user.id,
          email: decryptedEmail,
          role: 'admin',
          name: user.name || 'Administrator'
        }
      })
      return
    }
    
 
 
    if (identifier === 'admin') {
      const masterKey = getMasterKey()
      if (masterKey && password === masterKey) {
 
        const tokenPayload: TokenPayload = {
          userId: 'admin',
          email: 'admin@ziri.local',
          role: 'admin',
          name: 'Administrator'
        }
        
        const accessToken = generateAccessToken(tokenPayload)
        const refreshToken = generateRefreshToken(tokenPayload)
        
 
        const tokenHash = hashRefreshToken(refreshToken)
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        const absoluteExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        const deviceId = req.body.deviceId || null
        
        db.prepare(`
          INSERT INTO refresh_tokens (auth_id, token_hash, expires_at, absolute_expires_at, device_id)
          VALUES (?, ?, ?, ?, ?)
        `).run('admin', tokenHash, expiresAt.toISOString(), absoluteExpiresAt.toISOString(), deviceId)
        
        res.json({
          accessToken,
          refreshToken,
          expiresIn: 3600,
          tokenType: 'Bearer',
          user: {
            userId: 'admin',
            email: 'admin@ziri.local',
            role: 'admin',
            name: 'Administrator'
          }
        })
        return
      }
    }
    
 
    res.status(401).json({
      error: 'Invalid username/email or password',
      code: 'INVALID_CREDENTIALS'
    })
  } catch (error: any) {
    console.error('[AUTH] Admin login error:', error)
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    })
  }
})

 
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
    
 
    const user = db.prepare('SELECT * FROM auth WHERE id = ?').get(userId) as any
    
    if (!user) {
      res.status(401).json({
        error: 'Invalid userId or password',
        code: 'INVALID_CREDENTIALS'
      })
      return
    }
    
 
    const passwordMatch = await bcrypt.compare(password, user.password)
    
    if (!passwordMatch) {
      res.status(401).json({
        error: 'Invalid userId or password',
        code: 'INVALID_CREDENTIALS'
      })
      return
    }
    
 
    if (user.status !== 1) {
      res.status(403).json({
        error: 'User account is not active',
        code: 'USER_INACTIVE'
      })
      return
    }
    
 
    let decryptedEmail: string
    try {
      decryptedEmail = decrypt(user.email)
    } catch (error: any) {
      decryptedEmail = user.email
    }
    
 
    const tokenPayload: TokenPayload = {
      userId: user.id,
      email: decryptedEmail,
      role: 'user',
      name: user.name || ''
    }
    
    const accessToken = generateAccessToken(tokenPayload)
    const refreshToken = generateRefreshToken(tokenPayload)
    
 
    const tokenHash = hashRefreshToken(refreshToken)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    const absoluteExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    const deviceId = req.body.deviceId || null
    
    db.prepare(`
      INSERT INTO refresh_tokens (auth_id, token_hash, expires_at, absolute_expires_at, device_id)
      VALUES (?, ?, ?, ?, ?)
    `).run(user.id, tokenHash, expiresAt.toISOString(), absoluteExpiresAt.toISOString(), deviceId)
    
 
    db.prepare('UPDATE auth SET last_sign_in = datetime(\'now\') WHERE id = ?').run(user.id)
    
    res.json({
      accessToken,
      refreshToken,
      expiresIn: 3600,
      tokenType: 'Bearer',
      user: {
        userId: user.id,
        email: decryptedEmail,
        role: 'user',
        name: user.name || ''
      }
    })
  } catch (error: any) {
    console.error('[AUTH] Login error:', error)
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    })
  }
})

 
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
    
 
    const db = getDatabase()
    const tokenHash = hashRefreshToken(refreshToken)
    
 
    const storedToken = db.prepare(`
      SELECT * FROM refresh_tokens 
      WHERE token_hash = ? 
        AND revoked_at IS NULL 
        AND expires_at > datetime('now')
        AND (absolute_expires_at IS NULL OR absolute_expires_at > datetime('now'))
    `).get(tokenHash) as any
    
    if (!storedToken) {
      res.status(401).json({
        error: 'Refresh token not found or expired',
        code: 'REFRESH_TOKEN_INVALID'
      })
      return
    }
    
 
    if (storedToken.used_at) {
      console.error(`[AUTH] SECURITY BREACH: Token reuse detected for user ${payload.userId}, token hash: ${tokenHash.substring(0, 8)}...`)
      
 
      db.prepare(`
        UPDATE refresh_tokens 
        SET revoked_at = datetime('now') 
        WHERE auth_id = ? AND revoked_at IS NULL
      `).run(payload.userId)
      
      res.status(401).json({
        error: 'Token reuse detected, all sessions invalidated. Please login again.',
        code: 'TOKEN_REUSE_DETECTED'
      })
      return
    }
    
 
    const user = db.prepare('SELECT * FROM auth WHERE id = ?').get(payload.userId) as any
    
    if (!user || user.status !== 1) {
      res.status(403).json({
        error: 'User account is not active',
        code: 'USER_INACTIVE'
      })
      return
    }
    
 
    let decryptedEmail: string
    try {
      decryptedEmail = decrypt(user.email)
    } catch (error: any) {
      decryptedEmail = user.email
    }
    
 
    db.prepare(`
      UPDATE refresh_tokens 
      SET used_at = datetime('now') 
      WHERE token_hash = ?
    `).run(tokenHash)
    
 
    const tokenPayload: TokenPayload = {
      userId: user.id,
      email: decryptedEmail,
      role: user.id === 'admin' ? 'admin' : 'user',
      name: user.name || ''
    }
    
    const newAccessToken = generateAccessToken(tokenPayload)
    const newRefreshToken = generateRefreshToken(tokenPayload)
    
 
    const newTokenHash = hashRefreshToken(newRefreshToken)
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
 
    const newAbsoluteExpiresAt = storedToken.absolute_expires_at 
      ? new Date(storedToken.absolute_expires_at) 
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    
    db.prepare(`
      INSERT INTO refresh_tokens (auth_id, token_hash, expires_at, absolute_expires_at, device_id)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      user.id, 
      newTokenHash, 
      newExpiresAt.toISOString(), 
      newAbsoluteExpiresAt.toISOString(),
      storedToken.device_id
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

 
router.post('/logout', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body
    
    if (refreshToken) {
      const db = getDatabase()
      const tokenHash = hashRefreshToken(refreshToken)
      
 
      db.prepare(`
        UPDATE refresh_tokens 
        SET revoked_at = datetime('now') 
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
