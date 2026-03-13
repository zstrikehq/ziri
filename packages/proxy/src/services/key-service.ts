import { getDatabase } from '../db/index.js'
import { generateApiKey, hashApiKey } from '../utils/api-key.js'
import { randomBytes } from 'crypto'
import * as userService from './user-service.js'
import { serviceFactory } from './service-factory.js'
import type { Entity } from '../types/entity.js'

export interface CreateKeyInput {
  userId: string
}

export interface ApiKey {
  id: string
  userId: string
  apiKey?: string
  keySuffix?: string
  createdAt: string
}

function findUserKeyEntity(entities: any[], userId: string) {
  return entities.find(e =>
    e.uid.type === 'UserKey' &&
    (e.attrs as any).user?.__entity?.id === userId
  ) || null
}

async function findUserKeyId(userId: string): Promise<string | null> {
  const all = (await serviceFactory.getEntityStore().getEntities()).data
  return findUserKeyEntity(all, userId)?.uid.id ?? null
}

export async function createKey(input: CreateKeyInput): Promise<{ apiKey: string; userId: string }> {
  const db = getDatabase()
  const user = db.prepare('SELECT * FROM auth WHERE id = ?').get(input.userId) as any
  if (!user) throw new Error('User not found')
  if (user.status !== 1) throw new Error('User is not active')

  if (getKeysByUserId(input.userId).length > 0) {
    throw new Error('User already has an API key. Only one key per user is allowed.')
  }

  const entities = serviceFactory.getEntityStore()
  const { toDecimalFour } = await import('../utils/cedar.js')

  // ensure User entity exists
  const allEnts = (await entities.getEntities()).data
  if (!allEnts.some(e => e.uid.type === 'User' && e.uid.id === input.userId)) {
    const { decrypt } = await import('../utils/encryption.js')
    let email = ''
    try { email = decrypt(user.email) } catch { email = user.email || '' }

    await entities.createEntity({
      uid: { type: 'User', id: input.userId },
      attrs: { user_id: input.userId, email, tenant: user.tenant || '', is_agent: user.is_agent === 1, limit_requests_per_minute: 100 },
      parents: []
    }, 1)
  }

  // ensure UserKey entity exists
  let keyEntityId = findUserKeyEntity(allEnts, input.userId)?.uid.id
  if (!keyEntityId) {
    keyEntityId = `uk-${randomBytes(8).toString('hex')}`
    const now = new Date().toISOString()
    await entities.createEntity({
      uid: { type: 'UserKey', id: keyEntityId },
      attrs: {
        current_daily_spend: toDecimalFour(0), current_monthly_spend: toDecimalFour(0),
        last_daily_reset: now, last_monthly_reset: now,
        status: 'active' as const,
        user: { __entity: { type: 'User', id: input.userId } }
      },
      parents: []
    }, 1)
  }

  const key = generateApiKey()
  db.prepare(`INSERT INTO user_agent_keys (id, key_value, key_hash, auth_id, status) VALUES (?,?,?,?,'active')`)
    .run(`key-${randomBytes(8).toString('hex')}`, key.slice(-5), hashApiKey(key), input.userId)

  return { apiKey: key, userId: input.userId }
}

export function listKeys(): ApiKey[] {
  return (getDatabase().prepare(
    `SELECT * FROM user_agent_keys WHERE status IN ('active','disabled') ORDER BY created_at DESC`
  ).all() as any[]).map(toApiKey)
}

export function getKeyByHash(hash: string): ApiKey | null {
  const row = getDatabase().prepare(`SELECT * FROM user_agent_keys WHERE key_hash = ? AND status = 'active'`).get(hash) as any
  return row ? toApiKey(row) : null
}

export function getKeyByApiKey(raw: string): ApiKey | null {
  return getKeyByHash(hashApiKey(raw))
}

export function getKeyHashByApiKey(raw: string): string | null {
  const h = hashApiKey(raw)
  const row = getDatabase().prepare(`SELECT key_hash FROM user_agent_keys WHERE key_hash = ? AND status = 'active'`).get(h) as any
  return row?.key_hash || null
}

export function getKeysByUserId(userId: string): ApiKey[] {
  return (getDatabase().prepare(
    `SELECT * FROM user_agent_keys WHERE auth_id = ? AND status IN ('active','disabled') ORDER BY created_at DESC`
  ).all(userId) as any[]).map(toApiKey)
}

export async function getUserKeyIdForUser(userId: string): Promise<string | null> {
  return findUserKeyId(userId)
}

export async function rotateKey(userId: string): Promise<{ apiKey: string; userId: string }> {
  const db = getDatabase()
  const user = db.prepare('SELECT * FROM auth WHERE id = ?').get(userId) as any
  if (!user) throw new Error('User not found')
  if (user.status !== 1) throw new Error('User is not active')

  if (!await findUserKeyId(userId)) {
    throw new Error('UserKey entity not found for user. User may not have been properly created.')
  }

  // soft-delete old keys
  db.prepare(`UPDATE user_agent_keys SET status = 'deleted', updated_at = datetime('now') WHERE auth_id = ?`).run(userId)

  const key = generateApiKey()
  db.prepare(`INSERT INTO user_agent_keys (id, key_value, key_hash, auth_id, status) VALUES (?,?,?,?,'active')`)
    .run(`key-${randomBytes(8).toString('hex')}`, key.slice(-5), hashApiKey(key), userId)

  return { apiKey: key, userId }
}

export async function deleteKeyById(keyId: string): Promise<void> {
  const db = getDatabase()
  const row = db.prepare('SELECT auth_id FROM user_agent_keys WHERE id = ?').get(keyId) as { auth_id: string } | undefined
  if (!row) throw new Error('API key not found')

  db.prepare(`UPDATE user_agent_keys SET status = 'deleted', updated_at = datetime('now') WHERE id = ?`).run(keyId)
  await syncKeyEntityStatus(row.auth_id, 'deleted')
}

export async function deleteKeysByUserId(userId: string): Promise<void> {
  getDatabase().prepare(`UPDATE user_agent_keys SET status = 'deleted', updated_at = datetime('now') WHERE auth_id = ?`).run(userId)
  await syncKeyEntityStatus(userId, 'deleted')
}

async function syncKeyEntityStatus(userId: string, status: 'active' | 'disabled' | 'deleted') {
  try {
    const store = serviceFactory.getEntityStore()
    const keyId = await findUserKeyId(userId)
    if (!keyId) return

    const all = (await store.getEntities()).data
    const ent = all.find((e: any) => e.uid.type === 'UserKey' && e.uid.id === keyId)
    if (!ent) return

    await store.updateEntity(
      { ...ent, attrs: { ...ent.attrs, status } },
      status === 'deleted' ? 0 : status === 'disabled' ? 2 : 1
    )
  } catch (err: any) {
    console.warn('key entity status sync failed:', err.message)
  }
}

function toApiKey(row: any): ApiKey {
  return {
    id: row.id,
    userId: row.auth_id,
    keySuffix: row.key_value?.length <= 5 ? row.key_value : '-----',
    createdAt: row.created_at
  }
}
