// Error handling middleware

import type { Request, Response, NextFunction } from 'express'

export interface ApiError extends Error {
  statusCode?: number
  code?: string
}

export function errorHandler(
  error: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const statusCode = error.statusCode || 500
  const message = error.message || 'Internal server error'
  
  console.error(`[ERROR] ${req.method} ${req.path}:`, {
    statusCode,
    message,
    code: error.code,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
  })
  
  res.status(statusCode).json({
    error: message,
    code: error.code,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  })
}

export function notFoundHandler(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  res.status(404).json({
    error: `Route not found: ${req.method} ${req.path}`
  })
}
