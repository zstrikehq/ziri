import { serviceFactory } from './service-factory.js'
import type { Entity } from '../types/entity.js'

const ROLE_ID_REGEX = /^[a-zA-Z0-9_-]+$/

export interface ListRolesParams {
  search?: string
  limit?: number
  offset?: number
  sortBy?: string | null
  sortOrder?: 'asc' | 'desc' | null
}

export interface RoleItem {
  id: string
}

export interface RoleUsage {
  count: number
  userIds?: string[]
}

export async function listRoles(params?: ListRolesParams): Promise<{ roles: RoleItem[]; total: number }> {
  const entityStore = serviceFactory.getEntityStore()
  const result = await entityStore.getEntities(undefined, {
    entityType: 'Role',
    limit: 10000,
    offset: 0
  })
  let roles = result.data.map((e: Entity) => ({ id: e.uid.id }))
  if (params?.search) {
    const q = params.search.toLowerCase()
    roles = roles.filter(r => r.id.toLowerCase().includes(q))
  }
  const total = roles.length

  if (params?.sortBy === 'id' && params.sortOrder) {
    roles.sort((a, b) => {
      const cmp = a.id.toLowerCase().localeCompare(b.id.toLowerCase())
      return params.sortOrder === 'asc' ? cmp : -cmp
    })
  }

  const limit = params?.limit ?? 100
  const offset = params?.offset ?? 0
  const paged = roles.slice(offset, offset + limit)

  return { roles: paged, total }
}

export async function createRole(id: string): Promise<void> {
  if (!ROLE_ID_REGEX.test(id)) {
    throw new Error('Role id must contain only letters, numbers, underscores and hyphens')
  }
  const entityStore = serviceFactory.getEntityStore()
  const entity: Entity = {
    uid: { type: 'Role', id },
    attrs: {},
    parents: []
  }
  try {
    await entityStore.createEntity(entity, 1)
  } catch (error: any) {
    const msg = String(error?.message || '')
    if (msg.includes('Entity already exists') || msg.includes('409')) {
      await entityStore.updateEntity(entity, 1)
      return
    }
    throw error
  }
}

export async function getRoleUsage(roleId: string, includeUserIds = false): Promise<RoleUsage> {
  const entityStore = serviceFactory.getEntityStore()
  const pageSize = 500
  let offset = 0
  let total = 0
  const matches: Entity[] = []



  for (;;) {
    const result = await entityStore.getEntities(undefined, {
      entityType: 'User',
      limit: pageSize,
      offset
    })
    const batch = result.data
    total = result.total
    if (!batch.length) {
      break
    }

    for (const e of batch as Entity[]) {
      if (e.parents?.some((p: { type: string; id: string }) => p.type === 'Role' && p.id === roleId)) {
        matches.push(e)
      }
    }

    offset += batch.length
    if (offset >= total) {
      break
    }
  }

  const userIds = includeUserIds ? matches.map((e: Entity) => e.uid.id) : undefined
  return { count: matches.length, userIds }
}

export async function deleteRole(id: string): Promise<void> {
  const usage = await getRoleUsage(id)
  if (usage.count > 0) {
    const msg = `Cannot delete role: ${usage.count} user(s) have this role. Reassign or remove the role from those users first.`
    const err = new Error(msg) as Error & { statusCode?: number }
    err.statusCode = 409
    throw err
  }
  const entityStore = serviceFactory.getEntityStore()
  await entityStore.deleteEntity(`Role::"${id}"`)
}
