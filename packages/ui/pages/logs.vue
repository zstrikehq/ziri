<script setup lang="ts">
import { formatDateShort, formatCurrency } from '~/utils/formatters'
import { useUnifiedAuth } from '~/composables/useUnifiedAuth'
import { useRealtimeUpdates } from '~/composables/useRealtimeUpdates'
import { useDebounce } from '~/composables/useDebounce'

definePageMeta({
  layout: 'default'
})

const { getAuthHeader } = useUnifiedAuth()

const searchQuery = ref('')
const filterDecision = ref<'' | 'permit' | 'forbid'>('')
const filterProvider = ref('')
const filterModel = ref('')
const dateRange = ref<'today' | '7d' | '30d' | 'all'>('7d')

const currentPage = ref(1)
const itemsPerPage = ref(10)

const sortBy = ref<string | null>(null)
const sortOrder = ref<'asc' | 'desc' | null>(null)

const isLoading = ref(true)
const allLogs = ref<any[]>([])
const totalLogs = ref<number | undefined>(undefined)

const debouncedSearchQuery = useDebounce(searchQuery, 300)

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

const fetchLogs = async () => {
  try {
    isLoading.value = true
    const authHeader = getAuthHeader()
    if (!authHeader) return

    const dateRangeParams = getDateRange()
    const params = new URLSearchParams()
    params.set('limit', itemsPerPage.value.toString())
    params.set('offset', ((currentPage.value - 1) * itemsPerPage.value).toString())
    
    if (filterDecision.value) params.set('decision', filterDecision.value)
    if (filterProvider.value) params.set('provider', filterProvider.value)
    if (filterModel.value) params.set('model', filterModel.value)
    if (dateRangeParams.startDate) params.set('startDate', dateRangeParams.startDate)
    if (dateRangeParams.endDate) params.set('endDate', dateRangeParams.endDate)
    if (searchQuery.value) params.set('search', searchQuery.value)
    
 
    if (sortBy.value) {
      params.set('sortBy', sortBy.value)
    }
    if (sortOrder.value) {
      params.set('sortOrder', sortOrder.value)
    }

    const response = await fetch(`/api/audit?${params.toString()}`, {
      headers: {
        'Authorization': authHeader
      }
    })

    if (response.ok) {
      const data = await response.json()
      allLogs.value = data.data || []
      totalLogs.value = data.total !== undefined ? data.total : undefined
    }
  } catch (error) {
 
  } finally {
    isLoading.value = false
  }
}

const handleSort = (newSortBy: string | null, newSortOrder: 'asc' | 'desc' | null) => {
  sortBy.value = newSortBy
  sortOrder.value = newSortOrder
  currentPage.value = 1
}

watch([filterDecision, filterProvider, filterModel, dateRange, currentPage, itemsPerPage, debouncedSearchQuery, sortBy, sortOrder], () => {
  fetchLogs()
})

const { isConnected, error: sseError } = useRealtimeUpdates({
  onAuditLogCreated: (event) => {
    const dateRangeParams = getDateRange()
    const eventDate = event.data.timestamp ? new Date(event.data.timestamp) : new Date()
    
    let matchesDateRange = true
    if (dateRangeParams.startDate) {
      matchesDateRange = eventDate >= new Date(dateRangeParams.startDate)
    }
    if (dateRangeParams.endDate && matchesDateRange) {
      matchesDateRange = eventDate <= new Date(dateRangeParams.endDate)
    }
    
    const matchesDecision = !filterDecision.value || event.data.decision === filterDecision.value
    const matchesProvider = !filterProvider.value || event.data.provider === filterProvider.value
    const matchesModel = !filterModel.value || event.data.model === filterModel.value
    
    if (matchesDateRange && matchesDecision && matchesProvider && matchesModel) {
      if (currentPage.value === 1) {
        fetchLogs()
      }
    }
  },
  onBatchUpdate: (event) => {
    if (currentPage.value === 1) {
      fetchLogs()
    }
  }
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
  { key: 'request_timestamp', header: 'Time', class: 'w-40', sortable: true },
  { key: 'auth_id', header: 'User', class: 'w-32', sortable: true },
  { key: 'model', header: 'Model', class: 'w-36', sortable: true },
  { key: 'decision', header: 'Decision', class: 'w-24', sortable: true },
  { key: 'auth_duration_ms', header: 'Duration', class: 'w-28', sortable: true },
  { key: 'provider', header: 'Provider', class: 'w-24', sortable: true },
  { key: 'spend', header: 'Cost', class: 'w-28', sortable: true }
]

onMounted(() => {
  fetchLogs()
})
</script>

<template>
  <div class="space-y-4">

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
      <select v-model="dateRange" class="input w-32" @change="fetchLogs">
          <option value="today">Today</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="all">All time</option>
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
      :data="allLogs" 
      :loading="isLoading"
      :paginated="true"
      :current-page="currentPage"
      :items-per-page="itemsPerPage"
      :total-items="totalLogs !== undefined ? totalLogs : allLogs.length"
      :sort-by="sortBy"
      :sort-order="sortOrder"
      empty-message="No logs found"
      @update:current-page="currentPage = $event"
      @update:items-per-page="itemsPerPage = $event"
      @update:sort="handleSort"
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

      <template #spend="{ row }">
        <span class="font-mono font-medium">{{ formatCurrency(row.spend ?? 0) }}</span>
      </template>
    </UiTable>

  </div>
</template>
