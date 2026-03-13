<script setup lang="ts">
import { useKeys } from '~/composables/useKeys'
import { useConfigStore } from '~/stores/config'
import { useToast } from '~/composables/useToast'
import { useUnifiedAuth } from '~/composables/useUnifiedAuth'
import { useInternalAuth } from '~/composables/useInternalAuth'
import { formatCurrency, formatDate, formatPercent, maskApiKey } from '~/utils/formatters'
import type { Key } from '~/types/entity'
import KeysSpendChart from '~/components/keys/SpendChart.vue'

const route = useRoute()
const router = useRouter()
const configStore = useConfigStore()
const { getKey, getKeyByUserId, deleteKeyById, currentKey, loading } = useKeys()
const { getAuthHeader } = useUnifiedAuth()
const toast = useToast()
const { checkAction } = useInternalAuth()


const permissionsLoading = ref(true)
const canCreateKey = ref(false)

const routeId = route.params.id as string
 
const userId = routeId

 
const demoKey = ref<Key>({
  userId: routeId,
  name: 'Alice Smith',
  email: 'alice@company.com',
  tenant: 'Engineering',
  isAgent: false,
  limitRequestsPerMinute: 100,
  apiKey: 'sk-abc123def456ghi789jkl012mno345pqr678stu901vwx234',
  currentDailySpend: 12.34,
  currentMonthlySpend: 156.78,
  lastDailyReset: '2026-01-08T00:00:00Z',
  lastMonthlyReset: '2026-01-01T00:00:00Z',
  status: 'active',
  createdAt: '2026-01-01T10:00:00Z'
})

const key = computed(() => currentKey.value || demoKey.value)

 
const isLoadingCosts = ref(false)
const dailyCostData = ref<any[]>([])
const monthlyCostData = ref<any[]>([])

 
const fetchCostData = async () => {
  if (!key.value.executionKey) return
  
  isLoadingCosts.value = true
  try {
    const authHeader = getAuthHeader()
    if (!authHeader) return

 
    const dailyStartDate = new Date()
    dailyStartDate.setDate(dailyStartDate.getDate() - 30)
    const dailyParams = new URLSearchParams({
      executionKey: key.value.executionKey,
      groupBy: 'day',
      startDate: dailyStartDate.toISOString(),
      endDate: new Date().toISOString()
    })

    const dailyResponse = await fetch(`/api/costs/summary?${dailyParams.toString()}`, {
      headers: {
        'Authorization': authHeader
      }
    })

    if (dailyResponse.ok) {
      const dailyResult = await dailyResponse.json()
      dailyCostData.value = dailyResult.data || []
    }

 
    const monthlyStartDate = new Date()
    monthlyStartDate.setMonth(monthlyStartDate.getMonth() - 12)
    const monthlyParams = new URLSearchParams({
      executionKey: key.value.executionKey,
      groupBy: 'day',
      startDate: monthlyStartDate.toISOString(),
      endDate: new Date().toISOString()
    })

    const monthlyResponse = await fetch(`/api/costs/summary?${monthlyParams.toString()}`, {
      headers: {
        'Authorization': authHeader
      }
    })

    if (monthlyResponse.ok) {
      const monthlyResult = await monthlyResponse.json()
 
      const monthlyMap = new Map<string, number>()
      monthlyResult.data?.forEach((item: any) => {
        const date = new Date(item.period || item.request_timestamp || '')
        const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        monthlyMap.set(monthKey, (monthlyMap.get(monthKey) || 0) + (item.total_cost || 0))
      })
      monthlyCostData.value = Array.from(monthlyMap.entries()).map(([month, cost]) => ({
        period: month,
        total_cost: cost
      }))
    }
  } catch (error) {
 
  } finally {
    isLoadingCosts.value = false
  }
}

 
const dailySpendData = computed(() => {
  if (dailyCostData.value.length === 0) {
 
    const labels = []
    const values = []
    const today = new Date()
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))
      values.push(0)
    }
    return { labels, values }
  }

 
  const sorted = [...dailyCostData.value].sort((a, b) => {
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

const monthlySpendData = computed(() => {
  if (monthlyCostData.value.length === 0) {
 
    const labels = ['Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan']
    return { labels, values: labels.map(() => 0) }
  }

 
  const sorted = [...monthlyCostData.value].sort((a, b) => {
    const dateA = new Date(a.period || '').getTime()
    const dateB = new Date(b.period || '').getTime()
    return dateA - dateB
  })

  return {
    labels: sorted.map(item => {
 
      return item.period?.split(' ')[0] || ''
    }),
    values: sorted.map(item => item.total_cost || 0)
  }
})

const showDeleteKeyModal = ref(false)
const isDeletingKey = ref(false)

const confirmDeleteKey = () => {
  const keyToDelete = currentKey.value || demoKey.value
  if (!keyToDelete.executionKey) {
    toast.error('Key ID not available')
    return
  }
  showDeleteKeyModal.value = true
}

const handleDeleteKey = async () => {
  const keyToDelete = currentKey.value || demoKey.value
  if (!keyToDelete.executionKey || isDeletingKey.value) return
  try {
    isDeletingKey.value = true
    await deleteKeyById(keyToDelete.executionKey)
    showDeleteKeyModal.value = false
    router.push('/keys')
  } catch (e) {

  } finally {
    isDeletingKey.value = false
  }
}

const goBack = () => {
  router.push('/keys')
}

onMounted(async () => {
  await nextTick()
  

  permissionsLoading.value = true
  try {
    const check = await checkAction('get_key', 'keys')
    if (!check.allowed) {
      toast.error('You do not have permission to view key details')
      router.push('/keys')
      return
    }
    

    const createCheck = await checkAction('create_key', 'keys')
    canCreateKey.value = createCheck.allowed
  } finally {
    permissionsLoading.value = false
  }
  
  if (configStore.isConfigured) {
    try {
 
      try {
        await getKey(routeId)
      } catch {
 
        await getKeyByUserId(routeId)
      }
      
 
      await fetchCostData()
    } catch (e) {
 
    }
  }
})

 
watch(() => key.value.executionKey, () => {
  if (key.value.executionKey) {
    fetchCostData()
  }
})
</script>

<template>
  <div class="space-y-6">
    <!-- Permissions Loading Skeleton -->
    <div v-if="permissionsLoading" class="space-y-6">
      <!-- Back Button Skeleton -->
      <div class="skeleton-shimmer h-5 w-32 rounded"></div>
      
      <!-- Cards Grid Skeleton -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Key Info Card Skeleton -->
        <div class="card">
          <div class="flex items-center justify-between mb-5">
            <div class="skeleton-shimmer h-6 w-24 rounded"></div>
            <div class="skeleton-shimmer h-6 w-20 rounded-full"></div>
          </div>
          <div class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-2">
                <div class="skeleton-shimmer h-3 w-16 rounded"></div>
                <div class="skeleton-shimmer h-8 w-full rounded-md"></div>
              </div>
              <div class="space-y-2">
                <div class="skeleton-shimmer h-3 w-20 rounded"></div>
                <div class="skeleton-shimmer h-4 w-12 rounded"></div>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-2">
                <div class="skeleton-shimmer h-3 w-16 rounded"></div>
                <div class="skeleton-shimmer h-4 w-full rounded"></div>
              </div>
              <div class="space-y-2">
                <div class="skeleton-shimmer h-3 w-24 rounded"></div>
                <div class="skeleton-shimmer h-4 w-full rounded"></div>
              </div>
            </div>
            <div class="pt-4 border-t-2 border-[rgb(var(--border))] space-y-2">
              <div class="skeleton-shimmer h-3 w-20 rounded"></div>
              <div class="skeleton-shimmer h-20 w-full rounded-lg"></div>
            </div>
            <div class="grid grid-cols-2 gap-4 pt-4 border-t-2 border-[rgb(var(--border))]">
              <div class="space-y-2">
                <div class="skeleton-shimmer h-3 w-16 rounded"></div>
                <div class="skeleton-shimmer h-4 w-32 rounded"></div>
              </div>
              <div class="space-y-2">
                <div class="skeleton-shimmer h-3 w-32 rounded"></div>
                <div class="skeleton-shimmer h-4 w-32 rounded"></div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Cost Tracking Card Skeleton -->
        <div class="card">
          <div class="skeleton-shimmer h-6 w-32 rounded mb-5"></div>
          <div class="space-y-4">
            <div class="space-y-2">
              <div class="skeleton-shimmer h-4 w-24 rounded"></div>
              <div class="skeleton-shimmer h-3 w-full rounded"></div>
              <div class="skeleton-shimmer h-3 w-full rounded"></div>
            </div>
            <div class="space-y-2">
              <div class="skeleton-shimmer h-4 w-32 rounded"></div>
              <div class="skeleton-shimmer h-3 w-full rounded"></div>
              <div class="skeleton-shimmer h-3 w-full rounded"></div>
            </div>
            <div class="skeleton-shimmer h-48 w-full rounded-lg"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content (only show after permissions load) -->
    <template v-else>
      <!-- Back button -->
      <button 
        @click="goBack"
        class="inline-flex items-center gap-2 text-sm font-medium text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text))] transition-colors group"
      >
        <svg class="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        Back to Keys
      </button>

      <div v-if="loading" class="p-6">
        <UiLoadingSkeleton :lines="8" height="h-6" />
      </div>

      <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Key Info Card -->
      <div class="card">
        <div class="flex items-center justify-between mb-5">
          <h2 class="text-base font-bold text-[rgb(var(--text))]">Key Details</h2>
          <span :class="(key.status === 'active' || key.status === 1) ? 'badge-success' : 'badge-danger'" class="badge">
            <span class="w-1.5 h-1.5 rounded-full bg-current"></span>
            {{ typeof key.status === 'number' ? (key.status === 1 ? 'active' : 'disabled') : key.status }}
          </span>
        </div>
        
        <div class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <p class="text-xs font-semibold text-[rgb(var(--text-muted))] uppercase tracking-wider mb-1">User ID</p>
              <code class="px-2 py-1 rounded-md bg-lime-50 dark:bg-lime-900/30 font-mono text-sm text-lime-700 dark:text-lime-200 font-semibold">{{ key.userId }}</code>
            </div>
            <div>
              <p class="text-xs font-semibold text-[rgb(var(--text-muted))] uppercase tracking-wider mb-1">Is Agent</p>
              <p class="text-sm text-[rgb(var(--text))]">{{ key.isAgent ? 'Yes' : 'No' }}</p>
            </div>
          </div>
          
          <div class="grid grid-cols-2 gap-4">
            <div>
            <p class="text-xs font-semibold text-[rgb(var(--text-muted))] uppercase tracking-wider mb-1">Email</p>
            <p class="text-sm text-[rgb(var(--text))]">{{ key.email }}</p>
          </div>
            <div>
              <p class="text-xs font-semibold text-[rgb(var(--text-muted))] uppercase tracking-wider mb-1">Tenant</p>
              <p class="text-sm text-[rgb(var(--text))]">{{ key.tenant }}</p>
            </div>
          </div>
          
          
          
          <div class="pt-4 border-t-2 border-[rgb(var(--border))]">
            <p class="text-xs font-semibold text-[rgb(var(--text-muted))] uppercase tracking-wider mb-2">API Key</p>
            <code class="block p-3 rounded-lg bg-[rgb(var(--surface-elevated))] text-xs font-mono break-all text-[rgb(var(--text))]">
              {{ maskApiKey(undefined, key.keySuffix) }}
            </code>
          </div>
          
          <div class="grid grid-cols-2 gap-4 pt-4 border-t-2 border-[rgb(var(--border))]">
            <div>
              <p class="text-xs font-semibold text-[rgb(var(--text-muted))] uppercase tracking-wider mb-1">Created</p>
              <p class="text-sm text-[rgb(var(--text))]">{{ formatDate(key.createdAt) }}</p>
            </div>
            <div>
              <p class="text-xs font-semibold text-[rgb(var(--text-muted))] uppercase tracking-wider mb-1">Last Daily Reset</p>
              <p class="text-sm text-[rgb(var(--text))]">{{ formatDate(key.lastDailyReset || '') }}</p>
            </div>
          </div>
          
          <div class="grid grid-cols-2 gap-4">
            <div>
              <p class="text-xs font-semibold text-[rgb(var(--text-muted))] uppercase tracking-wider mb-1">Rate Limit</p>
              <p class="text-sm font-medium text-[rgb(var(--text))]">{{ key.limitRequestsPerMinute || 0 }} req/min</p>
            </div>
            <div>
              <p class="text-xs font-semibold text-[rgb(var(--text-muted))] uppercase tracking-wider mb-1">Last Monthly Reset</p>
              <p class="text-sm text-[rgb(var(--text))]">{{ formatDate(key.lastMonthlyReset || '') }}</p>
            </div>
          </div>
        </div>
        
        <UiButton 
          v-if="key.executionKey && (key.status === 'active' || key.status === 1)"
          variant="danger" 
          class="w-full mt-6"
          @click="confirmDeleteKey"
          :loading="isDeletingKey"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Delete Key
        </UiButton>
      </div>
      
      <!-- Spend Charts -->
      <div class="space-y-6">
        <!-- Daily Spend Chart -->
        <div class="card">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-sm font-bold text-[rgb(var(--text))]">Daily Spend</h3>
            <span class="badge badge-neutral">Last 30 days</span>
          </div>
          
          <div class="mb-4">
            <div class="flex justify-between text-sm mb-2">
              <span class="font-semibold text-[rgb(var(--text))]">Today: {{ formatCurrency(key.currentDailySpend) }}</span>
              <span class="text-[rgb(var(--text-muted))]">Reset: {{ formatDate(key.lastDailyReset || '') }}</span>
            </div>
            <div class="progress-bar h-3">
              <div 
                class="progress-bar-fill bg-gradient-to-r from-lime-500 to-lime-300" 
                :style="{ width: `${Math.min(100, (key.currentDailySpend / 100) * 100)}%` }"
              />
            </div>
          </div>
          
          <KeysSpendChart :data="dailySpendData" type="line" color="lime" />
        </div>
        
        <!-- Monthly Spend Chart -->
        <div class="card">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-sm font-bold text-[rgb(var(--text))]">Monthly Spend</h3>
            <span class="badge badge-neutral">Last 12 months</span>
          </div>
          
          <div class="mb-4">
            <div class="flex justify-between text-sm mb-2">
              <span class="font-semibold text-[rgb(var(--text))]">This month: {{ formatCurrency(key.currentMonthlySpend) }}</span>
              <span class="text-[rgb(var(--text-muted))]">Reset: {{ formatDate(key.lastMonthlyReset || '') }}</span>
            </div>
            <div class="progress-bar h-3">
              <div 
                class="progress-bar-fill bg-gradient-to-r from-green-500 to-emerald-500" 
                :style="{ width: `${Math.min(100, (key.currentMonthlySpend / 1000) * 100)}%` }"
              />
            </div>
          </div>
          
          <KeysSpendChart :data="monthlySpendData" type="bar" color="green" />
        </div>
      </div>
    </div>
    </template>

    <!-- Delete Key Confirmation Modal -->
    <UiModal v-model="showDeleteKeyModal" title="Delete API Key">
      <div class="space-y-4">
        <p class="text-sm text-[rgb(var(--text))]">
          Are you sure you want to delete the API key for <strong>{{ key.name || key.userId }}</strong>?
        </p>
        <p class="text-xs text-[rgb(var(--text-secondary))]">
          This will permanently delete the API key. Any applications using this key will no longer be able to authenticate. This action cannot be undone.
        </p>
        <div class="flex gap-3 justify-end">
          <UiButton variant="ghost" @click="showDeleteKeyModal = false">
            Cancel
          </UiButton>
          <UiButton variant="danger" @click="handleDeleteKey" :loading="isDeletingKey">
            Delete Key
          </UiButton>
        </div>
      </div>
    </UiModal>
  </div>
</template>
