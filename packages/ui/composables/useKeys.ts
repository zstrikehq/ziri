import { computed } from 'vue'
import { useAdminAuth } from './useAdminAuth'
import { useKeysStore } from '~/stores/keys'
import { useToast } from './useToast'
import { extractApiErrorMessage, useApiError } from './useApiError'
import { runWithAuth } from './useApiCall'
import type { Key, Entity, CreateKeyInput } from '~/types/entity'
import type { EntitiesResponse } from '~/types/api'
import { parseDecimal } from '~/utils/cedar'

export function useKeys() {
    const keysStore = useKeysStore()
    const toast = useToast()
    const { getUserMessage } = useApiError()
    const { getAuthHeader } = useAdminAuth()

    const runKeysCall = <T>(run: (authHeader: string) => Promise<T>) => {
        return runWithAuth({
            setLoading: (value) => { keysStore.loading = value },
            setError: (value) => { keysStore.error = value },
            getAuthHeader,
            onError: (e) => { toast.error(getUserMessage(e)) }
        }, run)
    }

    const mapEntityToKey = (entity: Entity & { apiKey?: string | null; keySuffix?: string; userKeyId?: string; executionKey?: string | null }, allEntities?: Entity[]): Key => {
        const userKeyId = entity.uid.type === 'UserKey' ? entity.uid.id : (entity as any).userKeyId
        const userEntityRef = entity.attrs.user && (entity.attrs.user as any).__entity ? (entity.attrs.user as any).__entity : null
        const userId = userEntityRef ? userEntityRef.id : (entity.attrs as any).user_id || ''

        const keySuffix = entity.keySuffix ?? (entity as any).keySuffix
        const apiKey = entity.apiKey ?? undefined

        let userEntity: Entity | null = null
        if (allEntities && userEntityRef) {
            userEntity = allEntities.find(e =>
                e.uid.type === userEntityRef.type &&
                e.uid.id === userEntityRef.id
            ) || null
        }

        const name = userEntity ? (userEntity.attrs as any).name || '' : ''
        const email = userEntity ? (userEntity.attrs as any).email || '' : ''
        const tenant = userEntity ? (userEntity.attrs as any).tenant || '' : ''
        const isAgent = userEntity ? (userEntity.attrs as any).is_agent || false : false
        const limitRequestsPerMinute = userEntity ? (userEntity.attrs as any).limit_requests_per_minute || 0 : 0

        return {
            userId: userId,
            userKeyId: userKeyId,
            executionKey: (entity as any).executionKey || undefined,
            name: name,
            email: email,
            tenant: tenant,
            isAgent: isAgent,
            limitRequestsPerMinute: limitRequestsPerMinute,
            apiKey: apiKey,
            keySuffix: keySuffix,
            currentDailySpend: parseDecimal(entity.attrs.current_daily_spend),
            currentMonthlySpend: parseDecimal(entity.attrs.current_monthly_spend),
            lastDailyReset: entity.attrs.last_daily_reset as string | undefined,
            lastMonthlyReset: entity.attrs.last_monthly_reset as string | undefined,
            status: (entity.attrs.status as 'active' | 'disabled' | 'deleted') || 'active',
            createdAt: new Date().toISOString()
        }
    }

    const listKeys = async (params?: {
        search?: string
        limit?: number
        offset?: number
        sortBy?: string | null
        sortOrder?: 'asc' | 'desc' | null
    }) => {
        return runKeysCall(async (authHeader) => {
            const baseParams = new URLSearchParams()
            baseParams.set('includeApiKeys', 'true')
            baseParams.set('entityType', 'UserKey')

            const baseUrl = `/api/entities?${baseParams.toString()}`

            const response = await fetch(baseUrl, {
                headers: {
                    'Authorization': authHeader
                }
            })

            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: response.statusText }))
                throw new Error(extractApiErrorMessage({ data: error }, 'Failed to load entities'))
            }

            const data: EntitiesResponse = await response.json()
            const userKeyEntities = data.data.filter(e => e.uid.type === 'UserKey')

            const allEntitiesResponse = await fetch('/api/entities', {
                headers: {
                    'Authorization': authHeader
                }
            })
            const allEntitiesData: EntitiesResponse = await allEntitiesResponse.json()

            let keys = userKeyEntities.map(e => mapEntityToKey(e, allEntitiesData.data))

            if (params?.search) {
                const q = params.search.toLowerCase()
                keys = keys.filter(k =>
                    k.userId.toLowerCase().includes(q) ||
                    (k.name && k.name.toLowerCase().includes(q)) ||
                    (k.email && k.email.toLowerCase().includes(q)) ||
                    (k.keySuffix && k.keySuffix.toLowerCase().includes(q))
                )
            }

            if (params?.sortBy && params?.sortOrder) {
                const key = params.sortBy
                const order = params.sortOrder
                keys = [...keys].sort((a: any, b: any) => {
                    const aVal = (a as any)[key] || ''
                    const bVal = (b as any)[key] || ''
                    if (aVal === '' && bVal === '') return 0
                    if (aVal === '') return 1
                    if (bVal === '') return -1
                    if (typeof aVal === 'string' && typeof bVal === 'string') {
                        const cmp = aVal.toLowerCase().localeCompare(bVal.toLowerCase())
                        return order === 'asc' ? cmp : -cmp
                    }
                    const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
                    return order === 'asc' ? cmp : -cmp
                })
            }

            const total = keys.length
            const limit = params?.limit ?? total
            const offset = params?.offset ?? 0
            const paged = keys.slice(offset, offset + limit)

            keysStore.keys = paged
            return { keys: paged, total }
        })
    }

    const getKey = async (userKeyId: string) => {
        return runKeysCall(async (authHeader) => {
            const uid = encodeURIComponent(`UserKey::"${userKeyId}"`)
            const response = await fetch(`/api/entities?uid=${uid}&includeApiKeys=true`, {
                headers: {
                    'Authorization': authHeader
                }
            })
            
            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: response.statusText }))
                throw new Error(extractApiErrorMessage({ data: error }, 'Failed to load entity'))
            }
            
            const data: EntitiesResponse = await response.json()
            if (data.data.length > 0) {
                const allEntitiesResponse = await fetch('/api/entities', {
                    headers: {
                        'Authorization': authHeader
                    }
                })
                const allEntitiesData: EntitiesResponse = await allEntitiesResponse.json()
                const key = mapEntityToKey(data.data[0], allEntitiesData.data)
                keysStore.currentKey = key
                return key
            }
            throw new Error('Key not found')
        })
    }
    
    const getKeyByUserId = async (userId: string) => {
        return runKeysCall(async (authHeader) => {
            const response = await fetch(`/api/entities?includeApiKeys=true`, {
                headers: {
                    'Authorization': authHeader
                }
            })
            
            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: response.statusText }))
                throw new Error(extractApiErrorMessage({ data: error }, 'Failed to load entities'))
            }
            
            const data: EntitiesResponse = await response.json()
            const userKeys = data.data
                .filter(e => {
                    if (e.uid.type !== 'UserKey') return false
                    const userRef = (e.attrs as any).user?.__entity
                    return userRef && userRef.id === userId
                })
                .map(e => mapEntityToKey(e, data.data))
            
            if (userKeys.length > 0) {
                keysStore.currentKey = userKeys[0]
                return userKeys[0]
            }
            throw new Error('Key not found for user')
        })
    }

    const createKey = async (input: CreateKeyInput) => {
        return runKeysCall(async (authHeader) => {
            const response = await fetch('/api/keys', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': authHeader
                },
                body: JSON.stringify({
                    userId: input.userId
                })
            })
            
            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: response.statusText }))
                throw new Error(extractApiErrorMessage({ data: error }, 'Failed to create key'))
            }
            
            const result = await response.json()
            
            await listKeys()
            
            return { userId: result.userId, apiKey: result.apiKey }
        })
    }

    const deleteKeyById = async (keyId: string) => {
        return runKeysCall(async (authHeader) => {
            const response = await fetch(`/api/keys/id/${keyId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': authHeader
                }
            })

            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: response.statusText }))
                throw new Error(extractApiErrorMessage({ data: error }, 'Failed to delete key'))
            }

            await listKeys()
            toast.success('Key deleted')
        })
    }

    const deleteKey = async (userId: string) => {
        return runKeysCall(async (authHeader) => {
            const response = await fetch(`/api/keys/${userId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': authHeader
                }
            })
            
            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: response.statusText }))
                throw new Error(extractApiErrorMessage({ data: error }, 'Failed to delete key from proxy'))
            }

            await listKeys()
            toast.success('Keys removed')
        })
    }

    const rotateKey = async (userId: string): Promise<{ apiKey: string }> => {
        return runKeysCall(async (authHeader) => {
            const response = await fetch(`/api/keys/${userId}/rotate`, {
                method: 'POST',
                headers: {
                    'Authorization': authHeader
                }
            })
            
            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: response.statusText }))
                throw new Error(extractApiErrorMessage({ data: error }, 'Failed to rotate key'))
            }
            
            const result = await response.json()
            
            await listKeys()
            
            return { apiKey: result.apiKey }
        })
    }

    const updateKey = async (userKeyId: string, entity: Entity): Promise<void> => {
        return runKeysCall(async (authHeader) => {
            const statusValue = entity.attrs.status === 'active' ? 1 : 2
            const response = await fetch('/api/entities', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': authHeader
                },
                body: JSON.stringify({
                    entity,
                    status: statusValue
                })
            })
            
            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: response.statusText }))
                throw new Error(extractApiErrorMessage({ data: error }, 'Failed to update entity'))
            }
            
            await listKeys()
            toast.success('Key updated')
        })
    }

    return {
        listKeys,
        getKey,
        getKeyByUserId,
        createKey,
        deleteKey,
        deleteKeyById,
        rotateKey,
        updateKey,
        loading: computed(() => keysStore.loading),
        error: computed(() => keysStore.error),
        keys: computed(() => keysStore.keys),
        currentKey: computed(() => keysStore.currentKey)
    }
}
