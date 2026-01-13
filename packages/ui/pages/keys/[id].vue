<script setup lang="ts">
import { useKeys } from '~/composables/useKeys'
import { useConfigStore } from '~/stores/config'
import { useToast } from '~/composables/useToast'
import { formatCurrency, formatDate, formatPercent, maskApiKey } from '~/utils/formatters'
import type { Key } from '~/types/entity'

const route = useRoute()
const router = useRouter()
const configStore = useConfigStore()
const { getKey, revokeKey, currentKey, loading } = useKeys()
const toast = useToast()

const userId = route.params.id as string

// Demo key data
const demoKey = ref<Key>({
  userId: userId,
  name: 'Alice Smith',
  email: 'alice@company.com',
  role: 'engineer',
  department: 'Engineering',
  apiKey: 'sk-abc123def456ghi789jkl012mno345pqr678stu901vwx234',
  currentDailySpend: 12.34,
  dailySpendLimit: 50,
  currentMonthlySpend: 156.78,
  monthlySpendLimit: 500,
  status: 'active',
  createdAt: '2026-01-01T10:00:00Z',
  lastUsedAt: '2026-01-08T11:30:00Z'
})

const key = computed(() => currentKey.value || demoKey.value)

// Generate demo chart data
const dailySpendData = computed(() => {
  const labels = []
  const values = []
  const today = new Date()
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))
    values.push(Math.random() * 15 + 5)
  }
  values[29] = key.value.currentDailySpend
  
  return { labels, values }
})

const monthlySpendData = computed(() => {
  const labels = ['Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan']
  const values = labels.map(() => Math.random() * 300 + 100)
  values[11] = key.value.currentMonthlySpend
  
  return { labels, values }
})

const handleRevoke = async () => {
  try {
    await revokeKey(userId)
    demoKey.value.status = 'revoked'
  } catch (e) {
    // Error handled by composable
  }
}

const goBack = () => {
  router.push('/keys')
}

onMounted(async () => {
  console.log('[KEY DETAIL PAGE] onMounted called for userId:', userId)
  console.log('[KEY DETAIL PAGE] Config state:', {
    projectId: configStore.projectId,
    isConfigured: configStore.isConfigured
  })
  
  // Wait a tick to ensure config is loaded
  await nextTick()
  console.log('[KEY DETAIL PAGE] After nextTick, isConfigured:', configStore.isConfigured)
  
  if (configStore.isConfigured) {
    console.log('[KEY DETAIL PAGE] ✅ Config is set, loading key...')
    try {
      await getKey(userId)
      console.log('[KEY DETAIL PAGE] ✅ Key loaded')
    } catch (e) {
      console.error('[KEY DETAIL PAGE] Error loading key:', e)
    }
  } else {
    console.log('[KEY DETAIL PAGE] ❌ Config not set, using demo data')
  }
})
</script>

<template>
  <div class="space-y-6">
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
          <span :class="key.status === 'active' ? 'badge-success' : 'badge-danger'" class="badge">
            <span class="w-1.5 h-1.5 rounded-full bg-current"></span>
            {{ key.status }}
          </span>
        </div>
        
        <div class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <p class="text-xs font-semibold text-[rgb(var(--text-muted))] uppercase tracking-wider mb-1">User ID</p>
              <code class="px-2 py-1 rounded-md bg-indigo-50 dark:bg-indigo-900/30 font-mono text-sm text-indigo-600 dark:text-indigo-400 font-semibold">{{ key.userId }}</code>
            </div>
            <div>
              <p class="text-xs font-semibold text-[rgb(var(--text-muted))] uppercase tracking-wider mb-1">Role</p>
              <p class="text-sm text-[rgb(var(--text))] capitalize">{{ key.role.replace('_', ' ') }}</p>
            </div>
          </div>
          
          <div class="grid grid-cols-2 gap-4">
            <div>
              <p class="text-xs font-semibold text-[rgb(var(--text-muted))] uppercase tracking-wider mb-1">Name</p>
              <p class="text-sm text-[rgb(var(--text))]">{{ key.name }}</p>
            </div>
            <div>
              <p class="text-xs font-semibold text-[rgb(var(--text-muted))] uppercase tracking-wider mb-1">Department</p>
              <p class="text-sm text-[rgb(var(--text))]">{{ key.department }}</p>
            </div>
          </div>
          
          <div>
            <p class="text-xs font-semibold text-[rgb(var(--text-muted))] uppercase tracking-wider mb-1">Email</p>
            <p class="text-sm text-[rgb(var(--text))]">{{ key.email }}</p>
          </div>
          
          <div class="pt-4 border-t-2 border-[rgb(var(--border))]">
            <div class="flex items-center justify-between mb-2">
              <p class="text-xs font-semibold text-[rgb(var(--text-muted))] uppercase tracking-wider">API Key</p>
              <UiCopyButton :text="key.apiKey" size="sm" />
            </div>
            <code class="block p-3 rounded-lg bg-[rgb(var(--surface-elevated))] text-xs font-mono break-all text-[rgb(var(--text))]">
              {{ maskApiKey(key.apiKey) }}
            </code>
          </div>
          
          <div class="grid grid-cols-2 gap-4 pt-4 border-t-2 border-[rgb(var(--border))]">
            <div>
              <p class="text-xs font-semibold text-[rgb(var(--text-muted))] uppercase tracking-wider mb-1">Created</p>
              <p class="text-sm text-[rgb(var(--text))]">{{ formatDate(key.createdAt) }}</p>
            </div>
            <div>
              <p class="text-xs font-semibold text-[rgb(var(--text-muted))] uppercase tracking-wider mb-1">Last Used</p>
              <p class="text-sm text-[rgb(var(--text))]">{{ formatDate(key.lastUsedAt || '') }}</p>
            </div>
          </div>
          
          <div class="grid grid-cols-2 gap-4">
            <div>
              <p class="text-xs font-semibold text-[rgb(var(--text-muted))] uppercase tracking-wider mb-1">Daily Limit</p>
              <p class="text-sm font-medium text-[rgb(var(--text))]">{{ formatCurrency(key.dailySpendLimit) }}</p>
            </div>
            <div>
              <p class="text-xs font-semibold text-[rgb(var(--text-muted))] uppercase tracking-wider mb-1">Monthly Limit</p>
              <p class="text-sm font-medium text-[rgb(var(--text))]">{{ formatCurrency(key.monthlySpendLimit) }}</p>
            </div>
          </div>
        </div>
        
        <UiButton 
          v-if="key.status === 'active'"
          variant="danger" 
          class="w-full mt-6"
          @click="handleRevoke"
          :loading="loading"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
          Revoke Key
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
              <span class="text-[rgb(var(--text-muted))]">Limit: {{ formatCurrency(key.dailySpendLimit) }}</span>
            </div>
            <div class="progress-bar h-3">
              <div 
                class="progress-bar-fill bg-gradient-to-r from-indigo-500 to-purple-500" 
                :style="{ width: `${formatPercent(key.currentDailySpend, key.dailySpendLimit)}%` }"
              />
            </div>
          </div>
          
          <KeysSpendChart :data="dailySpendData" type="line" color="blue" />
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
              <span class="text-[rgb(var(--text-muted))]">Limit: {{ formatCurrency(key.monthlySpendLimit) }}</span>
            </div>
            <div class="progress-bar h-3">
              <div 
                class="progress-bar-fill bg-gradient-to-r from-green-500 to-emerald-500" 
                :style="{ width: `${formatPercent(key.currentMonthlySpend, key.monthlySpendLimit)}%` }"
              />
            </div>
          </div>
          
          <KeysSpendChart :data="monthlySpendData" type="bar" color="green" />
        </div>
      </div>
    </div>
  </div>
</template>
