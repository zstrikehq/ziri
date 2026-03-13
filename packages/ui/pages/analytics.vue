<script setup lang="ts">
import { formatCurrency, formatDateShort } from '~/utils/formatters'
import { useUnifiedAuth } from '~/composables/useUnifiedAuth'
import { useRealtimeUpdates } from '~/composables/useRealtimeUpdates'
import KeysSpendChart from '~/components/keys/SpendChart.vue'
import { TOP_MODEL_PROGRESS_COLORS } from '~/constants/chart-colors'

definePageMeta({
  layout: 'default'
})

const { getAuthHeader } = useUnifiedAuth()

const timeRange = ref<'today' | '7d' | '30d' | '90d' | 'all'>('30d')

const isLoading = ref(true)
const overviewStats = ref({
  totalRequests: 0,
  permitCount: 0,
  forbidCount: 0,
  totalCost: 0
})
const costByProvider = ref<any[]>([])
const costByModel = ref<any[]>([])
const dailyCost = ref<any[]>([])

const getDateRange = () => {
  const now = new Date()
  switch (timeRange.value) {
    case 'today':
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return {
        startDate: today.toISOString(),
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
    case '90d':
      return {
        startDate: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: now.toISOString()
      }
    default:
      return {
        startDate: undefined,
        endDate: undefined
      }
  }
}

const fetchOverviewStats = async () => {
  try {
    const authHeader = getAuthHeader()
    if (!authHeader) return

    const dateRangeParams = getDateRange()
    const params = new URLSearchParams({
      ...(dateRangeParams.startDate && { startDate: dateRangeParams.startDate }),
      ...(dateRangeParams.endDate && { endDate: dateRangeParams.endDate }),
    })

    const response = await fetch(`/api/stats/overview?${params.toString()}`, {
      headers: {
        'Authorization': authHeader
      }
    })

    if (response.ok) {
      const data = await response.json()
      overviewStats.value = data
    }
  } catch (error) {
 
  }
}

const fetchCostByProvider = async () => {
  try {
    const authHeader = getAuthHeader()
    if (!authHeader) return

    const dateRangeParams = getDateRange()
    const params = new URLSearchParams({
      groupBy: 'provider',
      ...(dateRangeParams.startDate && { startDate: dateRangeParams.startDate }),
      ...(dateRangeParams.endDate && { endDate: dateRangeParams.endDate }),
    })

    const response = await fetch(`/api/costs/summary?${params.toString()}`, {
      headers: {
        'Authorization': authHeader
      }
    })

    if (response.ok) {
      const data = await response.json()
      costByProvider.value = data.data || []
    }
  } catch (error) {
 
  }
}

const fetchCostByModel = async () => {
  try {
    const authHeader = getAuthHeader()
    if (!authHeader) return

    const dateRangeParams = getDateRange()
    const params = new URLSearchParams({
      groupBy: 'model',
      ...(dateRangeParams.startDate && { startDate: dateRangeParams.startDate }),
      ...(dateRangeParams.endDate && { endDate: dateRangeParams.endDate }),
    })

    const response = await fetch(`/api/costs/summary?${params.toString()}`, {
      headers: {
        'Authorization': authHeader
      }
    })

    if (response.ok) {
      const data = await response.json()
      costByModel.value = data.data || []
    }
  } catch (error) {
 
  }
}

const fetchDailyCost = async () => {
  try {
    const authHeader = getAuthHeader()
    if (!authHeader) return

    const dateRangeParams = getDateRange()
    const params = new URLSearchParams({
      groupBy: 'day',
      ...(dateRangeParams.startDate && { startDate: dateRangeParams.startDate }),
      ...(dateRangeParams.endDate && { endDate: dateRangeParams.endDate }),
    })

    const response = await fetch(`/api/costs/summary?${params.toString()}`, {
      headers: {
        'Authorization': authHeader
      }
    })

    if (response.ok) {
      const data = await response.json()
      dailyCost.value = data.data || []
    }
  } catch (error) {
 
  }
}

const fetchAllData = async () => {
  isLoading.value = true
  try {
    await Promise.all([
      fetchOverviewStats(),
      fetchCostByProvider(),
      fetchCostByModel(),
      fetchDailyCost()
    ])
  } finally {
    isLoading.value = false
  }
}

watch(timeRange, () => {
  fetchAllData()
})

useRealtimeUpdates({
  onAuditLogCreated: () => {
    fetchOverviewStats()
  },
  onCostTracked: () => {
    fetchCostByProvider()
    fetchCostByModel()
    fetchDailyCost()
    fetchOverviewStats()
  },
  onBatchUpdate: () => {
    fetchAllData()
  }
})

const stats = computed(() => {
  const totalRequests = overviewStats.value.totalRequests || 0
  const permitCount = overviewStats.value.permitCount || 0
  const successRate = totalRequests > 0 ? ((permitCount / totalRequests) * 100).toFixed(1) : '0.0'
  
  return {
    totalRequests,
    totalSpend: overviewStats.value.totalCost || 0,
    avgResponseTime: 0,
    successRate: parseFloat(successRate),
    activeUsers: 0,
    requestsToday: 0
  }
})

const topModels = computed(() => {
  const total = costByModel.value.reduce((sum, item) => sum + (item.total_cost || 0), 0)
  return costByModel.value
    .map(item => ({
      model: item.model_used || 'N/A',
      requests: item.request_count || 0,
      spend: item.total_cost || 0,
      percentage: total > 0 ? ((item.total_cost || 0) / total * 100).toFixed(1) : '0.0'
    }))
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 5)
})

const getTopModelBarColor = (idx: number) => TOP_MODEL_PROGRESS_COLORS[idx % TOP_MODEL_PROGRESS_COLORS.length]

const dailyCostChartData = computed(() => {
  if (!dailyCost.value || dailyCost.value.length === 0) {
    return { labels: [], values: [] }
  }
  
  const sorted = [...dailyCost.value].sort((a, b) => {
    const dateA = new Date(a.period || a.request_timestamp || '').getTime()
    const dateB = new Date(b.period || b.request_timestamp || '').getTime()
    return dateA - dateB
  })
  
  return {
    labels: sorted.map(item => {
      const date = new Date(item.period || item.request_timestamp || '')
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }),
    values: sorted.map(item => item.total_cost || 0)
  }
})

const costByProviderChartData = computed(() => {
  if (!costByProvider.value || costByProvider.value.length === 0) {
    return { labels: [], values: [] }
  }
  
  return {
    labels: costByProvider.value.map(item => item.provider || 'N/A'),
    values: costByProvider.value.map(item => item.total_cost || 0)
  }
})

const costByModelChartData = computed(() => {
  if (!costByModel.value || costByModel.value.length === 0) {
    return { labels: [], values: [] }
  }
  
  const sorted = [...costByModel.value]
    .sort((a, b) => (b.total_cost || 0) - (a.total_cost || 0))
    .slice(0, 10)
  
  return {
    labels: sorted.map(item => item.model_used || 'N/A'),
    values: sorted.map(item => item.total_cost || 0)
  }
})

const timeRangeLabel = computed(() => {
  switch (timeRange.value) {
    case 'today':
      return 'Today'
    case '7d':
      return 'Last 7 days'
    case '30d':
      return 'Last 30 days'
    case '90d':
      return 'Last 90 days'
    default:
      return 'All time'
  }
})

onMounted(() => {
  fetchAllData()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-[rgb(var(--text))]">Analytics</h1>
        <p class="text-sm text-[rgb(var(--text-muted))] mt-1">Monitor usage, performance, and spending</p>
      </div>
      <select
        v-model="timeRange"
        class="input"
        @change="fetchAllData"
      >
        <option value="today">Today</option>
        <option value="7d">Last 7 days</option>
        <option value="30d">Last 30 days</option>
        <option value="90d">Last 90 days</option>
        <option value="all">All time</option>
      </select>
    </div>

    <!-- Stats Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="card-interactive group">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-semibold text-[rgb(var(--text-muted))] uppercase tracking-wider">Total Requests</p>
            <p v-if="isLoading" class="text-2xl font-bold text-[rgb(var(--text))] mt-1">...</p>
            <p v-else class="text-2xl font-bold text-[rgb(var(--text))] mt-1">{{ stats.totalRequests.toLocaleString() }}</p>
            <p class="text-xs text-[rgb(var(--text-secondary))] mt-1">
              <span class="text-green-500">{{ overviewStats.permitCount }}</span> permitted,
              <span class="text-red-400">{{ overviewStats.forbidCount }}</span> denied
            </p>
          </div>
          <div class="p-3 rounded-xl bg-lime-50 dark:bg-lime-900/30 group-hover:scale-110 transition-transform">
            <svg class="w-6 h-6 text-lime-700 dark:text-lime-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3v18h18M7 16v-5m4 5V8m4 8v-3m4 3V6" />
            </svg>
          </div>
        </div>
      </div>

      <div class="card-interactive group">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-semibold text-[rgb(var(--text-muted))] uppercase tracking-wider">Total Spend</p>
            <p v-if="isLoading" class="text-2xl font-bold text-[rgb(var(--text))] mt-1">...</p>
            <p v-else class="text-2xl font-bold text-[rgb(var(--text))] mt-1">{{ formatCurrency(stats.totalSpend) }}</p>
            <p class="text-xs text-[rgb(var(--text-secondary))] mt-1">
              {{ timeRangeLabel }}
            </p>
          </div>
          <div class="p-3 rounded-xl bg-green-100 dark:bg-green-900/30 group-hover:scale-110 transition-transform">
            <svg class="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>

      <div class="card-interactive group">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-semibold text-[rgb(var(--text-muted))] uppercase tracking-wider">Success Rate</p>
            <p v-if="isLoading" class="text-2xl font-bold text-[rgb(var(--text))] mt-1">...</p>
            <p v-else class="text-2xl font-bold text-[rgb(var(--text))] mt-1">{{ stats.successRate }}%</p>
            <p class="text-xs text-[rgb(var(--text-secondary))] mt-1">
              authorization pass rate
            </p>
          </div>
          <div class="p-3 rounded-xl bg-lime-50 dark:bg-lime-900/30 group-hover:scale-110 transition-transform">
            <svg class="w-6 h-6 text-lime-700 dark:text-lime-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>

      <div class="card-interactive group">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-semibold text-[rgb(var(--text-muted))] uppercase tracking-wider">Avg Cost/Request</p>
            <p v-if="isLoading" class="text-2xl font-bold text-[rgb(var(--text))] mt-1">...</p>
            <p v-else class="text-2xl font-bold text-[rgb(var(--text))] mt-1">{{ formatCurrency(stats.totalRequests > 0 ? stats.totalSpend / stats.totalRequests : 0) }}</p>
            <p class="text-xs text-[rgb(var(--text-secondary))] mt-1">
              per authorization
            </p>
          </div>
          <div class="p-3 rounded-xl bg-lime-50 dark:bg-lime-900/30 group-hover:scale-110 transition-transform">
            <svg class="w-6 h-6 text-lime-700 dark:text-lime-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 3h8a2 2 0 012 2v14a2 2 0 01-2 2H8a2 2 0 01-2-2V5a2 2 0 012-2zm1 4h6m-6 4h2m2 0h2m-6 4h2m2 0h2" />
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- Charts Row -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Daily Cost Trend -->
      <div class="card">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-sm font-bold text-[rgb(var(--text))]">Daily Cost Trend</h2>
          <span class="badge badge-neutral">{{ timeRangeLabel }}</span>
        </div>
        <div v-if="isLoading" class="h-40 flex items-center justify-center">
          <UiLoadingSkeleton :lines="1" height="h-full" width="100%" />
        </div>
        <div v-else-if="dailyCostChartData.labels.length === 0" class="h-40 flex items-center justify-center text-[rgb(var(--text-muted))]">
          No cost data available for selected period
        </div>
        <KeysSpendChart v-else type="line" :data="dailyCostChartData" :fill-area="false" />
      </div>

      <!-- Cost by Provider -->
      <div class="card">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-sm font-bold text-[rgb(var(--text))]">Cost by Provider</h2>
          <span class="badge badge-neutral">{{ timeRangeLabel }}</span>
        </div>
        <div v-if="isLoading" class="h-40 flex items-center justify-center">
          <UiLoadingSkeleton :lines="1" height="h-full" width="100%" />
        </div>
        <div v-else-if="costByProviderChartData.labels.length === 0" class="h-40 flex items-center justify-center text-[rgb(var(--text-muted))]">
          No provider data available
        </div>
        <KeysSpendChart v-else type="bar" :data="costByProviderChartData" />
      </div>
    </div>

    <!-- Cost by Model Chart -->
    <div class="card">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-sm font-bold text-[rgb(var(--text))]">Cost by Model (Top 10)</h2>
        <span class="badge badge-neutral">{{ timeRange === '7d' ? 'Last 7 days' : timeRange === '30d' ? 'Last 30 days' : timeRange === '90d' ? 'Last 90 days' : 'All time' }}</span>
      </div>
      <div v-if="isLoading" class="h-40 flex items-center justify-center">
        <UiLoadingSkeleton :lines="1" height="h-full" width="100%" />
      </div>
      <div v-else-if="costByModelChartData.labels.length === 0" class="h-40 flex items-center justify-center text-[rgb(var(--text-muted))]">
        No model data available
      </div>
      <KeysSpendChart v-else type="bar" :data="costByModelChartData" />
    </div>

    <!-- Cost by Provider Table -->
    <div class="card">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-sm font-bold text-[rgb(var(--text))]">Cost by Provider</h2>
        <span class="badge badge-neutral">Detailed breakdown</span>
      </div>
      <div v-if="isLoading" class="space-y-2">
        <UiLoadingSkeleton :lines="3" height="h-16" />
      </div>
      <div v-else-if="costByProvider.length === 0" class="text-center py-8 text-[rgb(var(--text-muted))]">
        No cost data available
      </div>
      <div v-else class="space-y-3">
        <div 
          v-for="provider in costByProvider" 
          :key="provider.provider"
          class="flex items-center justify-between p-3 rounded-lg bg-[rgb(var(--surface-elevated))]"
        >
          <div class="flex-1">
            <div class="flex items-center justify-between mb-1">
              <p class="font-medium text-[rgb(var(--text))]">{{ provider.provider || 'N/A' }}</p>
            </div>
            <div class="flex items-center gap-4 text-sm">
              <span class="text-[rgb(var(--text-muted))]">{{ provider.request_count?.toLocaleString() || 0 }} requests</span>
              <span class="text-[rgb(var(--text-muted))]">{{ formatCurrency(provider.total_cost || 0) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Top Models Table -->
    <div class="card">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-sm font-bold text-[rgb(var(--text))]">Top Models</h2>
        <span class="badge badge-neutral">By spend</span>
      </div>
      <div v-if="isLoading" class="space-y-2">
        <UiLoadingSkeleton :lines="5" height="h-16" />
      </div>
      <div v-else-if="topModels.length === 0" class="text-center py-8 text-[rgb(var(--text-muted))]">
        No model data available
      </div>
      <div v-else class="space-y-3">
        <div 
          v-for="(model, idx) in topModels" 
          :key="model.model"
          class="flex items-center justify-between p-3 rounded-lg bg-[rgb(var(--surface-elevated))]"
        >
          <div class="flex-1">
            <div class="flex items-center justify-between mb-1">
              <p class="font-medium text-[rgb(var(--text))]">{{ model.model }}</p>
              <span class="text-xs text-[rgb(var(--text-muted))]">{{ model.percentage }}%</span>
            </div>
            <div class="flex items-center gap-4 text-sm">
              <span class="text-[rgb(var(--text-muted))]">{{ model.requests.toLocaleString() }} requests</span>
              <span class="text-[rgb(var(--text-muted))]">{{ formatCurrency(model.spend) }}</span>
            </div>
            <div class="mt-2 progress-bar">
              <div 
                class="progress-bar-fill"
                :style="{ width: `${model.percentage}%`, backgroundColor: getTopModelBarColor(idx) }"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
