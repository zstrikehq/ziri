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
        <svg class="animate-spin h-8 w-8 text-[rgb(var(--color-text-accent))]" fill="none" viewBox="0 0 24 24">
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
              <code class="px-2 py-1 rounded-md bg-lime-50 dark:bg-lime-900/30 font-mono text-sm text-lime-700 dark:text-lime-200 font-semibold">{{ userInfo.userId }}</code>
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
              <div class="flex items-center gap-2">
                <p class="text-xs font-semibold text-[rgb(var(--text-muted))] uppercase tracking-wider">API Key</p>
                <span 
                  v-if="keyStatus"
                  :class="[
                    'px-2 py-0.5 rounded text-xs font-semibold',
                    keyStatus === 'active' 
                      ? 'bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-200'
                      : keyStatus === 'revoked'
                      ? 'bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-200'
                      : 'bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200'
                  ]"
                >
                  {{ keyStatus.charAt(0).toUpperCase() + keyStatus.slice(1) }}
                </span>
              </div>
              <UiButton
                v-if="keySuffix && keyStatus === 'active'"
                variant="ghost"
                size="sm"
                @click="handleRotateKey"
                :loading="isRotating"
                title="Rotate API Key"
                class="text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </UiButton>
            </div>
            <code v-if="keySuffix" class="block p-3 rounded-lg bg-[rgb(var(--surface-elevated))] text-xs font-mono break-all text-[rgb(var(--text))]">
              {{ maskApiKey(undefined, keySuffix) }}
            </code>
            <p v-else class="text-sm text-[rgb(var(--text-muted))] italic">No API key found. Contact your administrator.</p>
            <p v-if="keyStatus === 'revoked'" class="text-xs text-red-600 dark:text-red-400 mt-2 italic">
              This API key has been revoked and cannot be used. Contact your administrator to re-enable it.
            </p>
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
                class="progress-bar-fill bg-gradient-to-r from-lime-500 to-lime-300" 
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

    <!-- Rotated Key Modal -->
    <UiModal v-model="showRotatedKeyModal" title="API Key Rotated">
      <div class="space-y-4">
        <div class="p-4 bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 rounded-lg">
          <div class="flex items-start gap-3">
            <svg class="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <div>
              <p class="text-sm font-semibold text-green-900 dark:text-green-100 mb-1">
                API key rotated successfully
              </p>
              <p class="text-xs text-green-800 dark:text-green-200">
                Your old API key is no longer valid. Use this new key for all future requests.
              </p>
            </div>
          </div>
        </div>
        
        <div>
          <label class="block text-xs font-semibold text-[rgb(var(--text-secondary))] mb-2">Your New API Key</label>
          <div class="flex items-center gap-2">
            <code class="flex-1 text-sm font-mono bg-[rgb(var(--surface-elevated))] border-2 border-[rgb(var(--border))] p-3 rounded-lg break-all text-[rgb(var(--text))]">
              {{ rotatedKey }}
            </code>
            <UiButton size="sm" @click="copyRotatedKey">
              Copy
            </UiButton>
          </div>
        </div>
        
        <div class="flex justify-end">
          <UiButton @click="closeRotatedKeyModal">
            Done
          </UiButton>
        </div>
      </div>
    </UiModal>
   </div>
</template>

<script setup lang="ts">
import { useUnifiedAuth } from '~/composables/useUnifiedAuth'
import { useToast } from '~/composables/useToast'
import { useApiError } from '~/composables/useApiError'
import { formatCurrency, formatDate, formatPercent, maskApiKey } from '~/utils/formatters'

definePageMeta({
  layout: 'default'
})

const { getAuthHeader, isAuthenticated } = useUnifiedAuth()
const toast = useToast()
const { getUserMessage } = useApiError()

const userInfo = ref({
  userId: '',
  email: '',
  name: '',
  role: '',
  status: 'active',
  createdAt: '',
  lastSignIn: ''
})

const keySuffix = ref<string | null>(null)
const keyStatus = ref<'active' | 'revoked' | 'disabled' | null>(null)

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
const isRotating = ref(false)
const showRotatedKeyModal = ref(false)
const rotatedKey = ref<string | null>(null)

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
        keySuffix.value = keyEntity.keySuffix || null
        
        const status = keyEntity.attrs?.status || keyEntity.status
        if (status === 'active' || status === 1) {
          keyStatus.value = 'active'
        } else if (status === 'revoked' || status === 2) {
          keyStatus.value = 'revoked'
        } else if (status === 'disabled') {
          keyStatus.value = 'disabled'
        } else {
          keyStatus.value = 'active'
        }
        

        usage.value.currentDailySpend = typeof keyEntity.currentDailySpend === 'number' ? keyEntity.currentDailySpend : parseFloat(keyEntity.currentDailySpend) || 0
        usage.value.currentMonthlySpend = typeof keyEntity.currentMonthlySpend === 'number' ? keyEntity.currentMonthlySpend : parseFloat(keyEntity.currentMonthlySpend) || 0
        usage.value.lastDailyReset = keyEntity.lastDailyReset || ''
        usage.value.lastMonthlyReset = keyEntity.lastMonthlyReset || ''
      } else {
        keyStatus.value = null
      }
    } else {
      keyStatus.value = null
    }
    
    if (usageResponse.ok) {
      const usageData = await usageResponse.json()
      usage.value.totalRequests = usageData.totalRequests || 0
      usage.value.totalTokens = usageData.totalTokens || 0

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
    error.value = getUserMessage(e)
    toast.error(getUserMessage(e))
  } finally {
    loading.value = false
  }
}

const handleRotateKey = async () => {
  if (isRotating.value) return
  
  try {
    isRotating.value = true
    const authHeader = getAuthHeader()
    if (!authHeader) {
      throw new Error('Please login first')
    }
    
    const response = await fetch('/api/me/rotate', {
      method: 'POST',
      headers: {
        'Authorization': authHeader
      }
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }))
      throw new Error(errorData.error || 'Failed to rotate key')
    }
    
    const result = await response.json()
    rotatedKey.value = result.apiKey
    showRotatedKeyModal.value = true
    
    await loadProfile()
    
    toast.success('API key rotated successfully')
  } catch (e: any) {
    toast.error(e.message || 'Failed to rotate key')
  } finally {
    isRotating.value = false
  }
}

const closeRotatedKeyModal = () => {
  showRotatedKeyModal.value = false
  rotatedKey.value = null
}

const copyRotatedKey = () => {
  if (rotatedKey.value) {
    navigator.clipboard.writeText(rotatedKey.value)
    toast.success('New API key copied to clipboard')
  }
}

onMounted(() => {
  loadProfile()
})
</script>
