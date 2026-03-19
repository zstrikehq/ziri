import Database from 'better-sqlite3'
import { dirname, join } from 'path'
import { existsSync, mkdirSync, readdirSync, readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { getConfigDir } from '../config/index.js'

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
    console.error('schema initialization failed:', error.message)
    throw error
  })

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
  runSqlMigrations(database)

  try {
    const { seedPricing } = await import('./seed-pricing.js')
    seedPricing(database)
  } catch (error: any) {
    if (!error.message?.includes('Cannot find module')) {
      console.warn('pricing seed failed:', error.message)
    }
  }
}

function runSqlMigrations(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), 'migrations')
  const files = readdirSync(migrationsDir)
    .filter((f) => /^\d+_.*\.sql$/i.test(f))
    .sort((a, b) => a.localeCompare(b))

  const applied = new Set(
    (database.prepare('SELECT id FROM schema_migrations').all() as Array<{ id: string }>).map((r) => r.id)
  )

  for (const file of files) {
    if (applied.has(file)) continue
    const fullPath = join(migrationsDir, file)
    const sql = readFileSync(fullPath, 'utf8')
    execSqlBatch(database, sql, file)
    database.prepare('INSERT INTO schema_migrations (id) VALUES (?)').run(file)
  }
}

function execSqlBatch(database: Database.Database, sql: string, migrationId: string): void {
  const parts = sql
    .split(/;\s*(?:\r?\n|$)/g)
    .map((s) => s.trim())
    .filter(Boolean)

  for (const stmt of parts) {
    try {
      database.exec(`${stmt};`)
    } catch (error: any) {
      const msg = String(error?.message || '')
      if (isIgnorableMigrationError(msg)) continue
      console.error(`migration ${migrationId} failed:`, msg)
      throw error
    }
  }
}

function isIgnorableMigrationError(msg: string): boolean {
  const m = msg.toLowerCase()
  if (m.includes('already exists')) return true
  if (m.includes('duplicate column name')) return true
  return false
}

export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
  }
}

export async function initializeAdminUser(): Promise<void> {
  const db = getDatabase()
  const { getRootKey } = await import('../utils/root-key.js')
  const { hashPassword } = await import('../utils/password.js')
  const { encrypt, hash: hashEmail } = await import('../utils/encryption.js')

  const rootKey = getRootKey()
  if (!rootKey) {
    console.error('root key not found, skipping admin user initialization')
    return
  }

  const adminEmail = 'ziri@ziri.local'
  const adminId = 'ziri'
  const rootKeyHash = await hashPassword(rootKey)
  
  const adminUser = db.prepare('SELECT * FROM auth WHERE id = ?').get(adminId) as any
  
  const encryptedEmail = encrypt(adminEmail)
  const emailHash = hashEmail(adminEmail)
  
  if (!adminUser) {
    db.prepare(`
      INSERT INTO auth (id, email, email_hash, name, password, tenant, is_agent, status, role)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      adminId,
      encryptedEmail,
      emailHash,
      'Administrator',
      rootKeyHash,
      'default',
      0,
      1,
      'admin'
    )
  } else {
    db.prepare(`
      UPDATE auth 
      SET email = ?, email_hash = ?, password = ?, status = 1, role = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(encryptedEmail, emailHash, rootKeyHash, 'admin', adminId)
  }
}

export async function initializeInternalAuth(): Promise<void> {
  const db = getDatabase()
  const { internalSchemaStore } = await import('../services/internal/internal-schema-store.js')
  const { internalPolicyStore } = await import('../services/internal/internal-policy-store.js')
  const { internalEntityStore } = await import('../services/internal/internal-entity-store.js')
  const { internalCedarTextSchema } = await import('../authorization/internal/internal-schema.js')
  const { internalPolicies } = await import('../authorization/internal/internal-policies.js')
  

  const schemaCheck = await internalSchemaStore.shouldUpdateSchema()
  if (schemaCheck.shouldUpdate) {
    await internalSchemaStore.updateSchema(schemaCheck.fileSchema)
  }

  const policyCheck = await internalPolicyStore.shouldUpdatePolicies()
  if (policyCheck.shouldUpdate) {
    await internalPolicyStore.updatePolicies(policyCheck.filePolicies)
  }

  const ziriEntity = await internalEntityStore.getEntity('ziri')
  if (!ziriEntity) {
    const ziriUser = db.prepare('SELECT * FROM auth WHERE id = ?').get('ziri') as any
    if (ziriUser) {
      const { decrypt } = await import('../utils/encryption.js')
      let email = 'ziri@ziri.local'
      try {
        email = decrypt(ziriUser.email)
      } catch {
        email = ziriUser.email || 'ziri@ziri.local'
      }
      
      const entity = {
        uid: {
          type: 'DashboardUser',
          id: 'ziri'
        },
        attrs: {
          user_id: 'ziri',
          role: 'admin',
          status: 'active',
          email: email,
          name: ziriUser.name || 'Administrator'
        },
        parents: []
      }
      
      await internalEntityStore.createEntity(entity)
    }
  } else {

    const ziriUser = db.prepare('SELECT * FROM auth WHERE id = ?').get('ziri') as any
    if (ziriUser) {
      const { decrypt } = await import('../utils/encryption.js')
      let email = 'ziri@ziri.local'
      try {
        email = decrypt(ziriUser.email)
      } catch {
        email = ziriUser.email || 'ziri@ziri.local'
      }
      
      const updates: any = {}
      if (ziriEntity.attrs.email !== email) {
        updates.email = email
      }
      if (ziriEntity.attrs.name !== (ziriUser.name || 'Administrator')) {
        updates.name = ziriUser.name || 'Administrator'
      }
      if (ziriEntity.attrs.role !== (ziriUser.role || 'admin')) {
        updates.role = ziriUser.role || 'admin'
      }
      
      if (Object.keys(updates).length > 0) {
        await internalEntityStore.updateEntity('ziri', updates)
      }
    }
  }
}

export { DB_PATH }
