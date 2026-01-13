import { defineStore } from 'pinia'
import { useApi } from '~/composables/useApi'
import { useConfigStore } from './config'
import type { Policy, CreatePolicyInput } from '~/types/cedar'
import type { PoliciesResponse } from '~/types/api'

export const useRulesStore = defineStore('rules', {
    state: () => ({
        rules: [] as Policy[],
        loading: false,
        error: null as string | null
    }),

    getters: {
    },

    actions: {
        extractEffect(policy: string): 'permit' | 'forbid' {
            return policy.trim().startsWith('forbid') ? 'forbid' : 'permit'
        },

        async fetchRules() {
            this.loading = true
            this.error = null

            try {
                const configStore = useConfigStore()
                const { apiCall } = useApi()

                const response = await apiCall<PoliciesResponse>(
                    `/api/v2025-01/projects/${configStore.projectId}/policies`
                )

                this.rules = response.data.policies.map(p => ({
                    ...p,
                    effect: this.extractEffect(p.policy),
                    isActive: true
                }))
            } catch (e: any) {
                this.error = e.message
                throw e
            } finally {
                this.loading = false
            }
        },

        async createRule(input: CreatePolicyInput) {
            this.loading = true
            try {
                const configStore = useConfigStore()
                const { apiCall } = useApi()

                await apiCall(
                    `/api/v2025-01/projects/${configStore.projectId}/policies`,
                    {
                        method: 'POST',
                        body: input
                    }
                )

                await this.fetchRules()
            } catch (e: any) {
                this.error = e.message
                throw e
            } finally {
                this.loading = false
            }
        },

        async deleteRule(policyId: string) {
            this.loading = true
            try {
                const configStore = useConfigStore()
                const { apiCall } = useApi()

                await apiCall(
                    `/api/v2025-01/projects/${configStore.projectId}/policies`,
                    {
                        method: 'DELETE',
                        body: { policy: policyId } // Backend expects the policy content as ID for deletion based on docs
                    }
                )

                await this.fetchRules()
            } catch (e: any) {
                this.error = e.message
                throw e
            } finally {
                this.loading = false
            }
        }
    }
})
