

import { ref } from 'vue'
import { useConfigStore } from '~/stores/config'
import { useAdminAuth } from './useAdminAuth'
import { useToast } from './useToast'
import { extractApiErrorMessage, useApiError } from './useApiError'
import { runWithAuth } from './useApiCall'

export interface User {
  id: string
  userId: string
  email: string
  name: string
  tenant?: string
  isAgent: boolean
  status: number
  createdAt: string
  updatedAt: string
  lastSignIn?: string
  roleId?: string
}

export interface CreateUserInput {
  email: string
  name: string
  tenant?: string
  isAgent: boolean
  limitRequestsPerMinute?: number
  createApiKey?: boolean
  roleId?: string
}

const users = ref<User[]>([])
const loading = ref(false)

export function useUsers() {
  const configStore = useConfigStore()
  const { getAuthHeader } = useAdminAuth()
  const toast = useToast()
  const { getUserMessage } = useApiError()

  const loadUsers = async (params?: {
    search?: string
    limit?: number
    offset?: number
    sortBy?: string | null
    sortOrder?: 'asc' | 'desc' | null
  }) => {
    try {
      return await runWithAuth({
        setLoading: (value) => { loading.value = value },
        getAuthHeader,
        onError: (error) => { toast.error(getUserMessage(error)) }
      }, async (authHeader) => {
        const queryParams = new URLSearchParams()
        if (params?.search) queryParams.set('search', params.search)
        if (params?.limit) queryParams.set('limit', params.limit.toString())
        if (params?.offset) queryParams.set('offset', params.offset.toString())
        if (params?.sortBy) queryParams.set('sortBy', params.sortBy)
        if (params?.sortOrder) queryParams.set('sortOrder', params.sortOrder)

        const url = `/api/users${queryParams.toString() ? '?' + queryParams.toString() : ''}`
        const response = await fetch(url, {
          headers: {
            'Authorization': authHeader
          }
        })

        if (!response.ok) {
          const err = await response.json().catch(() => ({ error: response.statusText }))
          throw new Error(extractApiErrorMessage({ data: err }, 'Failed to load users'))
        }

        const data = await response.json()
        users.value = data.users || []
        return { users: data.users || [], total: data.total || 0 }
      })
    } catch (error: any) {
      throw error
    }
  }

  const createUser = async (
    input: CreateUserInput
  ): Promise<{ user: User; password?: string; apiKey?: string; emailSent: boolean }> => {
    const authHeader = getAuthHeader()
    if (!authHeader) {
      throw new Error('Please login first')
    }


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
      throw new Error(extractApiErrorMessage({ data: error }, 'Failed to create user'))
    }

    const result = await response.json()
    users.value.push(result.user)


    return {
      user: result.user,
      password: result.password,
      apiKey: result.apiKey,
      emailSent: result.emailSent ?? false
    }
  }

  const updateUser = async (userId: string, updates: Partial<CreateUserInput>): Promise<User> => {
    const authHeader = getAuthHeader()
    if (!authHeader) {
      throw new Error('Please login first')
    }


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
      throw new Error(extractApiErrorMessage({ data: error }, 'Failed to update user'))
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


    const response = await fetch(`/api/users/${userId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': authHeader
      }
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }))
      throw new Error(error.message || 'Failed to delete user')
    }

    users.value = users.value.filter(u => u.userId !== userId)
  }

  const resetPassword = async (userId: string): Promise<{ password?: string; emailSent: boolean }> => {
    const authHeader = getAuthHeader()
    if (!authHeader) {
      throw new Error('Please login first')
    }


    const response = await fetch(`/api/users/${userId}/reset-password`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader
      }
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }))
      throw new Error(extractApiErrorMessage({ data: error }, 'Failed to reset password'))
    }

    const result = await response.json()

    return {
      password: result.password,
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
