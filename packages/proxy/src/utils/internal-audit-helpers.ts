import type { Request } from 'express'
import { internalAuditLogService } from '../services/internal-audit-log-service.js'

export interface InternalOutcomePayload {
  status: 'success' | 'failed'
  code: string
  message?: string
  resourceId?: string
  resourceDetails?: any
  actionDurationMs?: number
}

export async function logInternalOutcome(req: Request, outcome: InternalOutcomePayload): Promise<void> {
  const internal = (req as any).internalAudit
  if (!internal?.requestId) {
    return
  }

  try {
    await internalAuditLogService.updateOutcome({
      requestId: internal.requestId,
      outcomeStatus: outcome.status,
      outcomeCode: outcome.code,
      outcomeMessage: outcome.message,
      actionDurationMs: outcome.actionDurationMs,
      resourceId: outcome.resourceId ?? internal.resourceId ?? null,
      resourceDetails: outcome.resourceDetails
    })
  } catch (error: any) {
    console.error('[INTERNAL AUDIT] Failed to update outcome:', error?.message || error)
  }
}

