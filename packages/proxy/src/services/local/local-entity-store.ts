// Local entity store using SQLite
// Uses new entities table with etype/eid composite key

import { getDatabase } from '../../db/index.js'
import type { IEntityStore } from '../interfaces.js'
import type { Entity } from '../interfaces.js'

/**
 * Local entity store implementation
 */
export class LocalEntityStore implements IEntityStore {
  /**
   * Get all entities (or filter by UID)
   * Supports optional search, limit, and offset for pagination
   */
  async getEntities(uid?: string, params?: {
    search?: string
    limit?: number
    offset?: number
    entityType?: string // Filter by entity type (e.g., 'UserKey')
    sortBy?: string | null
    sortOrder?: 'asc' | 'desc' | null
  }): Promise<{ data: Entity[]; total: number }> {
    const db = getDatabase()
    
    // Build WHERE clause
    let whereClause = 'WHERE 1=1'
    const args: any[] = []
    
    if (uid) {
      // Parse UID format: "User::\"userId\""
      const match = uid.match(/^(\w+)::"([^"]+)"$/)
      if (!match) {
        throw new Error(`Invalid UID format: ${uid}`)
      }
      const [, type, id] = match
      whereClause += ' AND etype = ? AND eid = ?'
      args.push(type, id)
    }
    
    if (params?.entityType) {
      whereClause += ' AND etype = ?'
      args.push(params.entityType)
    }
    
    // Get total count
    const countSql = `SELECT COUNT(*) as total FROM entities ${whereClause}`
    const countResult = db.prepare(countSql).get(...args) as { total: number }
    let total = countResult.total
    
    // Build ORDER BY clause
    let orderByClause = 'ORDER BY created_at DESC' // Default sort
    if (params?.sortBy && params?.sortOrder) {
      // Map frontend column names to database column names
      const columnMap: Record<string, string> = {
        'createdAt': 'created_at',
        'updatedAt': 'updated_at',
        'status': 'status'
      }
      const dbColumn = columnMap[params.sortBy]
      if (dbColumn) {
        const order = params.sortOrder.toUpperCase()
        orderByClause = `ORDER BY ${dbColumn} ${order}`
      }
    }
    
    // Get paginated data
    const limit = params?.limit || 100
    const offset = params?.offset || 0
    const dataSql = `SELECT ejson, status, created_at, updated_at FROM entities ${whereClause} ${orderByClause} LIMIT ? OFFSET ?`
    const rows = db.prepare(dataSql).all(...args, limit, offset) as any[]
    
    // Parse entities
    let entities = rows.map(row => {
      const entity = JSON.parse(row.ejson) as Entity
      return entity
    })
    
    // If search provided, filter by JSON fields
    // For UserKey entities, search across userId (from user reference), and we'll need to join with User entities
    if (params?.search && !uid) {
      const searchLower = params.search.toLowerCase()
      entities = entities.filter(entity => {
        // Search in entity attrs (varies by type)
        const attrs = entity.attrs as any
        
        // For UserKey: search userId from user reference
        if (entity.uid.type === 'UserKey' && attrs.user?.__entity?.id) {
          if (attrs.user.__entity.id.toLowerCase().includes(searchLower)) {
            return true
          }
        }
        
        // For User: search name, email, userId
        if (entity.uid.type === 'User') {
          if (
            (attrs.name && attrs.name.toLowerCase().includes(searchLower)) ||
            (attrs.email && attrs.email.toLowerCase().includes(searchLower)) ||
            (attrs.user_id && attrs.user_id.toLowerCase().includes(searchLower)) ||
            entity.uid.id.toLowerCase().includes(searchLower)
          ) {
            return true
          }
        }
        
        // Search in UID id
        if (entity.uid.id.toLowerCase().includes(searchLower)) {
          return true
        }
        
        return false
      })
      
      // Recalculate total based on filtered results
      // Note: limit and offset are passed separately, not in args array, so we can use args directly
      const allRows = db.prepare(`SELECT ejson FROM entities ${whereClause}`).all(...args) as any[]
      const allEntities = allRows.map(row => JSON.parse(row.ejson) as Entity)
      const filtered = allEntities.filter(entity => {
        const searchLower = params.search!.toLowerCase()
        const attrs = entity.attrs as any
        
        if (entity.uid.type === 'UserKey' && attrs.user?.__entity?.id) {
          if (attrs.user.__entity.id.toLowerCase().includes(searchLower)) return true
        }
        
        if (entity.uid.type === 'User') {
          if (
            (attrs.name && attrs.name.toLowerCase().includes(searchLower)) ||
            (attrs.email && attrs.email.toLowerCase().includes(searchLower)) ||
            (attrs.user_id && attrs.user_id.toLowerCase().includes(searchLower)) ||
            entity.uid.id.toLowerCase().includes(searchLower)
          ) {
            return true
          }
        }
        
        return entity.uid.id.toLowerCase().includes(searchLower)
      })
      total = filtered.length
      
      // If sorting is applied, re-sort the filtered results (for fields not in DB)
      if (params?.sortBy && params?.sortOrder) {
        const sortKey = params.sortBy
        entities.sort((a, b) => {
          let aVal: any
          let bVal: any
          
        // Handle different sort fields
        if (sortKey === 'userId') {
          // For UserKey: get userId from user reference
          if (a.uid.type === 'UserKey' && (a.attrs as any).user?.__entity?.id) {
            aVal = (a.attrs as any).user.__entity.id
          } else if (a.uid.type === 'User') {
            aVal = (a.attrs as any).user_id || a.uid.id
          } else {
            aVal = a.uid.id
          }
          
          if (b.uid.type === 'UserKey' && (b.attrs as any).user?.__entity?.id) {
            bVal = (b.attrs as any).user.__entity.id
          } else if (b.uid.type === 'User') {
            bVal = (b.attrs as any).user_id || b.uid.id
          } else {
            bVal = b.uid.id
          }
        } else if (sortKey === 'name' || sortKey === 'email') {
          // For User entities
          if (a.uid.type === 'User') {
            aVal = (a.attrs as any)[sortKey] || ''
          } else {
            aVal = ''
          }
          
          if (b.uid.type === 'User') {
            bVal = (b.attrs as any)[sortKey] || ''
          } else {
            bVal = ''
          }
        } else if (sortKey === 'currentDailySpend' || sortKey === 'currentMonthlySpend') {
          // For UserKey entities - extract decimal value
          const aAttrKey = sortKey === 'currentDailySpend' ? 'current_daily_spend' : 'current_monthly_spend'
          const bAttrKey = sortKey === 'currentDailySpend' ? 'current_daily_spend' : 'current_monthly_spend'
          const aAttr = (a.attrs as any)[aAttrKey]
          const bAttr = (b.attrs as any)[bAttrKey]
          // Extract decimal value from CedarDecimal format
          aVal = typeof aAttr === 'object' && aAttr?.__extn?.arg ? parseFloat(aAttr.__extn.arg) : (typeof aAttr === 'string' ? parseFloat(aAttr) : 0)
          bVal = typeof bAttr === 'object' && bAttr?.__extn?.arg ? parseFloat(bAttr.__extn.arg) : (typeof bAttr === 'string' ? parseFloat(bAttr) : 0)
        } else if (sortKey === 'status') {
          // For UserKey entities
          aVal = (a.attrs as any).status || 'active'
          bVal = (b.attrs as any).status || 'active'
        } else {
          // For other fields, try to get from attrs or uid
          aVal = (a.attrs as any)[sortKey] || a.uid.id
          bVal = (b.attrs as any)[sortKey] || b.uid.id
        }
          
          if (aVal === undefined || aVal === null) return 1
          if (bVal === undefined || bVal === null) return -1
          if (typeof aVal === 'string' && typeof bVal === 'string') {
            const comparison = aVal.toLowerCase().localeCompare(bVal.toLowerCase())
            return params.sortOrder === 'asc' ? comparison : -comparison
          }
          const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
          return params.sortOrder === 'asc' ? comparison : -comparison
        })
      }
    } else if (params?.sortBy && params?.sortOrder) {
      // Sort even when no search (for fields not in DB)
      const sortKey = params.sortBy
      entities.sort((a, b) => {
        let aVal: any
        let bVal: any
        
        if (sortKey === 'userId') {
          if (a.uid.type === 'UserKey' && (a.attrs as any).user?.__entity?.id) {
            aVal = (a.attrs as any).user.__entity.id
          } else if (a.uid.type === 'User') {
            aVal = (a.attrs as any).user_id || a.uid.id
          } else {
            aVal = a.uid.id
          }
          
          if (b.uid.type === 'UserKey' && (b.attrs as any).user?.__entity?.id) {
            bVal = (b.attrs as any).user.__entity.id
          } else if (b.uid.type === 'User') {
            bVal = (b.attrs as any).user_id || b.uid.id
          } else {
            bVal = b.uid.id
          }
        } else if (sortKey === 'name' || sortKey === 'email') {
          if (a.uid.type === 'User') {
            aVal = (a.attrs as any)[sortKey] || ''
          } else {
            aVal = ''
          }
          
          if (b.uid.type === 'User') {
            bVal = (b.attrs as any)[sortKey] || ''
          } else {
            bVal = ''
          }
        } else if (sortKey === 'currentDailySpend' || sortKey === 'currentMonthlySpend') {
          const aAttrKey = sortKey === 'currentDailySpend' ? 'current_daily_spend' : 'current_monthly_spend'
          const bAttrKey = sortKey === 'currentDailySpend' ? 'current_daily_spend' : 'current_monthly_spend'
          const aAttr = (a.attrs as any)[aAttrKey]
          const bAttr = (b.attrs as any)[bAttrKey]
          aVal = typeof aAttr === 'object' && aAttr?.__extn?.arg ? parseFloat(aAttr.__extn.arg) : (typeof aAttr === 'string' ? parseFloat(aAttr) : 0)
          bVal = typeof bAttr === 'object' && bAttr?.__extn?.arg ? parseFloat(bAttr.__extn.arg) : (typeof bAttr === 'string' ? parseFloat(bAttr) : 0)
        } else if (sortKey === 'status') {
          aVal = (a.attrs as any).status || 'active'
          bVal = (b.attrs as any).status || 'active'
        } else {
          aVal = (a.attrs as any)[sortKey] || a.uid.id
          bVal = (b.attrs as any)[sortKey] || b.uid.id
        }
        
        if (aVal === undefined || aVal === null) return 1
        if (bVal === undefined || bVal === null) return -1
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          const comparison = aVal.toLowerCase().localeCompare(bVal.toLowerCase())
          return params.sortOrder === 'asc' ? comparison : -comparison
        }
        const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
        return params.sortOrder === 'asc' ? comparison : -comparison
      })
    }
    
    return { data: entities, total }
  }
  
  /**
   * Create an entity
   */
  async createEntity(entity: Entity, status: number): Promise<void> {
    const db = getDatabase()
    
    const entityData = JSON.stringify(entity)
    const etype = entity.uid.type
    const eid = entity.uid.id
    
    try {
      db.prepare(`
        INSERT INTO entities (etype, eid, ejson, status)
        VALUES (?, ?, ?, ?)
      `).run(etype, eid, entityData, status)
    } catch (error: any) {
      if (error.message.includes('UNIQUE constraint')) {
        throw new Error('Entity already exists')
      }
      throw error
    }
  }
  
  /**
   * Update an entity (full entity body required, same as create)
   */
  async updateEntity(entity: Entity, status: number): Promise<void> {
    const db = getDatabase()
    
    const entityData = JSON.stringify(entity)
    const etype = entity.uid.type
    const eid = entity.uid.id
    
    const result = db.prepare(`
      UPDATE entities 
      SET ejson = ?, status = ?, updated_at = datetime('now')
      WHERE etype = ? AND eid = ?
    `).run(entityData, status, etype, eid)
    
    if (result.changes === 0) {
      throw new Error('Entity not found')
    }
  }
  
  /**
   * Delete an entity by UID name
   */
  async deleteEntity(entityName: string): Promise<void> {
    const db = getDatabase()
    
    // Parse UID format: "User::\"userId\""
    const match = entityName.match(/^(\w+)::"([^"]+)"$/)
    if (!match) {
      throw new Error(`Invalid entity name format: ${entityName}`)
    }
    const [, type, id] = match
    
    // Soft delete (set status to 0 = inactive)
    const result = db.prepare(`
      UPDATE entities 
      SET status = 0, updated_at = datetime('now')
      WHERE etype = ? AND eid = ?
    `).run(type, id)
    
    if (result.changes === 0) {
      throw new Error('Entity not found')
    }
  }
}

// Export singleton instance
export const localEntityStore = new LocalEntityStore()
