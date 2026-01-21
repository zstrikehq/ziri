// Database connection and initialization

import Database from 'better-sqlite3'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'
import { getConfigDir } from '@zs-ai/config'
import { ALL_SCHEMAS } from './schema.js'

const CONFIG_DIR = getConfigDir()
const DB_PATH = join(CONFIG_DIR, 'proxy.db')

let db: Database.Database | null = null

export function getDatabase(): Database.Database {
  if (db) {
    return db
  }

  // Ensure config directory exists
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true })
  }

  // Open database connection
  db = new Database(DB_PATH)

  // Enable foreign keys
  db.pragma('foreign_keys = ON')

  // Initialize schema (async but we'll await it)
  initializeSchema(db).catch((error) => {
    console.warn('[DB] Schema initialization error:', error.message)
  })

  console.log(`[DB] Database initialized at: ${DB_PATH}`)

  return db
}

async function initializeSchema(database: Database.Database): Promise<void> {
  console.log('[DB] Initializing database schema...')
  
  for (const schema of ALL_SCHEMAS) {
    database.exec(schema)
  }
  
  // Run migration for audit/cost tracking tables
  try {
    const { up: migrationUp } = await import('./migrations/003_audit_cost_tracking.js')
    migrationUp(database)
    console.log('[DB] Migration 003 applied: audit_cost_tracking')
  } catch (error: any) {
    // Migration might fail if tables already exist, that's okay
    if (!error.message?.includes('already exists') && !error.message?.includes('Cannot find module')) {
      console.warn('[DB] Migration 003 failed (may already be applied):', error.message)
    }
  }
  
  // Seed pricing data after migration
  try {
    const { seedPricing } = await import('./seed-pricing.js')
    seedPricing(database)
  } catch (error: any) {
    if (!error.message?.includes('Cannot find module')) {
      console.warn('[DB] Pricing seed failed:', error.message)
    }
  }
  
  console.log('[DB] Database schema initialized')
  
  // Admin user will be created in initializeAdminUser() function
  // No need to create placeholder here since we're using new schema
}

// Migrations removed - starting with fresh database schema

export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
    console.log('[DB] Database connection closed')
  }
}

/**
 * Initialize admin user with master key as password
 * This is called asynchronously on server startup
 * Uses new auth table schema
 */
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
  
  const adminEmail = 'admin@zs-ai.local'
  const adminId = 'admin'
  const masterKeyHash = await hashPassword(masterKey)
  
  // Check if admin user exists
  const adminUser = db.prepare('SELECT * FROM auth WHERE id = ?').get(adminId) as any
  
  // Encrypt email and generate hash
  const encryptedEmail = encrypt(adminEmail)
  const emailHash = hashEmail(adminEmail)
  
  if (!adminUser) {
    // Create admin user in auth table
    db.prepare(`
      INSERT INTO auth (id, email, email_hash, name, password, dept, is_agent, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      adminId,
      encryptedEmail,
      emailHash,
      'Administrator',
      masterKeyHash,
      null, // dept
      0, // is_agent (0 = user, 1 = agent)
      1 // status (1 = active)
    )
    console.log('[DB] ✅ Admin user created with master key as password')
  } else {
    // Always update password hash to match current master key (regenerated on restart)
    // Also update encrypted email in case encryption key changed
    db.prepare(`
      UPDATE auth 
      SET email = ?, email_hash = ?, password = ?, status = 1, updated_at = datetime('now')
      WHERE id = ?
    `).run(encryptedEmail, emailHash, masterKeyHash, adminId)
    console.log('[DB] ✅ Admin user password updated to match current master key')
  }
}

export { DB_PATH }
