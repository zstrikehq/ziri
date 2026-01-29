<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-[rgb(var(--text))]">My Profile</h1>
        <p class="text-sm text-[rgb(var(--text-secondary))] mt-1">
          View your account information and usage statistics
        </p>
      </div>
    </div>

    <div v-if="loading" class="card">
      <div class="flex items-center justify-center py-12">
        <svg class="animate-spin h-8 w-8 text-[rgb(var(--primary))]" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    </div>

    <div v-else-if="error" class="card">
      <div class="flex items-center gap-3 p-4 bg-[rgb(var(--danger))]/10 border border-[rgb(var(--danger))]/20 rounded-lg">
        <svg class="w-5 h-5 text-[rgb(var(--danger))]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p class="text-sm font-semibold text-[rgb(var(--danger))]">{{ error }}</p>
      </div>
    </div>

    <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- User Information Card -->
      <div class="card">
        <div class="flex items-center justify-between mb-5">
          <h2 class="text-base font-bold text-[rgb(var(--text))]">Account Information</h2>
          <span :class="userInfo.status === 'active' ? 'badge-success' : 'badge-danger'" class="badge">
            <span class="w-1.5 h-1.5 rounded-full bg-current"></span>
            {{ userInfo.status }}
          </span>
        </div>
        
        <div class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <p class="text-xs font-semibold text-[rgb(var(--text-muted))] uppercase tracking-wider mb-1">User ID</p>
              <code class="px-2 py-1 rounded-md bg-indigo-50 dark:bg-indigo-900/30 font-mono text-sm text-indigo-600 dark:text-indigo-400 font-semibold">{{ userInfo.userId }}</code>
            </div>
            <div>
              <p class="text-xs font-semibold text-[rgb(var(--text-muted))] uppercase tracking-wider mb-1">Role</p>
              <p class="text-sm text-[rgb(var(--text))] capitalize">{{ userInfo.role || 'user' }}</p>
            </div>
          </div>
          
          <div class="grid grid-cols-2 gap-4">
            <div>
              <p class="text-xs font-semibold text-[rgb(var(--text-muted))] uppercase tracking-wider mb-1">Name</p>
              <p class="text-sm text-[rgb(var(--text))]">{{ userInfo.name || '—' }}</p>
            </div>
            <div>
              <p class="text-xs font-semibold text-[rgb(var(--text-muted))] uppercase tracking-wider mb-1">Email</p>
              <p class="text-sm text-[rgb(var(--text))]">{{ userInfo.email || '—' }}</p>
            </div>
          </div>
          
          <div class="pt-4 border-t-2 border-[rgb(var(--border))]">
            <div class="flex items-center justify-between mb-2">
              <p class="text-xs font-semibold text-[rgb(var(--text-muted))] uppercase tracking-wider">API Key</p>
              <UiCopyButton v-if="apiKey" :text="apiKey" size="sm" />
            </div>
            <code v-if="apiKey" class="block p-3 rounded-lg bg-[rgb(var(--surface-elevated))] text-xs font-mono break-all text-[rgb(var(--text))]">
              {{ maskApiKey(apiKey) }}
            </code>
            <p v-else class="text-sm text-[rgb(var(--text-muted))] italic">No API key found. Contact your administrator.</p>
          </div>
          
          <div class="grid grid-cols-2 gap-4 pt-4 border-t-2 border-[rgb(var(--border))]">
            <div>
              <p class="text-xs font-semibold text-[rgb(var(--text-muted))] uppercase tracking-wider mb-1">Created</p>
              <p class="text-sm text-[rgb(var(--text))]">{{ formatDate(userInfo.createdAt) }}</p>
            </div>
            <div>
              <p class="text-xs font-semibold text-[rgb(var(--text-muted))] uppercase tracking-wider mb-1">Last Login</p>
              <p class="text-sm text-[rgb(var(--text))]">{{ userInfo.lastSignIn ? formatDate(userInfo.lastSignIn) : 'Never' }}</p>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Usage Statistics -->
      <div class="space-y-6">
        <!-- Daily Spend -->
        <div class="card">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-sm font-bold text-[rgb(var(--text))]">Daily Spend</h3>
            <span class="badge badge-neutral">Today</span>
          </div>
          
          <div class="mb-4">
            <div class="flex justify-between text-sm mb-2">
              <span class="font-semibold text-[rgb(var(--text))]">Current: {{ formatCurrency(usage.currentDailySpend) }}</span>
              <span class="text-[rgb(var(--text-muted))]">Reset: {{ formatDate(usage.lastDailyReset) }}</span>
            </div>
            <!-- <div class="progress-bar h-3">
              <div 
                class="progress-bar-fill bg-gradient-to-r from-indigo-500 to-purple-500" 
                :style="{ width: `${Math.min(100, (usage.currentDailySpend / 100) * 100)}%` }"
              />
            </div> -->
          </div>
        </div>
        
        <!-- Monthly Spend -->
        <div class="card">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-sm font-bold text-[rgb(var(--text))]">Monthly Spend</h3>
            <span class="badge badge-neutral">This Month</span>
          </div>
          
          <div class="mb-4">
            <div class="flex justify-between text-sm mb-2">
              <span class="font-semibold text-[rgb(var(--text))]">Current: {{ formatCurrency(usage.currentMonthlySpend) }}</span>
              <span class="text-[rgb(var(--text-muted))]">Reset: {{ formatDate(usage.lastMonthlyReset) }}</span>
            </div>
            <!-- <div class="progress-bar h-3">
              <div 
                class="progress-bar-fill bg-gradient-to-r from-green-500 to-emerald-500" 
                :style="{ width: `${Math.min(100, (usage.currentMonthlySpend / 1000) * 100)}%` }"
              />
            </div> -->
          </div>
        </div>

        <!-- Summary Stats -->
        <div class="grid grid-cols-2 gap-4">
          <div class="card">
            <div class="flex items-center justify-between mb-2">
              <h3 class="text-xs font-semibold text-[rgb(var(--text-secondary))]">Total Requests</h3>
              <svg class="w-4 h-4 text-[rgb(var(--text-muted))]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p class="text-2xl font-bold text-[rgb(var(--text))]">
              {{ usage.totalRequests.toLocaleString() }}
            </p>
            <p class="text-xs text-[rgb(var(--text-secondary))] mt-1">
              All time
            </p>
          </div>

          <div class="card">
            <div class="flex items-center justify-between mb-2">
              <h3 class="text-xs font-semibold text-[rgb(var(--text-secondary))]">Total Tokens</h3>
              <svg class="w-4 h-4 text-[rgb(var(--text-muted))]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
            </div>
            <p class="text-2xl font-bold text-[rgb(var(--text))]">
              {{ usage.totalTokens.toLocaleString() }}
            </p>
            <p class="text-xs text-[rgb(var(--text-secondary))] mt-1">
              All time
            </p>
          </div>
        </div>
      </div>
    </div>
   </div>
</template>

<script setup lang="ts">
import { useUnifiedAuth } from '~/composables/useUnifiedAuth'
import { useToast } from '~/composables/useToast'
import { formatCurrency, formatDate, formatPercent, maskApiKey } from '~/utils/formatters'

definePageMeta({
  layout: 'default'
})

const { getAuthHeader, isAuthenticated } = useUnifiedAuth()
const toast = useToast()

const userInfo = ref({
  userId: '',
  email: '',
  name: '',
  role: '',
  status: 'active',
  createdAt: '',
  lastSignIn: ''
})

const apiKey = ref<string | null>(null)

const usage = ref({
  currentDailySpend: 0,
  currentMonthlySpend: 0,
  lastDailyReset: '',
  lastMonthlyReset: '',
  limitRequestsPerMinute: 0,
  totalRequests: 0,
  totalTokens: 0
})

const loading = ref(false)
const error = ref<string | null>(null)

const loadProfile = async () => {
  if (!isAuthenticated.value) {
    error.value = 'Please login first'
    return
  }

  loading.value = true
  error.value = null

  try {
    const authHeader = getAuthHeader()
    if (!authHeader) {
      throw new Error('Please login first')
    }

 
    const userResponse = await fetch('/api/me', {
      headers: {
        'Authorization': authHeader
      }
    })

    if (!userResponse.ok) {
      const errorData = await userResponse.json().catch(() => ({ error: userResponse.statusText }))
      throw new Error(errorData.error || 'Failed to load user info')
    }

    const userData = await userResponse.json()
    userInfo.value = {
      userId: userData.userId || '',
      email: userData.email || '',
      name: userData.name || '',
      role: userData.role || 'user',
      status: typeof userData.status === 'number' ? (userData.status === 1 ? 'active' : userData.status === 0 ? 'inactive' : 'revoked') : (userData.status || 'active'),
      createdAt: userData.createdAt || '',
      lastSignIn: userData.lastSignIn || userData.lastLogin || ''
    }

 
    // Fetch API key and usage statistics in parallel
    const [keysResponse, usageResponse] = await Promise.all([
      fetch('/api/me/keys', {
        headers: {
          'Authorization': authHeader
        }
      }),
      fetch('/api/me/usage', {
        headers: {
          'Authorization': authHeader
        }
      })
    ])

    if (keysResponse.ok) {
      const keysData = await keysResponse.json()
      if (keysData.data && keysData.data.length > 0) {
        const keyEntity = keysData.data[0]
        apiKey.value = keyEntity.apiKey || null
        
        // Update spend values from keys response
        usage.value.currentDailySpend = typeof keyEntity.currentDailySpend === 'number' ? keyEntity.currentDailySpend : parseFloat(keyEntity.currentDailySpend) || 0
        usage.value.currentMonthlySpend = typeof keyEntity.currentMonthlySpend === 'number' ? keyEntity.currentMonthlySpend : parseFloat(keyEntity.currentMonthlySpend) || 0
        usage.value.lastDailyReset = keyEntity.lastDailyReset || ''
        usage.value.lastMonthlyReset = keyEntity.lastMonthlyReset || ''
      }
    }
    
    if (usageResponse.ok) {
      const usageData = await usageResponse.json()
      usage.value.totalRequests = usageData.totalRequests || 0
      usage.value.totalTokens = usageData.totalTokens || 0
      // Update spend values if not already set from keys
      if (usage.value.currentDailySpend === 0) {
        usage.value.currentDailySpend = usageData.currentDailySpend || 0
      }
      if (usage.value.currentMonthlySpend === 0) {
        usage.value.currentMonthlySpend = usageData.currentMonthlySpend || 0
      }
      if (!usage.value.lastDailyReset) {
        usage.value.lastDailyReset = usageData.lastDailyReset || ''
      }
      if (!usage.value.lastMonthlyReset) {
        usage.value.lastMonthlyReset = usageData.lastMonthlyReset || ''
      }
    }
  } catch (e: any) {
    error.value = e.message
    toast.error('Failed to load profile')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadProfile()
})
</script>
