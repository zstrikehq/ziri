import { defineStore } from 'pinia'
import type { Policy } from '~/types/cedar'

export const useRulesStore = defineStore('rules', {
    state: () => ({
        rules: [] as Policy[],
        loading: false,
        error: null as string | null
    })
})
