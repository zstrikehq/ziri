import { useAdminAuthStore } from '~/stores/admin-auth'
import { useApiError } from './useApiError'

export interface RoleItem {
  id: string
  usageCount?: number
}

export const useRoles = () => {
  const adminAuthStore = useAdminAuthStore()
  const { getUserMessage } = useApiError()

  const roles = ref<RoleItem[]>([])
  const loading = ref(false)

  const loadRoles = async (params?: {
    search?: string
    limit?: number
    offset?: number
    usage?: boolean
    sortBy?: string | null
    sortOrder?: 'asc' | 'desc' | null
  }) => {
    loading.value = true
    try {
      const token = adminAuthStore.accessToken
      if (!token) {
        throw new Error('Not authenticated')
      }
      const queryParams = new URLSearchParams()
      if (params?.search) queryParams.set('search', params.search)
      if (params?.limit) queryParams.set('limit', params.limit.toString())
      if (params?.offset) queryParams.set('offset', params.offset.toString())
      if (params?.usage) queryParams.set('usage', 'true')
      if (params?.sortBy) queryParams.set('sortBy', params.sortBy)
      if (params?.sortOrder) queryParams.set('sortOrder', params.sortOrder)
      const url = `/api/roles${queryParams.toString() ? '?' + queryParams.toString() : ''}`
      const response = await $fetch<{ roles: RoleItem[]; total: number }>(url, {
        headers: { Authorization: `Bearer ${token}` }
      })
      roles.value = response.roles
      return { roles: response.roles, total: response.total }
    } catch (error: any) {
      throw new Error(getUserMessage(error))
    } finally {
      loading.value = false
    }
  }

  const createRole = async (id: string) => {
    const token = adminAuthStore.accessToken
    if (!token) {
      throw new Error('Not authenticated')
    }
    await $fetch('/api/roles', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: { id: id.trim() }
    })
  }

  const deleteRole = async (id: string) => {
    const token = adminAuthStore.accessToken
    if (!token) {
      throw new Error('Not authenticated')
    }
    await $fetch(`/api/roles/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    })
  }

  return {
    roles,
    loading,
    loadRoles,
    createRole,
    deleteRole
  }
}
