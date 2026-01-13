import { defineStore } from 'pinia'
import { useApi } from '~/composables/useApi'
import { useConfigStore } from './config'
import type { CedarSchema } from '~/types/cedar'
import type { SchemaApiResponse } from '~/types/api'

export const useSchemaStore = defineStore('schema', {
    state: () => ({
        schema: null as CedarSchema | null,
        version: '',
        lastSyncedAt: null as Date | null,
        loading: false,
        error: null as string | null
    }),

    getters: {
        schemaString: (state) => {
            return state.schema ? JSON.stringify(state.schema, null, 2) : ''
        }
    },

    actions: {
        async fetchSchema() {
            this.loading = true
            this.error = null

            try {
                const configStore = useConfigStore()
                const { apiCall } = useApi()

                const response = await apiCall<SchemaApiResponse>(
                    `/api/v2025-01/projects/${configStore.projectId}/schema`
                )

                this.schema = response.data.schema
                this.version = response.data.version
                this.lastSyncedAt = new Date()
            } catch (e: any) {
                this.error = e.message
                throw e
            } finally {
                this.loading = false
            }
        },

        async updateSchema(schemaStr: string) {
            this.loading = true
            this.error = null

            try {
                const schema = JSON.parse(schemaStr)
                const configStore = useConfigStore()
                const { apiCall } = useApi()

                await apiCall(
                    `/api/v2025-01/projects/${configStore.projectId}/schema`,
                    {
                        method: 'POST',
                        body: { schema }
                    }
                )

                // Refresh after update to get version
                await this.fetchSchema()
            } catch (e: any) {
                this.error = e.message
                throw e
            } finally {
                this.loading = false
            }
        }
    }
})
