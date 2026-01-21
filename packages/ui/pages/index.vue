<script setup lang="ts">
import { formatCurrency, formatDateShort } from '~/utils/formatters'
import { useKeysStore } from '~/stores/keys'
import { useRulesStore } from '~/stores/rules'
import { useConfigStore } from '~/stores/config'
import { useKeys } from '~/composables/useKeys'
import { useRules } from '~/composables/useRules'
import { useUnifiedAuth } from '~/composables/useUnifiedAuth'

definePageMeta({
  layout: 'default'
})

const configStore = useConfigStore()
const keysStore = useKeysStore()
const rulesStore = useRulesStore()
const { listKeys } = useKeys()
const { listRules } = useRules()
const { getAuthHeader } = useUnifiedAuth()

// Loading state for dashboard
const isLoading = ref(true)
const overviewStats = ref({
  totalRequests: 0,
  permitCount: 0,
  forbidCount: 0,
  totalCost: 0
})
const recentActivity = ref<any[]>([])

// Fetch overview statistics
const fetchOverviewStats = async () => {
  try {
    const authHeader = getAuthHeader()
    if (!authHeader) return

    const response = await fetch('/api/stats/overview', {
      headers: {
        'Authorization': authHeader
      }
    })

    if (response.ok) {
      const data = await response.json()
      overviewStats.value = data
    }
  } catch (error) {
    // Error handled silently
  }
}

// Fetch recent audit logs
const fetchRecentActivity = async () => {
  try {
    const authHeader = getAuthHeader()
    if (!authHeader) return

    const response = await fetch('/api/audit?limit=10', {
      headers: {
        'Authorization': authHeader
      }
    })

    if (response.ok) {
      const data = await response.json()
      recentActivity.value = (data.data || []).map((log: any) => ({
        timestamp: log.request_timestamp,
        userId: log.auth_id || 'unknown',
        model: log.model || 'N/A',
        provider: log.provider || 'N/A',
        decision: log.decision === 'permit' ? 'Allow' : 'Deny',
        cost: log.cost_tracking_id ? 0 : 0 // Cost will be fetched separately if needed
      }))
    }
  } catch (error) {
    // Error handled silently
  }
}

// Fetch additional cost statistics
const costStats = ref({
  totalTokens: 0,
  avgCostPerRequest: 0,
  requestsToday: 0
})

const fetchCostStats = async () => {
  try {
    const authHeader = getAuthHeader()
    if (!authHeader) return

    // Get today's date range
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Fetch cost summary for today
    const todayParams = new URLSearchParams({
      startDate: today.toISOString(),
      endDate: tomorrow.toISOString()
    })

    const costResponse = await fetch(`/api/costs/summary?${todayParams.toString()}`, {
      headers: {
        'Authorization': authHeader
      }
    })

    if (costResponse.ok) {
      const costData = await costResponse.json()
      const todayData = costData.data?.[0] || {}
      costStats.value.requestsToday = todayData.request_count || 0
    }

    // Calculate average cost per request
    if (overviewStats.value.totalRequests > 0) {
      costStats.value.avgCostPerRequest = overviewStats.value.totalCost / overviewStats.value.totalRequests
    }
  } catch (error) {
    // Error handled silently
  }
}

// Auto-load data when page mounts (if config is set)
onMounted(async () => {
  await nextTick()
  
  if (configStore.isConfigured) {
    try {
      await Promise.allSettled([
        listKeys().catch(() => {}),
        listRules().catch(() => {}),
        fetchOverviewStats(),
        fetchRecentActivity(),
        fetchCostStats()
      ])
    } catch (e) {
      // Error handled by composables
    } finally {
      isLoading.value = false
    }
  } else {
    isLoading.value = false
  }
})

// Dashboard stats
const stats = computed(() => {
  const keys = keysStore.keys || []
  const rules = rulesStore.rules || []
  
  // Calculate success rate
  const totalRequests = overviewStats.value.totalRequests || 0
  const permitCount = overviewStats.value.permitCount || 0
  const successRate = totalRequests > 0 ? ((permitCount / totalRequests) * 100).toFixed(1) : '0.0'
  
  return {
    totalKeys: keys.length || 0,
    activeKeys: keys.filter(k => k.status === 'active' || (typeof k.status === 'number' && k.status === 1)).length || 0,
    revokedKeys: keys.filter(k => k.status === 'revoked' || (typeof k.status === 'number' && k.status === 2)).length || 0,
    totalRules: rules.length || 0,
    activeRules: rules.length || 0,
    totalRequests: overviewStats.value.totalRequests || 0,
    totalCost: overviewStats.value.totalCost || 0,
    successRate: parseFloat(successRate)
  }
})

const activityColumns = [
  { key: 'timestamp', header: 'Time' },
  { key: 'userId', header: 'User' },
  { key: 'provider', header: 'Provider' },
  { key: 'model', header: 'Model' },
  { key: 'decision', header: 'Decision' },
  { key: 'cost', header: 'Cost' }
]
</script>

<template>
  <div class="space-y-6">
    <!-- Stats Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- Total Requests -->
      <div class="card-interactive group">
        <div v-if="isLoading" class="flex items-center justify-between">
          <div class="flex-1 space-y-2">
            <UiLoadingSkeleton :lines="1" height="h-3" width="40%" />
            <UiLoadingSkeleton :lines="1" height="h-8" width="60%" />
            <UiLoadingSkeleton :lines="1" height="h-3" width="70%" />
          </div>
          <div class="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/30">
            <UiLoadingSkeleton :lines="1" height="h-full" width="100%" rounded="rounded-xl" />
          </div>
        </div>
        <div v-else class="flex items-center justify-between">
          <div>
            <p class="text-xs font-semibold text-[rgb(var(--text-muted))] uppercase tracking-wider">Total Requests</p>
            <p class="text-2xl font-bold text-[rgb(var(--text))] mt-1">{{ stats.totalRequests.toLocaleString() }}</p>
            <p class="text-xs text-[rgb(var(--text-secondary))] mt-1">
              <span class="text-green-500">{{ overviewStats.permitCount }}</span> permitted,
              <span class="text-red-400">{{ overviewStats.forbidCount }}</span> denied
            </p>
          </div>
          <div class="p-3 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 group-hover:scale-110 transition-transform">
            <svg class="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
        </div>
      </div>

      <!-- Total Cost -->
      <div class="card-interactive group">
        <div v-if="isLoading" class="flex items-center justify-between">
          <div class="flex-1 space-y-2">
            <UiLoadingSkeleton :lines="1" height="h-3" width="45%" />
            <UiLoadingSkeleton :lines="1" height="h-8" width="55%" />
            <UiLoadingSkeleton :lines="1" height="h-3" width="65%" />
          </div>
          <div class="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30">
            <UiLoadingSkeleton :lines="1" height="h-full" width="100%" rounded="rounded-xl" />
          </div>
        </div>
        <div v-else class="flex items-center justify-between">
          <div>
            <p class="text-xs font-semibold text-[rgb(var(--text-muted))] uppercase tracking-wider">Total Cost</p>
            <p class="text-2xl font-bold text-[rgb(var(--text))] mt-1">{{ formatCurrency(stats.totalCost) }}</p>
            <p class="text-xs text-[rgb(var(--text-secondary))] mt-1">
              all time
            </p>
          </div>
          <div class="p-3 rounded-xl bg-green-100 dark:bg-green-900/30 group-hover:scale-110 transition-transform">
            <svg class="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>

      <!-- Active Keys -->
      <div class="card-interactive group">
        <div v-if="isLoading" class="flex items-center justify-between">
          <div class="flex-1 space-y-2">
            <UiLoadingSkeleton :lines="1" height="h-3" width="50%" />
            <UiLoadingSkeleton :lines="1" height="h-8" width="70%" />
            <UiLoadingSkeleton :lines="1" height="h-3" width="60%" />
          </div>
          <div class="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/30">
            <UiLoadingSkeleton :lines="1" height="h-full" width="100%" rounded="rounded-xl" />
          </div>
        </div>
        <div v-else class="flex items-center justify-between">
          <div>
            <p class="text-xs font-semibold text-[rgb(var(--text-muted))] uppercase tracking-wider">Active Keys</p>
            <p class="text-2xl font-bold text-[rgb(var(--text))] mt-1">{{ stats.activeKeys }}</p>
            <p class="text-xs text-[rgb(var(--text-secondary))] mt-1">
              of {{ stats.totalKeys }} total
            </p>
          </div>
          <div class="p-3 rounded-xl bg-amber-100 dark:bg-amber-900/30 group-hover:scale-110 transition-transform">
            <svg class="w-6 h-6 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
        </div>
      </div>

      <!-- Success Rate -->
      <div class="card-interactive group">
        <div v-if="isLoading" class="flex items-center justify-between">
          <div class="flex-1 space-y-2">
            <UiLoadingSkeleton :lines="1" height="h-3" width="55%" />
            <UiLoadingSkeleton :lines="1" height="h-8" width="50%" />
            <UiLoadingSkeleton :lines="1" height="h-3" width="75%" />
          </div>
          <div class="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30">
            <UiLoadingSkeleton :lines="1" height="h-full" width="100%" rounded="rounded-xl" />
          </div>
        </div>
        <div v-else class="flex items-center justify-between">
          <div>
            <p class="text-xs font-semibold text-[rgb(var(--text-muted))] uppercase tracking-wider">Success Rate</p>
            <p class="text-2xl font-bold text-[rgb(var(--text))] mt-1">{{ stats.successRate }}%</p>
            <p class="text-xs text-[rgb(var(--text-secondary))] mt-1">
              authorization pass rate
            </p>
          </div>
          <div class="p-3 rounded-xl bg-purple-100 dark:bg-purple-900/30 group-hover:scale-110 transition-transform">
            <svg class="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- Additional Stats Row -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <!-- Requests Today -->
      <div class="card-interactive group">
        <div v-if="isLoading" class="flex items-center justify-between">
          <div class="flex-1 space-y-2">
            <UiLoadingSkeleton :lines="1" height="h-3" width="50%" />
            <UiLoadingSkeleton :lines="1" height="h-8" width="60%" />
          </div>
          <div class="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30">
            <UiLoadingSkeleton :lines="1" height="h-full" width="100%" rounded="rounded-xl" />
          </div>
        </div>
        <div v-else class="flex items-center justify-between">
          <div>
            <p class="text-xs font-semibold text-[rgb(var(--text-muted))] uppercase tracking-wider">Requests Today</p>
            <p class="text-2xl font-bold text-[rgb(var(--text))] mt-1">{{ costStats.requestsToday.toLocaleString() }}</p>
            <p class="text-xs text-[rgb(var(--text-secondary))] mt-1">
              {{ new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) }}
            </p>
          </div>
          <div class="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/30 group-hover:scale-110 transition-transform">
            <svg class="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>

      <!-- Average Cost Per Request -->
      <div class="card-interactive group">
        <div v-if="isLoading" class="flex items-center justify-between">
          <div class="flex-1 space-y-2">
            <UiLoadingSkeleton :lines="1" height="h-3" width="60%" />
            <UiLoadingSkeleton :lines="1" height="h-8" width="55%" />
          </div>
          <div class="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
            <UiLoadingSkeleton :lines="1" height="h-full" width="100%" rounded="rounded-xl" />
          </div>
        </div>
        <div v-else class="flex items-center justify-between">
          <div>
            <p class="text-xs font-semibold text-[rgb(var(--text-muted))] uppercase tracking-wider">Avg Cost/Request</p>
            <p class="text-2xl font-bold text-[rgb(var(--text))] mt-1">{{ formatCurrency(costStats.avgCostPerRequest) }}</p>
            <p class="text-xs text-[rgb(var(--text-secondary))] mt-1">
              per authorization
            </p>
          </div>
          <div class="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 group-hover:scale-110 transition-transform">
            <svg class="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
        </div>
      </div>

      <!-- Total Rules -->
      <div class="card-interactive group">
        <div v-if="isLoading" class="flex items-center justify-between">
          <div class="flex-1 space-y-2">
            <UiLoadingSkeleton :lines="1" height="h-3" width="45%" />
            <UiLoadingSkeleton :lines="1" height="h-8" width="65%" />
          </div>
          <div class="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-900/30">
            <UiLoadingSkeleton :lines="1" height="h-full" width="100%" rounded="rounded-xl" />
          </div>
        </div>
        <div v-else class="flex items-center justify-between">
          <div>
            <p class="text-xs font-semibold text-[rgb(var(--text-muted))] uppercase tracking-wider">Total Rules</p>
            <p class="text-2xl font-bold text-[rgb(var(--text))] mt-1">{{ stats.totalRules }}</p>
            <p class="text-xs text-[rgb(var(--text-secondary))] mt-1">
              {{ stats.activeRules }} active
            </p>
          </div>
          <div class="p-3 rounded-xl bg-orange-100 dark:bg-orange-900/30 group-hover:scale-110 transition-transform">
            <svg class="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- Recent Activity -->
    <div class="card">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-sm font-bold text-[rgb(var(--text))]">Recent Activity</h2>
        <span class="badge badge-neutral">Last 10 requests</span>
      </div>
      <div v-if="isLoading" class="space-y-2">
        <UiLoadingSkeleton :lines="5" height="h-12" />
      </div>
      <UiTable v-else :columns="activityColumns" :data="recentActivity">
        <template #timestamp="{ value }">
          <span class="text-[rgb(var(--text-muted))] font-mono text-xs">{{ formatDateShort(value) }}</span>
        </template>
        
        <template #userId="{ value }">
          <code class="px-2 py-0.5 rounded-md bg-[rgb(var(--surface-elevated))] font-mono text-xs text-indigo-600 dark:text-indigo-400">{{ value }}</code>
        </template>
        
        <template #provider="{ value }">
          <span class="text-[rgb(var(--text-secondary))] text-xs">{{ value }}</span>
        </template>
        
        <template #model="{ value }">
          <span class="text-[rgb(var(--text-secondary))]">{{ value }}</span>
        </template>
        
        <template #decision="{ value }">
          <span :class="value === 'Allow' ? 'badge-success' : 'badge-danger'" class="badge">
            {{ value }}
          </span>
        </template>
        
        <template #cost="{ value }">
          <span class="font-mono font-medium">{{ formatCurrency(value) }}</span>
        </template>
      </UiTable>
      <div v-if="!isLoading && recentActivity.length === 0" class="text-center py-8 text-[rgb(var(--text-muted))]">
        No recent activity
      </div>
    </div>
  </div>
</template>
