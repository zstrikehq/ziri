import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useAdminAuth } from './useAdminAuth'

export type EventType = 'audit_log_created' | 'cost_tracked' | 'batch_update' | 'internal_audit_log_created'

export interface RealtimeEvent {
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

export interface UseRealtimeUpdatesOptions {
  onAuditLogCreated?: (event: RealtimeEvent) => void
  onInternalAuditLogCreated?: (event: RealtimeEvent) => void
  onCostTracked?: (event: RealtimeEvent) => void
  onBatchUpdate?: (event: RealtimeEvent) => void
  debounceMs?: number
  pauseWhenHidden?: boolean
}

export function useRealtimeUpdates(options: UseRealtimeUpdatesOptions = {}) {
  const { getAuthHeader } = useAdminAuth()
  
  const isConnected = ref(false)
  const isPaused = ref(false)
  const error = ref<string | null>(null)
  
  let eventSource: EventSource | null = null
  let reconnectTimeout: NodeJS.Timeout | null = null
  let debounceTimeout: NodeJS.Timeout | null = null
  let pendingEvents: RealtimeEvent[] = []
  
  const debounceMs = options.debounceMs || 500
  const pauseWhenHidden = options.pauseWhenHidden !== false
  
   
  const processEvent = (event: RealtimeEvent) => {
    pendingEvents.push(event)
    
    if (debounceTimeout) {
      clearTimeout(debounceTimeout)
    }
    
    debounceTimeout = setTimeout(() => {
      const events = [...pendingEvents]
      pendingEvents = []
      
      for (const evt of events) {
        if (evt.type === 'audit_log_created' && options.onAuditLogCreated) {
          options.onAuditLogCreated(evt)
        } else if (evt.type === 'internal_audit_log_created' && options.onInternalAuditLogCreated) {
          options.onInternalAuditLogCreated(evt)
        } else if (evt.type === 'cost_tracked' && options.onCostTracked) {
          options.onCostTracked(evt)
        } else if (evt.type === 'batch_update' && options.onBatchUpdate) {
          options.onBatchUpdate(evt)
        } else if (evt.type === 'batch_update' && evt.data.events) {
          for (const batchEvt of evt.data.events) {
            if (batchEvt.type === 'audit_log_created' && options.onAuditLogCreated) {
              options.onAuditLogCreated({ type: batchEvt.type, data: batchEvt.data, timestamp: evt.timestamp })
            } else if (batchEvt.type === 'internal_audit_log_created' && options.onInternalAuditLogCreated) {
              options.onInternalAuditLogCreated({ type: batchEvt.type, data: batchEvt.data, timestamp: evt.timestamp })
            } else if (batchEvt.type === 'cost_tracked' && options.onCostTracked) {
              options.onCostTracked({ type: batchEvt.type, data: batchEvt.data, timestamp: evt.timestamp })
            }
          }
        }
      }
    }, debounceMs)
  }
  
  const connect = () => {
    if (eventSource) {
      return
    }
    
    const authHeader = getAuthHeader()
    if (!authHeader) {
      error.value = 'Not authenticated'
      return
    }
    
    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.replace('Bearer ', '')
      : authHeader
    
    const url = `/api/events?token=${encodeURIComponent(token)}`
    
    try {
      eventSource = new EventSource(url)
      
      eventSource.onopen = () => {
        isConnected.value = true
        error.value = null
      }
      
      eventSource.onmessage = (e) => {
        if (!e.data || e.data.trim().startsWith(':')) {
          return
        }
        
        try {
          const event: RealtimeEvent = JSON.parse(e.data)
          processEvent(event)
        } catch (err: any) {
          console.error('[REALTIME] Error parsing event:', err, 'Data:', e.data)
        }
      }
      
      eventSource.onerror = (err) => {
        const readyState = eventSource?.readyState
        
        if (readyState === EventSource.CLOSED) {
          isConnected.value = false
          
          if (eventSource) {
            eventSource.close()
            eventSource = null
          }
          
          if (reconnectTimeout) {
            clearTimeout(reconnectTimeout)
          }
          reconnectTimeout = setTimeout(() => {
            if (!isPaused.value) {
              connect()
            }
          }, 3000)
        } else if (readyState === EventSource.CONNECTING) {
 
        } else {
          isConnected.value = false
          
          if (reconnectTimeout) {
            clearTimeout(reconnectTimeout)
          }
          reconnectTimeout = setTimeout(() => {
            if (!isPaused.value && (!eventSource || eventSource.readyState !== EventSource.OPEN)) {
              if (eventSource) {
                eventSource.close()
                eventSource = null
              }
              connect()
            }
          }, 3000)
        }
      }
    } catch (err: any) {
      console.error('[REALTIME] Failed to create EventSource:', err)
      error.value = err.message || 'Failed to connect'
    }
  }
  
  const disconnect = () => {
    if (debounceTimeout) {
      clearTimeout(debounceTimeout)
      debounceTimeout = null
    }
    
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout)
      reconnectTimeout = null
    }
    
    if (eventSource) {
      eventSource.close()
      eventSource = null
    }
    
    isConnected.value = false
    pendingEvents = []
  }
  
  const pause = () => {
    if (isPaused.value) return
    isPaused.value = true
    disconnect()
  }
  
  const resume = () => {
    if (!isPaused.value) return
    isPaused.value = false
    connect()
  }
  
  if (pauseWhenHidden && typeof document !== 'undefined') {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        pause()
      } else {
        resume()
      }
    }
    
    onMounted(() => {
      document.addEventListener('visibilitychange', handleVisibilityChange)
    })
    
    onUnmounted(() => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    })
  }
  
  onMounted(() => {
    setTimeout(() => {
      if (!isPaused.value) {
        connect()
      }
    }, 100)
  })
  
  onUnmounted(() => {
    disconnect()
  })
  
  return {
    isConnected,
    isPaused,
    error,
    connect,
    disconnect,
    pause,
    resume
  }
}
