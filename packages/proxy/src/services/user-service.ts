// User service - business logic for user management
// Uses new auth table with encryption

import { getDatabase } from '../db/index.js'
import { generatePassword, hashPassword } from '../utils/password.js'
import { encrypt, decrypt, hash as hashEmail } from '../utils/encryption.js'
import { randomBytes } from 'crypto'

export interface CreateUserInput {
  email: string
  name: string
  department: string
  isAgent: boolean
  limitRequestsPerMinute?: number // Default: 100
}

export interface User {
  id: string // auth.id (TEXT)
  userId: string // Same as id (for backward compatibility)
  email: string // Decrypted
  name: string // Plain text
  department?: string // Plain text
  isAgent: boolean
  status: number // 0=inactive, 1=active, 2=revoked
  createdAt: string
  updatedAt: string
  lastSignIn?: string
}

/**
 * Generate a unique userId (auth.id)
 */
function generateUserId(): string {
  // Format: user-{random}
  const random = randomBytes(8).toString('hex')
  return `user-${random}`
}

/**
 * Generate a unique UserKey ID
 */
function generateUserKeyId(): string {
  // Format: uk-{random}
  const random = randomBytes(8).toString('hex')
  return `uk-${random}`
}

/**
 * Create a new user
 */
export async function createUser(input: CreateUserInput): Promise<{ user: User; password?: string; emailSent: boolean }> {
  const db = getDatabase()
  
  // Check if email already exists (using email_hash for fast lookup)
  const emailHash = hashEmail(input.email)
  const existing = db.prepare('SELECT * FROM auth WHERE email_hash = ?').get(emailHash) as any
  if (existing) {
    throw new Error('User with this email already exists')
  }
  
  // Generate userId and password
  const userId = generateUserId()
  const password = generatePassword(16)
  const passwordHash = await hashPassword(password)
  
  // Encrypt email
  const encryptedEmail = encrypt(input.email)
  
  // Insert user into auth table
  const result = db.prepare(`
    INSERT INTO auth (id, email, email_hash, name, password, dept, is_agent, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    userId,
    encryptedEmail,
    emailHash,
    input.name, // Plain text
    passwordHash,
    input.department || null, // Plain text
    input.isAgent ? 1 : 0,
    1 // status: 1 = active
  )
  
  // Get created user
  const dbUser = db.prepare('SELECT * FROM auth WHERE id = ?').get(userId) as any
  const user = mapDbUserToUser(dbUser)
  
  // Create User and UserKey entities
  const { serviceFactory } = await import('./service-factory.js')
  const entityStore = serviceFactory.getEntityStore()
  const { toDecimalFour } = await import('../utils/cedar.js')
  
  const creationTime = new Date().toISOString()
  const limitRequestsPerMinute = input.limitRequestsPerMinute || 100
  
  // 1. Create User entity
  const userEntity = {
    uid: { type: 'User', id: userId },
    attrs: {
      user_id: userId,
      email: input.email, // Plain email for entity (not encrypted)
      department: input.department,
      is_agent: input.isAgent,
      limit_requests_per_minute: limitRequestsPerMinute
    },
    parents: []
  }
  
  try {
    await entityStore.createEntity(userEntity, 1)
  } catch (error: any) {
    // Rollback user creation if entity creation fails
    db.prepare('DELETE FROM auth WHERE id = ?').run(userId)
    throw new Error(`Failed to create User entity: ${error.message}`)
  }
  
  // 2. Create UserKey entity
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
    // Rollback User entity and user creation if UserKey creation fails
    try {
      await entityStore.deleteEntity(`User::"${userId}"`)
    } catch (deleteError) {
      console.warn('[USER SERVICE] Failed to rollback User entity:', deleteError)
    }
    db.prepare('DELETE FROM auth WHERE id = ?').run(userId)
    throw new Error(`Failed to create UserKey entity: ${error.message}`)
  }
  
  // 3. Create API key automatically (linked to UserKey entity)
  try {
    const { generateApiKey, hashApiKey } = await import('../utils/api-key.js')
    const apiKey = generateApiKey(userId)
    const keyHash = hashApiKey(apiKey)
    
    // Encrypt API key
    const encryptedKey = encrypt(apiKey)
    
    // Store API key in user_agent_keys table
    const keyId = `key-${randomBytes(8).toString('hex')}`
    db.prepare(`
      INSERT INTO user_agent_keys (id, key_value, key_hash, auth_id)
      VALUES (?, ?, ?, ?)
    `).run(keyId, encryptedKey, keyHash, userId)
    
    console.log(`[USER SERVICE] API key created automatically for user ${userId}`)
  } catch (error: any) {
    // API key creation failure shouldn't block user creation, but log it
    console.warn(`[USER SERVICE] Failed to create API key for user ${userId}:`, error.message)
    // Note: User and UserKey entities are already created, so we continue
  }
  
  // Attempt to send credentials email (if configured)
  // Import here to avoid circular dependency
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
      to: user.email, // Use decrypted email
      subject: 'Your ZS AI Gateway Credentials',
      html: emailContent.html,
      text: emailContent.text
    })
    
    if (emailSent) {
      console.log(`[USER SERVICE] Credentials email sent to ${user.email}`)
    }
  } catch (error: any) {
    console.warn(`[USER SERVICE] Failed to send email to ${user.email}:`, error.message)
    // Continue anyway - email failure shouldn't block user creation
  }
  
  return {
    user,
    password: emailSent ? undefined : password, // Only return password if email not sent
    emailSent
  }
}

/**
 * List all users with optional search, limit, offset, and sorting
 */
export function listUsers(params?: {
  search?: string
  limit?: number
  offset?: number
  sortBy?: string | null
  sortOrder?: 'asc' | 'desc' | null
}): { data: User[]; total: number } {
  const db = getDatabase()
  
  // Build WHERE clause
  let whereClause = 'WHERE 1=1'
  const args: any[] = []
  
  if (params?.search) {
    const searchPattern = `%${params.search}%`
    // Search across name, email (decrypted), and id (userId)
    // Note: We can't search encrypted email directly, so we'll search name and id
    whereClause += ' AND (name LIKE ? OR id LIKE ?)'
    args.push(searchPattern, searchPattern)
  }
  
  // Build ORDER BY clause
  let orderByClause = 'ORDER BY created_at DESC' // Default sort
  if (params?.sortBy && params?.sortOrder) {
    // Map frontend column names to database column names
    const columnMap: Record<string, string> = {
      'name': 'name',
      'email': 'email', // Note: This will sort by encrypted email (not ideal but works)
      'userId': 'id',
      'department': 'dept',
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
  
  // Get total count
  const countSql = `SELECT COUNT(*) as total FROM auth ${whereClause}`
  const countResult = db.prepare(countSql).get(...args) as { total: number }
  const total = countResult.total
  
  // Get paginated data
  const limit = params?.limit || 100
  const offset = params?.offset || 0
  const dataSql = `SELECT * FROM auth ${whereClause} ${orderByClause} LIMIT ? OFFSET ?`
  const users = db.prepare(dataSql).all(...args, limit, offset) as any[]
  
  // Map and filter by search if needed (for email search since it's encrypted)
  let mappedUsers = users.map(mapDbUserToUser)
  
  // If search provided, also filter by decrypted email (can't do this in SQL)
  if (params?.search) {
    const searchLower = params.search.toLowerCase()
    mappedUsers = mappedUsers.filter(user => 
      user.name.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower) ||
      user.userId.toLowerCase().includes(searchLower)
    )
    // Recalculate total based on filtered results
    // Note: This is not perfect but necessary since email is encrypted
    const allUsers = db.prepare('SELECT * FROM auth').all() as any[]
    const allMapped = allUsers.map(mapDbUserToUser)
    const filtered = allMapped.filter(user => 
      user.name.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower) ||
      user.userId.toLowerCase().includes(searchLower)
    )
    
    // If sorting is applied, re-sort the filtered results
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

/**
 * Get user by userId (auth.id)
 */
export function getUserById(userId: string): User | null {
  const db = getDatabase()
  const user = db.prepare('SELECT * FROM auth WHERE id = ?').get(userId) as any
  return user ? mapDbUserToUser(user) : null
}

/**
 * Get user by email (using email_hash for fast lookup)
 */
export function getUserByEmail(email: string): User | null {
  const db = getDatabase()
  const emailHash = hashEmail(email)
  const user = db.prepare('SELECT * FROM auth WHERE email_hash = ?').get(emailHash) as any
  return user ? mapDbUserToUser(user) : null
}

/**
 * Update user
 */
export async function updateUser(userId: string, updates: Partial<CreateUserInput>): Promise<User> {
  const db = getDatabase()
  
  // Check if user exists
  const existing = getUserById(userId)
  if (!existing) {
    throw new Error('User not found')
  }
  
  // Build update query
  const fields: string[] = []
  const values: any[] = []
  
  if (updates.email !== undefined) {
    // Check if email already exists (for another user) using email_hash
    const newEmailHash = hashEmail(updates.email)
    const emailExists = db.prepare('SELECT * FROM auth WHERE email_hash = ? AND id != ?').get(newEmailHash, userId)
    if (emailExists) {
      throw new Error('Email already in use by another user')
    }
    // Encrypt new email
    const encryptedEmail = encrypt(updates.email)
    fields.push('email = ?')
    fields.push('email_hash = ?')
    values.push(encryptedEmail)
    values.push(newEmailHash)
  }
  
  if (updates.name !== undefined) {
    fields.push('name = ?')
    values.push(updates.name) // Plain text
  }
  
  if (updates.department !== undefined) {
    fields.push('dept = ?')
    values.push(updates.department || null) // Plain text
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

/**
 * Delete user (with cascade: keys → entities → refresh tokens)
 */
export async function deleteUser(userId: string): Promise<void> {
  const db = getDatabase()
  
  // Check if user exists
  const user = getUserById(userId)
  if (!user) {
    throw new Error('User not found')
  }
  
  // Import here to avoid circular dependency
  const { serviceFactory } = await import('./service-factory.js')
  const entityStore = serviceFactory.getEntityStore()
  
  // 1. Delete UserKey entity (find by user reference)
  try {
    // Get all UserKey entities and find the one for this user
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
  
  // 2. Delete User entity
  try {
    await entityStore.deleteEntity(`User::"${userId}"`)
  } catch (error: any) {
    console.warn(`[USER SERVICE] Failed to delete User entity:`, error.message)
  }
  
  // 3. Delete all API keys (foreign key will handle this, but explicit is better)
  db.prepare('DELETE FROM user_agent_keys WHERE auth_id = ?').run(userId)
  
  // 4. Delete all refresh tokens (foreign key will handle this)
  db.prepare('DELETE FROM refresh_tokens WHERE auth_id = ?').run(userId)
  
  // 5. Delete the user from auth table
  db.prepare('DELETE FROM auth WHERE id = ?').run(userId)
}

/**
 * Reset user password
 */
export async function resetUserPassword(userId: string): Promise<{ password: string; emailSent: boolean }> {
  const db = getDatabase()
  
  const user = getUserById(userId)
  if (!user) {
    throw new Error('User not found')
  }
  
  // Generate new password
  const newPassword = generatePassword(16)
  const passwordHash = await hashPassword(newPassword)
  
  // Update password
  db.prepare('UPDATE auth SET password = ?, updated_at = datetime(\'now\') WHERE id = ?').run(passwordHash, userId)
  
  // Attempt to send password reset email (if configured)
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
      to: user.email, // Use decrypted email
      subject: 'Your ZS AI Gateway Password Has Been Reset',
      html: emailContent.html,
      text: emailContent.text
    })
    
    if (emailSent) {
      console.log(`[USER SERVICE] Password reset email sent to ${user.email}`)
    }
  } catch (error: any) {
    console.warn(`[USER SERVICE] Failed to send password reset email to ${user.email}:`, error.message)
    // Continue anyway - email failure shouldn't block password reset
  }
  
  return {
    password: newPassword, // Return plain password (shown once if email not sent)
    emailSent
  }
}

/**
 * Map database user (auth table) to User interface
 */
function mapDbUserToUser(dbUser: any): User {
  // Decrypt email
  let decryptedEmail: string
  try {
    decryptedEmail = decrypt(dbUser.email)
  } catch (error: any) {
    // If decryption fails, it might be plain text (for migration)
    console.warn('[USER SERVICE] Failed to decrypt email, treating as plain text:', error.message)
    decryptedEmail = dbUser.email
  }
  
  // Map status INTEGER to number
  const status = typeof dbUser.status === 'number' ? dbUser.status : 
                 dbUser.status === 'active' ? 1 : 
                 dbUser.status === 'inactive' ? 0 : 2
  
  return {
    id: dbUser.id,
    userId: dbUser.id, // Same as id
    email: decryptedEmail,
    name: dbUser.name || '', // Plain text
    department: dbUser.dept || undefined, // Plain text
    isAgent: dbUser.is_agent === 1,
    status,
    createdAt: dbUser.created_at,
    updatedAt: dbUser.updated_at,
    lastSignIn: dbUser.last_sign_in || undefined
  }
}
