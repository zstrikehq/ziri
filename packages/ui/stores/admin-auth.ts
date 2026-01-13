import { defineStore } from 'pinia'

export interface AdminUser {
  userId: string
  email: string
  role: string
  name: string
}

export const useAdminAuthStore = defineStore('adminAuth', {
  state: () => ({
    accessToken: null as string | null,
    refreshToken: null as string | null,
    tokenExpiry: null as Date | null,
    user: null as AdminUser | null,
    isLoading: false,
    error: null as string | null
  }),

  getters: {
    isAuthenticated: (state) => {
      if (!state.accessToken || !state.tokenExpiry || !state.user) return false
      return new Date() < state.tokenExpiry
    }
  },

  actions: {
    setTokens(accessToken: string, refreshToken: string, expiresIn: number, user: AdminUser) {
      this.accessToken = accessToken
      this.refreshToken = refreshToken
      // Expire 60 seconds early to account for clock skew
      this.tokenExpiry = new Date(Date.now() + (expiresIn - 60) * 1000)
      this.user = user
      this.error = null
      
      // Persist to localStorage
      if (process.client) {
        localStorage.setItem('admin-auth', JSON.stringify({
          accessToken,
          refreshToken,
          tokenExpiry: this.tokenExpiry.toISOString(),
          user
        }))
      }
    },

    clearAuth() {
      this.accessToken = null
      this.refreshToken = null
      this.tokenExpiry = null
      this.user = null
      this.error = null
      
      // Clear from localStorage
      if (process.client) {
        localStorage.removeItem('admin-auth')
      }
    },

    loadFromStorage() {
      if (!process.client) return
      
      try {
        const stored = localStorage.getItem('admin-auth')
        if (stored) {
          const data = JSON.parse(stored)
          const expiry = new Date(data.tokenExpiry)
          
          // Check if token is still valid
          if (expiry > new Date()) {
            this.accessToken = data.accessToken
            this.refreshToken = data.refreshToken
            this.tokenExpiry = expiry
            this.user = data.user
          } else {
            // Token expired, clear it
            this.clearAuth()
          }
        }
      } catch (error) {
        console.error('[ADMIN AUTH] Error loading from storage:', error)
        this.clearAuth()
      }
    },

    setLoading(loading: boolean) {
      this.isLoading = loading
    },

    setError(error: string | null) {
      this.error = error
    }
  }
})
