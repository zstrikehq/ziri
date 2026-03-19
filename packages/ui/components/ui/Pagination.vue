<script setup lang="ts">
interface Props {
  currentPage: number
  totalItems?: number
  itemsPerPage: number
  showItemsPerPage?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showItemsPerPage: true
})

const emit = defineEmits<{
  'update:currentPage': [page: number]
  'update:itemsPerPage': [items: number]
}>()

const totalPages = computed(() => {
  const total = props.totalItems || 0
  if (props.itemsPerPage >= total) return 1
  return Math.ceil(total / props.itemsPerPage)
})

const goToPage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) {
    emit('update:currentPage', page)
  }
}

const itemsPerPageOptions = computed(() => {
  const options = [10, 20, 50]
  const total = props.totalItems || 0
  if (total > 50) {
    options.push(100)
  }
  return options
})

const selectValue = computed(() => {
  const total = props.totalItems || 0
  // Only show 'all' if the "All" option is actually rendered (total > 100)
  // AND the current itemsPerPage covers all items
  if (total > 100 && props.itemsPerPage >= total) {
    return 'all'
  }
  // Ensure the value matches one of the available options
  const options = itemsPerPageOptions.value
  if (options.includes(props.itemsPerPage)) {
    return props.itemsPerPage
  }
  // Fallback: find the smallest option >= itemsPerPage, or the largest option
  const larger = options.find(o => o >= props.itemsPerPage)
  return larger ?? options[options.length - 1]
})

const handleItemsPerPageChange = (event: Event) => {
  const target = event.target as HTMLSelectElement | null
  if (!target) return

  const value = target.value
  const total = props.totalItems || 0

  if (value === 'all') {
    emit('update:itemsPerPage', total)
  } else {
    emit('update:itemsPerPage', Number(value))
  }
  emit('update:currentPage', 1)
}
</script>

<template>
  <div class="flex items-center justify-between gap-4 flex-wrap">
    <div class="flex items-center gap-2">
      <span class="text-sm text-[rgb(var(--text-muted))]">
        Showing {{ Math.min((currentPage - 1) * itemsPerPage + 1, totalItems || 0) }} to
        {{ Math.min(currentPage * itemsPerPage, totalItems || 0) }} of
        {{ (totalItems || 0).toLocaleString() }} entries
      </span>
    </div>

    <div class="flex items-center gap-3">
      <!-- Items per page selector -->
      <div v-if="showItemsPerPage" class="flex items-center gap-2">
        <span class="text-sm text-[rgb(var(--text-muted))]">Show:</span>
        <select
          :value="selectValue"
          @change="handleItemsPerPageChange"
          class="input w-20 text-sm py-1"
        >
          <option v-for="option in itemsPerPageOptions" :key="option" :value="option">
            {{ option }}
          </option>
          <option v-if="(totalItems || 0) > 100" value="all">All</option>
        </select>
      </div>

      <!-- Page navigation -->
      <div class="flex items-center gap-1">
        <button
          @click="goToPage(currentPage - 1)"
          :disabled="currentPage === 1"
          class="px-3 py-1.5 border border-[rgb(var(--border))] text-sm font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-[rgb(var(--text-secondary))] hover:border-[rgb(var(--border-strong))] hover:bg-[rgb(var(--surface-elevated))] hover:text-[rgb(var(--text))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-border-accent))] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(var(--surface-panel))]"
        >
          Previous
        </button>

        <div class="flex items-center gap-1">
          <template v-if="totalPages <= 7">
            <button
              v-for="page in totalPages"
              :key="page"
              @click="goToPage(page)"
              :class="[
                'px-3 py-1.5 border text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-border-accent))] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(var(--surface-panel))]',
                currentPage === page
                  ? 'border-[rgb(var(--primary))] bg-[rgb(var(--primary))] text-[#0a0a0a]'
                  : 'border-[rgb(var(--border))] text-[rgb(var(--text-secondary))] hover:border-[rgb(var(--border-strong))] hover:bg-[rgb(var(--surface-elevated))] hover:text-[rgb(var(--text))]'
              ]"
            >
              {{ page }}
            </button>
          </template>
          <template v-else>
            <button
              v-if="currentPage > 3"
              @click="goToPage(1)"
              :class="[
                'px-3 py-1.5 border text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-border-accent))] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(var(--surface-panel))]',
                currentPage === 1
                  ? 'border-[rgb(var(--primary))] bg-[rgb(var(--primary))] text-[#0a0a0a]'
                  : 'border-[rgb(var(--border))] text-[rgb(var(--text-secondary))] hover:border-[rgb(var(--border-strong))] hover:bg-[rgb(var(--surface-elevated))] hover:text-[rgb(var(--text))]'
              ]"
            >
              1
            </button>
            <span v-if="currentPage > 4" class="px-2 text-[rgb(var(--text-muted))]">...</span>
            <button
              v-for="page in [currentPage - 1, currentPage, currentPage + 1].filter(p => p >= 1 && p <= totalPages)"
              :key="page"
              @click="goToPage(page)"
              :class="[
                'px-3 py-1.5 border text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-border-accent))] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(var(--surface-panel))]',
                currentPage === page
                  ? 'border-[rgb(var(--primary))] bg-[rgb(var(--primary))] text-[#0a0a0a]'
                  : 'border-[rgb(var(--border))] text-[rgb(var(--text-secondary))] hover:border-[rgb(var(--border-strong))] hover:bg-[rgb(var(--surface-elevated))] hover:text-[rgb(var(--text))]'
              ]"
            >
              {{ page }}
            </button>
            <span v-if="currentPage < totalPages - 3" class="px-2 text-[rgb(var(--text-muted))]">...</span>
            <button
              v-if="currentPage < totalPages - 2"
              @click="goToPage(totalPages)"
              :class="[
                'px-3 py-1.5 border text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-border-accent))] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(var(--surface-panel))]',
                currentPage === totalPages
                  ? 'border-[rgb(var(--primary))] bg-[rgb(var(--primary))] text-[#0a0a0a]'
                  : 'border-[rgb(var(--border))] text-[rgb(var(--text-secondary))] hover:border-[rgb(var(--border-strong))] hover:bg-[rgb(var(--surface-elevated))] hover:text-[rgb(var(--text))]'
              ]"
            >
              {{ totalPages }}
            </button>
          </template>
        </div>

        <button
          @click="goToPage(currentPage + 1)"
          :disabled="currentPage === totalPages"
          class="px-3 py-1.5 border border-[rgb(var(--border))] text-sm font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-[rgb(var(--text-secondary))] hover:border-[rgb(var(--border-strong))] hover:bg-[rgb(var(--surface-elevated))] hover:text-[rgb(var(--text))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-border-accent))] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(var(--surface-panel))]"
        >
          Next
        </button>
      </div>
    </div>
  </div>
</template>
