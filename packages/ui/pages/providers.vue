<script setup lang="ts">
import { useProviders } from '~/composables/useProviders'
import { useConfigStore } from '~/stores/config'
import { useToast } from '~/composables/useToast'
import { useDebounce } from '~/composables/useDebounce'
import { useInternalAuth } from '~/composables/useInternalAuth'
import { useApiError } from '~/composables/useApiError'
import type { Provider, CreateProviderInput } from '~/composables/useProviders'

const configStore = useConfigStore()
const { providers, loading, listProviders, addProvider, removeProvider, testProvider, updateProvider } = useProviders()
const toast = useToast()
const { checkActions, checkAction } = useInternalAuth()
const { getUserMessage } = useApiError()


const permissionsLoading = ref(true)
const canCreateProvider = ref(false)
const canDeleteProvider = ref(false)
const canTestProvider = ref(false)
const canUpdateProvider = ref(false)

 
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
  },
  google: {
    displayName: 'Google (Gemini)',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    models: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash']
  },
  xai: {
    displayName: 'xAI (Grok)',
    baseUrl: 'https://api.x.ai/v1',
    models: ['grok-4', 'grok-3', 'grok-3-mini']
  },
  mistral: {
    displayName: 'Mistral',
    baseUrl: 'https://api.mistral.ai/v1',
    models: ['mistral-large-3', 'mistral-medium-2505', 'mistral-small', 'mistral-nemo']
  },
  moonshot: {
    displayName: 'Kimi (Moonshot)',
    baseUrl: 'https://api.moonshot.ai/v1',
    models: ['kimi-k2.5', 'kimi-k2-thinking', 'kimi-k2-0905-preview']
  },
  deepseek: {
    displayName: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com',
    models: ['deepseek-chat', 'deepseek-reasoner', 'deepseek-v3.2', 'deepseek-r1']
  },
  dashscope: {
    displayName: 'Qwen (DashScope)',
    baseUrl: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
    models: ['qwen-plus-latest', 'qwen-max', 'qwen-plus', 'qwen-turbo']
  },
  openrouter: {
    displayName: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    models: ['anthropic/claude-sonnet-4.5', 'anthropic/claude-3.5-sonnet', 'openai/gpt-4o', 'google/gemini-2.5-pro', 'deepseek/deepseek-chat', 'x-ai/grok-4', 'mistralai/mistral-large-2512', 'moonshotai/kimi-k2.5']
  },
  vertex_ai: {
    displayName: 'Vertex AI (Google Cloud)',
    baseUrl: 'https://us-central1-aiplatform.googleapis.com/v1/projects/{project}/locations/us-central1/publishers/google/models/{model}:generateContent',
    models: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash', 'chat-bison', 'code-bison', 'text-bison']
  }
}

 
onMounted(async () => {

  permissionsLoading.value = true
  try {
    const permissions = await checkActions([
      { action: 'create_provider', resourceType: 'providers' },
      { action: 'delete_provider', resourceType: 'providers' },
      { action: 'test_provider', resourceType: 'providers' },
      { action: 'update_provider', resourceType: 'providers' }
    ])
    
    canCreateProvider.value = permissions.results.find(r => r.action === 'create_provider')?.allowed || false
    canDeleteProvider.value = permissions.results.find(r => r.action === 'delete_provider')?.allowed || false
    canTestProvider.value = permissions.results.find(r => r.action === 'test_provider')?.allowed || false
    canUpdateProvider.value = permissions.results.find(r => r.action === 'update_provider')?.allowed || false
  } finally {
    permissionsLoading.value = false
  }
  
  try {
    await listProviders()
  } catch (e: any) {
    toast.error(getUserMessage(e))
  }
})

 
const showCreateModal = ref(false)
const showEditModal = ref(false)
const showDeleteModal = ref(false)
const showExamplesModal = ref(false)
const providerToDelete = ref<Provider | null>(null)
const providerToEdit = ref<Provider | null>(null)
const testingProvider = ref<string | null>(null)

 
const currentPage = ref(1)
const itemsPerPage = ref(20)

 
const sortBy = ref<string | null>(null)
const sortOrder = ref<'asc' | 'desc' | null>(null)

 
const newProvider = reactive<CreateProviderInput & { providerType: string }>({
  name: '',
  providerType: 'openai',
  apiKey: '',
  displayName: ''
})

const editProviderState = reactive<{ displayName: string; apiKey: string }>({
  displayName: '',
  apiKey: ''
})


 
const searchQuery = ref('')
const totalProviders = ref(0)

 
const debouncedSearchQuery = useDebounce(searchQuery, 300)

 
const fetchProviders = async () => {
  try {
    const result = await listProviders({
      search: debouncedSearchQuery.value || undefined,
      limit: itemsPerPage.value,
      offset: (currentPage.value - 1) * itemsPerPage.value,
      sortBy: sortBy.value,
      sortOrder: sortOrder.value
    })
    totalProviders.value = result.total || 0
  } catch (e) {
 
  }
}

 
const handleSort = (newSortBy: string | null, newSortOrder: 'asc' | 'desc' | null) => {
  sortBy.value = newSortBy
  sortOrder.value = newSortOrder
 
  currentPage.value = 1
}

 
watch([debouncedSearchQuery, currentPage, itemsPerPage, sortBy, sortOrder], () => {
  fetchProviders()
})

const paginatedProviders = computed(() => {
 
  return providers.value
})

watch(() => newProvider.providerType, (val, prev) => {
  if (!val) return
  if (!newProvider.displayName || newProvider.displayName === prev) {
    newProvider.displayName = val
  }
})

const handleAddProvider = async () => {
  const check = await checkAction('create_provider', 'providers')
  if (!check.allowed) {
    toast.error('You do not have permission to create providers')
    return
  }

  try {
    if (!newProvider.apiKey || !newProvider.providerType) {
      toast.error('Please provide provider type and API key')
      return
    }

    newProvider.name = newProvider.providerType
    const displayName = (newProvider.displayName || newProvider.name).trim()
    
    await addProvider({
      name: newProvider.name,
      apiKey: newProvider.apiKey,
      displayName
    })

    toast.success(`${newProvider.name} added`)
    showCreateModal.value = false

    newProvider.name = ''
    newProvider.providerType = 'openai'
    newProvider.apiKey = ''
    newProvider.displayName = ''
  } catch (e: any) {
    toast.error(getUserMessage(e))
  }
}

const handleRemoveProvider = async () => {
  if (!providerToDelete.value) return
  

  const check = await checkAction('delete_provider', 'providers')
  if (!check.allowed) {
    toast.error('You do not have permission to delete providers')
    return
  }
  
  try {
    await removeProvider(providerToDelete.value.name)
    toast.success(`${providerToDelete.value.name} removed`)
    showDeleteModal.value = false
    providerToDelete.value = null
    await fetchProviders()
    const total = totalProviders.value
    const maxIndex = (currentPage.value - 1) * itemsPerPage.value
    if (currentPage.value > 1 && maxIndex >= total) {
      currentPage.value = currentPage.value - 1
    }
  } catch (e: any) {
    toast.error(getUserMessage(e))
  }
}

const openEditProvider = (provider: Provider) => {
  if (!canUpdateProvider.value) return
  providerToEdit.value = provider
  editProviderState.displayName = provider.displayName
  editProviderState.apiKey = ''
  showEditModal.value = true
}

const handleUpdateProvider = async () => {
  if (!providerToEdit.value) return

  const check = await checkAction('update_provider', 'providers')
  if (!check.allowed) {
    toast.error('You do not have permission to update providers')
    return
  }

  if (!editProviderState.displayName.trim() && !editProviderState.apiKey.trim()) {
    toast.error('Nothing to update')
    return
  }

  try {
    await updateProvider(providerToEdit.value.name, {
      displayName: editProviderState.displayName.trim(),
      apiKey: editProviderState.apiKey.trim() || undefined
    })
    toast.success('Provider updated')
    showEditModal.value = false
    providerToEdit.value = null
  } catch (e: any) {
    toast.error(getUserMessage(e))
  }
}

const handleTestProvider = async (provider: Provider) => {

  const check = await checkAction('test_provider', 'providers')
  if (!check.allowed) {
    toast.error('You do not have permission to test providers')
    return
  }
  
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
    toast.error(getUserMessage(e))
  } finally {
    testingProvider.value = null
  }
}

const handleOpenCreateModal = () => {
  newProvider.providerType = 'openai'
  newProvider.name = ''
  newProvider.apiKey = ''
  newProvider.displayName = newProvider.providerType
  showCreateModal.value = true
}

const handleOpenExamplesModal = () => {
  showExamplesModal.value = true
}

const columns = computed(() => {
  const baseColumns = [
    { key: 'name', header: 'Provider', sortable: true },
    { key: 'displayName', header: 'Display Name', sortable: true },
    { key: 'baseUrl', header: 'Base URL', sortable: true },
    { key: 'hasCredentials', header: 'Status' }
  ]
  

  if (canCreateProvider.value || canDeleteProvider.value || canTestProvider.value) {
    baseColumns.push({ key: 'actions', header: 'Actions' })
  }
  
  return baseColumns
})

const exampleApiBaseUrl = computed(() => {
  const configuredPublicUrl = (configStore.publicUrl || '').trim()
  if (configuredPublicUrl) {
    return configuredPublicUrl.replace(/\/+$/, '')
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/+$/, '')
  }

  return 'http://localhost:3100'
})

const chatCompletionCurlExample = computed(() => {
  return `curl -X POST ${exampleApiBaseUrl.value}/api/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: <your_ziri_api_key>" \\
  -d '{
    "provider": "openai",
    "model": "gpt-4o-mini",
    "messages": [
      {"role": "user", "content": "Hello, ZIRI!"}
    ]
  }'`
})

const embeddingsCurlExample = computed(() => {
  return `curl -X POST ${exampleApiBaseUrl.value}/api/embeddings \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: <your_ziri_api_key>" \\
  -d '{
    "provider": "openai",
    "model": "text-embedding-3-small",
    "input": "Hello, ZIRI!"
  }'`
})

const imageGenerationCurlExample = computed(() => {
  return `curl -X POST ${exampleApiBaseUrl.value}/api/images \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: <your_ziri_api_key>" \\
  -d '{
    "provider": "openai",
    "model": "dall-e-3",
    "prompt": "A white cat sitting on a windowsill",
    "size": "1024x1024",
    "quality": "standard",
    "n": 1
  }'`
})
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
        <div class="skeleton-shimmer h-10 w-32 rounded-lg"></div>
      </div>
      <!-- Table Skeleton -->
      <div class="overflow-x-auto rounded-xl border-2 border-[rgb(var(--border))] bg-[rgb(var(--surface))]">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b-2 border-[rgb(var(--border))]">
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
            </tr>
          </thead>
          <tbody>
            <tr v-for="i in 5" :key="i" class="border-b border-[rgb(var(--border))]">
              <td class="px-4 py-3">
                <div class="skeleton-shimmer h-4 rounded" :style="{ width: `${70 + Math.random() * 20}%` }"></div>
              </td>
              <td class="px-4 py-3">
                <div class="skeleton-shimmer h-4 rounded" :style="{ width: `${65 + Math.random() * 25}%` }"></div>
              </td>
              <td class="px-4 py-3">
                <div class="skeleton-shimmer h-4 rounded" :style="{ width: `${60 + Math.random() * 30}%` }"></div>
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
      <div class="flex items-center justify-between gap-4" v-if="providers.length > 0 || searchQuery">
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
      <div class="flex items-center gap-2">
        <UiButton v-if="canCreateProvider" variant="outline" @click="handleOpenExamplesModal">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17h6M9 13h6M9 9h6" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 4h10a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2z" />
          </svg>
          Examples
        </UiButton>
        <UiButton v-if="canCreateProvider" @click="handleOpenCreateModal">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Add Provider
        </UiButton>
      </div>
    </div>

    <!-- Empty state toolbar (when no providers at all) -->
    <div class="flex items-center justify-end gap-4" v-if="providers.length === 0 && !loading && !searchQuery">
      <div class="flex items-center gap-2">
        <UiButton v-if="canCreateProvider" variant="outline" @click="handleOpenExamplesModal">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17h6M9 13h6M9 9h6" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 4h10a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2z" />
          </svg>
          Examples
        </UiButton>
        <UiButton v-if="canCreateProvider" @click="handleOpenCreateModal">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Add Provider
        </UiButton>
      </div>
    </div>

    <!-- Providers Table -->
    <UiTable 
      :columns="columns" 
      :data="paginatedProviders" 
      :loading="loading" 
      :paginated="true"
      :current-page="currentPage"
      :items-per-page="itemsPerPage"
      :total-items="totalProviders"
      :sort-by="sortBy"
      :sort-order="sortOrder"
      :empty-message="searchQuery ? 'No providers match your search criteria.' : 'No providers configured. Add your first LLM provider to get started.'"
      @update:current-page="currentPage = $event"
      @update:items-per-page="itemsPerPage = $event"
      @update:sort="handleSort"
    >
      <template #empty-action>
        <UiButton v-if="canCreateProvider && !searchQuery" @click="handleOpenCreateModal">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Add Provider
        </UiButton>
      </template>
      
      <template #name="{ row }">
        <div class="font-medium text-[rgb(var(--text))]">{{ row.displayName }}</div>
        <div class="text-xs text-[rgb(var(--text-muted))]">{{ row.name }}</div>
      </template>
      
      <template #displayName="{ row }">
        <span class="text-[rgb(var(--text))]">{{ row.displayName }}</span>
      </template>
      
      <template #baseUrl="{ value }">
        <code class="text-xs font-mono text-[rgb(var(--text-muted))]">{{ value }}</code>
      </template>
      
      <!-- <template #models="{ row }">
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
      </template> -->
      
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
            v-if="canUpdateProvider"
            size="sm"
            variant="ghost"
            @click="openEditProvider(row)"
          >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </UiButton>
          <UiButton
            v-if="canTestProvider"
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
            v-if="canDeleteProvider"
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


    <!-- Create Provider Modal -->
    <UiModal v-model="showCreateModal" title="Add Provider">
      <form @submit.prevent="handleAddProvider" class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-2">Provider Type</label>
          <select v-model="newProvider.providerType" class="input" required>
            <option value="">Select provider...</option>
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic</option>
            <option value="google">Google (Gemini)</option>
            <option value="xai">xAI (Grok)</option>
            <option value="mistral">Mistral</option>
            <option value="moonshot">Kimi (Moonshot)</option>
            <option value="deepseek">DeepSeek</option>
            <option value="dashscope">Qwen (DashScope)</option>
            <option value="openrouter">OpenRouter</option>
            <option value="vertex_ai">Vertex AI (Google Cloud)</option>
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

        <div v-if="newProvider.providerType">
          <label class="block text-sm font-medium mb-2">Provider name</label>
          <input
            v-model="newProvider.displayName"
            type="text"
            class="input"
            placeholder="Name used in requests, e.g. openai or chatGPT"
          />
          <p class="text-xs text-[rgb(var(--text-secondary))] mt-1">
            You can use this value as the provider field in chat, image, or embeddings requests.
          </p>
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

    <!-- Edit Provider Modal -->
    <UiModal v-model="showEditModal" title="Edit Provider">
      <form @submit.prevent="handleUpdateProvider" class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-1">Provider ID</label>
          <input
            :value="providerToEdit?.name || ''"
            type="text"
            class="input"
            disabled
          />
        </div>

        <div>
          <label class="block text-sm font-medium mb-1">Base URL</label>
          <input
            :value="providerToEdit?.baseUrl || ''"
            type="text"
            class="input"
            disabled
          />
        </div>

        <div>
          <label class="block text-sm font-medium mb-1">Provider name</label>
          <input
            v-model="editProviderState.displayName"
            type="text"
            class="input"
            placeholder="Name used in requests, e.g. openai or chatGPT"
          />
        </div>

        <div>
          <label class="block text-sm font-medium mb-1">API Key</label>
          <input
            v-model="editProviderState.apiKey"
            type="password"
            class="input"
            placeholder="Leave blank to keep existing key"
          />
        </div>

        <div class="flex justify-end gap-3 pt-2 border-t border-[rgb(var(--border))]">
          <UiButton type="button" variant="ghost" @click="showEditModal = false; providerToEdit = null">
            Cancel
          </UiButton>
          <UiButton type="submit" :disabled="loading">
            Save changes
          </UiButton>
        </div>
      </form>
    </UiModal>

    <UiModal v-model="showExamplesModal" title="Provider Request Examples">
      <div class="space-y-4">
        <div class="max-h-[70vh] overflow-y-auto pr-1 space-y-4">
          <p class="text-sm text-[rgb(var(--text-secondary))]">
            Use these examples to call ZIRI for chat completions, embeddings, and image generation.
          </p>
          <p class="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md px-3 py-2">
            Note: Not every model supports all three tasks. Update model names based on your provider's capabilities.
          </p>

          <div class="space-y-3 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface-elevated))] p-3">
            <div>
              <p class="text-xs font-semibold text-[rgb(var(--text))] mb-1">Chat Completions</p>
              <pre class="whitespace-pre-wrap break-all text-xs font-mono text-[rgb(var(--text-muted))]">{{ chatCompletionCurlExample }}</pre>
            </div>
            <div>
              <p class="text-xs font-semibold text-[rgb(var(--text))] mb-1">Embeddings</p>
              <pre class="whitespace-pre-wrap break-all text-xs font-mono text-[rgb(var(--text-muted))]">{{ embeddingsCurlExample }}</pre>
            </div>
            <div>
              <p class="text-xs font-semibold text-[rgb(var(--text))] mb-1">Image Generation</p>
              <pre class="whitespace-pre-wrap break-all text-xs font-mono text-[rgb(var(--text-muted))]">{{ imageGenerationCurlExample }}</pre>
            </div>
          </div>
        </div>

        <div class="flex justify-end">
          <UiButton type="button" variant="ghost" @click="showExamplesModal = false">Close</UiButton>
        </div>
      </div>
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
    </template>
  </div>
</template>
