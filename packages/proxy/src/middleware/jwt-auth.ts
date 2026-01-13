// JWT authentication middleware

import type { Request, Response, NextFunction } from 'express'
import { verifyAccessToken } from '../utils/jwt.js'

export interface AuthenticatedRequest extends Request {
  userId?: string
  user?: {
    userId: string
    email?: string
    role?: string
    name?: string
  }
}

/**
 * Middleware to require JWT authentication
 */
export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'Authorization token required',
      code: 'TOKEN_REQUIRED'
    })
    return
  }
  
  const token = authHeader.substring(7) // Remove 'Bearer ' prefix
  
  try {
    const payload = verifyAccessToken(token)
    req.userId = payload.userId
    req.user = payload
    next()
  } catch (error: any) {
    if (error.message === 'Token expired') {
      res.status(401).json({
        error: 'Token expired. Please refresh your token.',
        code: 'TOKEN_EXPIRED'
      })
      return
    }
    
    res.status(401).json({
      error: 'Invalid token. Please login again.',
      code: 'INVALID_TOKEN'
    })
  }
}
