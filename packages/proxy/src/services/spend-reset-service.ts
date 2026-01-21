// Spend reset service - checks and resets daily/monthly spend before Cedar authorization

import type Database from 'better-sqlite3'
import { getDatabase } from '../db/index.js'
import type { Entity } from '../types/entity.js'

interface CedarDecimalValue {
  __extn: {
    fn: 'decimal'
    arg: string
  }
}

type UserKeyEntity = Entity & {
  uid: {
    type: 'UserKey'
    id: string
  }
  attrs: {
    current_daily_spend: CedarDecimalValue | string
    current_monthly_spend: CedarDecimalValue | string
    last_daily_reset: string
    last_monthly_reset: string
    status: string
    user: {
      __entity: {
        type: 'User'
        id: string
      }
    }
    [key: string]: any
  }
}

interface SpendResetResult {
  dailyReset: boolean
  monthlyReset: boolean
  updatedEntity: UserKeyEntity | null
}

export class SpendResetService {
  private db: Database.Database

  constructor(db?: Database.Database) {
    this.db = db || getDatabase()
  }

  /**
   * Check if spend needs to be reset and perform reset if necessary.
   * This should be called BEFORE Cedar authorization.
   */
  async checkAndResetSpend(userKeyEntity: UserKeyEntity): Promise<SpendResetResult> {
    const now = new Date()
    const result: SpendResetResult = {
      dailyReset: false,
      monthlyReset: false,
      updatedEntity: null,
    }

    // Handle date parsing - ensure we have valid dates
    const lastDailyResetStr = userKeyEntity.attrs.last_daily_reset || new Date().toISOString()
    const lastMonthlyResetStr = userKeyEntity.attrs.last_monthly_reset || new Date().toISOString()
    const lastDailyReset = new Date(lastDailyResetStr)
    const lastMonthlyReset = new Date(lastMonthlyResetStr)

    // Check daily reset: has midnight (UTC) passed since last reset?
    const needsDailyReset = this.hasMidnightPassed(lastDailyReset, now)

    // Check monthly reset: has month boundary passed since last reset?
    const needsMonthlyReset = this.hasMonthBoundaryPassed(lastMonthlyReset, now)

    if (needsDailyReset || needsMonthlyReset) {
      const updatedAttrs = { ...userKeyEntity.attrs }
      const currentTimestamp = now.toISOString()

      if (needsDailyReset) {
        updatedAttrs.current_daily_spend = this.createDecimalValue('0.0000')
        updatedAttrs.last_daily_reset = currentTimestamp
        result.dailyReset = true
      }

      if (needsMonthlyReset) {
        updatedAttrs.current_monthly_spend = this.createDecimalValue('0.0000')
        updatedAttrs.last_monthly_reset = currentTimestamp
        result.monthlyReset = true
      }

      // Update entity in database
      const updatedEntity = {
        ...userKeyEntity,
        attrs: updatedAttrs,
      }

      await this.updateEntityInDatabase(updatedEntity)
      result.updatedEntity = updatedEntity
    }

    return result
  }

  /**
   * Check if midnight (UTC) has passed between two dates.
   */
  private hasMidnightPassed(lastReset: Date, now: Date): boolean {
    // Get the date portion only (in UTC)
    const lastResetDate = new Date(Date.UTC(
      lastReset.getUTCFullYear(),
      lastReset.getUTCMonth(),
      lastReset.getUTCDate()
    ))
    
    const nowDate = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate()
    ))

    // If now's date is greater than last reset's date, midnight has passed
    return nowDate.getTime() > lastResetDate.getTime()
  }

  /**
   * Check if month boundary has passed between two dates.
   */
  private hasMonthBoundaryPassed(lastReset: Date, now: Date): boolean {
    const lastResetYear = lastReset.getUTCFullYear()
    const lastResetMonth = lastReset.getUTCMonth()
    
    const nowYear = now.getUTCFullYear()
    const nowMonth = now.getUTCMonth()

    // If year is greater, or same year but month is greater
    if (nowYear > lastResetYear) {
      return true
    }
    if (nowYear === lastResetYear && nowMonth > lastResetMonth) {
      return true
    }
    return false
  }

  /**
   * Create Cedar decimal extension format with 4 decimal places.
   */
  private createDecimalValue(value: string): CedarDecimalValue {
    return {
      __extn: {
        fn: 'decimal',
        arg: value,
      },
    }
  }

  /**
   * Update the UserKey entity in the entities table.
   */
  private async updateEntityInDatabase(entity: UserKeyEntity): Promise<void> {
    const stmt = this.db.prepare(`
      UPDATE entities 
      SET ejson = ?, updated_at = datetime('now')
      WHERE etype = 'UserKey' AND eid = ?
    `)

    stmt.run(JSON.stringify(entity), entity.uid.id)
  }
}

// Export singleton instance
export const spendResetService = new SpendResetService()
