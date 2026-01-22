// Audit log service - logs all authorization requests

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
    search?: string // Generic search across multiple fields
    limit?: number
    offset?: number
    sortBy?: string | null
    sortOrder?: 'asc' | 'desc' | null
  }): Promise<{ data: any[]; total: number }> {
    // Build WHERE clause for both count and data queries
    let whereClause = 'WHERE 1=1'
    const args: any[] = []

    if (params.authId) {
      whereClause += ' AND auth_id = ?'
      args.push(params.authId)
    }
    if (params.apiKeyId) {
      whereClause += ' AND api_key_id = ?'
      args.push(params.apiKeyId)
    }
    if (params.provider) {
      whereClause += ' AND provider = ?'
      args.push(params.provider)
    }
    if (params.model) {
      whereClause += ' AND model = ?'
      args.push(params.model)
    }
    if (params.decision) {
      whereClause += ' AND decision = ?'
      args.push(params.decision)
    }
    if (params.startDate) {
      whereClause += ' AND request_timestamp >= ?'
      args.push(params.startDate)
    }
    if (params.endDate) {
      whereClause += ' AND request_timestamp <= ?'
      args.push(params.endDate)
    }
    // Generic search across auth_id, model, and request_id
    if (params.search) {
      const searchPattern = `%${params.search}%`
      whereClause += ' AND (auth_id LIKE ? OR model LIKE ? OR request_id LIKE ?)'
      args.push(searchPattern, searchPattern, searchPattern)
    }

    // Get total count
    const countSql = `SELECT COUNT(*) as total FROM audit_logs ${whereClause}`
    const countResult = this.db.prepare(countSql).get(...args) as { total: number }
    const total = countResult.total

    // Build ORDER BY clause
    let orderByClause = 'ORDER BY request_timestamp DESC' // Default sort
    if (params?.sortBy && params?.sortOrder) {
      // Map frontend column names to database column names
      // Frontend uses snake_case keys that match database columns
      const columnMap: Record<string, string> = {
        'request_timestamp': 'request_timestamp',
        'auth_id': 'auth_id',
        'provider': 'provider',
        'model': 'model',
        'decision': 'decision',
        'auth_duration_ms': 'auth_duration_ms',
        'request_id': 'request_id'
      }
      const dbColumn = columnMap[params.sortBy]
      if (dbColumn) {
        const order = params.sortOrder.toUpperCase()
        orderByClause = `ORDER BY ${dbColumn} ${order}`
      }
    }

    // Get paginated data (use provided limit, or default to 100 if not specified)
    const limit = params.limit || 100
    const offset = params.offset || 0
    const dataSql = `SELECT * FROM audit_logs ${whereClause} ${orderByClause} LIMIT ? OFFSET ?`
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

// Export singleton instance
export const auditLogService = new AuditLogService()
