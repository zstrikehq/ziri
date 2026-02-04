import { Router, type Request, type Response } from 'express'
import { verifyAccessToken } from '../utils/jwt.js'
import { eventEmitterService, type EventData } from '../services/event-emitter-service.js'

const router: Router = Router()

function authenticateSSE(
  req: Request,
  res: Response,
  next: () => void
): void {
  const authHeader = req.headers.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    try {
      const payload = verifyAccessToken(token)

      if (payload.role && payload.role !== 'user') {
        (req as any).admin = {
          userId: payload.userId,
          email: payload.email,
          role: payload.role,
          name: payload.name
        }
        next()
        return
      }
    } catch (error) {

    }
  }

  const token = req.query.token as string
  if (token) {
    try {
      const payload = verifyAccessToken(token)

      if (payload.role && payload.role !== 'user') {
        (req as any).admin = {
          userId: payload.userId,
          email: payload.email,
          role: payload.role,
          name: payload.name
        }
        next()
        return
      }
    } catch (error) {

    }
  }

  res.status(401).json({
    error: 'Dashboard authentication required',
    code: 'DASHBOARD_AUTH_REQUIRED'
  })
}

router.get('/', authenticateSSE, (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')

  res.write(`: SSE connection established\n\n`)

  const sendEvent = (event: EventData) => {
    try {
      const data = JSON.stringify(event)
      res.write(`data: ${data}\n\n`)
    } catch (error) {
      console.error('[EVENTS] Error sending event:', error)
    }
  }

  eventEmitterService.on('event', sendEvent)
  
  eventEmitterService.flush()

  const heartbeatInterval = setInterval(() => {
    try {
      res.write(`: heartbeat\n\n`)
    } catch (error) {
      clearInterval(heartbeatInterval)
      eventEmitterService.removeListener('event', sendEvent)
    }
  }, 30000)

  req.on('close', () => {
    clearInterval(heartbeatInterval)
    eventEmitterService.removeListener('event', sendEvent)
  })
})

export default router
