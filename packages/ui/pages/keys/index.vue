<script setup lang="ts">
import { useKeys } from '~/composables/useKeys'
import { useUsers } from '~/composables/useUsers'
import { useConfigStore } from '~/stores/config'
import { useToast } from '~/composables/useToast'
import { useCedarWasm } from '~/composables/useCedarWasm'
import { useAdminAuth } from '~/composables/useAdminAuth'
import { useInternalAuth } from '~/composables/useInternalAuth'
import { extractApiErrorMessage, useApiError } from '~/composables/useApiError'
import { formatCurrency, formatPercent, maskApiKey } from '~/utils/formatters'
import { toDecimal, toDecimalOne, toDecimalFour, toIp, normalizeDecimal } from '~/utils/cedar'
import type { Key, CreateKeyInput, Entity } from '~/types/entity'
import type { ValidationError } from '~/composables/useCedarWasm'

const router = useRouter()
const configStore = useConfigStore()
const { listKeys, getKey, getKeyByUserId, createKey, updateKey, rotateKey, deleteKey, deleteKeyById, keys, loading } = useKeys()
const { users } = useUsers()
const { getAuthHeader } = useAdminAuth()
const { validateEntities } = useCedarWasm()
const toast = useToast()
const { checkActions, checkAction } = useInternalAuth()
const { getUserMessage } = useApiError()


const loadAllUsersForApiKeys = async () => {
  try {
    const authHeader = getAuthHeader()
    if (!authHeader) {
      throw new Error('Please login first')
    }
    
    const response = await fetch('/api/users?forApiKeys=true', {
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
  } catch (error: any) {

  }
}

const formatValidationMessage = (message: string) => {
  return getUserMessage({ message })
}


const permissionsLoading = ref(true)
const canCreateKey = ref(false)
const canRotateKey = ref(false)
const canDeleteKey = ref(false)
const canUpdateKeyStatus = ref(false)

 
onMounted(async () => {

  permissionsLoading.value = true
  try {
    const permissions = await checkActions([
      { action: 'create_key', resourceType: 'keys' },
      { action: 'rotate_key', resourceType: 'keys' },
      { action: 'delete_key_by_id', resourceType: 'keys' },
      { action: 'update_key_status', resourceType: 'keys' }
    ])
    
    canCreateKey.value = permissions.results.find(r => r.action === 'create_key')?.allowed || false
    canRotateKey.value = permissions.results.find(r => r.action === 'rotate_key')?.allowed || false
    canDeleteKey.value = permissions.results.find(r => r.action === 'delete_key_by_id')?.allowed || false
    canUpdateKeyStatus.value = permissions.results.find(r => r.action === 'update_key_status')?.allowed || false
  } finally {
    permissionsLoading.value = false
  }
  
  await nextTick()
  
  if (configStore.isConfigured) {
    try {
      await Promise.allSettled([
        fetchKeys(),
        loadAllUsersForApiKeys().catch(() => {})
      ])
    } catch (e) {
 
    }
  }
})

 
const showCreateModal = ref(false)
const showEditModal = ref(false)
const showKeyModal = ref(false)
const showDeleteKeyModal = ref(false)
const generatedKey = ref('')
const keyToEdit = ref<Key | null>(null)
const keyToDelete = ref<Key | null>(null)
const isKeyRotated = ref(false)

 
const isEditing = ref(false)
const isRotating = ref<string | null>(null)
const isDeleting = ref<string | null>(null)
const isCreating = ref(false)
const originalEntity = ref<Entity | null>(null)

 
const searchQuery = ref('')
const filterStatus = ref<'' | 'active' | 'disabled'>('')

 
const currentPage = ref(1)
const itemsPerPage = ref(20)
const totalKeys = ref(0)

 
const sortBy = ref<string | null>(null)
const sortOrder = ref<'asc' | 'desc' | null>(null)

 
const newKey = reactive<{
  userId: string
}>({
  userId: ''
})

 
const editKey = reactive<{
  status: 'active' | 'disabled'
}>({
  status: 'active'
})

 
const validationErrors = ref<ValidationError[]>([])
const isValidating = ref(false)

const selectedUser = computed(() => {
  return users.value.find(u => u.userId === newKey.userId)
})

const usersWithoutKey = computed(() => {
  return users.value.filter(u => !keys.value.some((k: Key) => k.userId === u.userId))
})

 
const debouncedSearchQuery = useDebounce(searchQuery, 300)

 
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
 
  }
}

 
const handleSort = (newSortBy: string | null, newSortOrder: 'asc' | 'desc' | null) => {
  sortBy.value = newSortBy
  sortOrder.value = newSortOrder
 
  currentPage.value = 1
}

 
const displayKeys = computed(() => {
  if (filterStatus.value === '') {
    return keys.value
  }
  
  return keys.value.filter(key => {
    return (
      (filterStatus.value === 'active' && (key.status === 'active' || key.status === 1)) ||
      (filterStatus.value === 'disabled' && key.status === 'disabled') ||
      (typeof key.status === 'string' && key.status === filterStatus.value)
    )
  })
})

 
watch([debouncedSearchQuery, currentPage, itemsPerPage, sortBy, sortOrder], () => {
  fetchKeys()
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

const viewKeyDetail = async (row: Key) => {

  const check = await checkAction('create_key', 'keys')
  if (!check.allowed) {
    toast.error('You do not have permission to view key details')
    return
  }
  
  const identifier = row.userKeyId || row.userId
  router.push(`/keys/${identifier}`)
}

 
const convertToUserKeyEntity = (userKeyId: string, formData: { status: 'active' | 'disabled' }, original: Entity): Entity => {
  return {
    uid: {
      type: 'UserKey',
      id: userKeyId
    },
    attrs: {
 
      current_daily_spend: normalizeDecimal(original.attrs.current_daily_spend, 4),
      current_monthly_spend: normalizeDecimal(original.attrs.current_monthly_spend, 4),
      last_daily_reset: original.attrs.last_daily_reset,
      last_monthly_reset: original.attrs.last_monthly_reset,
      status: formData.status,
      user: original.attrs.user
    },
    parents: original.parents || []
  }
}

 
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

 
const handleEditKey = async (key: Key) => {
  if (isEditing.value) return
  
  try {
    isEditing.value = true
    
    if (!key.userKeyId) {
      toast.error('UserKey ID not available')
      return
    }
    
 
    const fullKey = await getKey(key.userKeyId)
    keyToEdit.value = fullKey
    
 
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
    
 
 
    const s = originalEntity.value.attrs.status
    editKey.status = (s === 'active' || s === 'disabled') ? s : 'active'
    
    validationErrors.value = []
    showEditModal.value = true
  } catch (e: any) {
    toast.error(`Failed to load key for editing: ${getUserMessage(e)}`)
  } finally {
    isEditing.value = false
  }
}

 
const isUpdating = ref(false)

 
const handleUpdateKey = async () => {
  if (!keyToEdit.value || !originalEntity.value || !keyToEdit.value.userKeyId || isUpdating.value) return
  

  const check = await checkAction('update_key_status', 'keys')
  if (!check.allowed) {
    toast.error('You do not have permission to update key status')
    return
  }
  
  try {
    isUpdating.value = true
 
    const entity = convertToUserKeyEntity(keyToEdit.value.userKeyId, editKey, originalEntity.value)
    
 
    const isValid = await validateEntity(entity)
    if (!isValid) {
      toast.warning('Please fix validation errors before saving')
      return
    }
    
 
    await updateKey(keyToEdit.value.userKeyId, entity)
    
    await fetchKeys()
    
    showEditModal.value = false
    keyToEdit.value = null
    originalEntity.value = null
    validationErrors.value = []
    
 
    editKey.status = 'active'
  } catch (e) {
 
  } finally {
    isUpdating.value = false
  }
}

 
const handleCancelEdit = () => {
  showEditModal.value = false
  keyToEdit.value = null
  originalEntity.value = null
  validationErrors.value = []
  
 
  editKey.status = 'active'
}

const handleCreateKey = async () => {
  if (!newKey.userId.trim()) {
    toast.warning('Please select a user')
    return
  }
  

  const check = await checkAction('create_key', 'keys')
  if (!check.allowed) {
    toast.error('You do not have permission to create API keys')
    return
  }
  
  if (isCreating.value) return
  
  try {
    isCreating.value = true
    const result = await createKey(newKey)
    generatedKey.value = result.apiKey
    isKeyRotated.value = false
    showCreateModal.value = false
    showKeyModal.value = true
    
    newKey.userId = ''
    
    await fetchKeys()
  } catch (e) {
 
  } finally {
    isCreating.value = false
  }
}

 

const handleRotateKey = async (userId: string) => {
  if (isRotating.value === userId) return
  

  const check = await checkAction('rotate_key', 'keys')
  if (!check.allowed) {
    toast.error('You do not have permission to rotate API keys')
    return
  }
  
  try {
    isRotating.value = userId
    const result = await rotateKey(userId)
    generatedKey.value = result.apiKey
    isKeyRotated.value = true
    showKeyModal.value = true
  } catch (e) {
 
  } finally {
    isRotating.value = null
  }
}

const confirmDeleteKey = async (row: Key) => {
  if (!row.executionKey) {
    toast.error('Key ID not available')
    return
  }
  const check = await checkAction('delete_key_by_id', 'keys')
  if (!check.allowed) {
    toast.error('You do not have permission to delete keys')
    return
  }
  keyToDelete.value = row
  showDeleteKeyModal.value = true
}

const handleDeleteKey = async () => {
  if (!keyToDelete.value?.executionKey || isDeleting.value) return
  try {
    isDeleting.value = keyToDelete.value.executionKey
    await deleteKeyById(keyToDelete.value.executionKey)
    showDeleteKeyModal.value = false
    keyToDelete.value = null
    await fetchKeys()
  } catch (e) {

  } finally {
    isDeleting.value = null
  }
}

const handleRotateFromEdit = async () => {
  if (!keyToEdit.value?.userId) return
  const check = await checkAction('rotate_key', 'keys')
  if (!check.allowed) {
    toast.error('You do not have permission to rotate API keys')
    return
  }
  try {
    isRotating.value = keyToEdit.value.userId
    const result = await rotateKey(keyToEdit.value.userId)
    showEditModal.value = false
    keyToEdit.value = null
    originalEntity.value = null
    generatedKey.value = result.apiKey
    isKeyRotated.value = true
    showKeyModal.value = true
    await fetchKeys()
  } catch (e) {

  } finally {
    isRotating.value = null
  }
}

const closeKeyModal = () => {
  showKeyModal.value = false
  generatedKey.value = ''
  isKeyRotated.value = false
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
          <div class="skeleton-shimmer h-10 w-32 rounded-lg"></div>
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
              <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[rgb(var(--text-muted))]">
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
          class="input"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="disabled">Disabled</option>
        </select>
      </div>
      <UiButton v-if="canCreateKey" @click="showCreateModal = true">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Create Key
      </UiButton>
    </div>

    <!-- Empty state toolbar (when no keys at all) -->
    <div class="flex items-center justify-end gap-4" v-if="keys.length === 0 && !loading && !searchQuery && !filterStatus">
      <UiButton v-if="canCreateKey" @click="showCreateModal = true">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Create Key
      </UiButton>
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
        <UiButton @click="showCreateModal = true" v-if="!canCreateKey && !searchQuery">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Create Key
        </UiButton>
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
        <code class="text-xs font-mono text-[rgb(var(--text-muted))]">{{ maskApiKey(undefined, row.keySuffix) }}</code>
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
              : value === 'disabled'
              ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
              : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
          ]"
        >
          {{ typeof value === 'string' ? value.charAt(0).toUpperCase() + value.slice(1) : (value === 1 ? 'Active' : 'Disabled') }}
        </span>
      </template>
      
      <template #actions="{ row }">
        <div class="flex gap-1">
          <UiButton 
            v-if="canUpdateKeyStatus"
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
            v-if="row.executionKey && canDeleteKey"
            size="sm" 
            variant="ghost"
            class="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
            @click.stop="confirmDeleteKey(row)"
            :loading="isDeleting === row.executionKey"
            title="Delete key"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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
          <select v-model="newKey.userId" class="input" required :disabled="usersWithoutKey.length === 0">
            <option value="">Select a user...</option>
            <option v-for="user in usersWithoutKey" :key="user.userId" :value="user.userId">
              {{ user.name }} ({{ user.email }}) - {{ user.userId }}
            </option>
          </select>
          <p v-if="usersWithoutKey.length === 0" class="text-xs text-[rgb(var(--text-muted))] mt-1.5">
            All users already have an API key.
          </p>
          <p v-else class="text-xs text-[rgb(var(--text-secondary))] mt-1.5">
            Only users without an API key are listed. One key per user.
          </p>
        </div>
        
        <div class="flex gap-3 justify-end pt-2">
          <UiButton type="button" variant="outline" @click="showCreateModal = false">
            Cancel
          </UiButton>
          <UiButton type="submit" :loading="isCreating" :disabled="usersWithoutKey.length === 0">
            Create Key
          </UiButton>
        </div>
      </form>
    </UiModal>

    <!-- Edit Key Modal -->
    <UiModal v-model="showEditModal" title="Edit API Key">
      <form @submit.prevent="handleUpdateKey" class="space-y-5">
        <div>
          <UiToggle
            :model-value="editKey.status === 'active'"
            @update:model-value="editKey.status = $event ? 'active' : 'disabled'"
            label="Status"
            help-text="Only active keys can be used for API requests."
          />
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
                  {{ formatValidationMessage(error.message) }}
                </p>
                <p v-if="error.help" class="text-xs text-red-600 dark:text-red-400 mt-1">
                  {{ error.help }}
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <div class="flex gap-3 justify-end pt-2">
          <UiButton 
            v-if="keyToEdit && canRotateKey"
            type="button" 
            variant="outline"
            :loading="isRotating === keyToEdit.userId"
            @click="handleRotateFromEdit"
          >
            Rotate Key
          </UiButton>
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

    <!-- Delete Key Confirmation Modal -->
    <UiModal v-model="showDeleteKeyModal" title="Delete API Key">
      <div class="space-y-4">
        <p class="text-sm text-[rgb(var(--text))]">
          Are you sure you want to delete the API key for <strong>{{ keyToDelete?.name || keyToDelete?.userId }}</strong>?
        </p>
        <p class="text-xs text-[rgb(var(--text-secondary))]">
          This will permanently delete the API key. Any applications using this key will no longer be able to authenticate. This action cannot be undone.
        </p>
        <div class="flex gap-3 justify-end">
          <UiButton variant="ghost" @click="showDeleteKeyModal = false">
            Cancel
          </UiButton>
          <UiButton variant="danger" @click="handleDeleteKey" :loading="!!isDeleting">
            Delete Key
          </UiButton>
        </div>
      </div>
    </UiModal>

    <!-- Generated Key Modal -->
    <UiModal v-model="showKeyModal" title="API Key" :closable="false">
      <div class="space-y-5">
        <div class="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800">
          <div class="flex items-start gap-3">
            <svg class="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <!-- <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /> -->
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <p class="text-sm font-medium text-green-700 dark:text-green-300">
              {{ isKeyRotated ? 'API key rotated successfully' : 'API key created successfully' }}
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
    </template>
  </div>
</template>
