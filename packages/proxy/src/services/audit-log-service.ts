import { randomBytes } from 'crypto'
import { createHash } from 'crypto'
import type Database from 'better-sqlite3'
import { getDatabase } from '../db/index.js'

interface AuditLogEntry {
  requestId: string
  principal: string
  principalType: string
  authId?: string
  apiKeyId?: string
  action: string
  resource: string
  provider?: string
  model?: string
  decision: 'permit' | 'forbid'
  decisionReason?: string
  policiesEvaluated?: string[]
  determiningPolicies?: string[]
  requestIp?: string
  userAgent?: string
  requestMethod?: string
  requestPath?: string
  requestBodyHash?: string
  cedarContext?: object
  entitySnapshot?: object
  requestTimestamp: string
  authStartTime?: string
  authEndTime?: string
  authDurationMs?: number
}

export class AuditLogService {
  private db: Database.Database

  constructor(db?: Database.Database) {
    this.db = db || getDatabase()
  }

  generateRequestId(): string {
    const timestamp = Date.now().toString(36)
    const random = randomBytes(8).toString('hex')
    return `req_${timestamp}_${random}`
  }

  hashRequestBody(body: any): string {
    const bodyString = typeof body === 'string' ? body : JSON.stringify(body)
    return createHash('sha256').update(bodyString).digest('hex')
  }

  async log(entry: AuditLogEntry): Promise<number> {
    const stmt = this.db.prepare(`
      INSERT INTO audit_logs (
        request_id, principal, principal_type, auth_id, api_key_id,
        action, resource, provider, model,
        decision, decision_reason, policies_evaluated, determining_policies,
        request_ip, user_agent, request_method, request_path, request_body_hash,
        cedar_context, entity_snapshot,
        request_timestamp, auth_start_time, auth_end_time, auth_duration_ms
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const result = stmt.run(
      entry.requestId,
      entry.principal,
      entry.principalType,
      entry.authId || null,
      entry.apiKeyId || null,
      entry.action,
      entry.resource,
      entry.provider || null,
      entry.model || null,
      entry.decision,
      entry.decisionReason || null,
      entry.policiesEvaluated ? JSON.stringify(entry.policiesEvaluated) : null,
      entry.determiningPolicies ? JSON.stringify(entry.determiningPolicies) : null,
      entry.requestIp || null,
      entry.userAgent || null,
      entry.requestMethod || null,
      entry.requestPath || null,
      entry.requestBodyHash || null,
      entry.cedarContext ? JSON.stringify(entry.cedarContext) : null,
      entry.entitySnapshot ? JSON.stringify(entry.entitySnapshot) : null,
      entry.requestTimestamp,
      entry.authStartTime || null,
      entry.authEndTime || null,
      entry.authDurationMs || null
    )

    return result.lastInsertRowid as number
  }

  async updateWithProviderResponse(
    requestId: string,
    providerRequestId: string,
    costTrackingId: number
  ): Promise<void> {
    const stmt = this.db.prepare(`
      UPDATE audit_logs 
      SET provider_request_id = ?, cost_tracking_id = ?
      WHERE request_id = ?
    `)
    stmt.run(providerRequestId, costTrackingId, requestId)
  }

  async query(params: {
    authId?: string
    apiKeyId?: string
    provider?: string
    model?: string
    decision?: 'permit' | 'forbid'
    startDate?: string
    endDate?: string
    search?: string
    limit?: number
    offset?: number
    sortBy?: string | null
    sortOrder?: 'asc' | 'desc' | null
  }): Promise<{ data: any[]; total: number }> {
    let whereClause = 'WHERE 1=1'
    const args: any[] = []

    if (params.authId) {
      whereClause += ' AND audit_logs.auth_id = ?'
      args.push(params.authId)
    }
    if (params.apiKeyId) {
      whereClause += ' AND audit_logs.api_key_id = ?'
      args.push(params.apiKeyId)
    }
    if (params.provider) {
      whereClause += ' AND audit_logs.provider = ?'
      args.push(params.provider)
    }
    if (params.model) {
      whereClause += ' AND audit_logs.model = ?'
      args.push(params.model)
    }
    if (params.decision) {
      whereClause += ' AND audit_logs.decision = ?'
      args.push(params.decision)
    }
    if (params.startDate) {
      whereClause += ' AND audit_logs.request_timestamp >= ?'
      args.push(params.startDate)
    }
    if (params.endDate) {
      whereClause += ' AND audit_logs.request_timestamp <= ?'
      args.push(params.endDate)
    }
    if (params.search) {
      const searchPattern = `%${params.search}%`
      whereClause += ' AND (audit_logs.auth_id LIKE ? OR audit_logs.model LIKE ? OR audit_logs.request_id LIKE ?)'
      args.push(searchPattern, searchPattern, searchPattern)
    }

    const countSql = `SELECT COUNT(*) as total FROM audit_logs ${whereClause}`
    const countResult = this.db.prepare(countSql).get(...args) as { total: number }
    const total = countResult.total

 
    let orderByClause = 'ORDER BY request_timestamp DESC'
    if (params?.sortBy && params?.sortOrder) {
 
 
      const columnMap: Record<string, string> = {
        'request_timestamp': 'audit_logs.request_timestamp',
        'auth_id': 'audit_logs.auth_id',
        'provider': 'audit_logs.provider',
        'model': 'audit_logs.model',
        'decision': 'audit_logs.decision',
        'auth_duration_ms': 'audit_logs.auth_duration_ms',
        'request_id': 'audit_logs.request_id',
        'spend': 'COALESCE(cost_tracking.total_cost, 0)'
      }
      const dbColumn = columnMap[params.sortBy]
      if (dbColumn) {
        const order = params.sortOrder.toUpperCase()
        orderByClause = `ORDER BY ${dbColumn} ${order}`
      }
    }

    const limit = params.limit || 100
    const offset = params.offset || 0
    const dataSql = `SELECT audit_logs.*, COALESCE(cost_tracking.total_cost, 0) AS spend FROM audit_logs LEFT JOIN cost_tracking ON audit_logs.cost_tracking_id = cost_tracking.id ${whereClause} ${orderByClause} LIMIT ? OFFSET ?`
    const data = this.db.prepare(dataSql).all(...args, limit, offset) as any[]

    return { data, total }
  }

  async getStatistics(startDate?: string, endDate?: string): Promise<object> {
    let whereClause = '1=1'
    const args: any[] = []

    if (startDate) {
      whereClause += ' AND request_timestamp >= ?'
      args.push(startDate)
    }
    if (endDate) {
      whereClause += ' AND request_timestamp <= ?'
      args.push(endDate)
    }

    const stats = this.db.prepare(`
      SELECT 
        COUNT(*) as total_requests,
        SUM(CASE WHEN decision = 'permit' THEN 1 ELSE 0 END) as permit_count,
        SUM(CASE WHEN decision = 'forbid' THEN 1 ELSE 0 END) as forbid_count,
        AVG(auth_duration_ms) as avg_auth_duration_ms,
        provider,
        model
      FROM audit_logs
      WHERE ${whereClause}
      GROUP BY provider, model
    `).all(...args)

    return stats
  }
}

export const auditLogService = new AuditLogService()
