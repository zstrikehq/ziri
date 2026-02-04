import { getDatabase } from '../../db/index.js'
import { internalCedarTextSchema } from '../../authorization/internal/internal-schema.js'
import type * as cedarType from '@cedar-policy/cedar-wasm'

let cedar: typeof cedarType | null = null
let cedarLoadingPromise: Promise<typeof cedarType> | null = null

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
    console.error('[INTERNAL SCHEMA STORE] Error converting Cedar text to JSON:', error)
    throw error
  }
}

export interface InternalSchemaData {
  schema: any
  version?: string
}

export interface IInternalSchemaStore {
  getSchema(): Promise<InternalSchemaData>
  updateSchema(schema: string): Promise<void>
  shouldUpdateSchema(): Promise<{ shouldUpdate: boolean; fileSchema: string; dbSchema: string | null }>
}

export class InternalSchemaStore implements IInternalSchemaStore {
  async getSchema(): Promise<InternalSchemaData> {
    const db = getDatabase()
    
    const row = db.prepare(`
      SELECT content, version 
      FROM internal_schema_policy 
      WHERE obj_type = 'schema' AND status = 1
      ORDER BY updated_at DESC 
      LIMIT 1
    `).get() as any
    
    if (!row) {

      const schemaJson = await convertCedarTextToJson(internalCedarTextSchema)
      return {
        schema: schemaJson,
        version: undefined
      }
    }
    
    const schemaText = row.content
    
    try {
      const schemaJson = await convertCedarTextToJson(schemaText)
      return {
        schema: schemaJson,
        version: row.version
      }
    } catch (error: any) {
      console.error('[INTERNAL SCHEMA STORE] Failed to convert Cedar text to JSON:', error)

      const schemaJson = await convertCedarTextToJson(internalCedarTextSchema)
      return {
        schema: schemaJson,
        version: undefined
      }
    }
  }
  
  async updateSchema(schema: string): Promise<void> {
    const db = getDatabase()
    const { randomBytes } = await import('crypto')


    const existing = db.prepare(`
      SELECT id 
      FROM internal_schema_policy 
      WHERE obj_type = 'schema'
      LIMIT 1
    `).get() as { id: string } | undefined

    if (existing?.id) {

      db.prepare(`
        UPDATE internal_schema_policy
        SET content = ?, description = ?, status = 1, updated_at = datetime('now')
        WHERE id = ?
      `).run(schema, 'Internal authorization schema', existing.id)
    } else {

      const schemaId = `internal-schema-${randomBytes(8).toString('hex')}`
      db.prepare(`
        INSERT INTO internal_schema_policy (id, obj_type, content, description, status)
        VALUES (?, 'schema', ?, ?, 1)
      `).run(schemaId, schema, 'Internal authorization schema')
    }
  }
  
  async shouldUpdateSchema(): Promise<{ shouldUpdate: boolean; fileSchema: string; dbSchema: string | null }> {
    const db = getDatabase()
    
    const row = db.prepare(`
      SELECT content 
      FROM internal_schema_policy 
      WHERE obj_type = 'schema' AND status = 1
      ORDER BY updated_at DESC 
      LIMIT 1
    `).get() as any
    
    const fileSchema = internalCedarTextSchema.trim()
    const dbSchema = row?.content?.trim() || null
    
    return {
      shouldUpdate: dbSchema !== fileSchema,
      fileSchema,
      dbSchema
    }
  }
}

export const internalSchemaStore = new InternalSchemaStore()
