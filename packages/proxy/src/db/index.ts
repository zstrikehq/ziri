import Database from 'better-sqlite3'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'
import { getConfigDir } from '../config/index.js'
import { ALL_SCHEMAS } from './schema.js'

const CONFIG_DIR = getConfigDir()
const DB_PATH = join(CONFIG_DIR, 'proxy.db')

let db: Database.Database | null = null
let schemaInitPromise: Promise<void> | null = null

export function getDatabase(): Database.Database {
  if (db) {
    return db
  }

  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true })
  }

  db = new Database(DB_PATH)

  db.pragma('foreign_keys = ON')

  schemaInitPromise = initializeSchema(db).catch((error) => {
    console.error('[DB] ❌ Schema initialization failed:', error.message)
    console.error('[DB] Stack:', error.stack)
    throw error
  })

  console.log(`[DB] Database initialized at: ${DB_PATH}`)

  return db
}

export async function ensureSchemaInitialized(): Promise<void> {
  if (!schemaInitPromise) {
    getDatabase()
  }
  if (schemaInitPromise) {
    await schemaInitPromise
  }
}

async function initializeSchema(database: Database.Database): Promise<void> {
  console.log('[DB] Initializing database schema...')
  
  try {
    const { up: migrationUp } = await import('./migrations/003_audit_cost_tracking.js')
    migrationUp(database)
    console.log('[DB] ✅ Migration 003 applied: audit_cost_tracking')
  } catch (error: any) {
    if (error.message?.includes('already exists')) {
      console.log('[DB] Migration 003: tables already exist, skipping')
    } else if (error.message?.includes('Cannot find module')) {
      console.warn('[DB] Migration 003: module not found')
    } else {
      console.error('[DB] Migration 003 failed:', error.message)
      throw error
    }
  }

  try {
    const { up: migrationUp } = await import('./migrations/004_rate_limiting.js')
    migrationUp(database)
    console.log('[DB] ✅ Migration 004 applied: rate_limiting')
  } catch (error: any) {
    if (error.message?.includes('already exists')) {
      console.log('[DB] Migration 004: tables already exist, skipping')
    } else if (error.message?.includes('Cannot find module')) {
      console.error('[DB] Migration 004: module not found - this is required!')
      throw error
    } else {
      console.error('[DB] Migration 004 failed:', error.message)
      throw error
    }
  }
  
  try {
    const { up: migrationUp } = await import('./migrations/005_model_actions_and_image_pricing.js')
    migrationUp(database)
    console.log('[DB] ✅ Migration 005 applied: model_actions_and_image_pricing')
  } catch (error: any) {
    if (error.message?.includes('duplicate column name') || error.message?.includes('already exists')) {
      console.log('[DB] Migration 005: schema already updated, skipping')
    } else if (error.message?.includes('Cannot find module')) {
      console.error('[DB] Migration 005: module not found - this is required!')
      throw error
    } else {
      console.error('[DB] Migration 005 failed:', error.message)
      throw error
    }
  }
  
  const schemasToApply = ALL_SCHEMAS.filter(schema => !schema.includes('CREATE TABLE IF NOT EXISTS audit_logs'))
  
  for (const schema of schemasToApply) {
    try {
      database.exec(schema)
    } catch (error: any) {
      if (!error.message?.includes('already exists')) {
        console.warn('[DB] Schema execution warning:', error.message)
      }
    }
  }
  
  try {
    const { seedPricing } = await import('./seed-pricing.js')
    seedPricing(database)
  } catch (error: any) {
    if (!error.message?.includes('Cannot find module')) {
      console.warn('[DB] Pricing seed failed:', error.message)
    }
  }
  
  console.log('[DB] ✅ Database schema initialized')
}

export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
    console.log('[DB] Database connection closed')
  }
}

export async function initializeAdminUser(): Promise<void> {
  const db = getDatabase()
  const { getMasterKey } = await import('../utils/master-key.js')
  const { hashPassword } = await import('../utils/password.js')
  const { encrypt, hash: hashEmail } = await import('../utils/encryption.js')
  
  const masterKey = getMasterKey()
  if (!masterKey) {
    console.warn('[DB] Master key not found, skipping admin user initialization')
    return
  }
  
  const adminEmail = 'admin@ziri.local'
  const adminId = 'admin'
  const masterKeyHash = await hashPassword(masterKey)
  
  const adminUser = db.prepare('SELECT * FROM auth WHERE id = ?').get(adminId) as any
  
  const encryptedEmail = encrypt(adminEmail)
  const emailHash = hashEmail(adminEmail)
  
  if (!adminUser) {
    db.prepare(`
      INSERT INTO auth (id, email, email_hash, name, password, dept, is_agent, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      adminId,
      encryptedEmail,
      emailHash,
      'Administrator',
      masterKeyHash,
      null,
      0,
      1
    )
    console.log('[DB] ✅ Admin user created with master key as password')
  } else {
    db.prepare(`
      UPDATE auth 
      SET email = ?, email_hash = ?, password = ?, status = 1, updated_at = datetime('now')
      WHERE id = ?
    `).run(encryptedEmail, emailHash, masterKeyHash, adminId)
    console.log('[DB] ✅ Admin user password updated to match current master key')
  }
}

export { DB_PATH }
