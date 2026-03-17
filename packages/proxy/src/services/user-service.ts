import { getDatabase } from '../db/index.js'
import { generatePassword, hashPassword } from '../utils/password.js'
import { encrypt, decrypt, hash as hashEmail } from '../utils/encryption.js'
import { randomBytes } from 'crypto'
import { paginatedQuery } from '../utils/query.js'

export interface CreateUserInput {
  email: string
  name: string
  tenant?: string
  isAgent: boolean
  limitRequestsPerMinute?: number
  createApiKey?: boolean
  roleId?: string
}

export interface User {
  id: string
  userId: string
  email: string
  name: string
  tenant?: string
  isAgent: boolean
  status: number
  createdAt: string
  updatedAt: string
  lastSignIn?: string
  roleId?: string
}

const USER_COLUMNS: Record<string, string> = {
  name: 'name', email: 'email', userId: 'id', tenant: 'tenant',
  createdAt: 'created_at', updatedAt: 'updated_at', lastSignIn: 'last_sign_in', status: 'status'
}

function uid() { return `user-${randomBytes(8).toString('hex')}` }
function ukid() { return `uk-${randomBytes(8).toString('hex')}` }

function toUser(row: any): User {
  let email: string
  try { email = decrypt(row.email) } catch { email = row.email }

  return {
    id: row.id, userId: row.id, email,
    name: row.name || '',
    tenant: row.tenant ?? undefined,
    isAgent: row.is_agent === 1,
    status: typeof row.status === 'number' ? row.status : row.status === 'active' ? 1 : row.status === 'inactive' ? 0 : 2,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastSignIn: row.last_sign_in || undefined
  }
}

export async function createUser(input: CreateUserInput): Promise<{ user: User; password?: string; apiKey?: string; emailSent: boolean }> {
  const db = getDatabase()

  const eHash = hashEmail(input.email)
  if (db.prepare('SELECT 1 FROM auth WHERE email_hash = ? AND status != 0').get(eHash)) {
    throw new Error('User with this email already exists')
  }

  const id = uid()
  const password = generatePassword(16)
  const pwHash = await hashPassword(password)

  db.prepare(`INSERT INTO auth (id, email, email_hash, name, password, tenant, is_agent, status) VALUES (?,?,?,?,?,?,?,?)`)
    .run(id, encrypt(input.email), eHash, input.name, pwHash, input.tenant || null, input.isAgent ? 1 : 0, 1)

  const user = toUser(db.prepare('SELECT * FROM auth WHERE id = ?').get(id))

  const { serviceFactory } = await import('./service-factory.js')
  const entities = serviceFactory.getEntityStore()
  const { toDecimalFour } = await import('../utils/cedar.js')

  const rpm = input.limitRequestsPerMinute || 100
  if (input.roleId) {
    const { listRoles } = await import('./role-entity-service.js')
    const { roles } = await listRoles({ limit: 10000 })
    if (!roles.some(r => r.id === input.roleId)) {
      db.prepare('DELETE FROM auth WHERE id = ?').run(id)
      throw new Error(`Role not found: ${input.roleId}`)
    }
  }

  const parents = input.roleId ? [{ type: 'Role', id: input.roleId }] : []
  try {
    await entities.createEntity({
      uid: { type: 'User', id },
      attrs: { user_id: id, email: input.email, tenant: input.tenant || '', is_agent: input.isAgent, limit_requests_per_minute: rpm },
      parents
    }, 1)
  } catch (err: any) {
    db.prepare('DELETE FROM auth WHERE id = ?').run(id)
    throw new Error(`Failed to create User entity: ${err.message}`)
  }

  let apiKey: string | undefined
  if (input.createApiKey) {
    const userKeyId = ukid()
    const now = new Date().toISOString()
    try {
      await entities.createEntity({
        uid: { type: 'UserKey', id: userKeyId },
        attrs: {
          current_daily_spend: toDecimalFour(0), current_monthly_spend: toDecimalFour(0),
          last_daily_reset: now, last_monthly_reset: now,
          status: 'active' as const,
          user: { __entity: { type: 'User', id } }
        },
        parents: []
      }, 1)
    } catch (err: any) {
      try { await entities.deleteEntity(`User::"${id}"`) } catch {}
      db.prepare('DELETE FROM auth WHERE id = ?').run(id)
      throw new Error(`Failed to create UserKey entity: ${err.message}`)
    }

    try {
      const { generateApiKey, hashApiKey } = await import('../utils/api-key.js')
      apiKey = generateApiKey()
      db.prepare(`INSERT INTO user_agent_keys (id, key_value, key_hash, auth_id, status) VALUES (?,?,?,?,'active')`)
        .run(`key-${randomBytes(8).toString('hex')}`, apiKey.slice(-5), hashApiKey(apiKey), id)
    } catch (err: any) {
      console.warn(`key creation failed for ${id}:`, err.message)
    }
  }

  // try to email credentials
  const { sendEmail, generateUserCredentialsEmail } = await import('./email-service.js')
  const { loadConfig } = await import('../config.js')
  const cfg = loadConfig()
  const gatewayUrl = cfg.publicUrl || `http://${cfg.host || 'localhost'}:${cfg.port}`

  let emailSent = false
  try {
    const content = generateUserCredentialsEmail({ name: user.name, userId: user.userId, password, gatewayUrl })
    emailSent = await sendEmail({ to: user.email, subject: 'Your ZIRI Credentials', html: content.html, text: content.text })
  } catch {}

  const out = { ...user }
  if (input.roleId) out.roleId = input.roleId

  return { user: out, password: emailSent ? undefined : password, apiKey, emailSent }
}

export function listUsers(params?: {
  search?: string; limit?: number; offset?: number
  sortBy?: string | null; sortOrder?: 'asc' | 'desc' | null
}): { data: User[]; total: number } {
  const db = getDatabase()

  // Email is encrypted in DB, so search/sort on email must happen in JS after decryption.
  // Fetch all matching rows, decrypt, then filter/sort/paginate in JS.
  const all = (db.prepare('SELECT * FROM auth WHERE role IS NULL AND status != 0').all() as any[]).map(toUser)

  let users = all

  if (params?.search) {
    const q = params.search.toLowerCase()
    users = users.filter(u =>
      u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.userId.toLowerCase().includes(q)
    )
  }

  if (params?.sortBy && params?.sortOrder) {
    const key = params.sortBy as keyof User
    const dir = params.sortOrder === 'asc' ? 1 : -1
    users = [...users].sort((a, b) => {
      const aVal = String(a[key] ?? '').toLowerCase()
      const bVal = String(b[key] ?? '').toLowerCase()
      if (aVal < bVal) return -1 * dir
      if (aVal > bVal) return 1 * dir
      return 0
    })
  }

  const total = users.length
  const limit = params?.limit || 100
  const offset = params?.offset || 0
  return { data: users.slice(offset, offset + limit), total }
}

export function listAllUsersForApiKeys(params?: {
  search?: string; limit?: number; offset?: number
  sortBy?: string | null; sortOrder?: 'asc' | 'desc' | null
}): { data: User[]; total: number } {
  const db = getDatabase()

  const all = (db.prepare('SELECT * FROM auth WHERE status != 0').all() as any[]).map(toUser)

  let users = all

  if (params?.search) {
    const q = params.search.toLowerCase()
    users = users.filter(u =>
      u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.userId.toLowerCase().includes(q)
    )
  }

  if (params?.sortBy && params?.sortOrder) {
    const key = params.sortBy as keyof User
    const dir = params.sortOrder === 'asc' ? 1 : -1
    users = [...users].sort((a, b) => {
      const aVal = String(a[key] ?? '').toLowerCase()
      const bVal = String(b[key] ?? '').toLowerCase()
      if (aVal < bVal) return -1 * dir
      if (aVal > bVal) return 1 * dir
      return 0
    })
  }

  const total = users.length
  const limit = params?.limit || 100
  const offset = params?.offset || 0
  return { data: users.slice(offset, offset + limit), total }
}

export function getUserById(userId: string): User | null {
  const db = getDatabase()
  const row = db.prepare('SELECT * FROM auth WHERE id = ? AND role IS NULL AND status != 0').get(userId) as any
  return row ? toUser(row) : null
}

export function getUserByEmail(email: string): User | null {
  const db = getDatabase()
  const row = db.prepare('SELECT * FROM auth WHERE email_hash = ? AND role IS NULL AND status != 0').get(hashEmail(email)) as any
  return row ? toUser(row) : null
}

export async function updateUser(userId: string, updates: Partial<CreateUserInput>): Promise<User> {
  const db = getDatabase()

  const raw = db.prepare('SELECT * FROM auth WHERE id = ?').get(userId) as any
  if (!raw) throw new Error('User not found')
  if (raw.role != null) throw new Error('Cannot update dashboard user from access user management. Use dashboard user management instead.')

  if (!getUserById(userId)) throw new Error('User not found')

  const sets: string[] = []
  const vals: any[] = []

  if (updates.email !== undefined) {
    const newHash = hashEmail(updates.email)
    if (db.prepare('SELECT 1 FROM auth WHERE email_hash = ? AND id != ? AND status != 0').get(newHash, userId)) {
      throw new Error('Email already in use by another user')
    }
    sets.push('email = ?', 'email_hash = ?')
    vals.push(encrypt(updates.email), newHash)
  }
  if (updates.name !== undefined)   { sets.push('name = ?');     vals.push(updates.name) }
  if (updates.tenant !== undefined) { sets.push('tenant = ?');   vals.push(updates.tenant || null) }
  if (updates.isAgent !== undefined){ sets.push('is_agent = ?'); vals.push(updates.isAgent ? 1 : 0) }

  if (sets.length) {
    sets.push("updated_at = datetime('now')")
    vals.push(userId)
    db.prepare(`UPDATE auth SET ${sets.join(', ')} WHERE id = ?`).run(...vals)
  }

  if (updates.roleId !== undefined) {
    await syncUserEntityRole(userId, updates.roleId || undefined)
  }

  const u = getUserById(userId)!
  u.roleId = await getRoleIdForUser(userId)
  return u
}

export async function syncUserEntityRole(userId: string, roleId?: string): Promise<void> {
  const { serviceFactory } = await import('./service-factory.js')
  const entities = serviceFactory.getEntityStore()
  const user = getUserById(userId)
  if (!user) throw new Error('User not found')

  if (roleId) {
    const { listRoles } = await import('./role-entity-service.js')
    const { roles } = await listRoles({ limit: 10000 })
    if (!roles.some(r => r.id === roleId)) throw new Error(`Role not found: ${roleId}`)
  }

  const result = await entities.getEntities(`User::"${userId}"`)
  const existing = result.data[0]
  const attrs = existing?.attrs
    ? { ...existing.attrs }
    : { user_id: userId, email: user.email, tenant: user.tenant || '', is_agent: user.isAgent, limit_requests_per_minute: 100 }

  const entity = { uid: { type: 'User', id: userId }, attrs, parents: roleId ? [{ type: 'Role', id: roleId }] : [] }

  if (existing) await entities.updateEntity(entity, 1)
  else await entities.createEntity(entity, 1)
}

export async function getRoleIdForUser(userId: string): Promise<string | undefined> {
  const { serviceFactory } = await import('./service-factory.js')
  const result = await serviceFactory.getEntityStore().getEntities(`User::"${userId}"`)
  const ent = result.data[0]
  if (!ent?.parents?.length) return undefined
  const role = ent.parents.find((p: { type: string }) => p.type === 'Role')
  return role ? (role as { type: string; id: string }).id : undefined
}

export async function deleteUser(userId: string): Promise<void> {
  const db = getDatabase()

  const raw = db.prepare('SELECT * FROM auth WHERE id = ?').get(userId) as any
  if (!raw) throw new Error('User not found')
  if (raw.role != null) throw new Error('Cannot delete dashboard user from access user management. Dashboard users must be deleted via dashboard user management.')
  if (userId === 'ziri') throw new Error('Cannot delete the initial admin user (ziri)')

  const { serviceFactory } = await import('./service-factory.js')
  const entities = serviceFactory.getEntityStore()

  const { deleteKeysByUserId } = await import('./key-service.js')
  await deleteKeysByUserId(userId)

  const keys = db.prepare('SELECT id, key_hash FROM user_agent_keys WHERE auth_id = ?').all(userId) as { id: string; key_hash: string }[]

  // clean up rate limiter buckets if the table exists
  try {
    if (db.prepare(`SELECT 1 FROM sqlite_master WHERE type='table' AND name='rate_limit_buckets'`).get()) {
      for (const k of keys) {
        db.prepare('DELETE FROM rate_limit_buckets WHERE key LIKE ?').run(`rl_api_key_${k.key_hash}%`)
      }
      db.prepare('DELETE FROM rate_limit_buckets WHERE key LIKE ?').run(`rl_user_${userId}%`)
    }
  } catch (err: any) {
    console.warn('rate limiter cleanup failed:', err.message)
  }

  db.prepare("UPDATE refresh_tokens SET revoked_at = datetime('now') WHERE auth_id = ? AND revoked_at IS NULL").run(userId)
  db.prepare("UPDATE auth SET status = 0, updated_at = datetime('now') WHERE id = ?").run(userId)

  try { await entities.deleteEntity(`User::"${userId}"`) } catch (err: any) {
    console.warn('entity cleanup failed:', err.message)
  }
}

export async function resetUserPassword(userId: string): Promise<{ password: string; emailSent: boolean }> {
  const db = getDatabase()

  const raw = db.prepare('SELECT * FROM auth WHERE id = ?').get(userId) as any
  if (!raw) throw new Error('User not found')
  if (raw.role != null) throw new Error('Cannot reset password for dashboard user from access user management. Dashboard user passwords must be reset via dashboard user management.')
  if (userId === 'ziri') throw new Error('Cannot reset password for the initial admin user (ziri)')

  const user = getUserById(userId)
  if (!user) throw new Error('User not found')

  const pw = generatePassword(16)
  db.prepare("UPDATE auth SET password = ?, updated_at = datetime('now') WHERE id = ?").run(await hashPassword(pw), userId)

  const { sendEmail, generatePasswordResetEmail } = await import('./email-service.js')
  const { loadConfig } = await import('../config.js')
  const cfg = loadConfig()
  const gatewayUrl = cfg.publicUrl || `http://${cfg.host || 'localhost'}:${cfg.port}`

  let emailSent = false
  try {
    const content = generatePasswordResetEmail({ name: user.name, userId: user.userId, password: pw, gatewayUrl })
    emailSent = await sendEmail({ to: user.email, subject: 'Your ZIRI Password Has Been Reset', html: content.html, text: content.text })
  } catch {}

  return { password: pw, emailSent }
}
