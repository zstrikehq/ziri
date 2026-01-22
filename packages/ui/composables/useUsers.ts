// Users composable - for managing users via Proxy API

import { ref } from 'vue'
import { useConfigStore } from '~/stores/config'
import { useAdminAuth } from './useAdminAuth'
import { useToast } from './useToast'

export interface User {
  id: string // auth.id (TEXT)
  userId: string // Same as id (for backward compatibility)
  email: string // Decrypted
  name: string // Plain text
  department?: string // Plain text
  isAgent: boolean
  status: number // 0=inactive, 1=active, 2=revoked
  createdAt: string
  updatedAt: string
  lastSignIn?: string // Renamed from lastLogin
}

export interface CreateUserInput {
  email: string
  name: string
  department: string
  isAgent: boolean
  limitRequestsPerMinute?: number // Default: 100
}

const users = ref<User[]>([])
const loading = ref(false)

export function useUsers() {
  const configStore = useConfigStore()
  const { getAuthHeader } = useAdminAuth()
  const toast = useToast()

  const loadUsers = async (params?: {
    search?: string
    limit?: number
    offset?: number
    sortBy?: string | null
    sortOrder?: 'asc' | 'desc' | null
  }) => {
    loading.value = true
    try {
      const authHeader = getAuthHeader()
      if (!authHeader) {
        throw new Error('Please login first')
      }
      
      // Build query string
      const queryParams = new URLSearchParams()
      if (params?.search) queryParams.set('search', params.search)
      if (params?.limit) queryParams.set('limit', params.limit.toString())
      if (params?.offset) queryParams.set('offset', params.offset.toString())
      if (params?.sortBy) queryParams.set('sortBy', params.sortBy)
      if (params?.sortOrder) queryParams.set('sortOrder', params.sortOrder)
      
      const url = `/api/users${queryParams.toString() ? '?' + queryParams.toString() : ''}`
      
      // Use relative URL - Nuxt server API will proxy to proxy server
      const response = await fetch(url, {
        headers: {
          'Authorization': authHeader
        }
      })
      
      if (!response.ok) {
        throw new Error(`Failed to load users: ${response.statusText}`)
      }
      
      const data = await response.json()
      users.value = data.users || []
      return { users: data.users || [], total: data.total || 0 }
    } catch (error: any) {
      toast.error(`Failed to load users: ${error.message}`)
      throw error
    } finally {
      loading.value = false
    }
  }

  const createUser = async (input: CreateUserInput): Promise<{ user: User; password?: string; emailSent: boolean }> => {
    const authHeader = getAuthHeader()
    if (!authHeader) {
      throw new Error('Please login first')
    }
    
    // Use relative URL - Nuxt server API will proxy to proxy server
    const response = await fetch('/api/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify(input)
    })
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }))
      throw new Error(error.error || 'Failed to create user')
    }
    
    const result = await response.json()
    users.value.push(result.user)
    
    // Return user and password (password only exists if email was not sent)
    return {
      user: result.user,
      password: result.password // Only present if email was not sent
    }
  }

  const updateUser = async (userId: string, updates: Partial<CreateUserInput>): Promise<User> => {
    const authHeader = getAuthHeader()
    if (!authHeader) {
      throw new Error('Please login first')
    }
    
    // Use relative URL - Nuxt server API will proxy to proxy server
    const response = await fetch(`/api/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify(updates)
    })
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }))
      throw new Error(error.error || 'Failed to update user')
    }
    
    const result = await response.json()
    const index = users.value.findIndex(u => u.userId === userId)
    if (index !== -1) {
      users.value[index] = result.user
    }
    
    return result.user
  }

  const deleteUser = async (userId: string): Promise<void> => {
    const authHeader = getAuthHeader()
    if (!authHeader) {
      throw new Error('Please login first')
    }
    
    // Use relative URL - Nuxt server API will proxy to proxy server
    const response = await fetch(`/api/users/${userId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': authHeader
      }
    })
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }))
      throw new Error(error.error || 'Failed to delete user')
    }
    
    users.value = users.value.filter(u => u.userId !== userId)
  }

  const resetPassword = async (userId: string): Promise<{ password?: string; emailSent: boolean }> => {
    const authHeader = getAuthHeader()
    if (!authHeader) {
      throw new Error('Please login first')
    }
    
    // Use relative URL - Nuxt server API will proxy to proxy server
    const response = await fetch(`/api/users/${userId}/reset-password`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader
      }
    })
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }))
      throw new Error(error.error || 'Failed to reset password')
    }
    
    const result = await response.json()
    // Return password only if email was not sent
    return {
      password: result.password, // Only present if email was not sent
      emailSent: result.emailSent || false
    }
  }

  return {
    users,
    loading,
    loadUsers,
    createUser,
    updateUser,
    deleteUser,
    resetPassword
  }
}
