import { defineStore } from 'pinia'
import type { Key } from '~/types/entity'

export const useKeysStore = defineStore('keys', {
    state: () => ({
        keys: [] as Key[],
        currentKey: null as Key | null,
        loading: false,
        error: null as string | null
    }),

    getters: {
        activeKeys: (state) => state.keys.filter(k => k.status === 'active'),
        revokedKeys: (state) => state.keys.filter(k => k.status === 'revoked'),
        totalDailySpend: (state) => state.keys.reduce((acc, k) => acc + k.currentDailySpend, 0)
    }
})
