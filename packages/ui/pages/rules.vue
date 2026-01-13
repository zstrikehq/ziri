<script setup lang="ts">
import { useRules } from '~/composables/useRules'
import { useConfigStore } from '~/stores/config'
import { useToast } from '~/composables/useToast'
import type { Policy, CreatePolicyInput } from '~/types/cedar'

const configStore = useConfigStore()
const { listRules, createRule, deleteRule, rules, loading } = useRules()
const toast = useToast()

// Auto-load rules when page mounts (if config is set)
onMounted(async () => {
  console.log('[RULES PAGE] onMounted called')
  console.log('[RULES PAGE] Config state:', {
    projectId: configStore.projectId,
    isConfigured: configStore.isConfigured
  })
  
  // Wait a tick to ensure config is loaded
  await nextTick()
  console.log('[RULES PAGE] After nextTick, isConfigured:', configStore.isConfigured)
  
  if (configStore.isConfigured) {
    console.log('[RULES PAGE] ✅ Config is set, loading rules...')
    try {
      await listRules()
      console.log('[RULES PAGE] ✅ Rules loaded')
    } catch (e) {
      console.error('[RULES PAGE] Error loading rules:', e)
    }
  } else {
    console.log('[RULES PAGE] ❌ Config not set, skipping rules load')
  }
})

// Modal state
const showCreateModal = ref(false)
const showDeleteModal = ref(false)
const ruleToDelete = ref<Policy | null>(null)

// Filter state
const searchQuery = ref('')
const filterEffect = ref<'' | 'permit' | 'forbid'>('')

// Pagination
const currentPage = ref(1)
const itemsPerPage = ref(20)

// Form state
const newRule = reactive<CreatePolicyInput>({
  policy: '',
  description: ''
})

const displayRules = computed(() => {
  return rules.value.filter(rule => {
    const matchesSearch = searchQuery.value === '' || 
      rule.description.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      rule.policy.toLowerCase().includes(searchQuery.value.toLowerCase())
    
    const matchesFilter = filterEffect.value === '' || rule.effect === filterEffect.value
    
    return matchesSearch && matchesFilter
  })
})

const columns = [
  { key: 'effect', header: 'Effect', class: 'w-24' },
  { key: 'description', header: 'Description' },
  { key: 'actions', header: '', class: 'w-20' }
]

const handleCreateRule = async () => {
  if (!newRule.policy.trim() || !newRule.description.trim()) {
    toast.warning('Please fill in all fields')
    return
  }
  
  try {
    await createRule(newRule)
    showCreateModal.value = false
    newRule.policy = ''
    newRule.description = ''
  } catch (e) {
    // Error handled by composable
  }
}

const confirmDelete = (rule: Policy) => {
  ruleToDelete.value = rule
  showDeleteModal.value = true
}

const handleDeleteRule = async () => {
  if (!ruleToDelete.value) return
  
  try {
    await deleteRule(ruleToDelete.value.policy)
    showDeleteModal.value = false
    ruleToDelete.value = null
  } catch (e) {
    // Error handled by composable
  }
}
</script>

<template>
  <div class="space-y-4">
    <!-- Toolbar -->
    <div class="flex items-center justify-between gap-4" v-if="displayRules.length > 0">
      <div class="flex-1 flex items-center gap-3">
        <div class="relative flex-1 max-w-md">
          <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgb(var(--text-muted))]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input 
            v-model="searchQuery"
            type="text"
            placeholder="Search rules..."
            class="input pl-10"
          />
        </div>
        <select 
          v-model="filterEffect"
          class="input w-32"
        >
          <option value="">All Effects</option>
          <option value="permit">Permit</option>
          <option value="forbid">Forbid</option>
        </select>
      </div>
      <UiButton @click="showCreateModal = true">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Create Rule
      </UiButton>
    </div>

    <!-- Rules Table -->
    <UiTable 
      :columns="columns" 
      :data="displayRules" 
      :loading="loading" 
      :paginated="true"
      :current-page="currentPage"
      :items-per-page="itemsPerPage"
      empty-message="No rules found. Create your first rule to get started."
      @update:current-page="currentPage = $event"
      @update:items-per-page="itemsPerPage = $event"
    >
      <template #empty-action>
        <UiButton @click="showCreateModal = true">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Create Rule
        </UiButton>
      </template>
      <template #effect="{ row }">
        <span :class="row.effect === 'permit' ? 'badge-success' : 'badge-danger'" class="badge">
          {{ row.effect }}
        </span>
      </template>
      
      <template #description="{ row }">
        <div>
          <p class="text-[rgb(var(--text))] font-medium">{{ row.description }}</p>
          <p class="text-[rgb(var(--text-muted))] text-xs font-mono mt-1 truncate max-w-lg">
            {{ row.policy.substring(0, 70) }}...
          </p>
        </div>
      </template>
      
      <template #actions="{ row }">
        <button 
          @click="confirmDelete(row)"
          class="icon-btn text-[rgb(var(--text-muted))] hover:text-red-500"
          title="Delete rule"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </template>
    </UiTable>

    <!-- Create Modal -->
    <UiModal v-model="showCreateModal" title="Create Rule">
      <form @submit.prevent="handleCreateRule" class="space-y-5">
        <div>
          <label class="block text-xs font-semibold text-[rgb(var(--text-secondary))] mb-1.5">Description</label>
          <input 
            v-model="newRule.description"
            type="text"
            placeholder="Allow engineers to query LLM"
            class="input"
          />
        </div>
        
        <div>
          <label class="block text-xs font-semibold text-[rgb(var(--text-secondary))] mb-1.5">Policy</label>
          <textarea 
            v-model="newRule.policy"
            rows="8"
            placeholder="permit(principal, action, resource) when { ... };"
            class="input resize-none"
          />
        </div>
        
        <div class="flex gap-3 justify-end pt-2">
          <UiButton type="button" variant="outline" @click="showCreateModal = false">
            Cancel
          </UiButton>
          <UiButton type="submit" :loading="loading">
            Create Rule
          </UiButton>
        </div>
      </form>
    </UiModal>

    <!-- Delete Confirmation Modal -->
    <UiModal v-model="showDeleteModal" title="Delete Rule" size="sm">
      <div class="space-y-4">
        <div class="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800">
          <p class="text-sm text-red-700 dark:text-red-300">
            Are you sure you want to delete this rule? This action cannot be undone.
          </p>
        </div>
        <div class="flex gap-3 justify-end">
          <UiButton variant="outline" @click="showDeleteModal = false">
            Cancel
          </UiButton>
          <UiButton variant="danger" :loading="loading" @click="handleDeleteRule">
            Delete
          </UiButton>
        </div>
      </div>
    </UiModal>
  </div>
</template>
