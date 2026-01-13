<script setup lang="ts">
import { formatCurrency, formatDateShort } from '~/utils/formatters'
import { useKeysStore } from '~/stores/keys'
import { useRulesStore } from '~/stores/rules'
import { useConfigStore } from '~/stores/config'
import { useKeys } from '~/composables/useKeys'
import { useRules } from '~/composables/useRules'

const configStore = useConfigStore()
const keysStore = useKeysStore()
const rulesStore = useRulesStore()
const { listKeys } = useKeys()
const { listRules } = useRules()

// Auto-load data when page mounts (if config is set)
onMounted(async () => {
  console.log('[INDEX PAGE] onMounted called')
  console.log('[INDEX PAGE] Config state:', {
    projectId: configStore.projectId,
    isConfigured: configStore.isConfigured
  })
  
  // Wait a tick to ensure config is loaded
  await nextTick()
  console.log('[INDEX PAGE] After nextTick, isConfigured:', configStore.isConfigured)
  
  if (configStore.isConfigured) {
    console.log('[INDEX PAGE] ✅ Config is set, loading data...')
    try {
      // Load keys and rules in parallel
      await Promise.allSettled([
        listKeys().catch((e) => {
          console.error('[INDEX PAGE] Error loading keys:', e)
        }),
        listRules().catch((e) => {
          console.error('[INDEX PAGE] Error loading rules:', e)
        })
      ])
      console.log('[INDEX PAGE] ✅ Data loaded')
    } catch (e) {
      console.error('[INDEX PAGE] Error loading data:', e)
    }
  } else {
    console.log('[INDEX PAGE] ❌ Config not set, skipping data load')
  }
})

// Demo stats
const stats = computed(() => {
  // Safely access store properties with fallbacks for SSR/prerendering
  const keys = keysStore.keys || []
  const rules = rulesStore.rules || []
  
  return {
    totalKeys: keys.length || 12,
    activeKeys: keys.filter(k => k.status === 'active').length || 10,
    revokedKeys: keys.filter(k => k.status === 'revoked').length || 2,
    totalRules: rules.length || 8,
    activeRules: rules.length || 6, // All rules are active now (no #active check)
    dailySpend: keysStore.totalDailySpend || 12.34,
    dailyLimit: 500,
    successRate: 98.5
  }
})

// Demo recent activity
const recentActivity = ref([
  { timestamp: '2026-01-08T11:30:00Z', userId: 'alice', model: 'gpt-4o', decision: 'Allow', cost: 0.12 },
  { timestamp: '2026-01-08T11:28:00Z', userId: 'bob', model: 'gpt-4o-mini', decision: 'Allow', cost: 0.03 },
  { timestamp: '2026-01-08T11:25:00Z', userId: 'charlie', model: 'gpt-4o', decision: 'Deny', cost: 0 },
  { timestamp: '2026-01-08T11:20:00Z', userId: 'alice', model: 'claude-3-5-sonnet', decision: 'Allow', cost: 0.15 },
  { timestamp: '2026-01-08T11:15:00Z', userId: 'dave', model: 'gpt-4o', decision: 'Allow', cost: 0.08 }
])

const activityColumns = [
  { key: 'timestamp', header: 'Time' },
  { key: 'userId', header: 'User' },
  { key: 'model', header: 'Model' },
  { key: 'decision', header: 'Decision' },
  { key: 'cost', header: 'Cost' }
]
</script>

<template>
  <div class="space-y-6">
    <!-- Stats Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- Total Keys -->
      <div class="card-interactive group">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-semibold text-[rgb(var(--text-muted))] uppercase tracking-wider">Total Keys</p>
            <p class="text-2xl font-bold text-[rgb(var(--text))] mt-1">{{ stats.totalKeys }}</p>
            <p class="text-xs text-[rgb(var(--text-secondary))] mt-1">
              <span class="text-green-500">{{ stats.activeKeys }}</span> active,
              <span class="text-red-400">{{ stats.revokedKeys }}</span> revoked
            </p>
          </div>
          <div class="p-3 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 group-hover:scale-110 transition-transform">
            <svg class="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
        </div>
      </div>

      <!-- Active Rules -->
      <div class="card-interactive group">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-semibold text-[rgb(var(--text-muted))] uppercase tracking-wider">Active Rules</p>
            <p class="text-2xl font-bold text-[rgb(var(--text))] mt-1">{{ stats.activeRules }}</p>
            <p class="text-xs text-[rgb(var(--text-secondary))] mt-1">
              of {{ stats.totalRules }} total
            </p>
          </div>
          <div class="p-3 rounded-xl bg-green-100 dark:bg-green-900/30 group-hover:scale-110 transition-transform">
            <svg class="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
        </div>
      </div>

      <!-- Today's Spend -->
      <div class="card-interactive group">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-semibold text-[rgb(var(--text-muted))] uppercase tracking-wider">Today's Spend</p>
            <p class="text-2xl font-bold text-[rgb(var(--text))] mt-1">{{ formatCurrency(stats.dailySpend) }}</p>
            <p class="text-xs text-[rgb(var(--text-secondary))] mt-1">
              of {{ formatCurrency(stats.dailyLimit) }} limit
            </p>
          </div>
          <div class="p-3 rounded-xl bg-amber-100 dark:bg-amber-900/30 group-hover:scale-110 transition-transform">
            <svg class="w-6 h-6 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>

      <!-- Success Rate -->
      <div class="card-interactive group">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-semibold text-[rgb(var(--text-muted))] uppercase tracking-wider">Success Rate</p>
            <p class="text-2xl font-bold text-[rgb(var(--text))] mt-1">{{ stats.successRate }}%</p>
            <p class="text-xs text-[rgb(var(--text-secondary))] mt-1">
              authorization pass rate
            </p>
          </div>
          <div class="p-3 rounded-xl bg-purple-100 dark:bg-purple-900/30 group-hover:scale-110 transition-transform">
            <svg class="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- Recent Activity -->
    <div class="card">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-sm font-bold text-[rgb(var(--text))]">Recent Activity</h2>
        <span class="badge badge-neutral">Last 5 requests</span>
      </div>
      <UiTable :columns="activityColumns" :data="recentActivity">
        <template #timestamp="{ value }">
          <span class="text-[rgb(var(--text-muted))] font-mono text-xs">{{ formatDateShort(value) }}</span>
        </template>
        
        <template #userId="{ value }">
          <code class="px-2 py-0.5 rounded-md bg-[rgb(var(--surface-elevated))] font-mono text-xs text-indigo-600 dark:text-indigo-400">{{ value }}</code>
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
    </div>
  </div>
</template>
