// Admin authentication composable

import { useAdminAuthStore } from '~/stores/admin-auth'
import { useToast } from './useToast'

export function useAdminAuth() {
  const adminAuthStore = useAdminAuthStore()
  const toast = useToast()

  // Load auth from storage on init
  if (process.client) {
    adminAuthStore.loadFromStorage()
  }

  const login = async (username: string, password: string): Promise<boolean> => {
    adminAuthStore.setLoading(true)
    adminAuthStore.setError(null)
    
    try {
      const response = await fetch('/api/auth/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      })
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: response.statusText }))
        throw new Error(error.error || 'Login failed')
      }
      
      const data = await response.json()
      
      adminAuthStore.setTokens(
        data.accessToken,
        data.refreshToken,
        data.expiresIn,
        data.user
      )
      
      toast.success('Login successful!')
      
      // Redirect to config page after login
      if (process.client) {
        await navigateTo('/config')
      }
      
      return true
    } catch (error: any) {
      console.error('[ADMIN AUTH] Login error:', error)
      adminAuthStore.setError(error.message || 'Login failed')
      toast.error(error.message || 'Login failed')
      return false
    } finally {
      adminAuthStore.setLoading(false)
    }
  }

  const logout = () => {
    adminAuthStore.clearAuth()
    toast.info('Logged out successfully')
  }

  const getAuthHeader = (): string | null => {
    if (adminAuthStore.isAuthenticated && adminAuthStore.accessToken) {
      return `Bearer ${adminAuthStore.accessToken}`
    }
    return null
  }

  const refreshToken = async (): Promise<boolean> => {
    if (!adminAuthStore.refreshToken) {
      return false
    }
    
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          refreshToken: adminAuthStore.refreshToken
        })
      })
      
      if (!response.ok) {
        // Refresh failed, need to login again
        adminAuthStore.clearAuth()
        return false
      }
      
      const data = await response.json()
      
      // Update access token
      adminAuthStore.accessToken = data.accessToken
      adminAuthStore.tokenExpiry = new Date(Date.now() + (data.expiresIn - 60) * 1000)
      
      // Update localStorage
      if (process.client && adminAuthStore.user) {
        const stored = localStorage.getItem('admin-auth')
        if (stored) {
          const storedData = JSON.parse(stored)
          storedData.accessToken = data.accessToken
          storedData.tokenExpiry = adminAuthStore.tokenExpiry.toISOString()
          localStorage.setItem('admin-auth', JSON.stringify(storedData))
        }
      }
      
      return true
    } catch (error: any) {
      console.error('[ADMIN AUTH] Refresh error:', error)
      adminAuthStore.clearAuth()
      return false
    }
  }

  return {
    login,
    logout,
    getAuthHeader,
    refreshToken,
    isAuthenticated: computed(() => adminAuthStore.isAuthenticated),
    isLoading: computed(() => adminAuthStore.isLoading),
    error: computed(() => adminAuthStore.error),
    user: computed(() => adminAuthStore.user)
  }
}
