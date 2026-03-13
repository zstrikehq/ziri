<script setup lang="ts">
import { useUsers, type User, type CreateUserInput } from '~/composables/useUsers'
import { useRoles } from '~/composables/useRoles'
import { useToast } from '~/composables/useToast'
import { useDebounce } from '~/composables/useDebounce'
import { formatDate } from '~/utils/formatters'
import { useInternalAuth } from '~/composables/useInternalAuth'
import { useApiError } from '~/composables/useApiError'

const { users, loading, loadUsers, createUser, updateUser, deleteUser, resetPassword } = useUsers()
const { roles: rolesList, loadRoles } = useRoles()
const toast = useToast()
const { checkActions, checkAction } = useInternalAuth()
const { getUserMessage } = useApiError()


const permissionsLoading = ref(true)
const canCreateUser = ref(false)
const canUpdateUser = ref(false)
const canDeleteUser = ref(false)
const canResetPassword = ref(false)

 
const showCreateModal = ref(false)
const showPasswordModal = ref(false)
const showApiKeyModal = ref(false)
const showDeleteModal = ref(false)
const showResetPasswordModal = ref(false)
const generatedPassword = ref('')
const generatedApiKey = ref('')
const selectedUser = ref<User | null>(null)
const userToDelete = ref<User | null>(null)
const userToResetPassword = ref<User | null>(null)

 
const isCreatingUser = ref(false)
const isResettingPassword = ref(false)
const isDeletingUser = ref(false)

 
const newUser = reactive<CreateUserInput>({
  email: '',
  name: '',
  tenant: '',
  isAgent: false,
  limitRequestsPerMinute: 100,
  createApiKey: true,
  roleId: undefined
})

 
const searchQuery = ref('')
const currentPage = ref(1)
const itemsPerPage = ref(20)
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
  } catch (e) {
 
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
      { action: 'create_user', resourceType: 'users' },
      { action: 'update_user', resourceType: 'users' },
      { action: 'delete_user', resourceType: 'users' },
      { action: 'reset_user_password', resourceType: 'users' }
    ])
    
    canCreateUser.value = permissions.results.find(r => r.action === 'create_user')?.allowed || false
    canUpdateUser.value = permissions.results.find(r => r.action === 'update_user')?.allowed || false
    canDeleteUser.value = permissions.results.find(r => r.action === 'delete_user')?.allowed || false
    canResetPassword.value = permissions.results.find(r => r.action === 'reset_user_password')?.allowed || false
  } finally {
    permissionsLoading.value = false
  }
  
  await fetchUsers()
  loadRoles().catch(() => {})
})

const handleCreateUser = async () => {
  if (!newUser.email.trim() || !newUser.name.trim()) {
    toast.warning('Email and name are required')
    return
  }
  

  const check = await checkAction('create_user', 'users')
  if (!check.allowed) {
    toast.error('You do not have permission to create users')
    return
  }
  
  if (isCreatingUser.value) return
  
  try {
    isCreatingUser.value = true
    const result = await createUser(newUser)
    showCreateModal.value = false
    
 
    if (result.password) {
      generatedPassword.value = result.password
      showPasswordModal.value = true
      toast.warning('Email was not sent. Please save the password below.')
    } else {
      toast.success('User created. Credentials sent via email.')
    }
    if (result.apiKey) {
      generatedApiKey.value = result.apiKey
      showApiKeyModal.value = true
    }
    
 
    Object.assign(newUser, {
      email: '',
      name: '',
      tenant: '',
      isAgent: false,
      limitRequestsPerMinute: 100,
      createApiKey: true,
      roleId: undefined
    })
  } catch (error: any) {
    toast.error(`Failed to create user: ${getUserMessage(error)}`)
  } finally {
    isCreatingUser.value = false
  }
}

const confirmDelete = async (user: User) => {
  if (user.userId === 'ziri') {
    toast.error('The initial admin user (ziri) cannot be deleted')
    return
  }
  const check = await checkAction('delete_user', 'users')
  if (!check.allowed) {
    toast.error('You do not have permission to delete users')
    return
  }
  
  userToDelete.value = user
  showDeleteModal.value = true
}

const confirmResetPassword = async (user: User) => {
  if (user.userId === 'ziri') {
    toast.error('The initial admin user (ziri) password cannot be reset from here')
    return
  }
  const check = await checkAction('reset_user_password', 'users')
  if (!check.allowed) {
    toast.error('You do not have permission to reset user passwords')
    return
  }
  
  userToResetPassword.value = user
  showResetPasswordModal.value = true
}

const handleDeleteUser = async () => {
  if (!userToDelete.value || isDeletingUser.value) return
  
  try {
    isDeletingUser.value = true
    await deleteUser(userToDelete.value.userId)
    showDeleteModal.value = false
    userToDelete.value = null
    toast.success('User deleted')
  } catch (error: any) {
    toast.error(`Failed to delete user: ${getUserMessage(error)}`)
  } finally {
    isDeletingUser.value = false
  }
}

const handleResetPassword = async () => {
  if (!userToResetPassword.value || isResettingPassword.value) return
  
  try {
    isResettingPassword.value = true
    const result = await resetPassword(userToResetPassword.value.userId)
    selectedUser.value = userToResetPassword.value
    showResetPasswordModal.value = false
    
 
    if (result.password) {
      generatedPassword.value = result.password
      showPasswordModal.value = true
      toast.warning('Email was not sent. Please save the password below.')
    } else if (result.emailSent) {
      toast.success('Password reset. New password sent via email.')
    } else {
      toast.success('Password reset.')
    }
    
    userToResetPassword.value = null
  } catch (error: any) {
    toast.error(`Failed to reset password: ${getUserMessage(error)}`)
  } finally {
    isResettingPassword.value = false
  }
}

const copyPassword = () => {
  navigator.clipboard.writeText(generatedPassword.value)
  toast.success('Password copied to clipboard')
}

const copyApiKey = () => {
  navigator.clipboard.writeText(generatedApiKey.value)
  toast.success('API key copied to clipboard')
}

const closeApiKeyModal = () => {
  showApiKeyModal.value = false
  generatedApiKey.value = ''
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
        <div class="skeleton-shimmer h-10 w-28 rounded-lg"></div>
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
              <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[rgb(var(--text-muted))] w-32">
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
                <div class="skeleton-shimmer h-4 rounded" :style="{ width: `${50 + Math.random() * 20}%` }"></div>
              </td>
              <td class="px-4 py-3">
                <div class="flex gap-2">
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
      <!-- Toolbar - Always show if there's data OR if there's a search query -->
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
      <UiButton v-if="canCreateUser" @click="showCreateModal = true">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Create User
      </UiButton>
    </div>

    <!-- Empty state toolbar (when no users at all) -->
    <div class="flex items-center justify-end gap-4" v-if="users.length === 0 && !loading && !searchQuery">
      <UiButton v-if="canCreateUser" @click="showCreateModal = true">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Create User
      </UiButton>
    </div>

    <!-- Users Table -->
    <UiTable
      :columns="[
        { key: 'userId', header: 'User ID', sortable: true },
        { key: 'name', header: 'Name', sortable: true },
        { key: 'email', header: 'Email', sortable: true },
        { key: 'roleId', header: 'Role', sortable: false },
        { key: 'status', header: 'Status', sortable: true },
        { key: 'createdAt', header: 'Created', sortable: true },
        { key: 'actions', header: '', class: 'w-32' }
      ]"
      :data="users"
      :loading="loading"
      :paginated="true"
      :current-page="currentPage"
      :items-per-page="itemsPerPage"
      :total-items="totalUsers"
      :sort-by="sortBy"
      :sort-order="sortOrder"
      :empty-message="searchQuery ? 'No users match your search criteria.' : 'No users found. Create your first user to get started.'"
      @update:current-page="currentPage = $event"
      @update:items-per-page="itemsPerPage = $event"
      @update:sort="handleSort"
    >
        <template #userId="{ row }">
          <code class="text-xs font-mono">{{ row.userId }}</code>
        </template>
        <template #roleId="{ row }">
          <code v-if="row.roleId" class="text-xs font-mono px-2 py-0.5 rounded bg-[rgb(var(--surface-elevated))]">{{ row.roleId }}</code>
          <span v-else class="text-xs text-[rgb(var(--text-muted))]">-</span>
        </template>
        <template #status="{ row }">
          <span
            :class="[
              'table-pill',
              row.status === 1 
                ? 'bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-200'
                : row.status === 0
                ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                : 'bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-200'
            ]"
          >
            {{ row.status === 1 ? 'Active' : row.status === 0 ? 'Inactive' : 'Revoked' }}
          </span>
        </template>
        <template #createdAt="{ row }">
          <span class="text-xs text-[rgb(var(--text-secondary))]">
            {{ formatDate(row.createdAt) }}
          </span>
        </template>
        <template #actions="{ row }">
          <div class="flex gap-2">
            <UiButton
              v-if="canResetPassword && row.userId !== 'ziri'"
              variant="ghost"
              size="sm"
              @click="confirmResetPassword(row)"
              :loading="isResettingPassword && userToResetPassword?.userId === row.userId"
              title="Reset Password"
              class="text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </UiButton>
            <UiButton
              v-if="canDeleteUser && row.userId !== 'ziri'"
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
          <UiButton v-if="canCreateUser && !searchQuery" @click="showCreateModal = true">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Create User
          </UiButton>
        </template>
      </UiTable>

    <!-- Create User Modal -->
    <UiModal v-model="showCreateModal" title="Create User">
      <form
        @submit.prevent="handleCreateUser"
        class="flex flex-col gap-4 max-h-[min(80vh,560px)]"
      >
        <div class="flex-1 overflow-y-auto space-y-4 pr-1">
          <UiInput v-model="newUser.email" label="Email" type="email" required />
          <UiInput v-model="newUser.name" label="Name" required />
          <UiInput v-model="newUser.tenant" label="Tenant" />
          <div>
            <label class="block text-sm font-medium text-[rgb(var(--text))] mb-1">Role</label>
            <select
              v-model="newUser.roleId"
              class="w-full px-3 py-2 rounded-lg border-2 border-[rgb(var(--border))] bg-[rgb(var(--surface))] text-[rgb(var(--text))] focus:outline-none focus:ring-2 focus:ring-lime-400"
            >
              <option :value="undefined">None</option>
              <option v-for="r in rolesList" :key="r.id" :value="r.id">{{ r.id }}</option>
            </select>
            <p class="text-xs text-[rgb(var(--text-muted))] mt-0.5">
              Optional. Assign a Cedar role for access control.
            </p>
          </div>
          <UiToggle
            v-model="newUser.createApiKey"
            label="Create API Key"
            help-text="Automatically generate an API key for this user. The key will be shown once after creation."
          />
          <UiToggle
            v-model="newUser.isAgent"
            label="Is Agent"
            help-text="Mark this user as an agent. Agents may have different rate limits or permissions."
          />
          <UiInput 
            v-model="newUser.limitRequestsPerMinute" 
            label="Limit Requests Per Minute" 
            type="number" 
            min="1"
            step="1"
          />
          <p class="text-xs text-[rgb(var(--text-secondary))]">
            Default: 100 requests per minute
          </p>
        </div>
        <div class="flex gap-3 justify-end pt-3 border-t border-[rgb(var(--border))]">
          <UiButton type="button" variant="ghost" @click="showCreateModal = false">
            Cancel
          </UiButton>
          <UiButton type="submit" :loading="isCreatingUser">
            Create User
          </UiButton>
        </div>
      </form>
    </UiModal>

    <!-- Password Modal -->
    <UiModal v-model="showPasswordModal" title="Generated Password">
      <div class="space-y-4">
        <div class="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p class="text-sm font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
            {{ selectedUser ? 'Password Reset' : 'User Created' }}
          </p>
          <p class="text-xs text-yellow-800 dark:text-yellow-200 mb-3">
            ⚠️ Save this password now - it won't be shown again!
          </p>
          <div class="flex items-center gap-2">
            <code class="flex-1 text-sm font-mono bg-white dark:bg-gray-800 p-2 rounded">
              {{ generatedPassword }}
            </code>
            <UiButton size="sm" @click="copyPassword">
              Copy
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

    <!-- API Key Modal (shown once when user created with createApiKey) -->
    <UiModal v-model="showApiKeyModal" title="API Key Created">
      <div class="space-y-4">
        <div class="p-4 bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 rounded-lg">
          <p class="text-sm font-semibold text-green-900 dark:text-green-100 mb-2">
            API key created successfully
          </p>
          <p class="text-xs text-green-800 dark:text-green-200 mb-3">
            Save this API key now - it won't be shown again!
          </p>
          <div class="flex items-center gap-2">
            <code class="flex-1 text-sm font-mono bg-white dark:bg-gray-800 p-2 rounded break-all">
              {{ generatedApiKey }}
            </code>
            <UiButton size="sm" @click="copyApiKey">
              Copy
            </UiButton>
          </div>
        </div>
        <div class="flex justify-end">
          <UiButton @click="closeApiKeyModal">
            Done
          </UiButton>
        </div>
      </div>
    </UiModal>

    <!-- Delete Confirmation Modal -->
    <UiModal v-model="showDeleteModal" title="Delete User">
      <div class="space-y-4">
        <p class="text-sm text-[rgb(var(--text))]">
          Are you sure you want to delete user <strong>{{ userToDelete?.name }}</strong>?
        </p>
        <p class="text-xs text-[rgb(var(--text-secondary))]">
          This will permanently delete the user and all associated API keys. This action cannot be undone.
        </p>
        <div class="flex gap-3 justify-end">
          <UiButton variant="ghost" @click="showDeleteModal = false">
            Cancel
          </UiButton>
          <UiButton variant="danger" @click="handleDeleteUser" :loading="isDeletingUser">
            Delete User
          </UiButton>
        </div>
      </div>
    </UiModal>

    <!-- Reset Password Confirmation Modal -->
    <UiModal v-model="showResetPasswordModal" title="Reset Password">
      <div class="space-y-5">
        <div class="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-200 dark:border-yellow-800">
          <div class="flex items-start gap-3">
            <svg class="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p class="text-sm font-medium text-yellow-700 dark:text-yellow-300 mb-1">
                Are you sure you want to reset the password for this user?
              </p>
              <p class="text-xs text-yellow-600 dark:text-yellow-400">
                A new password will be generated and sent to the user's email address (if email service is enabled).
              </p>
            </div>
          </div>
        </div>
        
        <div v-if="userToResetPassword" class="space-y-2">
          <div>
            <span class="text-xs font-semibold text-[rgb(var(--text-secondary))]">Name:</span>
            <span class="ml-2 text-sm">{{ userToResetPassword.name }}</span>
          </div>
          <div>
            <span class="text-xs font-semibold text-[rgb(var(--text-secondary))]">Email:</span>
            <span class="ml-2 text-sm">{{ userToResetPassword.email }}</span>
          </div>
          <div>
            <span class="text-xs font-semibold text-[rgb(var(--text-secondary))]">User ID:</span>
            <code class="ml-2 px-2 py-1 rounded bg-[rgb(var(--surface-elevated))] text-xs font-mono">{{ userToResetPassword.userId }}</code>
          </div>
        </div>
        
        <div class="flex gap-3 justify-end pt-2">
          <UiButton type="button" variant="outline" @click="showResetPasswordModal = false; userToResetPassword = null">
            Cancel
          </UiButton>
          <UiButton type="button" @click="handleResetPassword" :loading="isResettingPassword">
            Reset Password
          </UiButton>
        </div>
      </div>
    </UiModal>
    </template>
  </div>
</template>
