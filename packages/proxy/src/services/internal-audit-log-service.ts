import { randomBytes } from 'crypto'
import { createHash } from 'crypto'
import type Database from 'better-sqlite3'
import { getDatabase } from '../db/index.js'
import { eventEmitterService } from './event-emitter-service.js'

export interface InternalAuditLogAuthEntry {
  requestId: string
  dashboardUserId: string
  dashboardUserRole?: string
  action: string
  resourceType: string
  resourceId?: string | null
  decision: 'permit' | 'forbid'
  decisionReason?: string
  requestMethod: string
  requestPath: string
  requestIp?: string
  userAgent?: string
  requestBodyHash?: string
  authDurationMs?: number
  requestTimestamp: string
  outcomeStatus?: 'denied_before_action'
}

export interface InternalAuditLogOutcomeUpdate {
  requestId: string
  outcomeStatus: 'success' | 'failed' | 'denied_before_action'
  outcomeCode?: string
  outcomeMessage?: string
  actionDurationMs?: number
  resourceId?: string | null
  resourceDetails?: any
}

export interface InternalAuditLogQueryParams {
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

export class InternalAuditLogService {
  private db: Database.Database

  constructor(db?: Database.Database) {
    this.db = db || getDatabase()
  }

  generateRequestId(): string {
    const timestamp = Date.now().toString(36)
    const random = randomBytes(8).toString('hex')
    return `internal_req_${timestamp}_${random}`
  }

  hashRequestBody(body: any): string {
    if (body == null) return ''
    const bodyString = typeof body === 'string' ? body : JSON.stringify(body)
    return createHash('sha256').update(bodyString).digest('hex')
  }

  async logAuthDecision(entry: InternalAuditLogAuthEntry): Promise<number> {


    const stmt = this.db.prepare(`
      INSERT INTO internal_audit_logs (
        request_id,
        dashboard_user_id,
        dashboard_user_role,
        action,
        resource_type,
        resource_id,
        resource_details,
        decision,
        decision_reason,
        request_method,
        request_path,
        request_ip,
        user_agent,
        request_body_hash,
        auth_duration_ms,
        request_timestamp,
        outcome_status,
        outcome_code,
        outcome_message,
        action_duration_ms,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, datetime('now'))
    `)

    const result = stmt.run(
      entry.requestId,                    // 1. request_id
      entry.dashboardUserId,               // 2. dashboard_user_id
      entry.dashboardUserRole || null,     // 3. dashboard_user_role
      entry.action,                        // 4. action
      entry.resourceType,                  // 5. resource_type
      entry.resourceId || null,            // 6. resource_id
      null,                                // 7. resource_details
      entry.decision,                      // 8. decision
      entry.decisionReason || null,        // 9. decision_reason
      entry.requestMethod,                 // 10. request_method
      entry.requestPath,                   // 11. request_path
      entry.requestIp || null,            // 12. request_ip
      entry.userAgent || null,             // 13. user_agent
      entry.requestBodyHash || null,       // 14. request_body_hash
      entry.authDurationMs || null,        // 15. auth_duration_ms
      entry.requestTimestamp,              // 16. request_timestamp
      entry.outcomeStatus || null          // 17. outcome_status




    )

    const id = result.lastInsertRowid as number


    eventEmitterService.emitEvent('internal_audit_log_created', {
      internalAuditLogId: id,
      requestId: entry.requestId,
      dashboardUserId: entry.dashboardUserId,
      action: entry.action,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId ?? null,
      outcomeStatus: entry.outcomeStatus || null,
      outcomeCode: null,
      decision: entry.decision
    })

    return id
  }

  async updateOutcome(update: InternalAuditLogOutcomeUpdate): Promise<void> {
    const stmt = this.db.prepare(`
      UPDATE internal_audit_logs
      SET
        outcome_status = COALESCE(?, outcome_status),
        outcome_code = ?,
        outcome_message = ?,
        action_duration_ms = ?,
        resource_id = COALESCE(?, resource_id),
        resource_details = ?
      WHERE request_id = ?
    `)

    const resourceDetailsJson =
      update.resourceDetails !== undefined ? JSON.stringify(update.resourceDetails) : null

    stmt.run(
      update.outcomeStatus,
      update.outcomeCode || null,
      update.outcomeMessage || null,
      update.actionDurationMs || null,
      update.resourceId || null,
      resourceDetailsJson,
      update.requestId
    )


    eventEmitterService.emitEvent('internal_audit_log_created', {
      requestId: update.requestId,
      outcomeStatus: update.outcomeStatus,
      outcomeCode: update.outcomeCode || null
    })
  }

  async query(params: InternalAuditLogQueryParams): Promise<{ data: any[]; total: number }> {
    let whereClause = 'WHERE 1=1'
    const args: any[] = []

    if (params.userId) {
      whereClause += ' AND internal_audit_logs.dashboard_user_id = ?'
      args.push(params.userId)
    }

    if (params.decision) {
      whereClause += ' AND internal_audit_logs.decision = ?'
      args.push(params.decision)
    }

    if (params.outcomeStatus) {
      whereClause += ' AND internal_audit_logs.outcome_status = ?'
      args.push(params.outcomeStatus)
    }

    if (params.action) {
      whereClause += ' AND internal_audit_logs.action = ?'
      args.push(params.action)
    }

    if (params.resourceType) {
      whereClause += ' AND internal_audit_logs.resource_type = ?'
      args.push(params.resourceType)
    }

    if (params.from) {
      whereClause += ' AND internal_audit_logs.request_timestamp >= ?'
      args.push(params.from)
    }

    if (params.to) {
      whereClause += ' AND internal_audit_logs.request_timestamp <= ?'
      args.push(params.to)
    }

    if (params.search) {
      const searchPattern = `%${params.search}%`
      whereClause +=
        ' AND (internal_audit_logs.dashboard_user_id LIKE ? OR internal_audit_logs.action LIKE ? OR internal_audit_logs.resource_type LIKE ? OR internal_audit_logs.resource_id LIKE ? OR internal_audit_logs.request_id LIKE ?)'
      args.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern)
    }

    const countSql = `SELECT COUNT(*) as total FROM internal_audit_logs ${whereClause}`
    const countResult = this.db.prepare(countSql).get(...args) as { total: number }
    const total = countResult.total

    let orderByClause = 'ORDER BY internal_audit_logs.request_timestamp DESC'
    if (params.sortBy && params.sortOrder) {
      const columnMap: Record<string, string> = {
        request_timestamp: 'internal_audit_logs.request_timestamp',
        dashboard_user_id: 'internal_audit_logs.dashboard_user_id',
        action: 'internal_audit_logs.action',
        resource_type: 'internal_audit_logs.resource_type',
        resource_id: 'internal_audit_logs.resource_id',
        decision: 'internal_audit_logs.decision',
        outcome_status: 'internal_audit_logs.outcome_status',
        outcome_code: 'internal_audit_logs.outcome_code',
        auth_duration_ms: 'internal_audit_logs.auth_duration_ms',
        action_duration_ms: 'internal_audit_logs.action_duration_ms',
        request_id: 'internal_audit_logs.request_id'
      }
      const dbColumn = columnMap[params.sortBy]
      if (dbColumn) {
        const order = params.sortOrder.toUpperCase()
        orderByClause = `ORDER BY ${dbColumn} ${order}`
      }
    }

    const limit = params.limit || 50
    const offset = params.offset || 0

    const dataSql = `
      SELECT internal_audit_logs.*
      FROM internal_audit_logs
      ${whereClause}
      ${orderByClause}
      LIMIT ? OFFSET ?
    `

    const data = this.db.prepare(dataSql).all(...args, limit, offset) as any[]

    return { data, total }
  }
}

export const internalAuditLogService = new InternalAuditLogService()

