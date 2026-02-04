import { useUnifiedAuth } from '~/composables/useUnifiedAuth'

export interface InternalAuditLog {
  id: number
  request_id: string
  dashboard_user_id: string
  dashboard_user_role: string | null
  action: string
  resource_type: string
  resource_id: string | null
  resource_details: any | null
  decision: 'permit' | 'forbid'
  decision_reason: string | null
  request_method: string
  request_path: string
  request_ip: string | null
  user_agent: string | null
  request_body_hash: string | null
  auth_duration_ms: number | null
  request_timestamp: string
  outcome_status: string | null
  outcome_code: string | null
  outcome_message: string | null
  action_duration_ms: number | null
}

export interface ListInternalAuditLogsParams {
  search?: string
  decision?: 'permit' | 'forbid'
  outcomeStatus?: 'success' | 'failed' | 'denied_before_action'
  userId?: string
  action?: string
  resourceType?: string
  from?: string
  to?: string
  limit?: number
  offset?: number
  sortBy?: string | null
  sortOrder?: 'asc' | 'desc' | null
}

export function useInternalAuditLogs() {
  const { getAuthHeader } = useUnifiedAuth()

  const listInternalAuditLogs = async (params: ListInternalAuditLogsParams) => {
    const authHeader = getAuthHeader()
    if (!authHeader) {
      throw new Error('Not authenticated')
    }

    const searchParams = new URLSearchParams()
    if (params.search) searchParams.set('search', params.search)
    if (params.decision) searchParams.set('decision', params.decision)
    if (params.outcomeStatus) searchParams.set('outcomeStatus', params.outcomeStatus)
    if (params.userId) searchParams.set('userId', params.userId)
    if (params.action) searchParams.set('action', params.action)
    if (params.resourceType) searchParams.set('resourceType', params.resourceType)
    if (params.from) searchParams.set('from', params.from)
    if (params.to) searchParams.set('to', params.to)
    if (params.limit != null) searchParams.set('limit', String(params.limit))
    if (params.offset != null) searchParams.set('offset', String(params.offset))
    if (params.sortBy) searchParams.set('sortBy', params.sortBy)
    if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder)

    const response = await fetch(`/api/internal-audit-logs?${searchParams.toString()}`, {
      headers: {
        Authorization: authHeader
      }
    })

    if (!response.ok) {
      throw new Error('Failed to load internal audit logs')
    }

    const data = await response.json()
    return {
      items: (data.items || []) as InternalAuditLog[],
      total: (data.total ?? 0) as number
    }
  }

  return {
    listInternalAuditLogs
  }
}

