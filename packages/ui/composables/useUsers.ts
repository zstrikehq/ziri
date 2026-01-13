// Users composable - for managing users via Proxy API

import { ref } from 'vue'
import { useConfigStore } from '~/stores/config'
import { useAdminAuth } from './useAdminAuth'
import { useToast } from './useToast'

export interface User {
  id: number
  userId: string
  email: string
  name: string
  role?: string
  department?: string
  status: string
  createdAt: string
  updatedAt: string
  lastLogin?: string
}

export interface CreateUserInput {
  email: string
  name: string
  // Note: role and department removed - they're now part of key creation
}

const users = ref<User[]>([])
const loading = ref(false)

export function useUsers() {
  const configStore = useConfigStore()
  const { getAuthHeader } = useAdminAuth()
  const toast = useToast()

  const loadUsers = async () => {
    loading.value = true
    try {
      const authHeader = getAuthHeader()
      if (!authHeader) {
        throw new Error('Please login first')
      }
      
      // Use relative URL - Nuxt server API will proxy to proxy server
      const response = await fetch('/api/users', {
        headers: {
          'Authorization': authHeader
        }
      })
      
      if (!response.ok) {
        throw new Error(`Failed to load users: ${response.statusText}`)
      }
      
      const data = await response.json()
      users.value = data.users || []
    } catch (error: any) {
      console.error('[USERS] Error loading users:', error)
      toast.error(`Failed to load users: ${error.message}`)
      throw error
    } finally {
      loading.value = false
    }
  }

  const createUser = async (input: CreateUserInput): Promise<{ user: User; password: string }> => {
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
    
    return result
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

  const resetPassword = async (userId: string): Promise<string> => {
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
    return result.password
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
