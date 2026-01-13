<script setup lang="ts">
import UiPagination from './Pagination.vue'

interface Column {
  key: string
  header: string
  class?: string
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
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  emptyMessage: 'No data available',
  clickable: false,
  paginated: false,
  itemsPerPage: 10,
  currentPage: 1
})

const emit = defineEmits<{
  'row-click': [row: any]
  'update:currentPage': [page: number]
  'update:itemsPerPage': [items: number]
}>()

const paginatedData = computed(() => {
  if (!props.paginated) return props.data
  const start = (props.currentPage - 1) * props.itemsPerPage
  const end = start + props.itemsPerPage
  return props.data.slice(start, end)
})

const handleRowClick = (row: any) => {
  if (props.clickable) {
    emit('row-click', row)
  }
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
            :class="column.class"
          >
            {{ column.header }}
          </th>
        </tr>
      </thead>
      <tbody>
        <!-- Loading skeleton -->
        <template v-if="loading">
          <tr v-for="i in 5" :key="i" class="border-b border-[rgb(var(--border))]">
            <td v-for="column in columns" :key="column.key" class="px-4 py-3">
              <UiLoadingSkeleton :lines="1" height="h-4" />
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
    <div v-if="paginated && data.length > 0" class="px-4 py-3 border-t-2 border-[rgb(var(--border))]">
      <UiPagination
        :current-page="currentPage"
        :total-items="data.length"
        :items-per-page="itemsPerPage"
        @update:current-page="(page) => emit('update:currentPage', page)"
        @update:items-per-page="(items) => emit('update:itemsPerPage', items)"
      />
    </div>
  </div>
</template>
