import { defineStore } from 'pinia'

export interface AdminUser {
  userId: string
  email: string
  role: string
  name: string
}

// Cookie helper functions
const getCookie = (name: string): string | null => {
  if (typeof document === 'undefined') return null
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null
  return null
}

const setCookie = (name: string, value: string, days: number = 30) => {
  if (typeof document === 'undefined') return
  const expires = new Date()
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000)
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`
}

const removeCookie = (name: string) => {
  if (typeof document === 'undefined') return
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`
}

const COOKIE_NAME = 'admin-auth'

export const useAdminAuthStore = defineStore('adminAuth', {
  state: () => ({
    accessToken: null as string | null,
    refreshToken: null as string | null,
    tokenExpiry: null as Date | null,
    user: null as AdminUser | null,
    serverSessionId: null as string | null, // Server session ID for restart detection
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
      
      // Persist to cookie (30 days expiry)
      if (process.client) {
        const authData = {
          accessToken,
          refreshToken,
          tokenExpiry: this.tokenExpiry.toISOString(),
          user,
          serverSessionId: this.serverSessionId
        }
        setCookie(COOKIE_NAME, JSON.stringify(authData), 30)
      }
    },

    clearAuth() {
      this.accessToken = null
      this.refreshToken = null
      this.tokenExpiry = null
      this.user = null
      this.serverSessionId = null
      this.error = null
      
      // Clear cookie
      if (process.client) {
        removeCookie(COOKIE_NAME)
      }
    },

    loadFromStorage() {
      if (!process.client) return
      
      try {
        const stored = getCookie(COOKIE_NAME)
        if (stored) {
          const data = JSON.parse(stored)
          const expiry = new Date(data.tokenExpiry)
          
          // Check if token is still valid
          if (expiry > new Date()) {
            this.accessToken = data.accessToken
            this.refreshToken = data.refreshToken
            this.tokenExpiry = expiry
            this.user = data.user
            this.serverSessionId = data.serverSessionId || null
          } else {
            // Token expired, clear it
            this.clearAuth()
          }
        }
      } catch (error) {
        this.clearAuth()
      }
    },

    setLoading(loading: boolean) {
      this.isLoading = loading
    },

    setError(error: string | null) {
      this.error = error
    },

    setServerSessionId(sessionId: string | null) {
      this.serverSessionId = sessionId
      // Update cookie with new session ID
      if (process.client && this.accessToken && this.refreshToken && this.tokenExpiry && this.user) {
        const authData = {
          accessToken: this.accessToken,
          refreshToken: this.refreshToken,
          tokenExpiry: this.tokenExpiry.toISOString(),
          user: this.user,
          serverSessionId: sessionId
        }
        setCookie(COOKIE_NAME, JSON.stringify(authData), 30)
      }
    },

    async checkServerSession(): Promise<boolean> {
      // Check if server session changed (server restarted)
      try {
        const response = await fetch('/api/health')
        if (!response.ok) {
          return false
        }
        const data = await response.json()
        const currentSessionId = data.sessionId

        // If we have a stored session ID and it changed, server restarted
        if (this.serverSessionId && currentSessionId && this.serverSessionId !== currentSessionId) {
          console.warn('[AUTH] Server session changed - server restarted, logging out')
          this.clearAuth()
          return false
        }

        // Update stored session ID if we don't have one or if it's new
        if (currentSessionId && (!this.serverSessionId || this.serverSessionId !== currentSessionId)) {
          this.setServerSessionId(currentSessionId)
        }

        return true
      } catch (error) {
        console.error('[AUTH] Failed to check server session:', error)
        return false
      }
    }
  }
})
