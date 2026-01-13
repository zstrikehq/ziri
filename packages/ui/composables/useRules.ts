import { useApi } from './useApi'
import { useConfigStore } from '~/stores/config'
import { useRulesStore } from '~/stores/rules'
import { useToast } from './useToast'
import type { Policy, CreatePolicyInput } from '~/types/cedar'
import type { PoliciesResponse } from '~/types/api'
import { extractPolicyEffect } from '~/utils/cedar'

export function useRules() {
    const { apiCall, loading, error } = useApi()
    const configStore = useConfigStore()
    const rulesStore = useRulesStore()
    const toast = useToast()

    const listRules = async () => {
        console.log('[RULES] listRules called, projectId:', configStore.projectId)
        rulesStore.loading = true
        rulesStore.error = null
        try {
            const response = await apiCall<PoliciesResponse>(
                `/api/v2025-01/projects/${configStore.projectId}/policies`
            )

            console.log('[RULES] ✅ Policies received, count:', response.data.policies.length)
            const rules: Policy[] = response.data.policies.map(p => ({
                policy: p.policy,
                description: p.description,
                effect: extractPolicyEffect(p.policy),
                isActive: true
            }))

            rulesStore.rules = rules
            console.log('[RULES] Rules processed:', rules.length)
            return rules
        } catch (e: any) {
            console.error('[RULES] ❌ Error loading rules:', e.message)
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
            await apiCall(`/api/v2025-01/projects/${configStore.projectId}/policies`, {
                method: 'POST',
                body: {
                    policy: input.policy,
                    description: input.description
                }
            })

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

    const deleteRule = async (policy: string) => {
        rulesStore.loading = true
        rulesStore.error = null
        try {
            await apiCall(`/api/v2025-01/projects/${configStore.projectId}/policies`, {
                method: 'DELETE',
                body: { policy }
            })

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

    return {
        listRules,
        createRule,
        deleteRule,
        loading: computed(() => rulesStore.loading),
        error: computed(() => rulesStore.error),
        rules: computed(() => rulesStore.rules)
    }
}
