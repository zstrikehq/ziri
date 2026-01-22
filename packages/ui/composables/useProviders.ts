// Provider management composable

import { ref } from 'vue'
import { useAdminAuth } from './useAdminAuth'

export interface Provider {
  id: string // provider_keys.id (TEXT)
  name: string
  displayName: string
  baseUrl: string
  models: string[]
  defaultModel?: string
  hasCredentials: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateProviderInput {
  name: string
  apiKey: string
}

const providers = ref<Provider[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

export function useProviders() {
  const { getAuthHeader } = useAdminAuth()
  
  const listProviders = async (params?: {
    search?: string
    limit?: number
    offset?: number
    sortBy?: string | null
    sortOrder?: 'asc' | 'desc' | null
  }) => {
    loading.value = true
    error.value = null
    
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
      
      const url = `/api/providers${queryParams.toString() ? '?' + queryParams.toString() : ''}`
      
      const response = await fetch(url, {
        headers: {
          'Authorization': authHeader
        }
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Failed to list providers: ${response.statusText}`)
      }
      
      const data = await response.json()
      // Handle both formats: { data: [...] } and { providers: [...] }
      providers.value = data.data || data.providers || []
      return { providers: data.data || data.providers || [], total: data.total || 0 }
    } catch (e: any) {
      error.value = e.message || 'Failed to list providers'
      throw e
    } finally {
      loading.value = false
    }
  }

  const addProvider = async (input: CreateProviderInput) => {
    loading.value = true
    error.value = null
    
    try {
      const authHeader = getAuthHeader()
      if (!authHeader) {
        throw new Error('Please login first')
      }
      
      const response = await fetch('/api/providers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader
        },
        body: JSON.stringify({
          name: input.name.toLowerCase(),
          apiKey: input.apiKey
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Failed to add provider: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      // Refresh list
      await listProviders()
      
      return data.data
    } catch (e: any) {
      error.value = e.message || 'Failed to add provider'
      throw e
    } finally {
      loading.value = false
    }
  }

  const removeProvider = async (name: string) => {
    loading.value = true
    error.value = null
    
    try {
      const authHeader = getAuthHeader()
      if (!authHeader) {
        throw new Error('Please login first')
      }
      
      const response = await fetch(`/api/providers/${name.toLowerCase()}`, {
        method: 'DELETE',
        headers: {
          'Authorization': authHeader
        }
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Failed to remove provider: ${response.statusText}`)
      }
      
      // Refresh list
      await listProviders()
    } catch (e: any) {
      error.value = e.message || 'Failed to remove provider'
      throw e
    } finally {
      loading.value = false
    }
  }

  const testProvider = async (name: string): Promise<{ status: string; models?: number }> => {
    loading.value = true
    error.value = null
    
    try {
      const authHeader = getAuthHeader()
      if (!authHeader) {
        throw new Error('Please login first')
      }
      
      const response = await fetch(`/api/providers/${name.toLowerCase()}/test`, {
        method: 'POST',
        headers: {
          'Authorization': authHeader
        }
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Failed to test provider: ${response.statusText}`)
      }
      
      const data = await response.json()
      // Handle normalized response format
      return data.data || { status: data.success ? 'success' : 'failed', message: data.message }
    } catch (e: any) {
      error.value = e.message || 'Failed to test provider'
      throw e
    } finally {
      loading.value = false
    }
  }

  return {
    providers,
    loading,
    error,
    listProviders,
    addProvider,
    removeProvider,
    testProvider
  }
}
