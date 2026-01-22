<script setup lang="ts">
import UiPagination from './Pagination.vue'

export type SortOrder = 'asc' | 'desc' | null

interface Column {
  key: string
  header: string
  class?: string
  sortable?: boolean // Whether this column can be sorted
}

interface Props {
  columns: Column[]
  data: any[]
  loading?: boolean
  emptyMessage?: string
  clickable?: boolean
  paginated?: boolean
  itemsPerPage?: number
  currentPage?: number
  totalItems?: number // For server-side pagination (total count from API)
  sortBy?: string | null // Current sort column
  sortOrder?: SortOrder // Current sort order
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  emptyMessage: 'No data available',
  clickable: false,
  paginated: false,
  itemsPerPage: 10,
  currentPage: 1,
  sortBy: null,
  sortOrder: null
})

const emit = defineEmits<{
  'row-click': [row: any]
  'update:currentPage': [page: number]
  'update:itemsPerPage': [items: number]
  'update:sort': [sortBy: string | null, sortOrder: SortOrder]
}>()

const paginatedData = computed(() => {
  if (!props.paginated) return props.data
  // If totalItems is provided, we're doing server-side pagination, so return data as-is
  if (props.totalItems !== undefined) {
    return props.data
  }
  // Otherwise, do client-side pagination
  const start = (props.currentPage - 1) * props.itemsPerPage
  const end = start + props.itemsPerPage
  return props.data.slice(start, end)
})

const totalItemsForPagination = computed(() => {
  // Use totalItems if provided (server-side), otherwise use data.length (client-side)
  // Default to 0 if neither is available
  if (props.totalItems !== undefined) {
    return props.totalItems
  }
  return props.data?.length || 0
})

const handleRowClick = (row: any) => {
  if (props.clickable) {
    emit('row-click', row)
  }
}

/**
 * Handle column header click for sorting
 * Three-state sorting: asc → desc → null
 */
const handleSort = (column: Column) => {
  if (!column.sortable) return
  
  let newSortBy: string | null = column.key
  let newSortOrder: SortOrder = 'asc'
  
  // If clicking the same column, cycle through states
  if (props.sortBy === column.key) {
    if (props.sortOrder === 'asc') {
      newSortOrder = 'desc'
    } else if (props.sortOrder === 'desc') {
      newSortBy = null
      newSortOrder = null
    }
  }
  
  emit('update:sort', newSortBy, newSortOrder)
}

/**
 * Get sort icon for a column
 */
const getSortIcon = (column: Column) => {
  if (!column.sortable || props.sortBy !== column.key) {
    return 'sort-default'
  }
  return props.sortOrder === 'asc' ? 'sort-asc' : 'sort-desc'
}
</script>

<template>
  <div class="overflow-x-auto rounded-xl border-2 border-[rgb(var(--border))] bg-[rgb(var(--surface))]">
    <table class="w-full text-sm">
      <thead>
        <tr class="border-b-2 border-[rgb(var(--border))]">
          <th 
            v-for="column in columns" 
            :key="column.key"
            class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[rgb(var(--text-muted))]"
            :class="[
              column.class,
              column.sortable && 'cursor-pointer select-none hover:bg-[rgb(var(--surface-elevated))] transition-colors'
            ]"
            @click="handleSort(column)"
          >
            <div class="flex items-center gap-2">
              <span>{{ column.header }}</span>
              <span v-if="column.sortable" class="flex flex-col items-center justify-center">
                <!-- Sort icons -->
                <svg 
                  v-if="getSortIcon(column) === 'sort-default'"
                  class="w-3 h-3 opacity-30"
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
                <svg 
                  v-else-if="getSortIcon(column) === 'sort-asc'"
                  class="w-3 h-3 text-indigo-500"
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
                </svg>
                <svg 
                  v-else-if="getSortIcon(column) === 'sort-desc'"
                  class="w-3 h-3 text-indigo-500"
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            </div>
          </th>
        </tr>
      </thead>
      <tbody>
        <!-- Loading skeleton with shimmer -->
        <template v-if="loading">
          <tr v-for="i in 5" :key="i" class="border-b border-[rgb(var(--border))]">
            <td v-for="column in columns" :key="column.key" class="px-4 py-3">
              <UiLoadingSkeleton :lines="1" height="h-4" :width="`${60 + Math.random() * 40}%`" />
            </td>
          </tr>
        </template>
        
        <!-- Empty state -->
        <tr v-else-if="paginatedData.length === 0">
          <td :colspan="columns.length" class="px-4 py-12 text-center">
            <div class="flex flex-col items-center gap-4">
              <svg class="w-12 h-12 text-[rgb(var(--text-muted))]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p class="text-sm font-medium text-[rgb(var(--text-muted))]">{{ emptyMessage }}</p>
              <slot name="empty-action" />
            </div>
          </td>
        </tr>
        
        <!-- Data rows -->
        <tr 
          v-else
          v-for="(row, index) in paginatedData" 
          :key="index"
          class="table-row border-b border-[rgb(var(--border))] last:border-b-0"
          :class="{ 'table-row-clickable': clickable }"
          @click="handleRowClick(row)"
        >
          <td 
            v-for="column in columns" 
            :key="column.key" 
            class="px-4 py-3 text-[rgb(var(--text))]"
            :class="column.class"
          >
            <slot :name="column.key" :row="row" :value="row[column.key]">
              {{ row[column.key] }}
            </slot>
          </td>
        </tr>
      </tbody>
    </table>
    
    <!-- Pagination -->
    <div v-if="paginated && (totalItemsForPagination > 0 || data.length > 0)" class="px-4 py-3 border-t-2 border-[rgb(var(--border))]">
      <UiPagination
        :current-page="currentPage"
        :total-items="totalItemsForPagination"
        :items-per-page="itemsPerPage"
        @update:current-page="(page) => emit('update:currentPage', page)"
        @update:items-per-page="(items) => emit('update:itemsPerPage', items)"
      />
    </div>
  </div>
</template>
