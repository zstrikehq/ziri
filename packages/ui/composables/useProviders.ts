// Provider management composable

import { useAdminAuth } from './useAdminAuth'

export interface Provider {
  name: string
  displayName: string
  baseUrl: string
  models: string[]
  defaultModel?: string
  hasCredentials: boolean
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
  
  const listProviders = async () => {
    loading.value = true
    error.value = null
    
    try {
      const authHeader = getAuthHeader()
      if (!authHeader) {
        throw new Error('Please login first')
      }
      
      const response = await fetch('/api/providers', {
        headers: {
          'Authorization': authHeader
        }
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Failed to list providers: ${response.statusText}`)
      }
      
      const data = await response.json()
      console.log('[PROVIDERS] Response data:', data)
      // Handle both formats: { data: [...] } and { providers: [...] }
      providers.value = data.data || data.providers || []
      console.log('[PROVIDERS] Loaded providers:', providers.value.length, providers.value)
    } catch (e: any) {
      console.error('[PROVIDERS] Error listing providers:', e)
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
      console.error('[PROVIDERS] Error adding provider:', e)
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
      console.error('[PROVIDERS] Error removing provider:', e)
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
      console.log('[PROVIDERS] Test response:', data)
      // Handle normalized response format
      return data.data || { status: data.success ? 'success' : 'failed', message: data.message }
    } catch (e: any) {
      console.error('[PROVIDERS] Error testing provider:', e)
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
