<script setup lang="ts">
import { useProviders } from '~/composables/useProviders'
import { useConfigStore } from '~/stores/config'
import { useToast } from '~/composables/useToast'
import type { Provider, CreateProviderInput } from '~/composables/useProviders'

const configStore = useConfigStore()
const { providers, loading, listProviders, addProvider, removeProvider, testProvider } = useProviders()
const toast = useToast()

// Supported provider templates
const PROVIDER_TEMPLATES: Record<string, { displayName: string; baseUrl: string; models: string[] }> = {
  openai: {
    displayName: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo']
  },
  anthropic: {
    displayName: 'Anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku']
  }
}

// Auto-load providers when page mounts
onMounted(async () => {
  console.log('[PROVIDERS PAGE] onMounted called')
  
  try {
    await listProviders()
    console.log('[PROVIDERS PAGE] ✅ Providers loaded')
  } catch (e: any) {
    console.error('[PROVIDERS PAGE] Error loading providers:', e)
    toast.error(e.message || 'Failed to load providers')
  }
})

// Modal state
const showCreateModal = ref(false)
const showDeleteModal = ref(false)
const providerToDelete = ref<Provider | null>(null)
const testingProvider = ref<string | null>(null)

// Pagination
const currentPage = ref(1)
const itemsPerPage = ref(20)

// Form state
const newProvider = reactive<CreateProviderInput & { providerType: string }>({
  name: '',
  providerType: 'openai',
  apiKey: ''
})


// Filter/search
const searchQuery = ref('')

const displayProviders = computed(() => {
  let filtered = providers.value
  
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(p => 
      p.name.toLowerCase().includes(query) ||
      p.displayName.toLowerCase().includes(query) ||
      p.baseUrl.toLowerCase().includes(query)
    )
  }
  
  return filtered
})

const paginatedProviders = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return displayProviders.value.slice(start, end)
})

const totalPages = computed(() => {
  return Math.ceil(displayProviders.value.length / itemsPerPage.value)
})

const handleAddProvider = async () => {
  try {
    if (!newProvider.apiKey || !newProvider.providerType) {
      toast.error('Please provide provider type and API key')
      return
    }
    
    newProvider.name = newProvider.providerType
    
    await addProvider({
      name: newProvider.name,
      apiKey: newProvider.apiKey
    })
    
    toast.success(`Provider '${newProvider.name}' added successfully`)
    showCreateModal.value = false
    
    // Reset form
    newProvider.name = ''
    newProvider.providerType = 'openai'
    newProvider.apiKey = ''
  } catch (e: any) {
    toast.error(e.message || 'Failed to add provider')
  }
}

const handleRemoveProvider = async () => {
  if (!providerToDelete.value) return
  
  try {
    await removeProvider(providerToDelete.value.name)
    toast.success(`Provider '${providerToDelete.value.name}' removed successfully`)
    showDeleteModal.value = false
    providerToDelete.value = null
  } catch (e: any) {
    toast.error(e.message || 'Failed to remove provider')
  }
}

const handleTestProvider = async (provider: Provider) => {
  testingProvider.value = provider.name
  try {
    const result = await testProvider(provider.name)
    if (result.status === 'success') {
      const modelsText = result.models !== undefined ? ` ${result.models} models available` : ''
      toast.success(`Connection successful!${modelsText}`)
    } else {
      toast.error(result.message || 'Connection test failed')
    }
  } catch (e: any) {
    toast.error(e.message || 'Connection test failed')
  } finally {
    testingProvider.value = null
  }
}

const handleOpenCreateModal = () => {
  showCreateModal.value = true
}

const columns = [
  { key: 'displayName', header: 'Provider', sortable: true },
  { key: 'baseUrl', header: 'Base URL', sortable: true },
  { key: 'models', header: 'Models' },
  { key: 'defaultModel', header: 'Default Model' },
  { key: 'hasCredentials', header: 'Status' },
  { key: 'actions', header: 'Actions' }
]
</script>

<template>
  <div class="space-y-4">
    <!-- Toolbar -->
    <div class="flex items-center justify-between gap-4" v-if="displayProviders.length > 0">
      <div class="flex-1 flex items-center gap-3">
        <div class="relative flex-1 max-w-md">
          <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgb(var(--text-muted))]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input 
            v-model="searchQuery"
            type="text"
            placeholder="Search providers..."
            class="input pl-10"
          />
        </div>
      </div>
      <UiButton @click="handleOpenCreateModal">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Add Provider
      </UiButton>
    </div>

    <!-- Providers Table -->
    <UiTable 
      :columns="columns" 
      :data="paginatedProviders" 
      :loading="loading" 
      :paginated="true"
      :current-page="currentPage"
      :items-per-page="itemsPerPage"
      empty-message="No providers configured. Add your first LLM provider to get started."
      @update:current-page="currentPage = $event"
      @update:items-per-page="itemsPerPage = $event"
    >
      <template #empty-action>
        <UiButton @click="handleOpenCreateModal">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Add Provider
        </UiButton>
      </template>
      
      <template #displayName="{ row }">
        <div class="font-medium text-[rgb(var(--text))]">{{ row.displayName }}</div>
        <div class="text-xs text-[rgb(var(--text-muted))]">{{ row.name }}</div>
      </template>
      
      <template #baseUrl="{ value }">
        <code class="text-xs font-mono text-[rgb(var(--text-muted))]">{{ value }}</code>
      </template>
      
      <template #models="{ row }">
        <div class="flex flex-wrap gap-1">
          <span 
            v-for="model in row.models.slice(0, 3)" 
            :key="model"
            class="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-900/30 text-xs text-indigo-600 dark:text-indigo-400"
          >
            {{ model }}
          </span>
          <span 
            v-if="row.models.length > 3"
            class="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-xs text-[rgb(var(--text-muted))]"
          >
            +{{ row.models.length - 3 }} more
          </span>
        </div>
      </template>
      
      <template #defaultModel="{ value }">
        <span v-if="value" class="text-xs text-[rgb(var(--text-secondary))]">{{ value }}</span>
        <span v-else class="text-xs text-[rgb(var(--text-muted))]">N/A</span>
      </template>
      
      <template #hasCredentials="{ row }">
        <span 
          v-if="row.hasCredentials"
          class="px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
        >
          Configured
        </span>
        <span 
          v-else
          class="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400"
        >
          Missing Key
        </span>
      </template>
      
      <template #actions="{ row }">
        <div class="flex items-center gap-2">
          <UiButton
            size="sm"
            variant="ghost"
            :disabled="testingProvider === row.name"
            @click="handleTestProvider(row)"
          >
            <svg v-if="testingProvider !== row.name" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span v-else class="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
            Test
          </UiButton>
          <UiButton
            size="sm"
            variant="ghost"
            @click="providerToDelete = row; showDeleteModal = true"
          >
            <svg class="w-4 h-4 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </UiButton>
        </div>
      </template>
    </UiTable>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="flex items-center justify-between">
      <div class="text-sm text-[rgb(var(--text-muted))]">
        Showing {{ (currentPage - 1) * itemsPerPage + 1 }} to {{ Math.min(currentPage * itemsPerPage, displayProviders.length) }} of {{ displayProviders.length }} providers
      </div>
      <UiPagination
        :current-page="currentPage"
        :total-pages="totalPages"
        :items-per-page="itemsPerPage"
        :total-items="displayProviders.length"
        @update:current-page="currentPage = $event"
        @update:items-per-page="itemsPerPage = $event"
      />
    </div>

    <!-- Create Provider Modal -->
    <UiModal v-model="showCreateModal" title="Add Provider">
      <form @submit.prevent="handleAddProvider" class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-2">Provider Type</label>
          <select v-model="newProvider.providerType" class="input" required>
            <option value="">Select provider...</option>
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic</option>
          </select>
        </div>
        
        <div v-if="newProvider.providerType">
          <label class="block text-sm font-medium mb-2">Base URL</label>
          <input 
            :value="PROVIDER_TEMPLATES[newProvider.providerType]?.baseUrl || ''"
            type="text"
            class="input"
            disabled
          />
        </div>
        
        <div>
          <label class="block text-sm font-medium mb-2">API Key</label>
          <input 
            v-model="newProvider.apiKey"
            type="password"
            class="input"
            placeholder="Enter API key..."
            required
          />
        </div>
        
        <div class="flex justify-end gap-3">
          <UiButton type="button" variant="ghost" @click="showCreateModal = false">Cancel</UiButton>
          <UiButton type="submit" :disabled="loading">Add Provider</UiButton>
        </div>
      </form>
    </UiModal>

    <!-- Delete Confirmation Modal -->
    <UiModal v-model="showDeleteModal" title="Remove Provider">
      <p class="text-[rgb(var(--text-secondary))] mb-4">
        Are you sure you want to remove <strong>{{ providerToDelete?.displayName }}</strong>? This action cannot be undone.
      </p>
      <div class="flex justify-end gap-3">
        <UiButton variant="ghost" @click="showDeleteModal = false">Cancel</UiButton>
        <UiButton variant="danger" @click="handleRemoveProvider" :disabled="loading">Remove</UiButton>
      </div>
    </UiModal>

  </div>
</template>
