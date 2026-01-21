// Spend update service - updates UserKey entity spend values after successful requests

import type Database from 'better-sqlite3'
import { getDatabase } from '../db/index.js'

interface CedarDecimalValue {
  __extn: {
    fn: 'decimal'
    arg: string
  }
}

interface UserKeyEntity {
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
  parents: any[]
}

export class SpendUpdateService {
  private db: Database.Database

  constructor(db?: Database.Database) {
    this.db = db || getDatabase()
  }

  /**
   * Update the UserKey entity's spend values after a successful request.
   * 
   * @param userKeyId - The UserKey entity ID (e.g., "uk-c07c98871ecfe27f")
   * @param cost - The calculated cost in USD
   */
  async addSpend(userKeyId: string, cost: number): Promise<void> {
    // Fetch current entity
    const stmt = this.db.prepare(`
      SELECT ejson FROM entities 
      WHERE etype = 'UserKey' AND eid = ?
    `)
    const row = stmt.get(userKeyId) as { ejson: string } | undefined

    if (!row) {
      throw new Error(`UserKey entity not found: ${userKeyId}`)
    }

    const entity: UserKeyEntity = JSON.parse(row.ejson)

    // Parse current spend values - handle both CedarDecimalValue and string formats
    const parseDecimal = (value: CedarDecimalValue | string | undefined): number => {
      if (!value) return 0
      if (typeof value === 'string') return parseFloat(value) || 0
      if (value.__extn && value.__extn.arg) return parseFloat(value.__extn.arg) || 0
      return 0
    }
    
    const currentDailySpend = parseDecimal(entity.attrs.current_daily_spend)
    const currentMonthlySpend = parseDecimal(entity.attrs.current_monthly_spend)

    // Add cost to both
    const newDailySpend = currentDailySpend + cost
    const newMonthlySpend = currentMonthlySpend + cost

    // Update with 4 decimal places
    entity.attrs.current_daily_spend = this.createDecimalValue(newDailySpend.toFixed(4))
    entity.attrs.current_monthly_spend = this.createDecimalValue(newMonthlySpend.toFixed(4))

    // Save back to database
    const updateStmt = this.db.prepare(`
      UPDATE entities 
      SET ejson = ?, updated_at = datetime('now')
      WHERE etype = 'UserKey' AND eid = ?
    `)

    updateStmt.run(JSON.stringify(entity), userKeyId)
  }

  private createDecimalValue(value: string): CedarDecimalValue {
    return {
      __extn: {
        fn: 'decimal',
        arg: value,
      },
    }
  }
}

// Export singleton instance
export const spendUpdateService = new SpendUpdateService()
