<script setup lang="ts">
import { useKeys } from '~/composables/useKeys'
import { useUsers } from '~/composables/useUsers'
import { useConfigStore } from '~/stores/config'
import { useToast } from '~/composables/useToast'
import { useCedarWasm } from '~/composables/useCedarWasm'
import { useAdminAuth } from '~/composables/useAdminAuth'
import { formatCurrency, formatPercent, maskApiKey } from '~/utils/formatters'
import { toDecimal, toDecimalOne, toDecimalFour, toIp, normalizeDecimal } from '~/utils/cedar'
import type { Key, CreateKeyInput, Entity } from '~/types/entity'
import type { ValidationError } from '~/composables/useCedarWasm'

const router = useRouter()
const configStore = useConfigStore()
const { listKeys, getKey, getKeyByUserId, createKey, updateKey, rotateKey, keys, loading } = useKeys()
const { users, loadUsers } = useUsers()
const { validateEntities } = useCedarWasm()
const toast = useToast()

// Auto-load keys and users when page mounts (if config is set)
onMounted(async () => {
  await nextTick()
  
  if (configStore.isConfigured) {
    try {
      await Promise.allSettled([
        fetchKeys(),
        loadUsers().catch(() => {})
      ])
    } catch (e) {
      // Error handled by composables
    }
  }
})

// Modal state
const showCreateModal = ref(false)
const showEditModal = ref(false)
const showKeyModal = ref(false)
const generatedKey = ref('')
const keyToEdit = ref<Key | null>(null)

// Loading states for actions
const isEditing = ref(false)
const isRotating = ref<string | null>(null)
const isCreating = ref(false)
const originalEntity = ref<Entity | null>(null)

// Filter state
const searchQuery = ref('')
const filterStatus = ref<'' | 'active' | 'revoked' | 'disabled'>('')

// Pagination
const currentPage = ref(1)
const itemsPerPage = ref(20)
const totalKeys = ref(0)

// Sorting state
const sortBy = ref<string | null>(null)
const sortOrder = ref<'asc' | 'desc' | null>(null)

// Form state - only userId needed (UserKey is created with user)
const newKey = reactive<{
  userId: string
}>({
  userId: ''
})

// Edit form state - only status is editable for UserKey
const editKey = reactive<{
  status: 'active' | 'revoked' | 'disabled'
}>({
  status: 'active'
})

// Validation state
const validationErrors = ref<ValidationError[]>([])
const isValidating = ref(false)

const selectedUser = computed(() => {
  return users.value.find(u => u.userId === newKey.userId)
})

// Debounced search query
const debouncedSearchQuery = useDebounce(searchQuery, 300)

// Fetch keys with server-side search, pagination, and sorting
const fetchKeys = async () => {
  try {
    const result = await listKeys({
      search: debouncedSearchQuery.value || undefined,
      limit: itemsPerPage.value,
      offset: (currentPage.value - 1) * itemsPerPage.value,
      sortBy: sortBy.value,
      sortOrder: sortOrder.value
    })
    totalKeys.value = result.total || 0
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

// Client-side filter by status (since status filtering isn't implemented server-side yet)
const displayKeys = computed(() => {
  if (filterStatus.value === '') {
    return keys.value
  }
  
  return keys.value.filter(key => {
    return (
      (filterStatus.value === 'active' && (key.status === 'active' || key.status === 1)) ||
      (filterStatus.value === 'revoked' && (key.status === 'revoked' || key.status === 2)) ||
      (filterStatus.value === 'disabled' && key.status === 'disabled') ||
      (typeof key.status === 'string' && key.status === filterStatus.value)
    )
  })
})

// Watch for filter changes
watch([debouncedSearchQuery, currentPage, itemsPerPage, sortBy, sortOrder], () => {
  fetchKeys()
})

watch([filterStatus], () => {
  // Status filter is client-side, no need to refetch
})

const columns = [
  { key: 'userId', header: 'User ID', sortable: true },
  { key: 'name', header: 'Name', sortable: true },
  { key: 'email', header: 'Email', sortable: true },
  { key: 'apiKey', header: 'API Key' },
  { key: 'status', header: 'Status', class: 'w-24', sortable: true },
  { key: 'currentDailySpend', header: 'Daily Spend', sortable: true },
  { key: 'currentMonthlySpend', header: 'Monthly Spend', sortable: true },
  { key: 'actions', header: '', class: 'w-32' }
]

const viewKeyDetail = (row: Key) => {
  // Use userKeyId if available, otherwise fallback to userId
  const identifier = row.userKeyId || row.userId
  router.push(`/keys/${identifier}`)
}

/**
 * Convert edit form to UserKey entity format
 * Entity UID is now UserKey::"userKeyId" (not Key::"keyHash")
 * Only status is editable for UserKey
 */
const convertToUserKeyEntity = (userKeyId: string, formData: { status: 'active' | 'revoked' | 'disabled' }, original: Entity): Entity => {
  return {
    uid: {
      type: 'UserKey',
      id: userKeyId
    },
    attrs: {
      // Keep all original UserKey attributes
      current_daily_spend: normalizeDecimal(original.attrs.current_daily_spend, 4),
      current_monthly_spend: normalizeDecimal(original.attrs.current_monthly_spend, 4),
      last_daily_reset: original.attrs.last_daily_reset,
      last_monthly_reset: original.attrs.last_monthly_reset,
      status: formData.status, // Only editable field
      user: original.attrs.user // Keep user reference
    },
    parents: original.parents || []
  }
}

/**
 * Validate entity
 */
const validateEntity = async (entity: Entity) => {
  isValidating.value = true
  try {
    const result = await validateEntities([entity])
    validationErrors.value = result.errors
      return result.valid
    } catch (e: any) {
      validationErrors.value = [{
        message: `Validation failed: ${e.message}`,
        help: null,
        sourceLocations: []
      }]
      return false
  } finally {
    isValidating.value = false
  }
}

/**
 * Handle edit key
 */
const handleEditKey = async (key: Key) => {
  if (isEditing.value) return
  
  try {
    isEditing.value = true
    
    if (!key.userKeyId) {
      toast.error('UserKey ID not available')
      return
    }
    
    // Fetch full UserKey entity data by userKeyId
    const fullKey = await getKey(key.userKeyId)
    keyToEdit.value = fullKey
    
    // Fetch original UserKey entity
    const { getAuthHeader } = useAdminAuth()
    const authHeader = getAuthHeader()
    if (!authHeader) {
      throw new Error('Please login first')
    }
    
    const uid = encodeURIComponent(`UserKey::"${key.userKeyId}"`)
    const response = await fetch(`/api/entities?uid=${uid}&includeApiKeys=true`, {
      headers: {
        'Authorization': authHeader
      }
    })
    
    if (!response.ok) {
      throw new Error('Failed to load entity')
    }
    
    const data = await response.json()
    if (data.data.length === 0) {
      throw new Error('Entity not found')
    }
    
    originalEntity.value = data.data[0]
    
    // Populate edit form - only status is editable for UserKey
    // User attributes (department, isAgent, limitRequestsPerMinute) are in User entity, not UserKey
    editKey.status = originalEntity.value.attrs.status || 'active'
    
    validationErrors.value = []
    showEditModal.value = true
  } catch (e: any) {
    toast.error(`Failed to load key for editing: ${e.message}`)
  } finally {
    isEditing.value = false
  }
}

// Loading state for update
const isUpdating = ref(false)

/**
 * Handle update key
 */
const handleUpdateKey = async () => {
  if (!keyToEdit.value || !originalEntity.value || !keyToEdit.value.userKeyId || isUpdating.value) return
  
  try {
    isUpdating.value = true
    // Convert form to UserKey entity (only status is editable)
    const entity = convertToUserKeyEntity(keyToEdit.value.userKeyId, editKey, originalEntity.value)
    
    // Validate entity
    const isValid = await validateEntity(entity)
    if (!isValid) {
      toast.warning('Please fix validation errors before saving')
      return
    }
    
    // Update UserKey entity
    await updateKey(keyToEdit.value.userKeyId, entity)
    
    showEditModal.value = false
    keyToEdit.value = null
    originalEntity.value = null
    validationErrors.value = []
    
    // Reset form
    editKey.status = 'active'
  } catch (e) {
    // Error handled by composable
  } finally {
    isUpdating.value = false
  }
}

/**
 * Handle cancel edit
 */
const handleCancelEdit = () => {
  showEditModal.value = false
  keyToEdit.value = null
  originalEntity.value = null
  validationErrors.value = []
  
  // Reset form
  editKey.status = 'active'
}

const handleCreateKey = async () => {
  if (!newKey.userId.trim()) {
    toast.warning('Please select a user')
    return
  }
  
  if (isCreating.value) return
  
  try {
    isCreating.value = true
    const result = await createKey(newKey)
    generatedKey.value = result.apiKey
    showCreateModal.value = false
    showKeyModal.value = true
    
    // Reset form
    newKey.userId = ''
    
    // Reload keys to show new one
    await fetchKeys()
  } catch (e) {
    // Error handled by composable
  } finally {
    isCreating.value = false
  }
}

// Delete functionality removed - keys are deleted when user is deleted

const handleRotateKey = async (userId: string) => {
  if (isRotating.value === userId) return
  
  try {
    isRotating.value = userId
    const result = await rotateKey(userId)
    generatedKey.value = result.apiKey
    showKeyModal.value = true
  } catch (e) {
    // Error handled by composable
  } finally {
    isRotating.value = null
  }
}

const closeKeyModal = () => {
  showKeyModal.value = false
  generatedKey.value = ''
}

// Get auth header helper
const { getAuthHeader } = useAdminAuth()
</script>

<template>
  <div class="space-y-4">
    <!-- Toolbar - Always show if there's data OR if there's a search query -->
    <div class="flex items-center justify-between gap-4" v-if="keys.length > 0 || searchQuery || filterStatus">
      <div class="flex-1 flex items-center gap-3">
        <div class="relative flex-1 max-w-md">
          <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgb(var(--text-muted))]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input 
            v-model="searchQuery"
            type="text"
            placeholder="Search by user ID, name, or email..."
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
        <select 
          v-model="filterStatus"
          class="input w-32"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="revoked">Revoked</option>
          <option value="disabled">Disabled</option>
        </select>
      </div>
      <!-- <UiButton @click="showCreateModal = true">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Create Key
      </UiButton> -->
    </div>

    <!-- Empty state toolbar (when no keys at all) -->
    <div class="flex items-center justify-end gap-4" v-if="keys.length === 0 && !loading && !searchQuery && !filterStatus">
      <!-- <UiButton @click="showCreateModal = true">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Create Key
      </UiButton> -->
    </div>

    <!-- Keys Table -->
    <UiTable 
      :columns="columns" 
      :data="displayKeys" 
      :loading="loading" 
      :paginated="true"
      :current-page="currentPage"
      :items-per-page="itemsPerPage"
      :total-items="totalKeys"
      :sort-by="sortBy"
      :sort-order="sortOrder"
      clickable 
      @row-click="viewKeyDetail" 
      :empty-message="searchQuery || filterStatus ? 'No keys match your search criteria.' : 'No API keys found. Create your first key to get started.'"
      @update:current-page="currentPage = $event"
      @update:items-per-page="itemsPerPage = $event"
      @update:sort="handleSort"
    >
      <template #empty-action>
        <!-- <UiButton @click="showCreateModal = true">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Create Key
        </UiButton> -->
      </template>
      <template #userId="{ value }">
        <code class="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-900/30 font-mono text-xs text-indigo-600 dark:text-indigo-400 font-semibold">{{ value }}</code>
      </template>
      
      <template #name="{ row }">
        <span class="text-sm text-[rgb(var(--text))] font-medium">
          {{ users.find(u => u.userId === row.userId)?.name || row.name || 'N/A' }}
        </span>
      </template>
      
      <template #apiKey="{ row }">
        <div class="flex items-center gap-2">
          <code class="text-xs font-mono text-[rgb(var(--text-muted))]">{{ maskApiKey(row.apiKey) }}</code>
          <UiCopyButton :text="row.apiKey" size="sm" />
        </div>
      </template>
      
      <template #currentDailySpend="{ value }">
        <span class="font-medium">{{ formatCurrency(value) }}</span>
      </template>
      
      <template #currentMonthlySpend="{ value }">
        <span class="font-medium">{{ formatCurrency(value) }}</span>
      </template>
      
      <template #status="{ value }">
        <span 
          :class="[
            'px-2 py-1 rounded text-xs font-semibold',
            value === 'active' || value === 1 
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : value === 'revoked' || value === 2
              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              : value === 'disabled'
              ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
              : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
          ]"
        >
          {{ typeof value === 'string' ? value.charAt(0).toUpperCase() + value.slice(1) : (value === 1 ? 'Active' : value === 2 ? 'Revoked' : 'Disabled') }}
        </span>
      </template>
      
      <template #actions="{ row }">
        <div class="flex gap-1">
          <UiButton 
            size="sm" 
            variant="ghost"
            class="text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
            @click.stop="handleEditKey(row)"
            :loading="isEditing"
            title="Edit Key"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </UiButton>
          <UiButton 
            v-if="row.status === 'active' || row.status === 1"
            size="sm" 
            variant="ghost"
            class="text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20"
            @click.stop="handleRotateKey(row.userId)"
            :loading="isRotating === row.userId"
            title="Rotate all keys for this user"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </UiButton>
        </div>
      </template>
    </UiTable>

    <!-- Create Key Modal -->
    <UiModal v-model="showCreateModal" title="Create API Key">
      <form @submit.prevent="handleCreateKey" class="space-y-5">
        <div>
          <label class="block text-xs font-semibold text-[rgb(var(--text-secondary))] mb-1.5">User</label>
          <select v-model="newKey.userId" class="input" required>
            <option value="">Select a user...</option>
            <option v-for="user in users" :key="user.userId" :value="user.userId">
              {{ user.name }} ({{ user.email }}) - {{ user.userId }}
            </option>
          </select>
          <p class="text-xs text-[rgb(var(--text-secondary))] mt-1.5">
            A UserKey entity is automatically created when a user is created. This will link a new API key to that UserKey.
          </p>
        </div>
        
        <div class="flex gap-3 justify-end pt-2">
          <UiButton type="button" variant="outline" @click="showCreateModal = false">
            Cancel
          </UiButton>
          <UiButton type="submit" :loading="isCreating">
            Create Key
          </UiButton>
        </div>
      </form>
    </UiModal>

    <!-- Edit Key Modal -->
    <UiModal v-model="showEditModal" title="Edit API Key">
      <form @submit.prevent="handleUpdateKey" class="space-y-5">
        <div>
          <label class="block text-xs font-semibold text-[rgb(var(--text-secondary))] mb-1.5">Status</label>
          <select v-model="editKey.status" class="input">
            <option value="active">Active</option>
            <option value="revoked">Revoked</option>
          </select>
          <p class="text-xs text-[rgb(var(--text-secondary))] mt-1.5">
            Only the status can be changed. User attributes (department, isAgent, limitRequestsPerMinute) are managed in the User entity.
          </p>
        </div>
        
        <!-- Validation Errors -->
        <div v-if="validationErrors.length > 0" class="space-y-2">
          <div 
            v-for="(error, idx) in validationErrors" 
            :key="idx"
            class="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800"
          >
            <div class="flex items-start gap-2">
              <svg class="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div class="flex-1">
                <p class="text-sm font-medium text-red-700 dark:text-red-300">
                  {{ error.message }}
                </p>
                <p v-if="error.help" class="text-xs text-red-600 dark:text-red-400 mt-1">
                  {{ error.help }}
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <div class="flex gap-3 justify-end pt-2">
          <UiButton type="button" variant="outline" @click="handleCancelEdit">
            Cancel
          </UiButton>
          <UiButton 
            type="submit" 
            :loading="isUpdating || isValidating" 
            :disabled="validationErrors.length > 0"
          >
            {{ isValidating ? 'Validating...' : 'Update Key' }}
          </UiButton>
        </div>
      </form>
    </UiModal>

    <!-- Generated Key Modal -->
    <UiModal v-model="showKeyModal" title="API Key" :closable="false">
      <div class="space-y-5">
        <div class="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-800">
          <div class="flex items-start gap-3">
            <svg class="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p class="text-sm font-medium text-amber-700 dark:text-amber-300">
              Save this key now — it won't be shown again!
            </p>
          </div>
        </div>
        
        <div>
          <label class="block text-xs font-semibold text-[rgb(var(--text-secondary))] mb-2">Your API Key</label>
          <div class="flex gap-2">
            <code class="flex-1 p-3 rounded-lg bg-[rgb(var(--surface-elevated))] border-2 border-[rgb(var(--border))] text-sm font-mono break-all text-[rgb(var(--text))]">
              {{ generatedKey }}
            </code>
            <UiCopyButton :text="generatedKey" />
          </div>
        </div>
        
        <div class="flex justify-end pt-2">
          <UiButton @click="closeKeyModal">Done</UiButton>
        </div>
      </div>
    </UiModal>

  </div>
</template>
