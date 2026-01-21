// Cost tracking service - tracks LLM request costs and updates UserKey spend

import type Database from 'better-sqlite3'
import { getDatabase } from '../db/index.js'
import { pricingService } from './pricing-service.js'
import { spendUpdateService } from './spend-update-service.js'

interface CostTrackingEntry {
  requestId: string
  executionKey: string
  auditLogId?: number
  provider: string
  providerRequestId?: string
  modelRequested: string
  modelUsed?: string
  inputTokens: number
  outputTokens: number
  totalTokens: number
  cachedTokens?: number
  requestTimestamp: string
  responseTimestamp?: string
  latencyMs?: number
  status?: string
  errorCode?: string
  errorMessage?: string
}

export class CostTrackingService {
  private db: Database.Database
  private pricingService: typeof pricingService
  private spendUpdateService: typeof spendUpdateService

  constructor(
    db?: Database.Database,
    pricingServiceInstance?: typeof pricingService,
    spendUpdateServiceInstance?: typeof spendUpdateService
  ) {
    this.db = db || getDatabase()
    this.pricingService = pricingServiceInstance || pricingService
    this.spendUpdateService = spendUpdateServiceInstance || spendUpdateService
  }

  async trackCost(entry: CostTrackingEntry): Promise<number> {
    // Calculate cost
    const costCalc = await this.pricingService.calculateCost(
      entry.provider,
      entry.modelUsed || entry.modelRequested,
      entry.inputTokens,
      entry.outputTokens,
      entry.cachedTokens || 0
    )

    // Insert into cost_tracking table
    const stmt = this.db.prepare(`
      INSERT INTO cost_tracking (
        request_id, execution_key, audit_log_id,
        provider, provider_request_id,
        model_requested, model_used,
        input_tokens, output_tokens, total_tokens, cached_tokens,
        input_cost, output_cost, cache_savings, total_cost,
        pricing_id, pricing_source, input_rate_used, output_rate_used,
        request_timestamp, response_timestamp, latency_ms,
        status, error_code, error_message
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const result = stmt.run(
      entry.requestId,
      entry.executionKey,
      entry.auditLogId || null,
      entry.provider,
      entry.providerRequestId || null,
      entry.modelRequested,
      entry.modelUsed || null,
      entry.inputTokens,
      entry.outputTokens,
      entry.totalTokens,
      entry.cachedTokens || 0,
      costCalc.inputCost,
      costCalc.outputCost,
      costCalc.cacheSavings,
      costCalc.totalCost,
      costCalc.pricingId || null,
      costCalc.pricingSource,
      costCalc.inputRateUsed,
      costCalc.outputRateUsed,
      entry.requestTimestamp,
      entry.responseTimestamp || null,
      entry.latencyMs || null,
      entry.status || 'completed',
      entry.errorCode || null,
      entry.errorMessage || null
    )

    // Update UserKey entity spend
    // Get the UserKey ID from the entities table by looking up via the key
    // The executionKey is the user_agent_keys.id, we need to find the UserKey entity
    const keyRecord = this.db.prepare(
      'SELECT auth_id FROM user_agent_keys WHERE id = ?'
    ).get(entry.executionKey) as { auth_id: string } | undefined

    if (keyRecord) {
      // Use keyService to find UserKey entity ID
      const { getUserKeyIdForUser } = await import('./key-service.js')
      const userKeyId = await getUserKeyIdForUser(keyRecord.auth_id)
      
      if (userKeyId) {
        await this.spendUpdateService.addSpend(userKeyId, costCalc.totalCost)
      }
    }

    return result.lastInsertRowid as number
  }

  async getCostSummary(query: {
    executionKey?: string
    provider?: string
    model?: string
    startDate?: string
    endDate?: string
    groupBy?: 'day' | 'week' | 'month' | 'provider' | 'model' | 'user'
  }): Promise<object[]> {
    let sql = `
      SELECT 
        COUNT(*) as request_count,
        SUM(input_tokens) as total_input_tokens,
        SUM(output_tokens) as total_output_tokens,
        SUM(total_cost) as total_cost,
        AVG(total_cost) as avg_cost_per_request
    `

    const args: any[] = []
    let whereClause = '1=1'

    if (query.executionKey) {
      whereClause += ' AND execution_key = ?'
      args.push(query.executionKey)
    }
    if (query.provider) {
      whereClause += ' AND provider = ?'
      args.push(query.provider)
    }
    if (query.model) {
      whereClause += ' AND model_used = ?'
      args.push(query.model)
    }
    if (query.startDate) {
      whereClause += ' AND request_timestamp >= ?'
      args.push(query.startDate)
    }
    if (query.endDate) {
      whereClause += ' AND request_timestamp <= ?'
      args.push(query.endDate)
    }

    let groupByClause = ''
    if (query.groupBy === 'day') {
      sql += `, date(request_timestamp) as period`
      groupByClause = 'GROUP BY date(request_timestamp)'
    } else if (query.groupBy === 'provider') {
      sql += `, provider`
      groupByClause = 'GROUP BY provider'
    } else if (query.groupBy === 'model') {
      sql += `, model_used`
      groupByClause = 'GROUP BY model_used'
    }

    sql += ` FROM cost_tracking WHERE ${whereClause} ${groupByClause}`

    return this.db.prepare(sql).all(...args) as object[]
  }
}

// Export singleton instance
export const costTrackingService = new CostTrackingService()
