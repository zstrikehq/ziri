import type Database from 'better-sqlite3'

export function up(db: Database.Database): void {

  const cols = db.prepare('PRAGMA table_info(auth)').all() as { name: string }[]
  const hasRole = cols.some(c => c.name === 'role')
  const isFirstRun = !hasRole
  
  if (!hasRole) {
    db.exec('ALTER TABLE auth ADD COLUMN role TEXT')
    console.log('[MIGRATION 007] Added role column to auth table')
  }
  


  const ziriUser = db.prepare('SELECT * FROM auth WHERE id = ?').get('ziri') as any
  if (ziriUser) {


    if (isFirstRun || !ziriUser.role) {
      db.prepare('UPDATE auth SET role = ? WHERE id = ?').run('admin', 'ziri')
      console.log('[MIGRATION 007] Set role = admin for ziri user')
    }
  }
  


  if (hasRole) {
    if (isFirstRun) {

      const nullRoleCount = db.prepare('UPDATE auth SET role = NULL WHERE id != ?').run('ziri').changes
      if (nullRoleCount > 0) {
        console.log(`[MIGRATION 007] Set role = NULL for ${nullRoleCount} access users`)
      }
    } else {

      try {
        const nullRoleCount = db.prepare('UPDATE auth SET role = NULL WHERE id != ? AND (role IS NULL OR role = "")').run('ziri').changes
        if (nullRoleCount > 0) {
          console.log(`[MIGRATION 007] Set role = NULL for ${nullRoleCount} access users (preserving existing dashboard user roles)`)
        }
      } catch (error: any) {

        console.warn('[MIGRATION 007] Could not update access user roles:', error.message)
      }
    }
  }
  

  db.exec(`
    CREATE TABLE IF NOT EXISTS internal_entities (
      etype TEXT NOT NULL,
      eid TEXT NOT NULL,
      ejson TEXT NOT NULL,
      status INTEGER NOT NULL DEFAULT 1 CHECK (status IN (0, 1, 2)),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (etype, eid)
    )
  `)
  
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_internal_entities_status ON internal_entities(status)
  `)
  
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_internal_entities_etype ON internal_entities(etype)
  `)
  
  console.log('[MIGRATION 007] Created internal_entities table')
  

  db.exec(`
    CREATE TABLE IF NOT EXISTS internal_schema_policy (
      id TEXT PRIMARY KEY,
      obj_type TEXT NOT NULL CHECK (obj_type IN ('schema', 'policy')),
      version TEXT,
      content TEXT NOT NULL,
      description TEXT,
      status INTEGER NOT NULL DEFAULT 1 CHECK (status IN (0, 1, 2)),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)
  
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_internal_schema_policy_obj_type ON internal_schema_policy(obj_type)
  `)
  
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_internal_schema_policy_status ON internal_schema_policy(status)
  `)
  
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_internal_schema_policy_version ON internal_schema_policy(version)
  `)
  
  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_internal_schema_policy_unique_schema 
    ON internal_schema_policy(obj_type) WHERE obj_type = 'schema'
  `)
  
  console.log('[MIGRATION 007] Created internal_schema_policy table')
}

export function down(db: Database.Database): void {


  db.prepare('UPDATE auth SET role = NULL').run()
  console.log('[MIGRATION 007] Reverted role column (set all to NULL)')
  

  db.exec('DROP TABLE IF EXISTS internal_schema_policy')
  db.exec('DROP TABLE IF EXISTS internal_entities')
  console.log('[MIGRATION 007] Dropped internal tables')
}
