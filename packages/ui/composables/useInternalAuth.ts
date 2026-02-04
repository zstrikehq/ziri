import { useAdminAuthStore } from '~/stores/admin-auth'

export interface CheckActionRequest {
  action: string
  resourceType?: string
  context?: Record<string, any>
}

export interface CheckActionsRequest {
  actions: Array<{
    action: string
    resourceType?: string
  }>
}

export interface CheckActionResponse {
  allowed: boolean
  reason?: string
}

export interface CheckActionsResponse {
  results: Array<{
    action: string
    allowed: boolean
  }>
}

export const useInternalAuth = () => {
  const adminAuthStore = useAdminAuthStore()
  
  const checkAction = async (action: string, resourceType?: string, context?: Record<string, any>): Promise<CheckActionResponse> => {
    const token = adminAuthStore.accessToken
    if (!token) {
      return { allowed: false, reason: 'Not authenticated' }
    }
    
    try {
      const response = await $fetch<CheckActionResponse>('/api/authz/check', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: {
          action,
          resourceType,
          context
        }
      })
      
      return response
    } catch (error: any) {
      console.error('[INTERNAL AUTH] Check action error:', error)

      return { allowed: false, reason: error.message || 'Authorization check failed' }
    }
  }
  
  const checkActions = async (actions: Array<{ action: string; resourceType?: string }>): Promise<CheckActionsResponse> => {
    const token = adminAuthStore.accessToken
    if (!token) {
      return {
        results: actions.map(a => ({ action: a.action, allowed: false }))
      }
    }
    
    try {
      const response = await $fetch<CheckActionsResponse>('/api/authz/check-batch', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: {
          actions
        }
      })
      
      return response
    } catch (error: any) {
      console.error('[INTERNAL AUTH] Check actions error:', error)

      return {
        results: actions.map(a => ({ action: a.action, allowed: false }))
      }
    }
  }
  
  return {
    checkAction,
    checkActions
  }
}
