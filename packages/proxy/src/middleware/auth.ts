// Authentication middleware

import type { Request, Response, NextFunction } from 'express'
import { verifyAccessToken } from '../utils/jwt.js'
import { getMasterKey } from '../utils/master-key.js'

export interface AdminRequest extends Request {
  admin?: {
    userId: string
    email: string
    role: string
    name?: string
  }
}

/**
 * Middleware to require admin authentication (JWT token)
 * Accepts either Authorization header or X-Master-Key (for backward compatibility)
 */
export function requireAdmin(
  req: AdminRequest,
  res: Response,
  next: NextFunction
): void {
  // Try JWT token first (preferred)
  const authHeader = req.headers.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    try {
      const payload = verifyAccessToken(token)
      // Check if it's an admin token
      if (payload.userId === 'admin' && payload.role === 'admin') {
        req.admin = {
          userId: payload.userId,
          email: payload.email || 'admin@zs-ai.local',
          role: payload.role || 'admin',
          name: payload.name
        }
        next()
        return
      }
    } catch (error: any) {
      // Token invalid, fall through to master key check
    }
  }
  
  // Fallback to master key for backward compatibility
  const masterKey = req.headers['x-master-key'] as string
  if (masterKey) {
    const expectedKey = getMasterKey()
    if (expectedKey && masterKey === expectedKey) {
      req.admin = {
        userId: 'admin',
        email: 'admin@zs-ai.local',
        role: 'admin',
        name: 'Administrator'
      }
      next()
      return
    }
  }
  
  res.status(401).json({
    error: 'Admin authentication required. Please login.',
    code: 'ADMIN_AUTH_REQUIRED'
  })
}

/**
 * @deprecated Use requireAdmin instead
 * Middleware to require master key for admin operations (backward compatibility)
 */
export function requireMasterKey(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  requireAdmin(req as AdminRequest, res, next)
}
