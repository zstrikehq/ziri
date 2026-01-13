// Password utilities

import bcrypt from 'bcrypt'
import { randomBytes } from 'crypto'

const SALT_ROUNDS = 10

/**
 * Generate a secure random password
 */
export function generatePassword(length: number = 16): string {
  // Generate random bytes and convert to base64
  const bytes = randomBytes(length)
  return bytes.toString('base64').slice(0, length)
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}
