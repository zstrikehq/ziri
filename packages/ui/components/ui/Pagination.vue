<script setup lang="ts">
interface Props {
  currentPage: number
  totalItems: number
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
  if (props.itemsPerPage >= props.totalItems) return 1
  return Math.ceil(props.totalItems / props.itemsPerPage)
})

const goToPage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) {
    emit('update:currentPage', page)
  }
}

const itemsPerPageOptions = computed(() => {
  const options = [10, 20, 50]
  if (props.totalItems > 50) {
    options.push(100)
  }
  return options
})
</script>

<template>
  <div class="flex items-center justify-between gap-4 flex-wrap">
    <div class="flex items-center gap-2">
      <span class="text-sm text-[rgb(var(--text-muted))]">
        Showing {{ Math.min((currentPage - 1) * itemsPerPage + 1, totalItems) }} to 
        {{ Math.min(currentPage * itemsPerPage, totalItems) }} of 
        {{ totalItems.toLocaleString() }} entries
      </span>
    </div>
    
    <div class="flex items-center gap-3">
      <!-- Items per page selector -->
      <div v-if="showItemsPerPage" class="flex items-center gap-2">
        <span class="text-sm text-[rgb(var(--text-muted))]">Show:</span>
        <select 
          :value="itemsPerPage >= totalItems ? 'all' : itemsPerPage"
          @change="(e) => {
            const value = (e.target as HTMLSelectElement).value
            if (value === 'all') {
              emit('update:itemsPerPage', totalItems)
            } else {
              emit('update:itemsPerPage', Number(value))
            }
            emit('update:currentPage', 1) // Reset to first page when changing items per page
          }"
          class="input w-20 text-sm py-1"
        >
          <option v-for="option in itemsPerPageOptions" :key="option" :value="option">
            {{ option }}
          </option>
          <option v-if="totalItems > 100" value="all">All</option>
        </select>
      </div>
      
      <!-- Page navigation -->
      <div class="flex items-center gap-1">
        <button
          @click="goToPage(currentPage - 1)"
          :disabled="currentPage === 1"
          class="px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--surface-elevated))] hover:text-[rgb(var(--text))]"
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
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200',
                currentPage === page
                  ? 'bg-indigo-500 text-white'
                  : 'text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--surface-elevated))] hover:text-[rgb(var(--text))]'
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
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200',
                currentPage === 1
                  ? 'bg-indigo-500 text-white'
                  : 'text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--surface-elevated))] hover:text-[rgb(var(--text))]'
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
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200',
                currentPage === page
                  ? 'bg-indigo-500 text-white'
                  : 'text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--surface-elevated))] hover:text-[rgb(var(--text))]'
              ]"
            >
              {{ page }}
            </button>
            <span v-if="currentPage < totalPages - 3" class="px-2 text-[rgb(var(--text-muted))]">...</span>
            <button
              v-if="currentPage < totalPages - 2"
              @click="goToPage(totalPages)"
              :class="[
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200',
                currentPage === totalPages
                  ? 'bg-indigo-500 text-white'
                  : 'text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--surface-elevated))] hover:text-[rgb(var(--text))]'
              ]"
            >
              {{ totalPages }}
            </button>
          </template>
        </div>
        
        <button
          @click="goToPage(currentPage + 1)"
          :disabled="currentPage === totalPages"
          class="px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--surface-elevated))] hover:text-[rgb(var(--text))]"
        >
          Next
        </button>
      </div>
    </div>
  </div>
</template>
