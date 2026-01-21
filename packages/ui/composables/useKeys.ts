import { computed } from 'vue'
import { useAdminAuth } from './useAdminAuth'
import { useKeysStore } from '~/stores/keys'
import { useToast } from './useToast'
import type { Key, Entity, CreateKeyInput } from '~/types/entity'
import type { EntitiesResponse } from '~/types/api'
import { parseDecimal } from '~/utils/cedar'

export function useKeys() {
    const keysStore = useKeysStore()
    const toast = useToast()

    const mapEntityToKey = (entity: Entity & { apiKey?: string | null; userKeyId?: string; executionKey?: string | null }, allEntities?: Entity[]): Key => {
        // Entity UID is now UserKey::"userKeyId"
        // User info is in entity.attrs.user.__entity
        const userKeyId = entity.uid.type === 'UserKey' ? entity.uid.id : (entity as any).userKeyId
        const userEntityRef = entity.attrs.user && (entity.attrs.user as any).__entity ? (entity.attrs.user as any).__entity : null
        const userId = userEntityRef ? userEntityRef.id : (entity.attrs as any).user_id || ''
        
        // Get API key (should only be one now since we delete on rotate)
        const apiKey = entity.apiKey || `sk-zs-${userId}-...`
        
        // Find User entity to get user info (name, email, department, etc.)
        let userEntity: Entity | null = null
        if (allEntities && userEntityRef) {
            userEntity = allEntities.find(e => 
                e.uid.type === userEntityRef.type && 
                e.uid.id === userEntityRef.id
            ) || null
        }
        
        // Get user info from User entity or fallback to empty strings
        const name = userEntity ? (userEntity.attrs as any).name || '' : ''
        const email = userEntity ? (userEntity.attrs as any).email || '' : ''
        const department = userEntity ? (userEntity.attrs as any).department || '' : ''
        const isAgent = userEntity ? (userEntity.attrs as any).is_agent || false : false
        const limitRequestsPerMinute = userEntity ? (userEntity.attrs as any).limit_requests_per_minute || 0 : 0
        
        return {
            userId: userId,
            userKeyId: userKeyId, // UserKey entity ID
            executionKey: (entity as any).executionKey || undefined, // user_agent_keys.id for cost tracking
            name: name,
            email: email,
            department: department,
            isAgent: isAgent,
            limitRequestsPerMinute: limitRequestsPerMinute,
            apiKey: apiKey,
            currentDailySpend: parseDecimal(entity.attrs.current_daily_spend),
            currentMonthlySpend: parseDecimal(entity.attrs.current_monthly_spend),
            lastDailyReset: entity.attrs.last_daily_reset as string | undefined,
            lastMonthlyReset: entity.attrs.last_monthly_reset as string | undefined,
            status: (entity.attrs.status as 'active' | 'revoked' | 'disabled') || 'active',
            createdAt: new Date().toISOString() // UserKey doesn't have created_at in attrs
        }
    }

    const listKeys = async () => {
        keysStore.loading = true
        try {
            const { getAuthHeader } = useAdminAuth()
            const authHeader = getAuthHeader()
            if (!authHeader) {
                throw new Error('Please login first')
            }
            
            // Call proxy server endpoint (local mode) with auth header
            // Include API keys in the response
            const response = await fetch('/api/entities?includeApiKeys=true', {
                headers: {
                    'Authorization': authHeader
                }
            })
            
            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: response.statusText }))
                throw new Error(error.error || 'Failed to load entities')
            }
            
            const data: EntitiesResponse = await response.json()
            // Filter to only UserKey entities (not Key entities anymore)
            const userKeyEntities = data.data.filter(e => e.uid.type === 'UserKey')
            // Map entities to keys (need all entities to find User entities)
            const keys = userKeyEntities.map(e => mapEntityToKey(e, data.data))
            keysStore.keys = keys
            return keys
        } catch (e: any) {
            keysStore.error = e.message
            toast.error('Failed to load keys')
            throw e
        } finally {
            keysStore.loading = false
        }
    }

    const getKey = async (userKeyId: string) => {
        keysStore.loading = true
        try {
            const { getAuthHeader } = useAdminAuth()
            const authHeader = getAuthHeader()
            if (!authHeader) {
                throw new Error('Please login first')
            }
            
            // Call proxy server endpoint (local mode) with auth header
            // Entity UID is now UserKey::"userKeyId"
            const uid = encodeURIComponent(`UserKey::"${userKeyId}"`)
            const response = await fetch(`/api/entities?uid=${uid}&includeApiKeys=true`, {
                headers: {
                    'Authorization': authHeader
                }
            })
            
            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: response.statusText }))
                throw new Error(error.error || 'Failed to load entity')
            }
            
            const data: EntitiesResponse = await response.json()
            if (data.data.length > 0) {
                // Get all entities to find User entity
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
        } catch (e: any) {
            keysStore.error = e.message
            toast.error('Failed to load key details')
            throw e
        } finally {
            keysStore.loading = false
        }
    }
    
    const getKeyByUserId = async (userId: string) => {
        // Get all keys for a user (filter by user reference in UserKey entity)
        keysStore.loading = true
        try {
            const { getAuthHeader } = useAdminAuth()
            const authHeader = getAuthHeader()
            if (!authHeader) {
                throw new Error('Please login first')
            }
            
            // Get all entities and filter by UserKey entities with matching user reference
            const response = await fetch(`/api/entities?includeApiKeys=true`, {
                headers: {
                    'Authorization': authHeader
                }
            })
            
            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: response.statusText }))
                throw new Error(error.error || 'Failed to load entities')
            }
            
            const data: EntitiesResponse = await response.json()
            // Filter to only UserKey entities with matching user reference
            const userKeys = data.data
                .filter(e => {
                    if (e.uid.type !== 'UserKey') return false
                    const userRef = (e.attrs as any).user?.__entity
                    return userRef && userRef.id === userId
                })
                .map(e => mapEntityToKey(e, data.data))
            
            if (userKeys.length > 0) {
                // Return first key (should only be one per user now)
                keysStore.currentKey = userKeys[0]
                return userKeys[0]
            }
            throw new Error('Key not found for user')
        } catch (e: any) {
            keysStore.error = e.message
            toast.error('Failed to load key details')
            throw e
        } finally {
            keysStore.loading = false
        }
    }

    const createKey = async (input: CreateKeyInput) => {
        keysStore.loading = true
        try {
            const { getAuthHeader } = useAdminAuth()
            const authHeader = getAuthHeader()
            if (!authHeader) {
                throw new Error('Please login first')
            }
            
            // Use relative URL - Nuxt server API will proxy to proxy server
            const response = await fetch('/api/keys', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': authHeader
                },
                body: JSON.stringify({
                    userId: input.userId
                    // UserKey entity is created with user, so we only need userId
                })
            })
            
            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: response.statusText }))
                throw new Error(error.error || 'Failed to create key')
            }
            
            const result = await response.json()
            
            // Reload keys to get updated list
            await listKeys()
            
            return { userId: result.userId, apiKey: result.apiKey }
        } catch (e: any) {
            keysStore.error = e.message
            toast.error(`Failed to create key: ${e.message}`)
            throw e
        } finally {
            keysStore.loading = false
        }
    }

    const deleteKey = async (userId: string) => {
        // Delete all keys for a user
        keysStore.loading = true
        try {
            const { getAuthHeader } = useAdminAuth()
            const authHeader = getAuthHeader()
            if (!authHeader) {
                throw new Error('Please login first')
            }
            
            // Delete all keys for user (and their entities)
            const response = await fetch(`/api/keys/${userId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': authHeader
                }
            })
            
            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: response.statusText }))
                throw new Error(error.error || 'Failed to delete key from proxy')
            }

            await listKeys()
            toast.success('Keys deleted successfully')
        } catch (e: any) {
            keysStore.error = e.message
            toast.error('Failed to delete key')
            throw e
        } finally {
            keysStore.loading = false
        }
    }

    const rotateKey = async (userId: string): Promise<{ apiKey: string }> => {
        keysStore.loading = true
        try {
            const { getAuthHeader } = useAdminAuth()
            const authHeader = getAuthHeader()
            if (!authHeader) {
                throw new Error('Please login first')
            }
            
            // Use relative URL - Nuxt server API will proxy to proxy server
            const response = await fetch(`/api/keys/${userId}/rotate`, {
                method: 'POST',
                headers: {
                    'Authorization': authHeader
                }
            })
            
            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: response.statusText }))
                throw new Error(error.error || 'Failed to rotate key')
            }
            
            const result = await response.json()
            
            // Reload keys to get updated list
            await listKeys()
            
            return { apiKey: result.apiKey }
        } catch (e: any) {
            keysStore.error = e.message
            toast.error(`Failed to rotate key: ${e.message}`)
            throw e
        } finally {
            keysStore.loading = false
        }
    }

    const updateKey = async (userKeyId: string, entity: Entity): Promise<void> => {
        keysStore.loading = true
        try {
            const { getAuthHeader } = useAdminAuth()
            const authHeader = getAuthHeader()
            if (!authHeader) {
                throw new Error('Please login first')
            }
            
            // Update entity via proxy server (entity UID is UserKey::"userKeyId")
            const statusValue = entity.attrs.status === 'active' ? 1 : 
                               entity.attrs.status === 'revoked' ? 2 : 0
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
                throw new Error(error.error || 'Failed to update entity')
            }
            
            // Reload keys to get updated list
            await listKeys()
            toast.success('Key updated successfully')
        } catch (e: any) {
            keysStore.error = e.message
            toast.error(`Failed to update key: ${e.message}`)
            throw e
        } finally {
            keysStore.loading = false
        }
    }

    return {
        listKeys,
        getKey,
        getKeyByUserId,
        createKey,
        deleteKey,
        rotateKey,
        updateKey,
        loading: computed(() => keysStore.loading),
        error: computed(() => keysStore.error),
        keys: computed(() => keysStore.keys),
        currentKey: computed(() => keysStore.currentKey)
    }
}
