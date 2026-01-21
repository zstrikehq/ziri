// Seed default Cedar data (schema and policies)

import { getDatabase } from './index.js'
import { localSchemaStore } from '../services/local/local-schema-store.js'
import { localPolicyStore } from '../services/local/local-policy-store.js'
import type * as cedarType from '@cedar-policy/cedar-wasm/nodejs'

// Cedar text schema (will be converted to JSON)
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

/**
 * Check if stored schema is in Cedar text format
 */
function isCedarTextFormat(schemaData: string): boolean {
  // Cedar text typically contains keywords like "entity", "action", "type", etc.
  return /^\s*(type\s+\w+|entity\s+\w+|action\s+)/m.test(schemaData.trim())
}

/**
 * Seed default schema if schema table is empty or needs migration
 */
export async function seedDefaultSchema(): Promise<void> {
  const db = getDatabase()
  
  const existing = db.prepare('SELECT id, content FROM schema_policy WHERE obj_type = \'schema\' AND status = 1 LIMIT 1').get() as any
  
  if (existing) {
    // Check if schema is already in Cedar text format
    const isCedarText = isCedarTextFormat(existing.content)
    
    if (isCedarText) {
      console.log('[SEED] Schema already exists in Cedar text format, skipping seed')
      return
    } else {
      // Schema exists but is in old JSON format - migrate to Cedar text
      console.log('[SEED] Schema exists in old JSON format, migrating to Cedar text...')
      console.log('[SEED] Converting existing JSON schema to Cedar text...')
      
      try {
        // Parse the JSON schema
        const jsonSchema = JSON.parse(existing.schema_data)
        
        // Convert JSON to Cedar text
        const cedar = await import('@cedar-policy/cedar-wasm/nodejs')
        const textConversion = cedar.schemaToText(jsonSchema as any)
        
        if (textConversion.type === 'failure') {
          const errors = textConversion.errors.map((e: any) => e.message || JSON.stringify(e)).join(', ')
          console.error(`[SEED] Failed to convert JSON to Cedar text: ${errors}`)
          console.log('[SEED] Replacing with default Cedar text schema...')
          // Fall through to use default schema
        } else {
          // Update with converted Cedar text
          const version = `v${Date.now()}`
          db.prepare(`
            UPDATE schema_policy 
            SET content = ?, version = ?, updated_at = datetime('now')
            WHERE id = ?
          `).run(textConversion.text, version, existing.id)
          console.log('[SEED] ✅ Schema migrated to Cedar text format')
          return
        }
      } catch (error: any) {
        console.error(`[SEED] Error migrating schema: ${error.message}`)
        console.log('[SEED] Replacing with default Cedar text schema...')
        // Fall through to use default schema
      }
    }
  }
  
  console.log('[SEED] Seeding default schema...')
  
  // Store Cedar text schema directly (source of truth)
  // Conversion to JSON will happen on retrieval (matching test file pattern)
  console.log('[SEED] Storing Cedar text schema (will convert to JSON on retrieval)...')
  
  await localSchemaStore.updateSchema(defaultCedarTextSchema)
  console.log('[SEED] ✅ Default Cedar text schema seeded')
}

/**
 * Seed default policy if policies table is empty
 */
export async function seedDefaultPolicy(): Promise<void> {
  const db = getDatabase()
  
  const existing = db.prepare('SELECT id FROM schema_policy WHERE obj_type = \'policy\' AND status = 1 LIMIT 1').get() as any
  
  if (existing) {
    console.log('[SEED] Policies already exist, skipping seed')
    return
  }
  
  console.log('[SEED] Seeding default policy...')
  
  // Default policy: Permit completion when user status is active
  const defaultPolicy = 'permit(principal, action, resource) when { principal.status == "active" };'
  const description = 'Default policy: Allow completion when user status is active'
  
  await localPolicyStore.createPolicy(defaultPolicy, description)
  console.log('[SEED] Default policy seeded')
}

/**
 * Seed all default data
 */
export async function seedDefaults(): Promise<void> {
  await seedDefaultSchema()
  await seedDefaultPolicy()
}
