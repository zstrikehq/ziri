<script setup lang="ts">
import { useUnifiedAuth } from '~/composables/useUnifiedAuth'
import { useInternalAuditLogs } from '~/composables/useInternalAuditLogs'
import { useDebounce } from '~/composables/useDebounce'
import { useRealtimeUpdates } from '~/composables/useRealtimeUpdates'
import { formatDateShort } from '~/utils/formatters'

definePageMeta({
  layout: 'default'
})

const { getAuthHeader } = useUnifiedAuth()
const { listInternalAuditLogs } = useInternalAuditLogs()

const searchQuery = ref('')
const filterUserId = ref('')
const filterAction = ref('')
const filterResourceType = ref('')

const currentPage = ref(1)
const itemsPerPage = ref(10)

const sortBy = ref<string | null>(null)
const sortOrder = ref<'asc' | 'desc' | null>(null)

const isLoading = ref(true)
const logs = ref<any[]>([])
const totalLogs = ref<number | undefined>(undefined)

const debouncedSearchQuery = useDebounce(searchQuery, 300)

const fetchLogs = async () => {
  try {
    isLoading.value = true
    const authHeader = getAuthHeader()
    if (!authHeader) return

    const offset = (currentPage.value - 1) * itemsPerPage.value

    const result = await listInternalAuditLogs({
      search: debouncedSearchQuery.value || undefined,
      userId: filterUserId.value || undefined,
      action: filterAction.value || undefined,
      resourceType: filterResourceType.value || undefined,
      limit: itemsPerPage.value,
      offset,
      sortBy: sortBy.value,
      sortOrder: sortOrder.value
    })

    logs.value = result.items
    totalLogs.value = result.total
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

watch(
  [
    debouncedSearchQuery,
    filterUserId,
    filterAction,
    filterResourceType,
    currentPage,
    itemsPerPage,
    sortBy,
    sortOrder
  ],
  () => {
    fetchLogs()
  }
)

const { isConnected: isSseConnected } = useRealtimeUpdates({
  onInternalAuditLogCreated: () => {

    if (currentPage.value === 1) {
      fetchLogs()
    }
  },
  onBatchUpdate: () => {

    if (currentPage.value === 1) {
      fetchLogs()
    }
  }
})

const columns = [
  { key: 'request_timestamp', header: 'Time', class: 'w-40', sortable: true },
  { key: 'dashboard_user_id', header: 'User', class: 'w-32', sortable: true },
  { key: 'dashboard_user_role', header: 'Role', class: 'w-24', sortable: true },
  { key: 'action', header: 'Action', class: 'w-32', sortable: true },
  { key: 'resource', header: 'Resource', class: 'w-40', sortable: false },
  { key: 'duration', header: 'Duration', class: 'w-40', sortable: false }
]


onMounted(() => {
  fetchLogs()
})
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-[rgb(var(--text))]">Internal Audit Logs</h1>
      <span
        class="text-xs px-2 py-1 rounded-full"
        :class="isSseConnected ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200' : 'bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200'"
      >
        {{ isSseConnected ? 'Live updates' : 'Offline' }}
      </span>
    </div>

    <!-- Filters -->
    <div class="flex items-center gap-3 flex-wrap">
      <div class="relative flex-1 max-w-md">
        <svg
          class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgb(var(--text-muted))]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search by user, action, or resource..."
          class="input pl-10"
        />
      </div>
      <input
        v-model="filterUserId"
        type="text"
        placeholder="User ID"
        class="input w-40"
      />
      <input
        v-model="filterAction"
        type="text"
        placeholder="Action"
        class="input w-40"
      />
      <input
        v-model="filterResourceType"
        type="text"
        placeholder="Resource type"
        class="input w-40"
      />
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="card">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b-2 border-[rgb(var(--border))]">
              <th class="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-[rgb(var(--text-muted))] w-40">Time</th>
              <th class="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-[rgb(var(--text-muted))] w-32">User</th>
              <th class="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-[rgb(var(--text-muted))] w-24">Role</th>
              <th class="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-[rgb(var(--text-muted))] w-32">Action</th>
              <th class="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-[rgb(var(--text-muted))] w-40">Resource</th>
              <th class="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-[rgb(var(--text-muted))] w-40">Duration</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="i in 10" :key="i" class="border-b border-[rgb(var(--border))]">
              <td class="py-3 px-4">
                <div class="space-y-1">
                  <div class="h-4 bg-[rgb(var(--surface-elevated))] rounded w-24 animate-pulse"></div>
                  <div class="h-3 bg-[rgb(var(--surface-elevated))] rounded w-16 animate-pulse"></div>
                </div>
              </td>
              <td class="py-3 px-4">
                <div class="h-5 bg-[rgb(var(--surface-elevated))] rounded w-20 animate-pulse"></div>
              </td>
              <td class="py-3 px-4">
                <div class="h-6 bg-[rgb(var(--surface-elevated))] rounded w-16 animate-pulse"></div>
              </td>
              <td class="py-3 px-4">
                <div class="h-4 bg-[rgb(var(--surface-elevated))] rounded w-24 animate-pulse"></div>
              </td>
              <td class="py-3 px-4">
                <div class="space-y-1">
                  <div class="h-4 bg-[rgb(var(--surface-elevated))] rounded w-20 animate-pulse"></div>
                  <div class="h-3 bg-[rgb(var(--surface-elevated))] rounded w-16 animate-pulse"></div>
                </div>
              </td>
              <td class="py-3 px-4">
                <div class="space-y-1">
                  <div class="h-3 bg-[rgb(var(--surface-elevated))] rounded w-24 animate-pulse"></div>
                  <div class="h-3 bg-[rgb(var(--surface-elevated))] rounded w-24 animate-pulse"></div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Logs Table -->
    <UiTable
      v-else
      :columns="columns"
      :data="logs"
      :loading="isLoading"
      :paginated="true"
      :current-page="currentPage"
      :items-per-page="itemsPerPage"
      :total-items="totalLogs !== undefined ? totalLogs : logs.length"
      :sort-by="sortBy"
      :sort-order="sortOrder"
      empty-message="No internal audit logs found"
      @update:current-page="currentPage = $event"
      @update:items-per-page="itemsPerPage = $event"
      @update:sort="handleSort"
    >
      <template #request_timestamp="{ row }">
        <div class="text-sm">
          <p class="text-[rgb(var(--text))] font-medium">
            {{ formatDateShort(row.request_timestamp) }}
          </p>
          <p class="text-xs text-[rgb(var(--text-muted))]">
            {{ new Date(row.request_timestamp).toLocaleTimeString() }}
          </p>
        </div>
      </template>

      <template #dashboard_user_id="{ row }">
        <div class="text-sm">
          <p class="text-[rgb(var(--text))] font-medium">
            {{ row.dashboard_user_name || '--' }}
          </p>
          <code class="text-xs text-[rgb(var(--text-muted))] font-mono">{{ row.dashboard_user_id || 'N/A' }}</code>
        </div>
      </template>

      <template #dashboard_user_role="{ value }">
        <span class="badge" :class="value ? 'badge-neutral' : 'badge-muted'">
          {{ value || 'N/A' }}
        </span>
      </template>

      <template #resource="{ row }">
        <div class="text-sm">
          <p class="text-[rgb(var(--text))] font-medium">
            {{ row.resource_type || 'N/A' }}
          </p>
          <p class="text-xs text-[rgb(var(--text-muted))]">
            {{ row.resource_id || '—' }}
          </p>
        </div>
      </template>

      <template #duration="{ row }">
        <div class="text-xs text-[rgb(var(--text-muted))] space-y-0.5">
          <!-- <p>
            Auth:
            <span class="font-mono text-[rgb(var(--text))]">{{
              row.auth_duration_ms != null ? `${row.auth_duration_ms}ms` : 'N/A'
            }}</span>
          </p> -->
          <p>
            Action:
            <span class="font-mono text-[rgb(var(--text))]">{{
              row.action_duration_ms != null ? `${row.action_duration_ms}ms` : 'N/A'
            }}</span>
          </p>
        </div>
      </template>
    </UiTable>
  </div>
</template>

