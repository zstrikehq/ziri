import { useAdminAuthStore } from '~/stores/admin-auth'

export interface DashboardUser {
  id: string
  userId: string
  email: string
  name: string
  role: string
  status: number
  createdAt: string
  updatedAt: string
  lastSignIn?: string
}

export interface CreateDashboardUserInput {
  email: string
  name: string
  role: 'admin' | 'viewer' | 'user_admin' | 'policy_admin'
}

export const useDashboardUsers = () => {
  const adminAuthStore = useAdminAuthStore()
  
  const users = ref<DashboardUser[]>([])
  const loading = ref(false)
  
  const loadUsers = async (params?: {
    search?: string
    limit?: number
    offset?: number
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
      if (params?.sortBy) queryParams.set('sortBy', params.sortBy)
      if (params?.sortOrder) queryParams.set('sortOrder', params.sortOrder)
      
      const url = `/api/dashboard-users${queryParams.toString() ? '?' + queryParams.toString() : ''}`
      const response = await $fetch<{ users: DashboardUser[]; total: number }>(url, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      
      users.value = response.users
      return { data: response.users, total: response.total }
    } catch (error: any) {
      console.error('[DASHBOARD USERS] Load error:', error)
      throw error
    } finally {
      loading.value = false
    }
  }
  
  const createUser = async (input: CreateDashboardUserInput) => {
    const token = adminAuthStore.accessToken
    if (!token) {
      throw new Error('Not authenticated')
    }
    
    const response = await $fetch<{ user: DashboardUser; password?: string; message: string }>('/api/dashboard-users', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: input
    })
    
    return response
  }
  
  const updateUser = async (userId: string, updates: {
    name?: string
    email?: string
    role?: 'admin' | 'viewer' | 'user_admin' | 'policy_admin'
  }) => {
    const token = adminAuthStore.accessToken
    if (!token) {
      throw new Error('Not authenticated')
    }
    
    const response = await $fetch<{ user: DashboardUser }>(`/api/dashboard-users/${userId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: updates
    })
    
    return response.user
  }
  
  const deleteUser = async (userId: string) => {
    const token = adminAuthStore.accessToken
    if (!token) {
      throw new Error('Not authenticated')
    }
    
    await $fetch(`/api/dashboard-users/${userId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
  }
  
  const disableUser = async (userId: string) => {
    const token = adminAuthStore.accessToken
    if (!token) {
      throw new Error('Not authenticated')
    }
    
    const response = await $fetch<{ user: DashboardUser }>(`/api/dashboard-users/${userId}/disable`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
    
    return response.user
  }
  
  const enableUser = async (userId: string) => {
    const token = adminAuthStore.accessToken
    if (!token) {
      throw new Error('Not authenticated')
    }
    
    const response = await $fetch<{ user: DashboardUser }>(`/api/dashboard-users/${userId}/enable`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
    
    return response.user
  }
  
  return {
    users,
    loading,
    loadUsers,
    createUser,
    updateUser,
    deleteUser,
    disableUser,
    enableUser
  }
}
