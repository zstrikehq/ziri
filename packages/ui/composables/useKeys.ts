import { useApi } from './useApi'
import { useAdminAuth } from './useAdminAuth'
import { useConfigStore } from '~/stores/config'
import { useKeysStore } from '~/stores/keys'
import { useToast } from './useToast'
import type { Key, Entity, CreateKeyInput } from '~/types/entity'
import type { EntitiesResponse } from '~/types/api'
import { parseDecimal, toDecimal, toIp } from '~/utils/cedar'

export function useKeys() {
    const { apiCall, loading, error } = useApi()
    const configStore = useConfigStore()
    const keysStore = useKeysStore()
    const toast = useToast()

    const mapEntityToKey = (entity: Entity): Key => ({
        userId: entity.uid.id,
        name: entity.attrs.name || '',
        email: entity.attrs.email || '',
        role: entity.attrs.role || '',
        department: entity.attrs.department || '',
        apiKey: `sk-${entity.uid.id}...`,
        currentDailySpend: parseDecimal(entity.attrs.current_daily_spend),
        dailySpendLimit: parseDecimal(entity.attrs.daily_spend_limit),
        currentMonthlySpend: parseDecimal(entity.attrs.current_monthly_spend),
        monthlySpendLimit: parseDecimal(entity.attrs.monthly_spend_limit),
        status: entity.attrs.status || 'active',
        createdAt: entity.attrs.created_at || new Date().toISOString()
    })

    const listKeys = async () => {
        console.log('[KEYS] listKeys called, projectId:', configStore.projectId)
        keysStore.loading = true
        try {
            const response = await apiCall<EntitiesResponse>(
                `/api/v2025-01/projects/${configStore.projectId}/entities`
            )
            console.log('[KEYS] ✅ Entities received, count:', response.data.length)
            const keys = response.data.map(mapEntityToKey)
            keysStore.keys = keys
            console.log('[KEYS] Keys processed:', keys.length)
            return keys
        } catch (e: any) {
            console.error('[KEYS] ❌ Error loading keys:', e.message)
            keysStore.error = e.message
            toast.error('Failed to load keys')
            throw e
        } finally {
            keysStore.loading = false
        }
    }

    const getKey = async (userId: string) => {
        keysStore.loading = true
        try {
            // Backend requires UID format: User::"userId" (URL encoded)
            const uid = encodeURIComponent(`User::"${userId}"`)
            const response = await apiCall<EntitiesResponse>(
                `/api/v2025-01/projects/${configStore.projectId}/entities?uid=${uid}`
            )
            if (response.data.length > 0) {
                const key = mapEntityToKey(response.data[0])
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
                    userId: input.userId,
                    role: input.role,
                    department: input.department,
                    securityClearance: input.securityClearance,
                    trainingCompleted: input.trainingCompleted,
                    yearsOfService: input.yearsOfService,
                    dailySpendLimit: input.dailySpendLimit,
                    monthlySpendLimit: input.monthlySpendLimit
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
        keysStore.loading = true
        try {
            const { getAuthHeader } = useAdminAuth()
            const authHeader = getAuthHeader()
            if (!authHeader) {
                throw new Error('Please login first')
            }
            
            // Delete entity by UID name: User::"userId"
            const entityName = `User::"${userId}"`

            await apiCall(`/api/v2025-01/projects/${configStore.projectId}/entity`, {
                method: 'DELETE',
                query: {
                    entityName
                }
            })

            // Also delete from proxy database
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
            toast.success('Key deleted successfully')
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

    return {
        listKeys,
        getKey,
        createKey,
        deleteKey,
        rotateKey,
        loading: computed(() => keysStore.loading),
        error: computed(() => keysStore.error),
        keys: computed(() => keysStore.keys),
        currentKey: computed(() => keysStore.currentKey)
    }
}
