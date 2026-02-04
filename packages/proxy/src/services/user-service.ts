import { getDatabase } from '../db/index.js'
import { generatePassword, hashPassword } from '../utils/password.js'
import { encrypt, decrypt, hash as hashEmail } from '../utils/encryption.js'
import { randomBytes } from 'crypto'

export interface CreateUserInput {
  email: string
  name: string
  group?: string
  isAgent: boolean
  limitRequestsPerMinute?: number
  createApiKey?: boolean
}

export interface User {
  id: string
  userId: string
  email: string
  name: string
  group?: string
  isAgent: boolean
  status: number
  createdAt: string
  updatedAt: string
  lastSignIn?: string
}

function generateUserId(): string {
  const random = randomBytes(8).toString('hex')
  return `user-${random}`
}

function generateUserKeyId(): string {
  const random = randomBytes(8).toString('hex')
  return `uk-${random}`
}

export async function createUser(input: CreateUserInput): Promise<{ user: User; password?: string; emailSent: boolean }> {
  const db = getDatabase()
  
  const emailHash = hashEmail(input.email)
  const existing = db.prepare('SELECT * FROM auth WHERE email_hash = ?').get(emailHash) as any
  if (existing) {
    throw new Error('User with this email already exists')
  }
  
  const userId = generateUserId()
  const password = generatePassword(16)
  const passwordHash = await hashPassword(password)
  const encryptedEmail = encrypt(input.email)
  
  const result = db.prepare(`
    INSERT INTO auth (id, email, email_hash, name, password, "group", is_agent, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    userId,
    encryptedEmail,
    emailHash,
    input.name,
    passwordHash,
    input.group || null,
    input.isAgent ? 1 : 0,
    1
  )
  
  const dbUser = db.prepare('SELECT * FROM auth WHERE id = ?').get(userId) as any
  const user = mapDbUserToUser(dbUser)
  
  const { serviceFactory } = await import('./service-factory.js')
  const entityStore = serviceFactory.getEntityStore()
  const { toDecimalFour } = await import('../utils/cedar.js')
  
  const creationTime = new Date().toISOString()
  const limitRequestsPerMinute = input.limitRequestsPerMinute || 100
  
  const userEntity = {
    uid: { type: 'User', id: userId },
    attrs: {
      user_id: userId,
      email: input.email,
      group: input.group || '',
      is_agent: input.isAgent,
      limit_requests_per_minute: limitRequestsPerMinute
    },
    parents: []
  }
  
  try {
    await entityStore.createEntity(userEntity, 1)
  } catch (error: any) {
    db.prepare('DELETE FROM auth WHERE id = ?').run(userId)
    throw new Error(`Failed to create User entity: ${error.message}`)
  }
  
  console.log(`[USER SERVICE] createUser - createApiKey value:`, input.createApiKey, `type:`, typeof input.createApiKey)
  
  if (input.createApiKey === true) {
    console.log(`[USER SERVICE] Creating UserKey entity and API key for user ${userId}`)
    
    const userKeyId = generateUserKeyId()
    const userKeyEntity = {
      uid: { type: 'UserKey', id: userKeyId },
      attrs: {
        current_daily_spend: toDecimalFour(0),
        current_monthly_spend: toDecimalFour(0),
        last_daily_reset: creationTime,
        last_monthly_reset: creationTime,
        status: 'active' as const,
        user: {
          __entity: {
            type: 'User',
            id: userId
          }
        }
      },
      parents: []
    }
    
    try {
      await entityStore.createEntity(userKeyEntity, 1)
    } catch (error: any) {
      try {
        await entityStore.deleteEntity(`User::"${userId}"`)
      } catch (deleteError) {
        console.warn('[USER SERVICE] Failed to rollback User entity:', deleteError)
      }
      db.prepare('DELETE FROM auth WHERE id = ?').run(userId)
      throw new Error(`Failed to create UserKey entity: ${error.message}`)
    }
    
    try {
      const { generateApiKey, hashApiKey } = await import('../utils/api-key.js')
      const apiKey = generateApiKey(userId)
      const keyHash = hashApiKey(apiKey)
      const encryptedKey = encrypt(apiKey)
      const keyId = `key-${randomBytes(8).toString('hex')}`
      db.prepare(`
        INSERT INTO user_agent_keys (id, key_value, key_hash, auth_id)
        VALUES (?, ?, ?, ?)
      `).run(keyId, encryptedKey, keyHash, userId)
      console.log(`[USER SERVICE] ✓ API key created automatically for user ${userId}`)
    } catch (error: any) {
      console.warn(`[USER SERVICE] ✗ Failed to create API key for user ${userId}:`, error.message)
    }
  } else {
    console.log(`[USER SERVICE] Skipping UserKey entity and API key creation for user ${userId} (createApiKey: ${input.createApiKey})`)
  }

  const { sendEmail, generateUserCredentialsEmail } = await import('./email-service.js')
  const { loadConfig } = await import('../config.js')
  
  const config = loadConfig()
  const gatewayUrl = config.publicUrl || `http://${config.host || 'localhost'}:${config.port}`
  
  let emailSent = false
  try {
    const emailContent = generateUserCredentialsEmail({
      name: user.name,
      userId: user.userId,
      password,
      gatewayUrl
    })
    
    emailSent = await sendEmail({
      to: user.email,
      subject: 'Your ZIRI Credentials',
      html: emailContent.html,
      text: emailContent.text
    })
    
    if (emailSent) {
      console.log(`[USER SERVICE] Credentials email sent to ${user.email}`)
    }
  } catch (error: any) {
    console.warn(`[USER SERVICE] Failed to send email to ${user.email}:`, error.message)
  }
  
  return {
    user,
    password: emailSent ? undefined : password,
    emailSent
  }
}

export function listUsers(params?: {
  search?: string
  limit?: number
  offset?: number
  sortBy?: string | null
  sortOrder?: 'asc' | 'desc' | null
}): { data: User[]; total: number } {
  const db = getDatabase()
  
  let whereClause = 'WHERE 1=1'
  const args: any[] = []
  
  if (params?.search) {
    const searchPattern = `%${params.search}%`
    whereClause += ' AND (name LIKE ? OR id LIKE ?)'
    args.push(searchPattern, searchPattern)
  }
  
  let orderByClause = 'ORDER BY created_at DESC'
  if (params?.sortBy && params?.sortOrder) {
    const columnMap: Record<string, string> = {
      'name': 'name',
      'email': 'email',
      'userId': 'id',
      'group': '"group"',
      'createdAt': 'created_at',
      'updatedAt': 'updated_at',
      'lastSignIn': 'last_sign_in',
      'status': 'status'
    }
    const dbColumn = columnMap[params.sortBy]
    if (dbColumn) {
      const order = params.sortOrder.toUpperCase()
      orderByClause = `ORDER BY ${dbColumn} ${order}`
    }
  }
  
 
  const countSql = `SELECT COUNT(*) as total FROM auth ${whereClause}`
  const countResult = db.prepare(countSql).get(...args) as { total: number }
  const total = countResult.total
  
 
  const limit = params?.limit || 100
  const offset = params?.offset || 0
  const dataSql = `SELECT * FROM auth ${whereClause} ${orderByClause} LIMIT ? OFFSET ?`
  const users = db.prepare(dataSql).all(...args, limit, offset) as any[]
  
  let mappedUsers = users.map(mapDbUserToUser)
  
  if (params?.search) {
    const searchLower = params.search.toLowerCase()
    mappedUsers = mappedUsers.filter(user => 
      user.name.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower) ||
      user.userId.toLowerCase().includes(searchLower)
    )
    
    const allUsers = db.prepare('SELECT * FROM auth').all() as any[]
    const allMapped = allUsers.map(mapDbUserToUser)
    const filtered = allMapped.filter(user => 
      user.name.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower) ||
      user.userId.toLowerCase().includes(searchLower)
    )
    
    if (params?.sortBy && params?.sortOrder) {
      const sortKey = params.sortBy as keyof User
      mappedUsers.sort((a, b) => {
        const aVal = a[sortKey]
        const bVal = b[sortKey]
        if (aVal === undefined || aVal === null) return 1
        if (bVal === undefined || bVal === null) return -1
        const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
        return params.sortOrder === 'asc' ? comparison : -comparison
      })
    }
    
    return { data: mappedUsers, total: filtered.length }
  }
  
  return { data: mappedUsers, total }
}

export function getUserById(userId: string): User | null {
  const db = getDatabase()
  const user = db.prepare('SELECT * FROM auth WHERE id = ?').get(userId) as any
  return user ? mapDbUserToUser(user) : null
}

export function getUserByEmail(email: string): User | null {
  const db = getDatabase()
  const emailHash = hashEmail(email)
  const user = db.prepare('SELECT * FROM auth WHERE email_hash = ?').get(emailHash) as any
  return user ? mapDbUserToUser(user) : null
}

export async function updateUser(userId: string, updates: Partial<CreateUserInput>): Promise<User> {
  const db = getDatabase()
  
  const existing = getUserById(userId)
  if (!existing) {
    throw new Error('User not found')
  }
  
 
  const fields: string[] = []
  const values: any[] = []
  
  if (updates.email !== undefined) {
 
    const newEmailHash = hashEmail(updates.email)
    const emailExists = db.prepare('SELECT * FROM auth WHERE email_hash = ? AND id != ?').get(newEmailHash, userId)
    if (emailExists) {
      throw new Error('Email already in use by another user')
    }
    const encryptedEmail = encrypt(updates.email)
    fields.push('email = ?')
    fields.push('email_hash = ?')
    values.push(encryptedEmail)
    values.push(newEmailHash)
  }
  
  if (updates.name !== undefined) {
    fields.push('name = ?')
    values.push(updates.name)
  }
  
  if (updates.group !== undefined) {
    fields.push('"group" = ?')
    values.push(updates.group || null)
  }
  
  if (updates.isAgent !== undefined) {
    fields.push('is_agent = ?')
    values.push(updates.isAgent ? 1 : 0)
  }
  
  if (fields.length === 0) {
    return existing
  }
  
  fields.push('updated_at = datetime(\'now\')')
  values.push(userId)
  
  db.prepare(`UPDATE auth SET ${fields.join(', ')} WHERE id = ?`).run(...values)
  
  return getUserById(userId)!
}

export async function deleteUser(userId: string): Promise<void> {
  const db = getDatabase()
  
  const user = getUserById(userId)
  if (!user) {
    throw new Error('User not found')
  }
  
  const { serviceFactory } = await import('./service-factory.js')
  const entityStore = serviceFactory.getEntityStore()
  
  try {
    const allEntitiesResult = await entityStore.getEntities()
    const allEntities = allEntitiesResult.data
    const userKeyEntities = allEntities.filter(e => 
      e.uid.type === 'UserKey' && 
      (e.attrs as any).user && 
      (e.attrs as any).user.__entity && 
      (e.attrs as any).user.__entity.id === userId
    )
    
    for (const userKeyEntity of userKeyEntities) {
      try {
        await entityStore.deleteEntity(`UserKey::"${userKeyEntity.uid.id}"`)
      } catch (error: any) {
        console.warn(`[USER SERVICE] Failed to delete UserKey entity ${userKeyEntity.uid.id}:`, error.message)
      }
    }
  } catch (error: any) {
    console.warn('[USER SERVICE] Failed to delete UserKey entities:', error.message)
  }
  
  try {
    await entityStore.deleteEntity(`User::"${userId}"`)
  } catch (error: any) {
    console.warn(`[USER SERVICE] Failed to delete User entity:`, error.message)
  }
  

  const userKeys = db.prepare('SELECT id, key_hash FROM user_agent_keys WHERE auth_id = ?').all(userId) as Array<{ id: string; key_hash: string }>
  

  try {

    const tableExists = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='rate_limit_buckets'
    `).get()
    
    if (tableExists) {

      for (const key of userKeys) {


        db.prepare('DELETE FROM rate_limit_buckets WHERE key LIKE ?').run(`rl_api_key_${key.key_hash}%`)
      }
      

      db.prepare('DELETE FROM rate_limit_buckets WHERE key LIKE ?').run(`rl_user_${userId}%`)
    }
  } catch (error: any) {

    console.warn('[USER SERVICE] Failed to clean up rate limiter buckets:', error.message)
  }
  

  db.prepare('DELETE FROM user_agent_keys WHERE auth_id = ?').run(userId)
  db.prepare('DELETE FROM refresh_tokens WHERE auth_id = ?').run(userId)
  db.prepare('DELETE FROM auth WHERE id = ?').run(userId)
}

export async function resetUserPassword(userId: string): Promise<{ password: string; emailSent: boolean }> {
  const db = getDatabase()
  
  const user = getUserById(userId)
  if (!user) {
    throw new Error('User not found')
  }
  
  const newPassword = generatePassword(16)
  const passwordHash = await hashPassword(newPassword)
  db.prepare('UPDATE auth SET password = ?, updated_at = datetime(\'now\') WHERE id = ?').run(passwordHash, userId)
  
  const { sendEmail, generatePasswordResetEmail } = await import('./email-service.js')
  const { loadConfig } = await import('../config.js')
  
  const config = loadConfig()
  const gatewayUrl = config.publicUrl || `http://${config.host || 'localhost'}:${config.port}`
  
  let emailSent = false
  try {
    const emailContent = generatePasswordResetEmail({
      name: user.name,
      userId: user.userId,
      password: newPassword,
      gatewayUrl
    })
    
    emailSent = await sendEmail({
      to: user.email,
      subject: 'Your ZIRI Password Has Been Reset',
      html: emailContent.html,
      text: emailContent.text
    })
    
    if (emailSent) {
      console.log(`[USER SERVICE] Password reset email sent to ${user.email}`)
    }
  } catch (error: any) {
    console.warn(`[USER SERVICE] Failed to send password reset email to ${user.email}:`, error.message)
  }
  
  return {
    password: newPassword,
    emailSent
  }
}

function mapDbUserToUser(dbUser: any): User {
  let decryptedEmail: string
  try {
    decryptedEmail = decrypt(dbUser.email)
  } catch (error: any) {
    console.warn('[USER SERVICE] Failed to decrypt email, treating as plain text:', error.message)
    decryptedEmail = dbUser.email
  }
  
  const status = typeof dbUser.status === 'number' ? dbUser.status : 
                 dbUser.status === 'active' ? 1 : 
                 dbUser.status === 'inactive' ? 0 : 2
  
  return {
    id: dbUser.id,
    userId: dbUser.id,
    email: decryptedEmail,
    name: dbUser.name || '',
    group: dbUser.group ?? undefined,
    isAgent: dbUser.is_agent === 1,
    status,
    createdAt: dbUser.created_at,
    updatedAt: dbUser.updated_at,
    lastSignIn: dbUser.last_sign_in || undefined
  }
}
