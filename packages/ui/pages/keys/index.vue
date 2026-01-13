<script setup lang="ts">
import { useKeys } from '~/composables/useKeys'
import { useUsers } from '~/composables/useUsers'
import { useConfigStore } from '~/stores/config'
import { useToast } from '~/composables/useToast'
import { formatCurrency, formatPercent, maskApiKey } from '~/utils/formatters'
import type { Key, CreateKeyInput } from '~/types/entity'

const router = useRouter()
const configStore = useConfigStore()
const { listKeys, createKey, deleteKey, rotateKey, keys, loading } = useKeys()
const { users, loadUsers } = useUsers()
const toast = useToast()

// Auto-load keys and users when page mounts (if config is set)
onMounted(async () => {
  console.log('[KEYS PAGE] onMounted called')
  console.log('[KEYS PAGE] Config state:', {
    projectId: configStore.projectId,
    isConfigured: configStore.isConfigured
  })
  
  // Wait a tick to ensure config is loaded
  await nextTick()
  console.log('[KEYS PAGE] After nextTick, isConfigured:', configStore.isConfigured)
  
  if (configStore.isConfigured) {
    console.log('[KEYS PAGE] ✅ Config is set, loading keys and users...')
    try {
      await Promise.allSettled([
        listKeys().catch(() => {}),
        loadUsers().catch(() => {})
      ])
      console.log('[KEYS PAGE] ✅ Keys and users loaded')
    } catch (e) {
      console.error('[KEYS PAGE] Error loading data:', e)
    }
  } else {
    console.log('[KEYS PAGE] ❌ Config not set, skipping keys load')
  }
})

// Modal state
const showCreateModal = ref(false)
const showKeyModal = ref(false)
const showDeleteModal = ref(false)
const generatedKey = ref('')
const keyToDelete = ref<Key | null>(null)

// Filter state
const searchQuery = ref('')
const filterStatus = ref<'' | 'active' | 'revoked'>('')

// Pagination
const currentPage = ref(1)
const itemsPerPage = ref(20)

// Form state
const newKey = reactive<CreateKeyInput>({
  userId: '',
  role: '',
  department: '',
  securityClearance: 2,
  trainingCompleted: false,
  yearsOfService: 0,
  dailySpendLimit: 50,
  monthlySpendLimit: 500
})

const selectedUser = computed(() => {
  return users.value.find(u => u.userId === newKey.userId)
})

const displayKeys = computed(() => {
  return keys.value.filter(key => {
    const matchesSearch = searchQuery.value === '' || 
      key.userId.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      key.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      key.email.toLowerCase().includes(searchQuery.value.toLowerCase())
    
    const matchesFilter = filterStatus.value === '' || key.status === filterStatus.value
    
    return matchesSearch && matchesFilter
  })
})

const columns = [
  { key: 'userId', header: 'User ID' },
  { key: 'name', header: 'Name' },
  { key: 'role', header: 'Role' },
  { key: 'apiKey', header: 'API Key' },
  { key: 'dailySpend', header: 'Daily Spend' },
  { key: 'monthlySpend', header: 'Monthly Spend' },
  { key: 'status', header: 'Status', class: 'w-24' },
  { key: 'actions', header: '', class: 'w-24' }
]

const viewKeyDetail = (row: Key) => {
  router.push(`/keys/${row.userId}`)
}

const handleCreateKey = async () => {
  if (!newKey.userId.trim()) {
    toast.warning('Please select a user')
    return
  }
  
  try {
    const result = await createKey(newKey)
    generatedKey.value = result.apiKey
    showCreateModal.value = false
    showKeyModal.value = true
    
    // Reset form
    newKey.userId = ''
    newKey.role = ''
    newKey.department = ''
    newKey.securityClearance = 2
    newKey.trainingCompleted = false
    newKey.yearsOfService = 0
    newKey.dailySpendLimit = 50
    newKey.monthlySpendLimit = 500
    
    // Reload keys to show new one
    await listKeys()
  } catch (e) {
    // Error handled by composable
  }
}

const handleDeleteKey = async () => {
  if (!keyToDelete.value) return
  
  try {
    await deleteKey(keyToDelete.value.userId)
    showDeleteModal.value = false
    keyToDelete.value = null
  } catch (e) {
    // Error handled by composable
  }
}

const confirmDelete = (key: Key) => {
  keyToDelete.value = key
  showDeleteModal.value = true
}

const handleRotateKey = async (userId: string) => {
  try {
    const result = await rotateKey(userId)
    generatedKey.value = result.apiKey
    showKeyModal.value = true
  } catch (e) {
    // Error handled by composable
  }
}

const closeKeyModal = () => {
  showKeyModal.value = false
  generatedKey.value = ''
}
</script>

<template>
  <div class="space-y-4">
    <!-- Toolbar -->
    <div class="flex items-center justify-between gap-4" v-if="displayKeys.length > 0">
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
        </div>
        <select 
          v-model="filterStatus"
          class="input w-32"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="revoked">Revoked</option>
        </select>
      </div>
      <UiButton @click="showCreateModal = true">
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
      clickable 
      @row-click="viewKeyDetail" 
      empty-message="No API keys found. Create your first key to get started."
      @update:current-page="currentPage = $event"
      @update:items-per-page="itemsPerPage = $event"
    >
      <template #empty-action>
        <UiButton @click="showCreateModal = true">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Create Key
        </UiButton>
      </template>
      <template #userId="{ value }">
        <code class="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-900/30 font-mono text-xs text-indigo-600 dark:text-indigo-400 font-semibold">{{ value }}</code>
      </template>
      
      <template #role="{ value }">
        <span class="capitalize text-[rgb(var(--text-secondary))]">{{ value.replace('_', ' ') }}</span>
      </template>
      
      <template #apiKey="{ row }">
        <div class="flex items-center gap-2">
          <code class="text-xs font-mono text-[rgb(var(--text-muted))]">{{ maskApiKey(row.apiKey) }}</code>
          <UiCopyButton :text="row.apiKey" size="sm" />
        </div>
      </template>
      
      <template #dailySpend="{ row }">
        <div class="space-y-1.5 w-28">
          <div class="flex justify-between text-xs">
            <span class="font-medium">{{ formatCurrency(row.currentDailySpend) }}</span>
            <span class="text-[rgb(var(--text-muted))]">{{ formatCurrency(row.dailySpendLimit) }}</span>
          </div>
          <div class="progress-bar">
            <div 
              class="progress-bar-fill bg-indigo-500" 
              :style="{ width: `${formatPercent(row.currentDailySpend, row.dailySpendLimit)}%` }"
            />
          </div>
        </div>
      </template>
      
      <template #monthlySpend="{ row }">
        <div class="space-y-1.5 w-28">
          <div class="flex justify-between text-xs">
            <span class="font-medium">{{ formatCurrency(row.currentMonthlySpend) }}</span>
            <span class="text-[rgb(var(--text-muted))]">{{ formatCurrency(row.monthlySpendLimit) }}</span>
          </div>
          <div class="progress-bar">
            <div 
              class="progress-bar-fill bg-green-500" 
              :style="{ width: `${formatPercent(row.currentMonthlySpend, row.monthlySpendLimit)}%` }"
            />
          </div>
        </div>
      </template>
      
      <template #status="{ value }">
        <span :class="value === 'active' ? 'badge-success' : 'badge-danger'" class="badge">
          <span class="w-1.5 h-1.5 rounded-full bg-current"></span>
          {{ value }}
        </span>
      </template>
      
      <template #actions="{ row }">
        <div class="flex gap-1">
          <UiButton 
            v-if="row.status === 'active'"
            size="sm" 
            variant="ghost"
            class="text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20"
            @click.stop="handleRotateKey(row.userId)"
          >
            Rotate
          </UiButton>
          <UiButton 
            size="sm" 
            variant="ghost"
            class="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
            @click.stop="confirmDelete(row)"
          >
            Delete
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
          <p v-if="selectedUser" class="text-xs text-[rgb(var(--text-secondary))] mt-1.5">
            {{ selectedUser.name }} ({{ selectedUser.email }})
          </p>
        </div>
        
        <div class="grid grid-cols-2 gap-4">
          <UiInput v-model="newKey.role" label="Role" placeholder="engineer" />
          <UiInput v-model="newKey.department" label="Department" placeholder="engineering" />
        </div>
        
        <div class="grid grid-cols-3 gap-4">
          <UiInput v-model.number="newKey.securityClearance" label="Security Clearance" type="number" min="1" max="5" />
          <div class="flex items-center gap-2">
            <input 
              v-model="newKey.trainingCompleted" 
              type="checkbox" 
              id="trainingCompleted"
              class="w-4 h-4 rounded border-[rgb(var(--border))]"
            />
            <label for="trainingCompleted" class="text-xs font-semibold text-[rgb(var(--text-secondary))]">
              Training Completed
            </label>
          </div>
          <UiInput v-model.number="newKey.yearsOfService" label="Years of Service" type="number" min="0" />
        </div>
        
        <div class="grid grid-cols-2 gap-4">
          <UiInput v-model.number="newKey.dailySpendLimit" label="Daily Limit ($)" type="number" />
          <UiInput v-model.number="newKey.monthlySpendLimit" label="Monthly Limit ($)" type="number" />
        </div>
        
        <div class="flex gap-3 justify-end pt-2">
          <UiButton type="button" variant="outline" @click="showCreateModal = false">
            Cancel
          </UiButton>
          <UiButton type="submit" :loading="loading">
            Create Key
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

    <!-- Delete Confirmation Modal -->
    <UiModal v-model="showDeleteModal" title="Delete API Key">
      <div class="space-y-5">
        <div class="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800">
          <div class="flex items-start gap-3">
            <svg class="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p class="text-sm font-medium text-red-700 dark:text-red-300 mb-1">
                Are you sure you want to delete this API key?
              </p>
              <p class="text-xs text-red-600 dark:text-red-400">
                This action cannot be undone. The entity will be permanently deleted from the Backend API.
              </p>
            </div>
          </div>
        </div>
        
        <div v-if="keyToDelete" class="space-y-2">
          <div>
            <span class="text-xs font-semibold text-[rgb(var(--text-secondary))]">User ID:</span>
            <code class="ml-2 px-2 py-1 rounded bg-[rgb(var(--surface-elevated))] text-xs font-mono">{{ keyToDelete.userId }}</code>
          </div>
          <div>
            <span class="text-xs font-semibold text-[rgb(var(--text-secondary))]">Name:</span>
            <span class="ml-2 text-sm">{{ keyToDelete.name }}</span>
          </div>
          <div>
            <span class="text-xs font-semibold text-[rgb(var(--text-secondary))]">Email:</span>
            <span class="ml-2 text-sm">{{ keyToDelete.email }}</span>
          </div>
        </div>
        
        <div class="flex gap-3 justify-end pt-2">
          <UiButton type="button" variant="outline" @click="showDeleteModal = false; keyToDelete = null">
            Cancel
          </UiButton>
          <UiButton type="button" variant="danger" @click="handleDeleteKey" :loading="loading">
            Delete Key
          </UiButton>
        </div>
      </div>
    </UiModal>
  </div>
</template>
