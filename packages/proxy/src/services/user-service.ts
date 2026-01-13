// User service - business logic for user management

import { getDatabase } from '../db/index.js'
import { generatePassword, hashPassword } from '../utils/password.js'
import { randomBytes } from 'crypto'

export interface CreateUserInput {
  email: string
  name: string
  // Note: role and department removed - they're now part of key creation
}

export interface User {
  id: number
  userId: string
  email: string
  name: string
  role?: string
  department?: string
  status: string
  createdAt: string
  updatedAt: string
  lastLogin?: string
}

/**
 * Generate a unique userId
 */
function generateUserId(): string {
  // Format: user-{random}
  const random = randomBytes(8).toString('hex')
  return `user-${random}`
}

/**
 * Create a new user
 */
export async function createUser(input: CreateUserInput): Promise<{ user: User; password: string }> {
  const db = getDatabase()
  
  // Check if email already exists
  const existing = db.prepare('SELECT * FROM users WHERE email = ?').get(input.email) as any
  if (existing) {
    throw new Error('User with this email already exists')
  }
  
  // Generate userId and password
  const userId = generateUserId()
  const password = generatePassword(16)
  const passwordHash = await hashPassword(password)
  
  // Insert user (only email and name - role/department moved to key creation)
  const result = db.prepare(`
    INSERT INTO users (user_id, email, name, password_hash, status)
    VALUES (?, ?, ?, ?, 'active')
  `).run(
    userId,
    input.email,
    input.name,
    passwordHash
  )
  
  // Get created user
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid) as any
  
  return {
    user: mapDbUserToUser(user),
    password // Return plain password (shown once)
  }
}

/**
 * List all users
 */
export function listUsers(): User[] {
  const db = getDatabase()
  const users = db.prepare('SELECT * FROM users ORDER BY created_at DESC').all() as any[]
  return users.map(mapDbUserToUser)
}

/**
 * Get user by userId
 */
export function getUserById(userId: string): User | null {
  const db = getDatabase()
  const user = db.prepare('SELECT * FROM users WHERE user_id = ?').get(userId) as any
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
    // Check if email already exists (for another user)
    const emailExists = db.prepare('SELECT * FROM users WHERE email = ? AND user_id != ?').get(updates.email, userId)
    if (emailExists) {
      throw new Error('Email already in use by another user')
    }
    fields.push('email = ?')
    values.push(updates.email)
  }
  
  if (updates.name !== undefined) {
    fields.push('name = ?')
    values.push(updates.name)
  }
  
  // Note: role and department removed - they're now part of key creation
  // Keep columns in DB for backward compatibility, but don't allow updates
  
  if (fields.length === 0) {
    return existing
  }
  
  fields.push('updated_at = CURRENT_TIMESTAMP')
  values.push(userId)
  
  db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE user_id = ?`).run(...values)
  
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
  
  // 1. Delete all entities from Backend API (for each key)
  const keys = db.prepare('SELECT * FROM api_keys WHERE user_id = ?').all(userId) as any[]
  
  // Import here to avoid circular dependency
  const { deleteEntityInBackend } = await import('./entity-service.js')
  
  for (const key of keys) {
    try {
      // Delete entity: DELETE /entity?entityName=User::"userId"
      await deleteEntityInBackend(userId)
    } catch (error: any) {
      // Log but continue - entity might not exist in Backend API
      console.warn(`[USER SERVICE] Failed to delete entity for user ${userId}:`, error.message)
    }
  }
  
  // 2. Delete all API keys (foreign key will handle this, but explicit is better)
  db.prepare('DELETE FROM api_keys WHERE user_id = ?').run(userId)
  
  // 3. Delete all refresh tokens
  db.prepare('DELETE FROM refresh_tokens WHERE user_id = ?').run(userId)
  
  // 4. Delete the user
  db.prepare('DELETE FROM users WHERE user_id = ?').run(userId)
}

/**
 * Reset user password
 */
export async function resetUserPassword(userId: string): Promise<string> {
  const db = getDatabase()
  
  const user = getUserById(userId)
  if (!user) {
    throw new Error('User not found')
  }
  
  // Generate new password
  const newPassword = generatePassword(16)
  const passwordHash = await hashPassword(newPassword)
  
  // Update password
  db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?').run(passwordHash, userId)
  
  return newPassword // Return plain password (shown once)
}

/**
 * Map database user to User interface
 */
function mapDbUserToUser(dbUser: any): User {
  return {
    id: dbUser.id,
    userId: dbUser.user_id,
    email: dbUser.email,
    name: dbUser.name,
    role: dbUser.role || undefined,
    department: dbUser.department || undefined,
    status: dbUser.status,
    createdAt: dbUser.created_at,
    updatedAt: dbUser.updated_at,
    lastLogin: dbUser.last_login || undefined
  }
}
