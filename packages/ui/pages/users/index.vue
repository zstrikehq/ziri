<script setup lang="ts">
import { useUsers, type User, type CreateUserInput } from '~/composables/useUsers'
import { useToast } from '~/composables/useToast'
import { formatDate } from '~/utils/formatters'

const { users, loading, loadUsers, createUser, updateUser, deleteUser, resetPassword } = useUsers()
const toast = useToast()

// Modal state
const showCreateModal = ref(false)
const showPasswordModal = ref(false)
const generatedPassword = ref('')
const selectedUser = ref<User | null>(null)

// Form state
const newUser = reactive<CreateUserInput>({
  email: '',
  name: ''
})

// Filter and pagination
const searchQuery = ref('')
const currentPage = ref(1)
const itemsPerPage = ref(20)

const displayUsers = computed(() => {
  return users.value.filter(user => {
    const matchesSearch = searchQuery.value === '' || 
      user.userId.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      user.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.value.toLowerCase())
    
    return matchesSearch
  })
})

const paginatedUsers = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return displayUsers.value.slice(start, end)
})

const totalPages = computed(() => {
  return Math.ceil(displayUsers.value.length / itemsPerPage.value)
})

onMounted(async () => {
  try {
    await loadUsers()
  } catch (e) {
    // Error already handled in composable
  }
})

const handleCreateUser = async () => {
  if (!newUser.email.trim() || !newUser.name.trim()) {
    toast.warning('Email and name are required')
    return
  }
  
  try {
    const result = await createUser(newUser)
    generatedPassword.value = result.password
    showCreateModal.value = false
    showPasswordModal.value = true
    
    // Reset form
    Object.assign(newUser, {
      email: '',
      name: ''
    })
    
    toast.success('User created successfully')
  } catch (error: any) {
    toast.error(`Failed to create user: ${error.message}`)
  }
}

const handleDeleteUser = async (user: User) => {
  if (!confirm(`Are you sure you want to delete user ${user.name}?`)) {
    return
  }
  
  try {
    await deleteUser(user.userId)
    toast.success('User deleted successfully')
  } catch (error: any) {
    toast.error(`Failed to delete user: ${error.message}`)
  }
}

const handleResetPassword = async (user: User) => {
  try {
    const password = await resetPassword(user.userId)
    generatedPassword.value = password
    selectedUser.value = user
    showPasswordModal.value = true
    toast.success('Password reset successfully')
  } catch (error: any) {
    toast.error(`Failed to reset password: ${error.message}`)
  }
}

const copyPassword = () => {
  navigator.clipboard.writeText(generatedPassword.value)
  toast.success('Password copied to clipboard')
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-[rgb(var(--text))]">Users</h1>
        <p class="text-sm text-[rgb(var(--text-secondary))] mt-1">Manage users and their access</p>
      </div>
      <UiButton @click="showCreateModal = true">
        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Create User
      </UiButton>
    </div>

    <!-- Filters -->
    <div class="card p-4">
      <div class="flex gap-4 items-end">
        <div class="flex-1">
          <label class="block text-xs font-semibold text-[rgb(var(--text-secondary))] mb-1.5">Search</label>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search by name, email, or user ID..."
            class="input"
          />
        </div>
      </div>
    </div>

    <!-- Table -->
    <div class="card overflow-hidden">
      <UiTable
        :columns="[
          { key: 'userId', header: 'User ID' },
          { key: 'name', header: 'Name' },
          { key: 'email', header: 'Email' },
          { key: 'status', header: 'Status' },
          { key: 'createdAt', header: 'Created' },
          { key: 'actions', header: '', class: 'w-32' }
        ]"
        :data="paginatedUsers"
        :loading="loading"
      >
        <template #userId="{ row }">
          <code class="text-xs font-mono">{{ row.userId }}</code>
        </template>
        <template #status="{ row }">
          <span
            :class="[
              'px-2 py-1 rounded text-xs font-semibold',
              row.status === 'active' 
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
            ]"
          >
            {{ row.status }}
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
              @click="handleResetPassword(row)"
              title="Reset Password"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </UiButton>
            <UiButton
              variant="ghost"
              size="sm"
              @click="handleDeleteUser(row)"
              title="Delete User"
            >
              <svg class="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </UiButton>
          </div>
        </template>
      </UiTable>

      <!-- Empty State -->
      <div v-if="!loading && paginatedUsers.length === 0" class="p-12 text-center">
        <p class="text-sm text-[rgb(var(--text-secondary))]">No users found</p>
      </div>

      <!-- Pagination -->
      <UiPagination
        v-if="totalPages > 1"
        :current-page="currentPage"
        :total-pages="totalPages"
        :items-per-page="itemsPerPage"
        @update:current-page="currentPage = $event"
        @update:items-per-page="itemsPerPage = $event"
      />
    </div>

    <!-- Create User Modal -->
    <UiModal v-model="showCreateModal" title="Create User">
      <form @submit.prevent="handleCreateUser" class="space-y-4">
        <UiInput v-model="newUser.email" label="Email" type="email" required />
        <UiInput v-model="newUser.name" label="Name" required />
        <p class="text-xs text-[rgb(var(--text-secondary))]">
          Note: Role and department are now set when creating API keys for this user.
        </p>
        
        <div class="flex gap-3 justify-end">
          <UiButton type="button" variant="ghost" @click="showCreateModal = false">
            Cancel
          </UiButton>
          <UiButton type="submit">
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
  </div>
</template>
