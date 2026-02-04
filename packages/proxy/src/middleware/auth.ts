 

import type { Request, Response, NextFunction } from 'express'
import { verifyAccessToken } from '../utils/jwt.js'
import { getRootKey } from '../utils/root-key.js'
import { requireInternalAuthz } from './internal-authz.js'

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

      if (payload.role && payload.role !== 'user') {
        req.admin = {
          userId: payload.userId,
          email: payload.email || 'admin@ziri.local',
          role: payload.role,
          name: payload.name
        }

        requireInternalAuthz(req, res, next)
        return
      }
    } catch (error: any) {
    }
  }
  
 
  const rootKeyHeader = req.headers['x-root-key'] as string
  if (rootKeyHeader) {
    const expectedKey = getRootKey()
    if (expectedKey && rootKeyHeader === expectedKey) {
      req.admin = {
        userId: 'ziri',
        email: 'ziri@ziri.local',
        role: 'admin',
        name: 'Administrator'
      }

      requireInternalAuthz(req, res, next)
      return
    }
  }
  
  res.status(401).json({
    error: 'Admin authentication required. Please login.',
    code: 'ADMIN_AUTH_REQUIRED'
  })
}

export function requireRootKey(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  requireAdmin(req as AdminRequest, res, next)
}
