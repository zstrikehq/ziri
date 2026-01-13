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

  // Initialize schema
  initializeSchema(db)

  console.log(`[DB] Database initialized at: ${DB_PATH}`)

  return db
}

function initializeSchema(database: Database.Database): void {
  console.log('[DB] Initializing database schema...')
  
  for (const schema of ALL_SCHEMAS) {
    database.exec(schema)
  }
  
  // Run migrations for existing databases
  runMigrations(database)
  
  // Create admin user if it doesn't exist (for foreign key constraints)
  // Admin login uses master key, not password from users table
  const adminUser = database.prepare('SELECT * FROM users WHERE user_id = ?').get('admin') as any
  if (!adminUser) {
    // Create admin user with dummy password hash (admin login uses master key, not this)
    const dummyHash = '$2b$10$dummy.hash.for.admin.user.not.used.for.auth'
    database.prepare(`
      INSERT INTO users (user_id, email, name, password_hash, role, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('admin', 'admin@zs-ai.local', 'Administrator', dummyHash, 'admin', 'active')
    console.log('[DB] Admin user created for foreign key constraints')
  }
  
  console.log('[DB] Database schema initialized')
}

/**
 * Run database migrations for existing databases
 */
function runMigrations(database: Database.Database): void {
  try {
    // Check if refresh_tokens table exists
    const tableInfo = database.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='refresh_tokens'
    `).get() as any
    
    if (tableInfo) {
      // Get current columns
      const columns = database.prepare(`PRAGMA table_info(refresh_tokens)`).all() as any[]
      const columnNames = columns.map(col => col.name.toLowerCase())
      
      // Migration 1: Add used_at, absolute_expires_at, device_id columns
      if (!columnNames.includes('used_at')) {
        console.log('[DB] Migration: Adding used_at column to refresh_tokens')
        database.prepare(`ALTER TABLE refresh_tokens ADD COLUMN used_at DATETIME DEFAULT NULL`).run()
      }
      
      if (!columnNames.includes('absolute_expires_at')) {
        console.log('[DB] Migration: Adding absolute_expires_at column to refresh_tokens')
        database.prepare(`ALTER TABLE refresh_tokens ADD COLUMN absolute_expires_at DATETIME`).run()
      }
      
      if (!columnNames.includes('device_id')) {
        console.log('[DB] Migration: Adding device_id column to refresh_tokens')
        database.prepare(`ALTER TABLE refresh_tokens ADD COLUMN device_id TEXT`).run()
      }
      
      // Set absolute_expires_at for existing tokens that don't have it
      // Use expires_at + 23 days (to make it 30 days total from creation)
      database.prepare(`
        UPDATE refresh_tokens 
        SET absolute_expires_at = datetime(expires_at, '+23 days')
        WHERE absolute_expires_at IS NULL
      `).run()
    }
  } catch (error: any) {
    console.warn('[DB] Migration error (non-fatal):', error.message)
  }
}

export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
    console.log('[DB] Database connection closed')
  }
}

export { DB_PATH }
