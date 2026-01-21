// Local schema store using SQLite

import { getDatabase } from '../../db/index.js'
import type { ISchemaStore, SchemaData } from '../interfaces.js'

// Type import for Cedar WASM
import type * as cedarType from '@cedar-policy/cedar-wasm'

// Cedar-WASM module (lazy loaded for schema conversion)
let cedar: typeof cedarType | null = null
let cedarLoadingPromise: Promise<typeof cedarType> | null = null

/**
 * Lazy load Cedar WASM module for schema conversion
 */
async function loadCedar(): Promise<typeof cedarType> {
  if (cedar) {
    return cedar
  }
  
  if (!cedarLoadingPromise) {
    cedarLoadingPromise = import('@cedar-policy/cedar-wasm/nodejs')
  }
  
  cedar = await cedarLoadingPromise
  return cedar
}

/**
 * Convert Cedar text schema to JSON format
 */
async function convertCedarTextToJson(cedarText: string): Promise<any> {
  try {
    const cedarModule = await loadCedar()
    const result = cedarModule.schemaToJson(cedarText)
    
    if (result.type === 'failure') {
      const errors = result.errors.map((e: any) => e.message || JSON.stringify(e)).join(', ')
      throw new Error(`Failed to convert Cedar text to JSON: ${errors}`)
    }
    
    return result.json
  } catch (error: any) {
    console.error('[SCHEMA STORE] Error converting Cedar text to JSON:', error)
    throw error
  }
}

/**
 * Convert JSON schema to Cedar text format
 */
async function convertJsonToCedarText(jsonSchema: any): Promise<string> {
  try {
    const cedarModule = await loadCedar()
    const result = cedarModule.schemaToText(jsonSchema)
    
    if (result.type === 'failure') {
      const errors = result.errors.map((e: any) => e.message || JSON.stringify(e)).join(', ')
      throw new Error(`Failed to convert JSON to Cedar text: ${errors}`)
    }
    
    return result.text
  } catch (error: any) {
    console.error('[SCHEMA STORE] Error converting JSON to Cedar text:', error)
    throw error
  }
}

/**
 * Detect if input is Cedar text format
 * Cedar text starts with keywords like "type", "entity", "action"
 */
function isCedarText(input: any): boolean {
  if (typeof input !== 'string') {
    return false
  }
  
  const trimmed = input.trim()
  // Cedar text typically starts with type, entity, or action declarations
  // More reliable check: starts with these keywords
  return /^\s*(type\s+\w+|entity\s+\w+|action\s+)/i.test(trimmed)
}

/**
 * Local schema store implementation
 */
export class LocalSchemaStore implements ISchemaStore {
  /**
   * Get current schema (always returns JSON format)
   * Converts Cedar text to JSON on retrieval
   * Database ALWAYS stores Cedar text, so we always convert it
   */
  async getSchema(): Promise<SchemaData> {
    const db = getDatabase()
    
    const row = db.prepare(`
      SELECT content, version 
      FROM schema_policy 
      WHERE obj_type = 'schema' AND status = 1
      ORDER BY updated_at DESC 
      LIMIT 1
    `).get() as any
    
    if (!row) {
      // Return default schema if none exists
      // Try async conversion, fallback to sync if needed
      try {
        return await this.getDefaultSchemaAsync()
      } catch (error) {
        console.error('[SCHEMA STORE] Failed to get default schema async, using fallback:', error)
        return this.getDefaultSchema()
      }
    }
    
    // Schema is ALWAYS stored as Cedar text (source of truth)
    // Convert to JSON on retrieval
    const schemaText = row.content
    
    // Always convert Cedar text to JSON (database always stores Cedar text)
    console.log('[SCHEMA STORE] Converting Cedar text schema to JSON on retrieval...')
    try {
      const schemaJson = await convertCedarTextToJson(schemaText)
      
      return {
        schema: schemaJson,
        version: row.version
      }
    } catch (error: any) {
      console.error('[SCHEMA STORE] Failed to convert Cedar text to JSON:', error)
      console.error('[SCHEMA STORE] Schema text preview:', schemaText.substring(0, 200))
      // If conversion fails, it might be legacy JSON format (shouldn't happen)
      try {
        const parsed = JSON.parse(schemaText)
        console.warn('[SCHEMA STORE] Retrieved JSON schema (legacy format)')
        return {
          schema: parsed,
          version: row.version
        }
      } catch (parseError) {
        console.error('[SCHEMA STORE] Failed to parse as JSON too:', parseError)
        throw new Error(`Failed to retrieve schema: ${error.message}`)
      }
    }
  }
  
  /**
   * Update schema
   * Accepts either JSON object or Cedar text string
   * Stores Cedar text in database (source of truth)
   * If JSON is provided, converts to Cedar text first
   */
  async updateSchema(schemaInput: SchemaData['schema'] | string): Promise<SchemaData> {
    const db = getDatabase()
    
    let schemaText: string
    let schemaJson: any
    
    if (typeof schemaInput === 'string') {
      // Input is Cedar text - store as-is (source of truth)
      schemaText = schemaInput
      
      // Validate by converting to JSON
      console.log('[SCHEMA STORE] Validating Cedar text schema...')
      schemaJson = await convertCedarTextToJson(schemaText)
      
      // Validate schema format using Cedar WASM
      const cedarModule = await loadCedar()
      const validationResult = cedarModule.checkParseSchema(schemaJson)
      
      if (validationResult.type === 'failure') {
        const errors = validationResult.errors.map((e: any) => e.message || JSON.stringify(e)).join(', ')
        throw new Error(`Invalid schema format: ${errors}`)
      }
    } else {
      // Input is JSON - convert to Cedar text for storage
      console.log('[SCHEMA STORE] Converting JSON schema to Cedar text for storage...')
      const cedarModule = await loadCedar()
      
      // Validate JSON schema first
      const validationResult = cedarModule.checkParseSchema(schemaInput as any)
      if (validationResult.type === 'failure') {
        const errors = validationResult.errors.map((e: any) => e.message || JSON.stringify(e)).join(', ')
        throw new Error(`Invalid schema format: ${errors}`)
      }
      
      // Convert JSON to Cedar text
      const textConversion = cedarModule.schemaToText(schemaInput as any)
      if (textConversion.type === 'failure') {
        const errors = textConversion.errors.map((e: any) => e.message || JSON.stringify(e)).join(', ')
        throw new Error(`Failed to convert JSON to Cedar text: ${errors}`)
      }
      
      schemaText = textConversion.text
      schemaJson = schemaInput
    }
    
    const version = `v${Date.now()}`
    
    // Check if schema exists (only one active schema allowed)
    const existing = db.prepare('SELECT id FROM schema_policy WHERE obj_type = \'schema\' AND status = 1 LIMIT 1').get() as any
    
    if (existing) {
      // Update existing - store Cedar text
      db.prepare(`
        UPDATE schema_policy 
        SET content = ?, version = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(schemaText, version, existing.id)
    } else {
      // Insert new - store Cedar text
      const schemaId = `schema-${Date.now()}`
      db.prepare(`
        INSERT INTO schema_policy (id, obj_type, content, version, status)
        VALUES (?, 'schema', ?, ?, 1)
      `).run(schemaId, schemaText, version)
    }
    
    console.log('[SCHEMA STORE] Schema updated successfully (stored as Cedar text)')
    
    return {
      schema: schemaJson,
      version
    }
  }
  
  /**
   * Get schema as Cedar text format (optional helper method)
   * Returns the stored Cedar text directly from database (source of truth)
   * Does NOT do round-trip conversion to avoid losing fields
   */
  async getSchemaAsCedarText(): Promise<string> {
    const db = getDatabase()
    
    const row = db.prepare(`
      SELECT content, version 
      FROM schema_policy 
      WHERE obj_type = 'schema' AND status = 1
      ORDER BY updated_at DESC 
      LIMIT 1
    `).get() as any
    
    if (!row) {
      // Return default schema if none exists
      const defaultSchema = await this.getDefaultSchemaAsync()
      // Convert default JSON back to Cedar text (for default schema only)
      return await convertJsonToCedarText(defaultSchema.schema)
    }
    
    // Return stored Cedar text directly (source of truth)
    // Database ALWAYS stores Cedar text, so just return it
    const schemaText = row.content
    
    // Since we always store Cedar text, just return it directly
    // Only check if it's actually Cedar text to be safe
    if (isCedarText(schemaText)) {
      return schemaText
    }
    
    // If somehow it's not Cedar text (shouldn't happen), try to handle it
    // But this is an error condition - we should always store Cedar text
    console.error('[SCHEMA STORE] ERROR: Stored schema is not Cedar text format!')
    console.error('[SCHEMA STORE] First 100 chars:', schemaText.substring(0, 100))
    throw new Error('Stored schema is not in Cedar text format. This should not happen.')
  }
  
  /**
   * Get default schema (converts Cedar text to JSON via Cedar WASM)
   */
  private async getDefaultSchemaAsync(): Promise<SchemaData> {
    // Cedar text schema
    const defaultCedarTextSchema = `
type RequestContext = {
  day_of_week: __cedar::String,
  hour: __cedar::Long,
  ip_address: __cedar::ipaddr,
  is_emergency: __cedar::Bool,
  model_name: __cedar::String,
  model_provider: __cedar::String,
  request_time: __cedar::String
};

entity Resource;

entity User = {
  user_id: __cedar::String,
  email: __cedar::String,
  department: __cedar::String,
  is_agent: __cedar::Bool,
  limit_requests_per_minute: __cedar::Long
};

entity UserKey = {
  current_daily_spend: __cedar::decimal,
  current_monthly_spend: __cedar::decimal,
  last_daily_reset: __cedar::String,
  last_monthly_reset: __cedar::String,
  status: __cedar::String,
  user: User
};

action "completion" appliesTo {
  principal: [UserKey],
  resource: [Resource],
  context: RequestContext
};

action "fine_tuning" appliesTo {
  principal: [UserKey],
  resource: [Resource],
  context: RequestContext
};

action "image_generation" appliesTo {
  principal: [UserKey],
  resource: [Resource],
  context: RequestContext
};

action "embedding" appliesTo {
  principal: [UserKey],
  resource: [Resource],
  context: RequestContext
};

action "moderation" appliesTo {
  principal: [UserKey],
  resource: [Resource],
  context: RequestContext
};
`
    
    // Convert Cedar text to JSON
    const cedarModule = await loadCedar()
    const schemaConversion = cedarModule.schemaToJson(defaultCedarTextSchema)
    
    if (schemaConversion.type === 'failure') {
      const errors = schemaConversion.errors.map((e: any) => e.message || JSON.stringify(e)).join(', ')
      console.error('[SCHEMA STORE] Failed to convert default Cedar text schema:', errors)
      throw new Error(`Failed to convert default Cedar text schema: ${errors}`)
    }
    
    return {
      schema: schemaConversion.json,
      version: 'v1.0.0'
    }
  }

  /**
   * Get default schema (synchronous fallback - returns empty schema if conversion fails)
   */
  private getDefaultSchema(): SchemaData {
    // For synchronous fallback, return empty schema
    // The async version will be used when possible
    console.warn('[SCHEMA STORE] Using fallback empty schema (async conversion not available)')
    return {
      schema: { '': {} },
      version: 'v1.0.0'
    }
  }
}

// Export singleton instance
export const localSchemaStore = new LocalSchemaStore()
