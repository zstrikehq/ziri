import { getDatabase } from '../db/index.js'
import { generatePassword, hashPassword } from '../utils/password.js'
import { encrypt, decrypt, hash as hashEmail } from '../utils/encryption.js'
import { randomBytes } from 'crypto'
import { internalEntityStore } from './internal/internal-entity-store.js'
import type { InternalEntity } from './internal/internal-entity-store.js'

export interface CreateDashboardUserInput {
  email: string
  name: string
  role: 'admin' | 'viewer' | 'user_admin' | 'policy_admin'
}

export interface DashboardUser {
  id: string
  userId: string
  email: string
  name: string
  role: string
  status: number
  createdAt: string
  updatedAt: string
  lastSignIn?: string
}

function generateDashboardUserId(): string {
  const random = randomBytes(8).toString('hex')
  return `dash-${random}`
}

function mapDbUserToDashboardUser(dbUser: any): DashboardUser {
  let email = ''
  try {
    email = decrypt(dbUser.email)
  } catch {
    email = dbUser.email || ''
  }
  
  return {
    id: dbUser.id,
    userId: dbUser.id,
    email,
    name: dbUser.name || '',
    role: dbUser.role || '',
    status: dbUser.status || 0,
    createdAt: dbUser.created_at || '',
    updatedAt: dbUser.updated_at || '',
    lastSignIn: dbUser.last_sign_in || undefined
  }
}

export async function createDashboardUser(input: CreateDashboardUserInput): Promise<{ user: DashboardUser; password?: string; emailSent: boolean }> {
  const db = getDatabase()

  const emailHash = hashEmail(input.email)
  const existingActive = db.prepare('SELECT * FROM auth WHERE email_hash = ? AND status != 0').get(emailHash) as any
  if (existingActive) {
    throw new Error('User with this email already exists')
  }

  const userId = generateDashboardUserId()
  const password = generatePassword(16)
  const passwordHash = await hashPassword(password)
  const encryptedEmail = encrypt(input.email)
  

  const transaction = db.transaction(() => {

    const authResult = db.prepare(`
      INSERT INTO auth (id, email, email_hash, name, password, role, status, is_agent, tenant)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId,
      encryptedEmail,
      emailHash,
      input.name,
      passwordHash,
      input.role,
      1,
      0,
      null
    )
    
    if (authResult.changes !== 1) {
      throw new Error(`Failed to insert auth row for user ${userId}`)
    }
    

    const entity: InternalEntity = {
      uid: {
        type: 'DashboardUser',
        id: userId
      },
      attrs: {
        user_id: userId,
        role: input.role,
        status: 'active',
        email: input.email,
        name: input.name
      },
      parents: []
    }
    

    const ejson = JSON.stringify(entity)
    const entityResult = db.prepare(`
      INSERT INTO internal_entities (etype, eid, ejson, status)
      VALUES (?, ?, ?, ?)
    `).run('DashboardUser', userId, ejson, 1)
    
    if (entityResult.changes !== 1) {
      throw new Error(`Failed to insert internal entity for user ${userId}`)
    }
  })
  
  try {
    transaction()
  } catch (error: any) {

    console.error(`[DASHBOARD USER SERVICE] Transaction failed for user ${userId}:`, error.message)
    throw new Error(`Failed to create dashboard user: ${error.message}`)
  }
  

  const dbUser = db.prepare('SELECT * FROM auth WHERE id = ?').get(userId) as any
  if (!dbUser) {
    throw new Error(`Failed to verify user creation: user ${userId} not found after transaction`)
  }
  if (dbUser.role !== input.role) {
    console.error(`[DASHBOARD USER SERVICE] WARNING: User ${userId} created with role mismatch. Expected: ${input.role}, Got: ${dbUser.role}`)
    throw new Error(`Data integrity error: user role mismatch`)
  }
  

  const entityCheck = db.prepare('SELECT * FROM internal_entities WHERE etype = ? AND eid = ?').get('DashboardUser', userId) as any
  if (!entityCheck) {
    console.error(`[DASHBOARD USER SERVICE] WARNING: User ${userId} created but internal entity not found`)

    db.prepare('DELETE FROM auth WHERE id = ?').run(userId)
    throw new Error(`Data integrity error: internal entity not created`)
  }
  
  const user = mapDbUserToDashboardUser(dbUser)
  

  const { sendEmail, generateDashboardUserCredentialsEmail } = await import('./email-service.js')
  const { loadConfig } = await import('../config.js')
  
  const config = loadConfig()
  const dashboardUrl = config.publicUrl || `http://${config.host || 'localhost'}:${config.port}`
  
  let emailSent = false
  try {
    const emailContent = generateDashboardUserCredentialsEmail({
      name: user.name,
      email: user.email,
      password,
      dashboardUrl
    })
    
    emailSent = await sendEmail({
      to: user.email,
      subject: 'Your ZIRI Dashboard Credentials',
      html: emailContent.html,
      text: emailContent.text
    })
    
  } catch (error: any) {
    console.warn(`[DASHBOARD USER SERVICE] Failed to send email to ${user.email}:`, error.message)
  }
  
  return {
    user,
    password: emailSent ? undefined : password,
    emailSent
  }
}

export function listDashboardUsers(params?: {
  search?: string
  limit?: number
  offset?: number
  sortBy?: string | null
  sortOrder?: 'asc' | 'desc' | null
}): { data: DashboardUser[]; total: number } {
  const db = getDatabase()

  // Email is encrypted in DB, so search/sort on email must happen in JS after decryption.
  const all = (db.prepare('SELECT * FROM auth WHERE role IS NOT NULL AND status != 0').all() as any[]).map(mapDbUserToDashboardUser)

  let users = all

  if (params?.search) {
    const q = params.search.toLowerCase()
    users = users.filter(u =>
      u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.userId.toLowerCase().includes(q)
    )
  }

  if (params?.sortBy && params?.sortOrder) {
    const key = params.sortBy as keyof DashboardUser
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

export function getDashboardUser(userId: string): DashboardUser | null {
  const db = getDatabase()
  
  const dbUser = db.prepare('SELECT * FROM auth WHERE id = ? AND role IS NOT NULL AND status != 0').get(userId) as any
  
  if (!dbUser) {
    return null
  }
  
  return mapDbUserToDashboardUser(dbUser)
}

export async function updateDashboardUser(userId: string, updates: {
  name?: string
  role?: 'admin' | 'viewer' | 'user_admin' | 'policy_admin'
}): Promise<DashboardUser> {
  const db = getDatabase()
  
  const existing = db.prepare('SELECT * FROM auth WHERE id = ? AND role IS NOT NULL AND status != 0').get(userId) as any
  if (!existing) {
    throw new Error('Dashboard user not found')
  }
  
  const updateFields: string[] = []
  const updateValues: any[] = []
  
  if (updates.name !== undefined) {
    updateFields.push('name = ?')
    updateValues.push(updates.name)
  }
  
  if (updates.role !== undefined) {
    updateFields.push('role = ?')
    updateValues.push(updates.role)
  }
  
  if (updateFields.length === 0) {
    return mapDbUserToDashboardUser(existing)
  }
  
  updateFields.push('updated_at = datetime(\'now\')')
  updateValues.push(userId)
  
  db.prepare(`
    UPDATE auth 
    SET ${updateFields.join(', ')}
    WHERE id = ?
  `).run(...updateValues)
  

  const entityUpdates: any = {}
  if (updates.role !== undefined) {
    entityUpdates.role = updates.role
  }
  if (updates.name !== undefined) {
    entityUpdates.name = updates.name
  }
  if (Object.keys(entityUpdates).length > 0) {
    await internalEntityStore.updateEntity(userId, entityUpdates)
  }
  
  const updated = db.prepare('SELECT * FROM auth WHERE id = ?').get(userId) as any
  return mapDbUserToDashboardUser(updated)
}

export async function deleteDashboardUser(userId: string): Promise<void> {
  if (userId === 'ziri') {
    throw new Error('Cannot delete the initial admin user (ziri)')
  }
  
  const db = getDatabase()
  
  const existing = db.prepare('SELECT * FROM auth WHERE id = ? AND role IS NOT NULL AND status != 0').get(userId) as any
  if (!existing) {
    throw new Error('Dashboard user not found')
  }
  
  const { deleteKeysByUserId } = await import('./key-service.js')
  await deleteKeysByUserId(userId)

  const transaction = db.transaction(() => {
    db.prepare(`
      UPDATE internal_entities SET status = 0, updated_at = datetime('now')
      WHERE etype = ? AND eid = ?
    `).run('DashboardUser', userId)

    db.prepare('UPDATE auth SET status = 0, updated_at = datetime(\'now\') WHERE id = ?').run(userId)
  })

  transaction()
}

export async function disableDashboardUser(userId: string): Promise<DashboardUser> {
  if (userId === 'ziri') {
    throw new Error('Cannot disable the initial admin user (ziri)')
  }
  
  const db = getDatabase()
  
  const existing = db.prepare('SELECT * FROM auth WHERE id = ? AND role IS NOT NULL AND status != 0').get(userId) as any
  if (!existing) {
    throw new Error('Dashboard user not found')
  }
  

  db.prepare(`
    UPDATE auth 
    SET status = 2, updated_at = datetime('now')
    WHERE id = ?
  `).run(userId)
  

  await internalEntityStore.updateEntity(userId, { status: 'disabled' })
  
  const updated = db.prepare('SELECT * FROM auth WHERE id = ?').get(userId) as any
  return mapDbUserToDashboardUser(updated)
}

export async function enableDashboardUser(userId: string): Promise<DashboardUser> {
  const db = getDatabase()
  
  const existing = db.prepare('SELECT * FROM auth WHERE id = ? AND role IS NOT NULL AND status != 0').get(userId) as any
  if (!existing) {
    throw new Error('Dashboard user not found')
  }
  

  db.prepare(`
    UPDATE auth 
    SET status = 1, updated_at = datetime('now')
    WHERE id = ?
  `).run(userId)
  

  await internalEntityStore.updateEntity(userId, { status: 'active' })
  
  const updated = db.prepare('SELECT * FROM auth WHERE id = ?').get(userId) as any
  return mapDbUserToDashboardUser(updated)
}

export async function resetDashUserPw(userId: string): Promise<{ user: DashboardUser; password: string; emailSent: boolean }> {
  const db = getDatabase()
  const existing = db.prepare('SELECT * FROM auth WHERE id = ? AND role IS NOT NULL AND status != 0').get(userId) as any
  if (!existing) {
    throw new Error('Dashboard user not found')
  }
  if (userId === 'ziri') {
    throw new Error('Cannot reset password for the initial admin user (ziri)')
  }
  const plainPw = generatePassword(16)
  const pwHash = await hashPassword(plainPw)
  db.prepare('UPDATE auth SET password = ?, updated_at = datetime(\'now\') WHERE id = ?').run(pwHash, userId)
  const user = mapDbUserToDashboardUser(existing)
  const { sendEmail, genDashUserPwResetEmail } = await import('./email-service.js')
  const { loadConfig } = await import('../config.js')
  const config = loadConfig()
  const dashboardUrl = config.publicUrl || `http://${config.host || 'localhost'}:${config.port}`
  let emailSent = false
  try {
    const content = genDashUserPwResetEmail({
      name: user.name,
      email: user.email,
      newPassword: plainPw,
      dashboardUrl
    })
    emailSent = await sendEmail({
      to: user.email,
      subject: 'ZIRI Dashboard Password Reset',
      html: content.html,
      text: content.text
    })
  } catch (err: any) {
    console.warn(`[DASHBOARD USER SERVICE] Failed to send reset email to ${user.email}:`, err.message)
  }
  const updated = db.prepare('SELECT * FROM auth WHERE id = ?').get(userId) as any
  return {
    user: mapDbUserToDashboardUser(updated),
    password: plainPw,
    emailSent
  }
}
