 

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

export function requireAdmin(
  req: AdminRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    try {
      const payload = verifyAccessToken(token)
      if (payload.role === 'admin') {
        req.admin = {
          userId: payload.userId,
          email: payload.email || 'admin@ziri.local',
          role: payload.role || 'admin',
          name: payload.name
        }
        next()
        return
      }
    } catch (error: any) {
    }
  }
  
 
  const masterKey = req.headers['x-master-key'] as string
  if (masterKey) {
    const expectedKey = getMasterKey()
    if (expectedKey && masterKey === expectedKey) {
      req.admin = {
        userId: 'admin',
        email: 'admin@ziri.local',
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

export function requireMasterKey(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  requireAdmin(req as AdminRequest, res, next)
}
