<script setup lang="ts">
import { formatCurrency, formatDateShort } from '~/utils/formatters'
import { Bar } from 'vue-chartjs'
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement,
  Title, 
  Tooltip, 
  Legend
} from 'chart.js'

ChartJS.register(
  CategoryScale, 
  LinearScale, 
  BarElement,
  Title, 
  Tooltip, 
  Legend
)

// Dummy analytics data
const timeRange = ref<'7d' | '30d' | '90d' | 'all'>('30d')

const stats = computed(() => ({
  totalRequests: 12450,
  totalSpend: 2345.67,
  avgResponseTime: 1.23,
  successRate: 98.5,
  activeUsers: 23,
  requestsToday: 342
}))

// Generate proper dummy data with dates
const requestTrend = computed(() => {
  const days = timeRange.value === '7d' ? 7 : timeRange.value === '30d' ? 30 : timeRange.value === '90d' ? 90 : 365
  const baseDate = new Date()
  const data = []
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(baseDate)
    date.setDate(date.getDate() - i)
    
    // Create realistic trend with some variation
    const baseValue = 300 + Math.sin(i / days * Math.PI * 2) * 100
    const variation = (Math.random() - 0.5) * 50
    
    data.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      fullDate: date,
      requests: Math.floor(baseValue + variation),
      spend: (baseValue + variation) * 0.15 + Math.random() * 10
    })
  }
  
  return data
})

const requestTrendChartData = computed(() => ({
  labels: requestTrend.value.map(d => d.date),
  datasets: [{
    label: 'Requests',
    data: requestTrend.value.map(d => d.requests),
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderColor: 'rgb(99, 102, 241)',
    borderWidth: 2,
    borderRadius: 4
  }]
}))

const requestTrendChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false
    },
    tooltip: {
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      titleFont: { size: 11 },
      bodyFont: { size: 11 },
      padding: 8,
      callbacks: {
        label: (context: any) => `${context.parsed.y.toLocaleString()} requests`
      }
    }
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { 
        font: { size: 10 },
        color: 'rgb(156, 163, 175)',
        maxRotation: 45,
        minRotation: 45
      }
    },
    y: {
      beginAtZero: true,
      grid: { color: 'rgba(156, 163, 175, 0.1)' },
      ticks: { 
        font: { size: 10 },
        color: 'rgb(156, 163, 175)',
        callback: (value: number) => value.toLocaleString()
      }
    }
  }
}

const hourlyDistribution = computed(() => {
  const data = []
  for (let i = 0; i < 24; i++) {
    // Create realistic hourly pattern (higher during business hours)
    const baseValue = i >= 9 && i <= 17 ? 120 : 60
    const variation = (Math.random() - 0.5) * 30
    data.push({
      hour: i,
      requests: Math.floor(baseValue + variation),
      label: `${i.toString().padStart(2, '0')}:00`
    })
  }
  return data
})

const hourlyChartData = computed(() => ({
  labels: hourlyDistribution.value.map(h => h.label),
  datasets: [{
    label: 'Requests',
    data: hourlyDistribution.value.map(h => h.requests),
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    borderColor: 'rgb(168, 85, 247)',
    borderWidth: 2,
    borderRadius: 4
  }]
}))

const hourlyChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false
    },
    tooltip: {
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      titleFont: { size: 11 },
      bodyFont: { size: 11 },
      padding: 8,
      callbacks: {
        label: (context: any) => `${context.parsed.y.toLocaleString()} requests`
      }
    }
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { 
        font: { size: 10 },
        color: 'rgb(156, 163, 175)',
        maxRotation: 0
      }
    },
    y: {
      beginAtZero: true,
      grid: { color: 'rgba(156, 163, 175, 0.1)' },
      ticks: { 
        font: { size: 10 },
        color: 'rgb(156, 163, 175)',
        callback: (value: number) => value.toLocaleString()
      }
    }
  }
}

const topModels = computed(() => [
  { model: 'gpt-4', requests: 4523, spend: 1234.56, percentage: 36.3 },
  { model: 'gpt-3.5-turbo', requests: 3892, spend: 567.89, percentage: 31.2 },
  { model: 'claude-3-opus', requests: 2341, spend: 345.67, percentage: 18.8 },
  { model: 'claude-3-sonnet', requests: 1694, spend: 197.55, percentage: 13.6 }
])

const topUsers = computed(() => [
  { userId: 'alice', name: 'Alice Smith', requests: 1234, spend: 234.56, percentage: 10.0 },
  { userId: 'bob', name: 'Bob Johnson', requests: 987, spend: 189.23, percentage: 7.9 },
  { userId: 'charlie', name: 'Charlie Brown', requests: 756, spend: 145.67, percentage: 6.1 },
  { userId: 'diana', name: 'Diana Prince', requests: 623, spend: 112.34, percentage: 5.0 },
  { userId: 'eve', name: 'Eve Wilson', requests: 512, spend: 98.45, percentage: 4.1 }
])

const statusCodes = computed(() => ({
  '2xx': 12250,
  '4xx': 145,
  '5xx': 55
}))
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
        class="input w-32"
      >
        <option value="7d">Last 7 days</option>
        <option value="30d">Last 30 days</option>
        <option value="90d">Last 90 days</option>
        <option value="all">All time</option>
      </select>
    </div>

    <!-- Stats Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div class="p-5 rounded-xl border-2 border-[rgb(var(--border))] bg-[rgb(var(--surface))]">
        <div class="flex items-center justify-between mb-2">
          <p class="text-sm font-medium text-[rgb(var(--text-muted))]">Total Requests</p>
          <svg class="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <p class="text-3xl font-bold text-[rgb(var(--text))]">{{ stats.totalRequests.toLocaleString() }}</p>
        <p class="text-xs text-green-600 dark:text-green-400 mt-1">+12.5% from last period</p>
      </div>

      <div class="p-5 rounded-xl border-2 border-[rgb(var(--border))] bg-[rgb(var(--surface))]">
        <div class="flex items-center justify-between mb-2">
          <p class="text-sm font-medium text-[rgb(var(--text-muted))]">Total Spend</p>
          <svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p class="text-3xl font-bold text-[rgb(var(--text))]">{{ formatCurrency(stats.totalSpend) }}</p>
        <p class="text-xs text-green-600 dark:text-green-400 mt-1">+8.3% from last period</p>
      </div>

      <div class="p-5 rounded-xl border-2 border-[rgb(var(--border))] bg-[rgb(var(--surface))]">
        <div class="flex items-center justify-between mb-2">
          <p class="text-sm font-medium text-[rgb(var(--text-muted))]">Avg Response Time</p>
          <svg class="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <p class="text-3xl font-bold text-[rgb(var(--text))]">{{ stats.avgResponseTime }}s</p>
        <p class="text-xs text-green-600 dark:text-green-400 mt-1">-5.2% from last period</p>
      </div>

      <div class="p-5 rounded-xl border-2 border-[rgb(var(--border))] bg-[rgb(var(--surface))]">
        <div class="flex items-center justify-between mb-2">
          <p class="text-sm font-medium text-[rgb(var(--text-muted))]">Success Rate</p>
          <svg class="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p class="text-3xl font-bold text-[rgb(var(--text))]">{{ stats.successRate }}%</p>
        <p class="text-xs text-green-600 dark:text-green-400 mt-1">+0.3% from last period</p>
      </div>

      <div class="p-5 rounded-xl border-2 border-[rgb(var(--border))] bg-[rgb(var(--surface))]">
        <div class="flex items-center justify-between mb-2">
          <p class="text-sm font-medium text-[rgb(var(--text-muted))]">Active Users</p>
          <svg class="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 100 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        </div>
        <p class="text-3xl font-bold text-[rgb(var(--text))]">{{ stats.activeUsers }}</p>
        <p class="text-xs text-green-600 dark:text-green-400 mt-1">+3 from last period</p>
      </div>

      <div class="p-5 rounded-xl border-2 border-[rgb(var(--border))] bg-[rgb(var(--surface))]">
        <div class="flex items-center justify-between mb-2">
          <p class="text-sm font-medium text-[rgb(var(--text-muted))]">Requests Today</p>
          <svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p class="text-3xl font-bold text-[rgb(var(--text))]">{{ stats.requestsToday }}</p>
        <p class="text-xs text-[rgb(var(--text-muted))] mt-1">Real-time</p>
      </div>
    </div>

    <!-- Charts Row -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Request Trend -->
      <div class="p-6 rounded-xl border-2 border-[rgb(var(--border))] bg-[rgb(var(--surface))]">
        <h2 class="text-lg font-semibold text-[rgb(var(--text))] mb-4">Request Trend</h2>
        <div class="h-64">
          <Bar :data="requestTrendChartData" :options="requestTrendChartOptions" />
        </div>
      </div>

      <!-- Hourly Distribution -->
      <div class="p-6 rounded-xl border-2 border-[rgb(var(--border))] bg-[rgb(var(--surface))]">
        <h2 class="text-lg font-semibold text-[rgb(var(--text))] mb-4">Hourly Distribution</h2>
        <div class="h-64">
          <Bar :data="hourlyChartData" :options="hourlyChartOptions" />
        </div>
      </div>
    </div>

    <!-- Tables Row -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Top Models -->
      <div class="p-6 rounded-xl border-2 border-[rgb(var(--border))] bg-[rgb(var(--surface))]">
        <h2 class="text-lg font-semibold text-[rgb(var(--text))] mb-4">Top Models</h2>
        <div class="space-y-3">
          <div 
            v-for="model in topModels" 
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
                  class="progress-bar-fill bg-indigo-500" 
                  :style="{ width: `${model.percentage}%` }"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Top Users -->
      <div class="p-6 rounded-xl border-2 border-[rgb(var(--border))] bg-[rgb(var(--surface))]">
        <h2 class="text-lg font-semibold text-[rgb(var(--text))] mb-4">Top Users</h2>
        <div class="space-y-3">
          <div 
            v-for="user in topUsers" 
            :key="user.userId"
            class="flex items-center justify-between p-3 rounded-lg bg-[rgb(var(--surface-elevated))]"
          >
            <div class="flex-1">
              <div class="flex items-center justify-between mb-1">
                <div>
                  <p class="font-medium text-[rgb(var(--text))]">{{ user.name }}</p>
                  <p class="text-xs text-[rgb(var(--text-muted))]">{{ user.userId }}</p>
                </div>
                <span class="text-xs text-[rgb(var(--text-muted))]">{{ user.percentage }}%</span>
              </div>
              <div class="flex items-center gap-4 text-sm mt-1">
                <span class="text-[rgb(var(--text-muted))]">{{ user.requests.toLocaleString() }} requests</span>
                <span class="text-[rgb(var(--text-muted))]">{{ formatCurrency(user.spend) }}</span>
              </div>
              <div class="mt-2 progress-bar">
                <div 
                  class="progress-bar-fill bg-green-500" 
                  :style="{ width: `${user.percentage}%` }"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Status Codes -->
    <div class="p-6 rounded-xl border-2 border-[rgb(var(--border))] bg-[rgb(var(--surface))]">
      <h2 class="text-lg font-semibold text-[rgb(var(--text))] mb-4">Response Status Codes</h2>
      <div class="grid grid-cols-3 gap-4">
        <div class="text-center p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800">
          <p class="text-2xl font-bold text-green-600 dark:text-green-400">{{ statusCodes['2xx'].toLocaleString() }}</p>
          <p class="text-sm text-green-700 dark:text-green-300 mt-1">2xx Success</p>
        </div>
        <div class="text-center p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-800">
          <p class="text-2xl font-bold text-amber-600 dark:text-amber-400">{{ statusCodes['4xx'].toLocaleString() }}</p>
          <p class="text-sm text-amber-700 dark:text-amber-300 mt-1">4xx Client Error</p>
        </div>
        <div class="text-center p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800">
          <p class="text-2xl font-bold text-red-600 dark:text-red-400">{{ statusCodes['5xx'].toLocaleString() }}</p>
          <p class="text-sm text-red-700 dark:text-red-300 mt-1">5xx Server Error</p>
        </div>
      </div>
    </div>
  </div>
</template>
