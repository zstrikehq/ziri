import { EventEmitter } from 'events'

export type EventType = 'audit_log_created' | 'cost_tracked' | 'batch_update' | 'internal_audit_log_created'

export interface EventData {
  type: EventType
  data: {
    auditLogId?: number
    requestId?: string
    internalAuditLogId?: number
    dashboardUserId?: string
    action?: string
    resourceType?: string
    resourceId?: string | null
    outcomeStatus?: string | null
    outcomeCode?: string | null
    costTrackingId?: number
    timestamp?: string
    decision?: 'permit' | 'forbid'
    provider?: string
    model?: string
    count?: number
    events?: Array<{ type: EventType; data: any }>
  }
  timestamp: string
}

export class EventEmitterService extends EventEmitter {
  private eventBuffer: EventData[] = []
  private batchInterval: NodeJS.Timeout | null = null
  private readonly BATCH_INTERVAL_MS = 2000
  private readonly MAX_BUFFER_SIZE = 1000

  constructor() {
    super()
    this.setMaxListeners(50)
    this.startBatching()
  }

  private startBatching(): void {
    if (this.batchInterval) {
      return
    }

    this.batchInterval = setInterval(() => {
      this.flushBuffer()
    }, this.BATCH_INTERVAL_MS)
  }

  private stopBatching(): void {
    if (this.batchInterval) {
      clearInterval(this.batchInterval)
      this.batchInterval = null
    }
  }

  emitEvent(type: EventType, data: EventData['data']): void {
    const event: EventData = {
      type,
      data: {
        ...data,
        timestamp: data.timestamp || new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    }

    this.eventBuffer.push(event)

    if (this.eventBuffer.length > this.MAX_BUFFER_SIZE) {
      console.warn(`[EVENT_EMITTER] Buffer overflow, dropping oldest events. Current size: ${this.eventBuffer.length}`)
      this.eventBuffer = this.eventBuffer.slice(-this.MAX_BUFFER_SIZE)
    }

    if (this.eventBuffer.length >= 100) {
      this.flushBuffer()
    }
  }

  private flushBuffer(): void {
    if (this.eventBuffer.length === 0) {
      return
    }

    const listenerCount = this.listenerCount('event')

    if (listenerCount === 0) {
      return
    }

    const events = [...this.eventBuffer]
    this.eventBuffer = []

    if (events.length === 1) {
      this.emit('event', events[0])
    } else {
      const batchEvent: EventData = {
        type: 'batch_update',
        data: {
          count: events.length,
          events: events.map(e => ({ type: e.type, data: e.data }))
        },
        timestamp: new Date().toISOString()
      }
      this.emit('event', batchEvent)
    }
  }

  flush(): void {
    this.flushBuffer()
  }
  
  getBufferSize(): number {
    return this.eventBuffer.length
  }

  destroy(): void {
    this.flushBuffer()
    this.stopBatching()
    this.removeAllListeners()
  }
}

export const eventEmitterService = new EventEmitterService()
