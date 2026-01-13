import { defineStore } from 'pinia'

export const useAuthStore = defineStore('auth', {
    state: () => ({
        token: null as string | null,
        tokenExpiry: null as Date | null,
        isLoading: false,
        error: null as string | null
    }),

    getters: {
        isAuthenticated: (state) => {
            if (!state.token || !state.tokenExpiry) return false
            return new Date() < state.tokenExpiry
        }
    },

    actions: {
        setToken(token: string, expiresIn: number) {
            this.token = token
            // Expire 60 seconds early to account for clock skew
            this.tokenExpiry = new Date(Date.now() + (expiresIn - 60) * 1000)
            this.error = null
        },

        clearToken() {
            this.token = null
            this.tokenExpiry = null
        },

        setLoading(loading: boolean) {
            this.isLoading = loading
        },

        setError(error: string | null) {
            this.error = error
        }
    }
})
