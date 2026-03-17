<script setup lang="ts">
import { useDashboardUsers, type DashboardUser, type CreateDashboardUserInput } from '~/composables/useDashboardUsers'
import { useToast } from '~/composables/useToast'
import { useDebounce } from '~/composables/useDebounce'
import { formatDate } from '~/utils/formatters'
import { useAdminAuth } from '~/composables/useAdminAuth'
import { useInternalAuth } from '~/composables/useInternalAuth'
import { useApiError } from '~/composables/useApiError'

const { users, loading, loadUsers, createUser, updateUser, deleteUser, disableUser, enableUser, resetPw } = useDashboardUsers()
const toast = useToast()
const { user: currentUser } = useAdminAuth()
const { checkAction, checkActions } = useInternalAuth()
const { getUserMessage } = useApiError()


const permissionsLoading = ref(true)
const canCreateAdmin = ref(false)
const canUpdateAdmin = ref(false)
const canDeleteAdmin = ref(false)
const canResetPw = ref(false)
const isZiri = computed(() => currentUser.value?.userId === 'ziri')

const tableColumns = [
  { key: 'userId', header: 'User ID', sortable: true },
  { key: 'name', header: 'Name', sortable: true },
  { key: 'email', header: 'Email', sortable: true },
  { key: 'role', header: 'Role' },
  { key: 'status', header: 'Status' },
  { key: 'lastSignIn', header: 'Last Sign In', sortable: true },
  { key: 'actions', header: '', class: 'w-48' }
]

const showCreateModal = ref(false)
const showEditModal = ref(false)
const showPasswordModal = ref(false)
const showDeleteModal = ref(false)
const showResetModal = ref(false)
const generatedPassword = ref('')
const selectedUser = ref<DashboardUser | null>(null)
const userToDelete = ref<DashboardUser | null>(null)
const userToReset = ref<DashboardUser | null>(null)

const isCreatingUser = ref(false)
const isUpdatingUser = ref(false)
const isDeletingUser = ref(false)
const isTogglingStatus = ref(false)
const resettingPw = ref(false)

const newUser = reactive<CreateDashboardUserInput>({
  email: '',
  name: '',
  role: 'viewer'
})

const editUser = reactive<{
  name: string
  role: 'admin' | 'viewer' | 'user_admin' | 'policy_admin'
}>({
  name: '',
  role: 'viewer'
})

const searchQuery = ref('')
const currentPage = ref(1)
const itemsPerPage = ref(10)
const totalUsers = ref(0)
const sortBy = ref<string | null>(null)
const sortOrder = ref<'asc' | 'desc' | null>(null)

const debouncedSearchQuery = useDebounce(searchQuery, 300)

const fetchUsers = async () => {
  try {
    const result = await loadUsers({
      search: debouncedSearchQuery.value || undefined,
      limit: itemsPerPage.value,
      offset: (currentPage.value - 1) * itemsPerPage.value,
      sortBy: sortBy.value,
      sortOrder: sortOrder.value
    })
    totalUsers.value = result.total || 0
  } catch (e: any) {
    toast.error(getUserMessage(e))
  }
}

const handleSort = (newSortBy: string | null, newSortOrder: 'asc' | 'desc' | null) => {
  sortBy.value = newSortBy
  sortOrder.value = newSortOrder
  currentPage.value = 1
}

watch([debouncedSearchQuery, currentPage, itemsPerPage, sortBy, sortOrder], () => {
  fetchUsers()
})

onMounted(async () => {

  permissionsLoading.value = true
  try {
    const permissions = await checkActions([
      { action: 'create_admin_dashboard_user', resourceType: 'dashboard_users' },
      { action: 'update_admin_dashboard_user', resourceType: 'dashboard_users' },
      { action: 'delete_admin_dashboard_user', resourceType: 'dashboard_users' },
      { action: 'reset_dashboard_user_password', resourceType: 'dashboard_users' }
    ])
    
    canCreateAdmin.value = permissions.results.find(r => r.action === 'create_admin_dashboard_user')?.allowed || false
    canUpdateAdmin.value = permissions.results.find(r => r.action === 'update_admin_dashboard_user')?.allowed || false
    canDeleteAdmin.value = permissions.results.find(r => r.action === 'delete_admin_dashboard_user')?.allowed || false
    canResetPw.value = permissions.results.find(r => r.action === 'reset_dashboard_user_password')?.allowed || false
  } finally {
    permissionsLoading.value = false
  }
  
  await fetchUsers()
})

const handleCreateUser = async () => {
  if (!newUser.email.trim() || !newUser.name.trim()) {
    toast.warning('Email and name are required')
    return
  }
  
  if (isCreatingUser.value) return
  

  if (newUser.role === 'admin') {
    const check = await checkAction('create_admin_dashboard_user', 'dashboard_users')
    if (!check.allowed) {
      toast.error('Only ziri can create admin dashboard users')
      return
    }
  } else {
    const check = await checkAction('create_dashboard_user', 'dashboard_users')
    if (!check.allowed) {
      toast.error('You do not have permission to create dashboard users')
      return
    }
  }
  
  try {
    isCreatingUser.value = true
    const result = await createUser(newUser)
    showCreateModal.value = false
    
    if (result.password) {
      generatedPassword.value = result.password
      showPasswordModal.value = true
      toast.warning('Email was not sent. Please save the password below.')
    } else {
      toast.success('Dashboard user created. Credentials sent via email.')
    }
    
    Object.assign(newUser, {
      email: '',
      name: '',
      role: 'viewer'
    })
    
    await fetchUsers()
  } catch (error: any) {
    toast.error(getUserMessage(error))
  } finally {
    isCreatingUser.value = false
  }
}

const openEditModal = (user: DashboardUser) => {
  selectedUser.value = user
  editUser.name = user.name
  editUser.role = user.role as 'admin' | 'viewer' | 'user_admin' | 'policy_admin'
  showEditModal.value = true
}

const handleUpdateUser = async () => {
  if (!selectedUser.value || isUpdatingUser.value) return
  
  try {
    isUpdatingUser.value = true
    await updateUser(selectedUser.value.userId, editUser)
    showEditModal.value = false
    selectedUser.value = null
    toast.success('User updated')
    await fetchUsers()
  } catch (error: any) {
    toast.error(getUserMessage(error))
  } finally {
    isUpdatingUser.value = false
  }
}

const confirmDelete = (user: DashboardUser) => {
  userToDelete.value = user
  showDeleteModal.value = true
}

const handleDeleteUser = async () => {
  if (!userToDelete.value || isDeletingUser.value) return
  

  if (userToDelete.value.role === 'admin') {
    const check = await checkAction('delete_admin_dashboard_user', 'dashboard_users')
    if (!check.allowed) {
      toast.error('Only ziri can delete admin dashboard users')
      return
    }
  } else {
    const check = await checkAction('delete_dashboard_user', 'dashboard_users')
    if (!check.allowed) {
      toast.error('You do not have permission to delete dashboard users')
      return
    }
  }
  

  if (currentUser.value?.userId === userToDelete.value.userId) {
    toast.error('You cannot delete your own account')
    return
  }
  
  try {
    isDeletingUser.value = true
    await deleteUser(userToDelete.value.userId)
    showDeleteModal.value = false
    userToDelete.value = null
    toast.success('User deleted')
    await fetchUsers()
    const total = totalUsers.value
    const maxIndex = (currentPage.value - 1) * itemsPerPage.value
    if (currentPage.value > 1 && maxIndex >= total) {
      currentPage.value = currentPage.value - 1
    }
  } catch (error: any) {
    toast.error(getUserMessage(error))
  } finally {
    isDeletingUser.value = false
  }
}

const handleToggleStatus = async (user: DashboardUser) => {
  if (isTogglingStatus.value) return
  

  if (user.role === 'admin') {
    const check = await checkAction('update_admin_dashboard_user', 'dashboard_users')
    if (!check.allowed) {
      toast.error('Only ziri can disable/enable admin dashboard users')
      return
    }
  } else {
    const check = await checkAction('update_dashboard_user', 'dashboard_users')
    if (!check.allowed) {
      toast.error('You do not have permission to modify dashboard users')
      return
    }
  }
  

  if (currentUser.value?.userId === user.userId) {
    toast.error('You cannot disable/enable your own account')
    return
  }
  
  try {
    isTogglingStatus.value = true
    if (user.status === 1) {
      await disableUser(user.userId)
      toast.success('User disabled')
    } else {
      await enableUser(user.userId)
      toast.success('User enabled')
    }
    await fetchUsers()
  } catch (error: any) {
    toast.error(getUserMessage(error))
  } finally {
    isTogglingStatus.value = false
  }
}

const copyPassword = () => {
  navigator.clipboard.writeText(generatedPassword.value)
  toast.success('Password copied to clipboard')
}

const confirmResetPw = async (user: DashboardUser) => {
  if (user.role === 'admin') {
    const check = await checkAction('reset_admin_dashboard_user_password', 'dashboard_users')
    if (!check.allowed) {
      toast.error('Only ziri can reset an admin\'s password')
      return
    }
  } else {
    const check = await checkAction('reset_dashboard_user_password', 'dashboard_users')
    if (!check.allowed) {
      toast.error('You do not have permission to reset dashboard user passwords')
      return
    }
  }
  userToReset.value = user
  showResetModal.value = true
}

const handleResetPw = async () => {
  if (!userToReset.value || resettingPw.value) return
  try {
    resettingPw.value = true
    const result = await resetPw(userToReset.value.userId)
    showResetModal.value = false
    if (result.password) {
      generatedPassword.value = result.password
      showPasswordModal.value = true
      toast.warning('Email was not sent. Please save the password below.')
    } else {
      toast.success('Password reset. New password sent to user\'s email.')
    }
    userToReset.value = null
  } catch (e: any) {
    toast.error(getUserMessage(e))
  } finally {
    resettingPw.value = false
  }
}

const getRoleBadgeColor = (role: string) => {
  switch (role) {
    case 'admin':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
    case 'user_admin':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
    case 'policy_admin':
      return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
    case 'viewer':
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
  }
}
</script>

<template>
  <div class="space-y-4">
    <!-- Permissions Loading Skeleton -->
    <div v-if="permissionsLoading" class="space-y-4">
      <!-- Toolbar Skeleton -->
      <div class="flex items-center justify-between gap-4">
        <div class="flex-1 flex items-center gap-3">
          <div class="relative flex-1 max-w-md">
            <div class="skeleton-shimmer h-10 rounded-lg" style="width: 100%;"></div>
          </div>
        </div>
        <div class="skeleton-shimmer h-10 w-40 rounded-lg"></div>
      </div>
      <!-- Table Skeleton -->
      <div class="overflow-x-auto rounded-xl border-2 border-[rgb(var(--border))] bg-[rgb(var(--surface))]">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b-2 border-[rgb(var(--border))]">
              <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[rgb(var(--text-muted))]">
                <div class="skeleton-shimmer h-4 w-16 rounded"></div>
              </th>
              <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[rgb(var(--text-muted))]">
                <div class="skeleton-shimmer h-4 w-20 rounded"></div>
              </th>
              <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[rgb(var(--text-muted))]">
                <div class="skeleton-shimmer h-4 w-24 rounded"></div>
              </th>
              <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[rgb(var(--text-muted))]">
                <div class="skeleton-shimmer h-4 w-16 rounded"></div>
              </th>
              <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[rgb(var(--text-muted))]">
                <div class="skeleton-shimmer h-4 w-20 rounded"></div>
              </th>
              <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[rgb(var(--text-muted))]">
                <div class="skeleton-shimmer h-4 w-24 rounded"></div>
              </th>
              <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[rgb(var(--text-muted))] w-40">
                <div class="skeleton-shimmer h-4 w-16 rounded"></div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="i in 5" :key="i" class="border-b border-[rgb(var(--border))]">
              <td class="px-4 py-3">
                <div class="skeleton-shimmer h-4 rounded" :style="{ width: `${60 + Math.random() * 30}%` }"></div>
              </td>
              <td class="px-4 py-3">
                <div class="skeleton-shimmer h-4 rounded" :style="{ width: `${70 + Math.random() * 20}%` }"></div>
              </td>
              <td class="px-4 py-3">
                <div class="skeleton-shimmer h-4 rounded" :style="{ width: `${65 + Math.random() * 25}%` }"></div>
              </td>
              <td class="px-4 py-3">
                <div class="skeleton-shimmer h-6 w-20 rounded-full"></div>
              </td>
              <td class="px-4 py-3">
                <div class="skeleton-shimmer h-6 w-20 rounded-full"></div>
              </td>
              <td class="px-4 py-3">
                <div class="skeleton-shimmer h-4 rounded" :style="{ width: `${50 + Math.random() * 20}%` }"></div>
              </td>
              <td class="px-4 py-3">
                <div class="flex gap-2">
                  <div class="skeleton-shimmer h-8 w-8 rounded"></div>
                  <div class="skeleton-shimmer h-8 w-8 rounded"></div>
                  <div class="skeleton-shimmer h-8 w-8 rounded"></div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Main Content (only show after permissions load) -->
    <template v-else>
      <!-- Toolbar -->
      <div class="flex items-center justify-between gap-4" v-if="users.length > 0 || searchQuery">
      <div class="flex-1 flex items-center gap-3">
        <div class="relative flex-1 max-w-md">
          <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgb(var(--text-muted))]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input 
            v-model="searchQuery"
            type="text"
            placeholder="Search by name, email, or user ID..."
            class="input pl-10"
          />
          <button
            v-if="searchQuery"
            @click="searchQuery = ''"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text))]"
            title="Clear search"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      <UiButton @click="showCreateModal = true">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Create Dashboard User
      </UiButton>
    </div>

    <!-- Empty state toolbar -->
    <div class="flex items-center justify-end gap-4" v-if="users.length === 0 && !loading && !searchQuery">
      <UiButton @click="showCreateModal = true">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Create Dashboard User
      </UiButton>
    </div>

    <!-- Users Table -->
    <UiTable
      :columns="tableColumns"
      :data="users"
      :loading="loading"
      :paginated="true"
      :current-page="currentPage"
      :items-per-page="itemsPerPage"
      :total-items="totalUsers"
      :sort-by="sortBy"
      :sort-order="sortOrder"
      :empty-message="searchQuery ? 'No dashboard users match your search criteria.' : 'No dashboard users found. Create your first dashboard user to get started.'"
      @update:current-page="currentPage = $event"
      @update:items-per-page="itemsPerPage = $event"
      @update:sort="handleSort"
    >
      <template #userId="{ row }">
        <code class="text-xs font-mono">{{ row.userId }}</code>
      </template>
      <template #role="{ row }">
        <span
          :class="[
            'px-2 py-1 rounded text-xs font-semibold',
            getRoleBadgeColor(row.role)
          ]"
        >
          {{ row.role === 'user_admin' ? 'User Admin' : row.role === 'policy_admin' ? 'Policy Admin' : row.role.charAt(0).toUpperCase() + row.role.slice(1) }}
        </span>
      </template>
      <template #status="{ row }">
        <span
          :class="[
            'px-2 py-1 rounded text-xs font-semibold',
            row.status === 1 
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
          ]"
        >
          {{ row.status === 1 ? 'Active' : 'Disabled' }}
        </span>
      </template>
      <template #lastSignIn="{ row }">
        <span class="text-xs text-[rgb(var(--text-secondary))]">
          {{ row.lastSignIn ? formatDate(row.lastSignIn) : 'Never' }}
        </span>
      </template>
      <template #actions="{ row }">
        <div class="flex gap-2">
          <!-- Edit button: Hide for admin users if not ziri, hide for self -->
          <UiButton
            v-if="currentUser?.userId !== row.userId && (row.role !== 'admin' || canUpdateAdmin)"
            variant="ghost"
            size="sm"
            @click="openEditModal(row)"
            title="Edit User"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </UiButton>
          <UiButton
            v-if="currentUser?.userId !== row.userId && row.userId !== 'ziri' && ((row.role !== 'admin' && canResetPw) || (row.role === 'admin' && isZiri))"
            variant="ghost"
            size="sm"
            @click="confirmResetPw(row)"
            :loading="resettingPw && userToReset?.userId === row.userId"
            title="Reset Password"
            class="text-amber-500 hover:text-amber-600"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </UiButton>
          <!-- Disable/Enable button: Hide for admin users if not ziri, hide for self -->
          <UiButton
            v-if="currentUser?.userId !== row.userId && (row.role !== 'admin' || canUpdateAdmin)"
            variant="ghost"
            size="sm"
            @click="handleToggleStatus(row)"
            :loading="isTogglingStatus"
            :title="row.status === 1 ? 'Disable User' : 'Enable User'"
            :class="row.status === 1 ? 'text-amber-500 hover:text-amber-600' : 'text-green-500 hover:text-green-600'"
          >
            <svg v-if="row.status === 1" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
            <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </UiButton>
          <!-- Delete button: Hide for ziri, hide for admin users if not ziri, hide for self -->
          <UiButton
            v-if="row.userId !== 'ziri' && currentUser?.userId !== row.userId && (row.role !== 'admin' || canDeleteAdmin)"
            variant="ghost"
            size="sm"
            @click="confirmDelete(row)"
            :loading="isDeletingUser && userToDelete?.userId === row.userId"
            title="Delete User"
            class="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </UiButton>
        </div>
      </template>
      <template #empty-action>
        <UiButton @click="showCreateModal = true" v-if="!searchQuery">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Create Dashboard User
        </UiButton>
      </template>
    </UiTable>

    <!-- Create User Modal -->
    <UiModal v-model="showCreateModal" title="Create Dashboard User">
      <form @submit.prevent="handleCreateUser" class="space-y-4">
        <UiInput v-model="newUser.email" label="Email" type="email" required />
        <UiInput v-model="newUser.name" label="Name" required />
        <div>
          <label class="block text-sm font-medium mb-2 text-[rgb(var(--text))]">Role</label>
          <select v-model="newUser.role" class="input" required :disabled="!canCreateAdmin && newUser.role === 'admin'">
            <option value="admin" :disabled="!canCreateAdmin">Admin</option>
            <option value="viewer">Viewer</option>
            <option value="user_admin">User Admin</option>
            <option value="policy_admin">Policy Admin</option>
          </select>
          <p class="text-xs text-[rgb(var(--text-secondary))] mt-1">
            Admin: Full access. Viewer: Read-only. User Admin: Users & Keys management. Policy Admin: Rules management.
          </p>
          <!-- <p v-if="!canCreateAdmin" class="text-xs text-amber-600 dark:text-amber-400 mt-1">
            ⚠️ Only ziri can create admin users. Admin option is disabled.
          </p> -->
        </div>
        
        <div class="flex gap-3 justify-end">
          <UiButton type="button" variant="ghost" @click="showCreateModal = false">
            Cancel
          </UiButton>
          <UiButton type="submit" :loading="isCreatingUser">
            Create User
          </UiButton>
        </div>
      </form>
    </UiModal>

    <!-- Edit User Modal -->
    <UiModal v-model="showEditModal" title="Edit Dashboard User">
      <form @submit.prevent="handleUpdateUser" class="space-y-4">
        <UiInput :model-value="selectedUser?.email || ''" label="Email" type="email" disabled />
        <UiInput v-model="editUser.name" label="Name" required />
        <div>
          <label class="block text-sm font-medium mb-2 text-[rgb(var(--text))]">Role</label>
          <select 
            v-model="editUser.role" 
            class="input" 
            required
            :disabled="(!canUpdateAdmin && (selectedUser?.role === 'admin' || editUser.role === 'admin'))"
          >
            <option 
              value="admin" 
              :disabled="!canUpdateAdmin"
            >
              Admin
            </option>
            <option value="viewer">Viewer</option>
            <option value="user_admin">User Admin</option>
            <option value="policy_admin">Policy Admin</option>
          </select>
          <!-- <p v-if="selectedUser?.role === 'admin' && !canUpdateAdmin" class="text-xs text-amber-600 dark:text-amber-400 mt-1">
            ⚠️ Only ziri can modify admin users. Role changes are restricted.
          </p>
          <p v-if="selectedUser?.role !== 'admin' && editUser.role === 'admin' && !canUpdateAdmin" class="text-xs text-amber-600 dark:text-amber-400 mt-1">
            ⚠️ Only ziri can promote users to admin. Admin role is disabled.
          </p> -->
        </div>
        
        <div class="flex gap-3 justify-end">
          <UiButton type="button" variant="ghost" @click="showEditModal = false">
            Cancel
          </UiButton>
          <UiButton type="submit" :loading="isUpdatingUser">
            Update User
          </UiButton>
        </div>
      </form>
    </UiModal>

    <!-- Password Modal -->
    <UiModal v-model="showPasswordModal" title="Generated Password">
      <div class="space-y-4">
        <div class="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <p class="text-sm text-amber-800 dark:text-amber-200 font-semibold mb-2">
            ⚠️ Important: Save this password
          </p>
          <p class="text-xs text-amber-700 dark:text-amber-300">
            This password will not be shown again. Make sure to copy it now.
          </p>
        </div>
        
        <div>
          <label class="block text-sm font-medium mb-2 text-[rgb(var(--text))]">Password</label>
          <div class="flex gap-2">
            <input
              :value="generatedPassword"
              type="text"
              readonly
              class="input flex-1 font-mono"
            />
            <UiButton @click="copyPassword" variant="ghost">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </UiButton>
          </div>
        </div>
        
        <div class="flex justify-end">
          <UiButton @click="showPasswordModal = false">
            Close
          </UiButton>
        </div>
      </div>
    </UiModal>

    <!-- Delete Confirmation Modal -->
    <UiModal v-model="showDeleteModal" title="Delete Dashboard User">
      <div class="space-y-4">
        <p class="text-[rgb(var(--text))]">
          Are you sure you want to delete <strong>{{ userToDelete?.name }}</strong>?
          This action cannot be undone.
        </p>
        
        <div class="flex gap-3 justify-end">
          <UiButton variant="ghost" @click="showDeleteModal = false">
            Cancel
          </UiButton>
          <UiButton 
            variant="danger" 
            @click="handleDeleteUser"
            :loading="isDeletingUser"
          >
            Delete User
          </UiButton>
        </div>
      </div>
    </UiModal>

    <!-- Reset Password Modal -->
    <UiModal v-model="showResetModal" title="Reset Password">
      <div class="space-y-4">
        <p class="text-[rgb(var(--text))]">
          Reset password for <strong>{{ userToReset?.name }}</strong>? A new password will be sent to their email if configured, otherwise shown here.
        </p>
        <div v-if="userToReset" class="text-sm text-[rgb(var(--text-secondary))]">
          <span class="font-medium">Email:</span> {{ userToReset.email }}
        </div>
        <div class="flex gap-3 justify-end">
          <UiButton variant="ghost" @click="showResetModal = false; userToReset = null">
            Cancel
          </UiButton>
          <UiButton
            :loading="resettingPw"
            class="bg-amber-500 hover:bg-amber-600 text-white"
            @click="handleResetPw"
          >
            Reset Password
          </UiButton>
        </div>
      </div>
    </UiModal>
    </template>
  </div>
</template>
