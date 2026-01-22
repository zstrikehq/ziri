<script setup lang="ts">
import { useUsers, type User, type CreateUserInput } from '~/composables/useUsers'
import { useToast } from '~/composables/useToast'
import { useDebounce } from '~/composables/useDebounce'
import { formatDate } from '~/utils/formatters'

const { users, loading, loadUsers, createUser, updateUser, deleteUser, resetPassword } = useUsers()
const toast = useToast()

// Modal state
const showCreateModal = ref(false)
const showPasswordModal = ref(false)
const showDeleteModal = ref(false)
const showResetPasswordModal = ref(false)
const generatedPassword = ref('')
const selectedUser = ref<User | null>(null)
const userToDelete = ref<User | null>(null)
const userToResetPassword = ref<User | null>(null)

// Loading states
const isCreatingUser = ref(false)
const isResettingPassword = ref(false)
const isDeletingUser = ref(false)

// Form state
const newUser = reactive<CreateUserInput>({
  email: '',
  name: '',
  department: '',
  isAgent: false,
  limitRequestsPerMinute: 100
})

// Filter and pagination
const searchQuery = ref('')
const currentPage = ref(1)
const itemsPerPage = ref(20)
const totalUsers = ref(0)

// Sorting state
const sortBy = ref<string | null>(null)
const sortOrder = ref<'asc' | 'desc' | null>(null)

// Debounced search query
const debouncedSearchQuery = useDebounce(searchQuery, 300)

// Fetch users with server-side search, pagination, and sorting
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
    // Error already handled in composable
  }
}

// Handle sort change
const handleSort = (newSortBy: string | null, newSortOrder: 'asc' | 'desc' | null) => {
  sortBy.value = newSortBy
  sortOrder.value = newSortOrder
  // Reset to first page when sorting changes
  currentPage.value = 1
}

// Watch for filter changes
watch([debouncedSearchQuery, currentPage, itemsPerPage, sortBy, sortOrder], () => {
  fetchUsers()
})

onMounted(async () => {
  await fetchUsers()
})

const handleCreateUser = async () => {
  if (!newUser.email.trim() || !newUser.name.trim() || !newUser.department.trim()) {
    toast.warning('Email, name, and department are required')
    return
  }
  
  if (isCreatingUser.value) return
  
  try {
    isCreatingUser.value = true
    const result = await createUser(newUser)
    showCreateModal.value = false
    
    // Only show password modal if email was NOT sent (password is in response)
    if (result.password) {
      generatedPassword.value = result.password
      showPasswordModal.value = true
      toast.warning('Email was not sent. Please save the password below.')
    } else {
      // Email was sent successfully
      toast.success('User created successfully. Credentials have been sent to the user\'s email address.')
    }
    
    // Reset form
    Object.assign(newUser, {
      email: '',
      name: '',
      department: '',
      isAgent: false,
      limitRequestsPerMinute: 100
    })
  } catch (error: any) {
    toast.error(`Failed to create user: ${error.message}`)
  } finally {
    isCreatingUser.value = false
  }
}

const confirmDelete = (user: User) => {
  userToDelete.value = user
  showDeleteModal.value = true
}

const confirmResetPassword = (user: User) => {
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
    toast.success('User deleted successfully')
  } catch (error: any) {
    toast.error(`Failed to delete user: ${error.message}`)
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
    
    // Show password modal only if email was NOT sent (password is in response)
    if (result.password) {
      generatedPassword.value = result.password
      showPasswordModal.value = true
      toast.warning('Email was not sent. Please save the password below.')
    } else if (result.emailSent) {
      // Email was sent successfully
      toast.success('Password reset successfully. The new password has been sent to the user\'s email address.')
    } else {
      // Fallback (shouldn't happen)
      toast.success('Password reset successfully.')
    }
    
    userToResetPassword.value = null
  } catch (error: any) {
    toast.error(`Failed to reset password: ${error.message}`)
  } finally {
    isResettingPassword.value = false
  }
}

const copyPassword = () => {
  navigator.clipboard.writeText(generatedPassword.value)
  toast.success('Password copied to clipboard')
}
</script>

<template>
  <div class="space-y-4">
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
      <UiButton @click="showCreateModal = true">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Create User
      </UiButton>
    </div>

    <!-- Empty state toolbar (when no users at all) -->
    <div class="flex items-center justify-end gap-4" v-if="users.length === 0 && !loading && !searchQuery">
      <UiButton @click="showCreateModal = true">
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
        <template #status="{ row }">
          <span
            :class="[
              'px-2 py-1 rounded text-xs font-semibold',
              row.status === 1 
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : row.status === 0
                ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
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
          <UiButton @click="showCreateModal = true">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Create User
          </UiButton>
        </template>
      </UiTable>

    <!-- Create User Modal -->
    <UiModal v-model="showCreateModal" title="Create User">
      <form @submit.prevent="handleCreateUser" class="space-y-4">
        <UiInput v-model="newUser.email" label="Email" type="email" required />
        <UiInput v-model="newUser.name" label="Name" required />
        <UiInput v-model="newUser.department" label="Department" required />
        
        <div class="flex items-center gap-2">
          <input 
            type="checkbox" 
            id="isAgent"
            v-model="newUser.isAgent"
            class="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <label for="isAgent" class="text-sm font-medium text-[rgb(var(--text))]">
            Is Agent
          </label>
        </div>
        
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
          <UiButton type="button" @click="handleResetPassword" :loading="isResettingPassword" class="bg-amber-500 hover:bg-amber-600 text-white">
            Reset Password
          </UiButton>
        </div>
      </div>
    </UiModal>
  </div>
</template>
