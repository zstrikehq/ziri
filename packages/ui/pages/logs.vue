<script setup lang="ts">
import { formatDateShort } from '~/utils/formatters'
import { useUnifiedAuth } from '~/composables/useUnifiedAuth'

definePageMeta({
  layout: 'default'
})

const { getAuthHeader } = useUnifiedAuth()

// Filters
const searchQuery = ref('')
const filterDecision = ref<'' | 'permit' | 'forbid'>('')
const filterProvider = ref('')
const filterModel = ref('')
const dateRange = ref<'today' | '7d' | '30d' | 'all'>('7d')

// Pagination
const currentPage = ref(1)
const itemsPerPage = ref(20)

// Loading state
const isLoading = ref(true)
const allLogs = ref<any[]>([])

// Calculate date range
const getDateRange = () => {
  const now = new Date()
  switch (dateRange.value) {
    case 'today':
      return {
        startDate: new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString(),
        endDate: now.toISOString()
      }
    case '7d':
      return {
        startDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: now.toISOString()
      }
    case '30d':
      return {
        startDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: now.toISOString()
      }
    default:
      return {
        startDate: undefined,
        endDate: undefined
      }
  }
}

// Fetch logs from API
const fetchLogs = async () => {
  try {
    isLoading.value = true
    const authHeader = getAuthHeader()
    if (!authHeader) return

    const dateRangeParams = getDateRange()
    const params = new URLSearchParams({
      limit: itemsPerPage.value.toString(),
      offset: ((currentPage.value - 1) * itemsPerPage.value).toString(),
      ...(filterDecision.value && { decision: filterDecision.value }),
      ...(filterProvider.value && { provider: filterProvider.value }),
      ...(filterModel.value && { model: filterModel.value }),
      ...(dateRangeParams.startDate && { startDate: dateRangeParams.startDate }),
      ...(dateRangeParams.endDate && { endDate: dateRangeParams.endDate }),
    })

    const response = await fetch(`/api/audit?${params.toString()}`, {
      headers: {
        'Authorization': authHeader
      }
    })

    if (response.ok) {
      const data = await response.json()
      allLogs.value = data.data || []
    }
  } catch (error) {
    // Error handled silently
  } finally {
    isLoading.value = false
  }
}

// Watch for filter changes
watch([filterDecision, filterProvider, filterModel, dateRange, currentPage, itemsPerPage], () => {
  fetchLogs()
})

// Fetch cost data for each log entry
const getCostForLog = async (requestId: string) => {
  try {
    const authHeader = getAuthHeader()
    if (!authHeader) return 0

    const response = await fetch(`/api/costs/summary?requestId=${requestId}`, {
      headers: {
        'Authorization': authHeader
      }
    })

    if (response.ok) {
      const data = await response.json()
      return data.data?.[0]?.total_cost || 0
    }
  } catch (error) {
    // Error handled silently
  }
  return 0
}

const filteredLogs = computed(() => {
  return allLogs.value.filter(log => {
    const matchesSearch = searchQuery.value === '' || 
      (log.auth_id && log.auth_id.toLowerCase().includes(searchQuery.value.toLowerCase())) ||
      (log.model && log.model.toLowerCase().includes(searchQuery.value.toLowerCase())) ||
      (log.request_id && log.request_id.toLowerCase().includes(searchQuery.value.toLowerCase()))
    
    return matchesSearch
  })
})

const uniqueProviders = computed(() => {
  return [...new Set(allLogs.value.map(log => log.provider).filter(Boolean))].sort()
})

const uniqueModels = computed(() => {
  return [...new Set(allLogs.value.map(log => log.model).filter(Boolean))].sort()
})

const getStatusBadgeClass = (decision: string) => {
  switch (decision) {
    case 'permit':
      return 'badge-success'
    case 'forbid':
      return 'badge-danger'
    default:
      return 'badge-neutral'
  }
}

const columns = [
  { key: 'request_timestamp', header: 'Time', class: 'w-40' },
  { key: 'auth_id', header: 'User', class: 'w-32' },
  { key: 'model', header: 'Model', class: 'w-36' },
  { key: 'decision', header: 'Decision', class: 'w-24' },
  { key: 'auth_duration_ms', header: 'Duration', class: 'w-28' },
  { key: 'provider', header: 'Provider', class: 'w-24' },
  { key: 'actions', header: '', class: 'w-20' }
]

onMounted(() => {
  fetchLogs()
})
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-[rgb(var(--text))]">Logs</h1>
        <p class="text-sm text-[rgb(var(--text-muted))] mt-1">Monitor API requests and authorization decisions</p>
      </div>
      <div class="flex items-center gap-3">
        <select v-model="dateRange" class="input w-32" @change="fetchLogs">
          <option value="today">Today</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="all">All time</option>
        </select>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex items-center gap-3 flex-wrap">
      <div class="relative flex-1 max-w-md">
        <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgb(var(--text-muted))]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input 
          v-model="searchQuery"
          type="text"
          placeholder="Search by user, model, or request ID..."
          class="input pl-10"
        />
      </div>
      <select v-model="filterDecision" class="input w-32" @change="fetchLogs">
        <option value="">All Decisions</option>
        <option value="permit">Permit</option>
        <option value="forbid">Forbid</option>
      </select>
      <select v-model="filterProvider" class="input w-32" @change="fetchLogs">
        <option value="">All Providers</option>
        <option v-for="provider in uniqueProviders" :key="provider" :value="provider">{{ provider }}</option>
      </select>
      <select v-model="filterModel" class="input w-32" @change="fetchLogs">
        <option value="">All Models</option>
        <option v-for="model in uniqueModels" :key="model" :value="model">{{ model }}</option>
      </select>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="card">
      <div class="space-y-2">
        <UiLoadingSkeleton :lines="10" height="h-12" />
      </div>
    </div>

    <!-- Logs Table -->
    <UiTable 
      v-else
      :columns="columns" 
      :data="filteredLogs" 
      :paginated="true"
      :current-page="currentPage"
      :items-per-page="itemsPerPage"
      empty-message="No logs found"
      @update:current-page="currentPage = $event"
      @update:items-per-page="itemsPerPage = $event"
    >
      <template #request_timestamp="{ row }">
        <div class="text-sm">
          <p class="text-[rgb(var(--text))] font-medium">{{ formatDateShort(row.request_timestamp) }}</p>
          <p class="text-xs text-[rgb(var(--text-muted))]">{{ new Date(row.request_timestamp).toLocaleTimeString() }}</p>
        </div>
      </template>

      <template #auth_id="{ value }">
        <code class="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-900/30 font-mono text-xs text-indigo-600 dark:text-indigo-400 font-semibold">{{ value || 'N/A' }}</code>
      </template>

      <template #model="{ value }">
        <span class="text-sm text-[rgb(var(--text))] font-medium">{{ value || 'N/A' }}</span>
      </template>

      <template #decision="{ row }">
        <span :class="[getStatusBadgeClass(row.decision), 'badge']">
          {{ row.decision === 'permit' ? 'Permit' : 'Forbid' }}
        </span>
      </template>

      <template #auth_duration_ms="{ value }">
        <span class="text-sm text-[rgb(var(--text))]">{{ value ? `${value}ms` : 'N/A' }}</span>
      </template>

      <template #provider="{ value }">
        <span class="text-sm text-[rgb(var(--text-secondary))]">{{ value || 'N/A' }}</span>
      </template>

      <template #actions="{ row }">
        <button 
          @click="() => {}"
          class="icon-btn text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text))]"
          title="View details"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </button>
      </template>
    </UiTable>

  </div>
</template>
