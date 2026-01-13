<script setup lang="ts">
import { formatDateShort } from '~/utils/formatters'

// Filters
const searchQuery = ref('')
const filterStatus = ref<'' | 'success' | 'error' | 'denied'>('')
const filterUser = ref('')
const dateRange = ref<'today' | '7d' | '30d' | 'all'>('7d')

// Pagination
const currentPage = ref(1)
const itemsPerPage = ref(20)

// Dummy logs data
const generateLogs = () => {
  const logs = []
  const statuses = ['success', 'success', 'success', 'success', 'success', 'error', 'denied']
  const models = ['gpt-4', 'gpt-3.5-turbo', 'claude-3-opus', 'claude-3-sonnet']
  const users = ['alice', 'bob', 'charlie', 'diana', 'eve']
  const methods = ['POST', 'GET']
  
  for (let i = 0; i < 50; i++) {
    const timestamp = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
    const status = statuses[Math.floor(Math.random() * statuses.length)]
    const statusCode = status === 'success' ? 200 : status === 'error' ? 500 : 403
    
    logs.push({
      id: `log-${i + 1}`,
      timestamp,
      userId: users[Math.floor(Math.random() * users.length)],
      method: methods[Math.floor(Math.random() * methods.length)],
      endpoint: '/api/v1/chat/completions',
      model: models[Math.floor(Math.random() * models.length)],
      status,
      statusCode,
      responseTime: Math.random() * 2 + 0.5,
      tokens: Math.floor(Math.random() * 2000) + 500,
      cost: Math.random() * 0.5 + 0.1,
      ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      error: status !== 'success' ? (status === 'denied' ? 'Authorization denied' : 'Internal server error') : null
    })
  }
  
  return logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
}

const allLogs = ref(generateLogs())

const filteredLogs = computed(() => {
  return allLogs.value.filter(log => {
    const matchesSearch = searchQuery.value === '' || 
      log.userId.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      log.model.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      log.endpoint.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      (log.error && log.error.toLowerCase().includes(searchQuery.value.toLowerCase()))
    
    const matchesStatus = filterStatus.value === '' || log.status === filterStatus.value
    const matchesUser = filterUser.value === '' || log.userId === filterUser.value
    
    return matchesSearch && matchesStatus && matchesUser
  })
})

const uniqueUsers = computed(() => {
  return [...new Set(allLogs.value.map(log => log.userId))].sort()
})

const getStatusBadgeClass = (status: string) => {
  switch (status) {
    case 'success':
      return 'badge-success'
    case 'error':
      return 'badge-danger'
    case 'denied':
      return 'badge-warning'
    default:
      return 'badge-neutral'
  }
}

const getStatusCodeClass = (code: number) => {
  if (code >= 200 && code < 300) return 'text-green-600 dark:text-green-400'
  if (code >= 400 && code < 500) return 'text-amber-600 dark:text-amber-400'
  if (code >= 500) return 'text-red-600 dark:text-red-400'
  return 'text-[rgb(var(--text-muted))]'
}

const columns = [
  { key: 'timestamp', header: 'Time', class: 'w-40' },
  { key: 'userId', header: 'User', class: 'w-32' },
  { key: 'model', header: 'Model', class: 'w-36' },
  { key: 'status', header: 'Status', class: 'w-24' },
  { key: 'responseTime', header: 'Response', class: 'w-28' },
  { key: 'tokens', header: 'Tokens', class: 'w-24' },
  { key: 'cost', header: 'Cost', class: 'w-24' },
  { key: 'actions', header: '', class: 'w-20' }
]
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-[rgb(var(--text))]">Logs</h1>
        <p class="text-sm text-[rgb(var(--text-muted))] mt-1">Monitor API requests and responses</p>
      </div>
      <div class="flex items-center gap-3">
        <select v-model="dateRange" class="input w-32">
          <option value="today">Today</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="all">All time</option>
        </select>
        <UiButton variant="outline" size="sm">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export
        </UiButton>
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
          placeholder="Search logs..."
          class="input pl-10"
        />
      </div>
      <select v-model="filterStatus" class="input w-32">
        <option value="">All Status</option>
        <option value="success">Success</option>
        <option value="error">Error</option>
        <option value="denied">Denied</option>
      </select>
      <select v-model="filterUser" class="input w-32">
        <option value="">All Users</option>
        <option v-for="user in uniqueUsers" :key="user" :value="user">{{ user }}</option>
      </select>
    </div>

    <!-- Logs Table -->
    <UiTable 
      :columns="columns" 
      :data="filteredLogs" 
      :paginated="true"
      :current-page="currentPage"
      :items-per-page="itemsPerPage"
      empty-message="No logs found"
      @update:current-page="currentPage = $event"
      @update:items-per-page="itemsPerPage = $event"
    >
      <template #timestamp="{ row }">
        <div class="text-sm">
          <p class="text-[rgb(var(--text))] font-medium">{{ formatDateShort(row.timestamp) }}</p>
          <p class="text-xs text-[rgb(var(--text-muted))]">{{ row.timestamp.toLocaleTimeString() }}</p>
        </div>
      </template>

      <template #userId="{ value }">
        <code class="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-900/30 font-mono text-xs text-indigo-600 dark:text-indigo-400 font-semibold">{{ value }}</code>
      </template>

      <template #model="{ value }">
        <span class="text-sm text-[rgb(var(--text))] font-medium">{{ value }}</span>
      </template>

      <template #status="{ row }">
        <div class="flex flex-col gap-1 items-start">
          <span :class="[getStatusBadgeClass(row.status), 'badge']">
            {{ row.status.charAt(0).toUpperCase() + row.status.slice(1) }}
            <span :class="getStatusCodeClass(row.statusCode)" class="text-xs font-mono font-medium">
              {{ row.statusCode }}
            </span>
          </span>
        </div>
      </template>

      <template #responseTime="{ value }">
        <span class="text-sm text-[rgb(var(--text))]">{{ value.toFixed(2) }}s</span>
      </template>

      <template #tokens="{ value }">
        <span class="text-sm text-[rgb(var(--text))]">{{ value.toLocaleString() }}</span>
      </template>

      <template #cost="{ value }">
        <span class="text-sm font-medium text-[rgb(var(--text))]">${{ value.toFixed(4) }}</span>
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
