import { useApi } from './useApi'
import { useConfigStore } from '~/stores/config'
import { useSchemaStore } from '~/stores/schema'
import { useToast } from './useToast'
import type { SchemaApiResponse } from '~/types/api'

export function useSchema() {
    const { apiCall, loading, error } = useApi()
    const configStore = useConfigStore()
    const schemaStore = useSchemaStore()
    const toast = useToast()

    const getSchema = async () => {
        console.log('[SCHEMA] getSchema called, projectId:', configStore.projectId)
        schemaStore.loading = true
        schemaStore.error = null
        try {
            const response = await apiCall<SchemaApiResponse>(
                `/api/v2025-01/projects/${configStore.projectId}/schema`
            )

            console.log('[SCHEMA] ✅ Schema received, version:', response.data.version)
            schemaStore.schema = response.data.schema
            schemaStore.version = response.data.version
            schemaStore.lastSyncedAt = new Date()
            return {
                schema: response.data.schema,
                version: response.data.version
            }
        } catch (e: any) {
            console.error('[SCHEMA] ❌ Error loading schema:', e.message)
            schemaStore.error = e.message
            toast.error('Failed to load schema')
            throw e
        } finally {
            schemaStore.loading = false
        }
    }

    const refreshSchema = async () => {
        await getSchema()
        toast.success('Schema refreshed')
    }

    return {
        getSchema,
        refreshSchema,
        loading: computed(() => schemaStore.loading),
        error: computed(() => schemaStore.error),
        schema: computed(() => schemaStore.schema),
        schemaString: computed(() => schemaStore.schemaString),
        version: computed(() => schemaStore.version),
        lastSyncedAt: computed(() => schemaStore.lastSyncedAt)
    }
}
