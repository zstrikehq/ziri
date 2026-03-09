import { defineStore } from 'pinia'
import type { CedarSchema } from '~/types/cedar'

export const useSchemaStore = defineStore('schema', {
    state: () => ({
        schema: null as CedarSchema | null,
        schemaCedarText: null as string | null,
        version: '',
        lastSyncedAt: null as Date | null,
        loading: false,
        error: null as string | null
    }),

    getters: {
        schemaString: (state) => {
            return state.schema ? JSON.stringify(state.schema, null, 2) : ''
        }
    }
})
