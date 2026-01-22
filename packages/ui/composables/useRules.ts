import { useRulesStore } from '~/stores/rules'
import { useToast } from './useToast'
import { useAdminAuth } from './useAdminAuth'
import type { Policy, CreatePolicyInput } from '~/types/cedar'
import type { PoliciesResponse } from '~/types/api'
import { extractPolicyEffect } from '~/utils/cedar'

export function useRules() {
    const rulesStore = useRulesStore()
    const toast = useToast()
    const { getAuthHeader } = useAdminAuth()

    const listRules = async (params?: {
        search?: string
        limit?: number
        offset?: number
        effect?: 'permit' | 'forbid'
        sortBy?: string | null
        sortOrder?: 'asc' | 'desc' | null
    }) => {
        rulesStore.loading = true
        rulesStore.error = null
        try {
            const authHeader = getAuthHeader()
            if (!authHeader) {
                throw new Error('Please login first')
            }
            
            // Build query string
            const queryParams = new URLSearchParams()
            if (params?.search) queryParams.set('search', params.search)
            if (params?.limit) queryParams.set('limit', params.limit.toString())
            if (params?.offset) queryParams.set('offset', params.offset.toString())
            if (params?.effect) queryParams.set('effect', params.effect)
            if (params?.sortBy) queryParams.set('sortBy', params.sortBy)
            if (params?.sortOrder) queryParams.set('sortOrder', params.sortOrder)
            
            const url = `/api/policies${queryParams.toString() ? '?' + queryParams.toString() : ''}`
            
            // Call proxy server endpoint (local mode) with auth header
            const response = await fetch(url, {
                headers: {
                    'Authorization': authHeader
                }
            })
            
            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: response.statusText }))
                throw new Error(error.error || 'Failed to load policies')
            }
            
            const data: PoliciesResponse = await response.json()

            const rules: Policy[] = data.data.policies.map(p => ({
                policy: p.policy,
                description: p.description,
                effect: extractPolicyEffect(p.policy),
                isActive: p.isActive
            }))

            rulesStore.rules = rules
            return { rules, total: (data as any).total || rules.length }
        } catch (e: any) {
            rulesStore.error = e.message
            toast.error('Failed to load rules')
            throw e
        } finally {
            rulesStore.loading = false
        }
    }

    const createRule = async (input: CreatePolicyInput) => {
        rulesStore.loading = true
        rulesStore.error = null
        try {
            const authHeader = getAuthHeader()
            if (!authHeader) {
                throw new Error('Please login first')
            }
            
            // Call proxy server endpoint (local mode) with auth header
            const response = await fetch('/api/policies', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': authHeader
                },
                body: JSON.stringify({
                    policy: input.policy,
                    description: input.description
                })
            })
            
            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: response.statusText }))
                throw new Error(error.error || 'Failed to create policy')
            }

            // Reload rules to get the updated list
            await listRules()
            toast.success('Rule created successfully')
        } catch (e: any) {
            rulesStore.error = e.message
            toast.error('Failed to create rule')
            throw e
        } finally {
            rulesStore.loading = false
        }
    }

    const updateRule = async (oldPolicy: string, input: CreatePolicyInput) => {
        rulesStore.loading = true
        rulesStore.error = null
        try {
            const authHeader = getAuthHeader()
            if (!authHeader) {
                throw new Error('Please login first')
            }
            
            // Call proxy server endpoint (local mode) with auth header
            const response = await fetch('/api/policies', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': authHeader
                },
                body: JSON.stringify({
                    oldPolicy,
                    policy: input.policy,
                    description: input.description
                })
            })
            
            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: response.statusText }))
                throw new Error(error.error || 'Failed to update policy')
            }

            // Reload rules to get the updated list
            await listRules()
            toast.success('Rule updated successfully')
        } catch (e: any) {
            rulesStore.error = e.message
            toast.error('Failed to update rule')
            throw e
        } finally {
            rulesStore.loading = false
        }
    }

    const deleteRule = async (policy: string) => {
        rulesStore.loading = true
        rulesStore.error = null
        try {
            const authHeader = getAuthHeader()
            if (!authHeader) {
                throw new Error('Please login first')
            }
            
            // Call proxy server endpoint (local mode) with auth header
            const response = await fetch('/api/policies', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': authHeader
                },
                body: JSON.stringify({ policy })
            })
            
            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: response.statusText }))
                throw new Error(error.error || 'Failed to delete policy')
            }

            // Reload rules to get the updated list
            await listRules()
            toast.success('Rule deleted successfully')
        } catch (e: any) {
            rulesStore.error = e.message
            toast.error('Failed to delete rule')
            throw e
        } finally {
            rulesStore.loading = false
        }
    }

    const setRuleStatus = async (policy: string, isActive: boolean) => {
        rulesStore.loading = true
        rulesStore.error = null
        try {
            const authHeader = getAuthHeader()
            if (!authHeader) {
                throw new Error('Please login first')
            }

            const response = await fetch('/api/policies/status', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': authHeader
                },
                body: JSON.stringify({ policy, isActive })
            })

            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: response.statusText }))
                throw new Error(error.error || 'Failed to update policy status')
            }

            await listRules()
            toast.success(`Rule ${isActive ? 'activated' : 'deactivated'} successfully`)
        } catch (e: any) {
            rulesStore.error = e.message
            toast.error('Failed to update rule status')
            throw e
        } finally {
            rulesStore.loading = false
        }
    }

    return {
        listRules,
        createRule,
        updateRule,
        deleteRule,
        setRuleStatus,
        loading: computed(() => rulesStore.loading),
        error: computed(() => rulesStore.error),
        rules: computed(() => rulesStore.rules)
    }
}
