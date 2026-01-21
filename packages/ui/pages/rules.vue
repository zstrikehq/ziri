<script setup lang="ts">
import { useRules } from '~/composables/useRules'
import { useConfigStore } from '~/stores/config'
import { useToast } from '~/composables/useToast'
import { useSchema } from '~/composables/useSchema'
import { useCedarWasm } from '~/composables/useCedarWasm'
import type { Policy, CreatePolicyInput } from '~/types/cedar'
import type { ValidationError } from '~/composables/useCedarWasm'

const configStore = useConfigStore()
const { listRules, createRule, updateRule, deleteRule, setRuleStatus, rules, loading } = useRules()
const { getSchema } = useSchema()
const { validatePolicies, formatPolicy } = useCedarWasm()
const toast = useToast()

// Auto-load rules when page mounts (if config is set)
onMounted(async () => {
  await nextTick()
  
  if (configStore.isConfigured) {
    try {
      await listRules()
    } catch (e) {
      // Error handled by composable
    }
  }
})

// Modal state
const showCreateModal = ref(false)
const showEditModal = ref(false)
const showDeleteModal = ref(false)
const ruleToDelete = ref<Policy | null>(null)
const ruleToEdit = ref<Policy | null>(null)

// Filter state
const searchQuery = ref('')
const filterEffect = ref<'' | 'permit' | 'forbid'>('')

// Pagination
const currentPage = ref(1)
const itemsPerPage = ref(20)

// Form state
const newRule = reactive<CreatePolicyInput & { isActive: boolean }>({
  policy: '',
  description: '',
  isActive: true // Default to active when creating
})

// Validation state
const validationErrors = ref<ValidationError[]>([])
const validationWarnings = ref<ValidationError[]>([])
const isValidating = ref(false)

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
  { key: 'status', header: 'Status', class: 'w-32' },
  { key: 'actions', header: '', class: 'w-32' }
]

/**
 * Validate policy against schema
 */
const validatePolicy = async (policyText: string) => {
  if (!policyText.trim()) {
    validationErrors.value = []
    validationWarnings.value = []
    return
  }
  
  isValidating.value = true
  try {
    // Load schema for validation
    const schemaData = await getSchema('json')
    const schema = schemaData.schemaJson || schemaData.schema
    
    const result = await validatePolicies(policyText, schema)
    validationErrors.value = result.errors
    validationWarnings.value = result.warnings
    } catch (e: any) {
      validationErrors.value = [{
      message: `Validation failed: ${e.message}`,
      help: null,
      sourceLocations: []
    }]
    validationWarnings.value = []
  } finally {
    isValidating.value = false
  }
}

/**
 * Debounced validation
 */
let validationTimer: NodeJS.Timeout | null = null
const debouncedValidate = (policyText: string) => {
  if (validationTimer) {
    clearTimeout(validationTimer)
  }
  
  validationTimer = setTimeout(() => {
    validatePolicy(policyText)
  }, 500)
}

/**
 * Format policy text
 */
const formatPolicyText = async (policyText: string) => {
  if (!policyText.trim()) return policyText
  
  try {
    const result = await formatPolicy(policyText, 4)
    if ('formatted' in result) {
      return result.formatted
    } else {
      // Formatting failed - show errors but keep original text
      if (result.errors && result.errors.length > 0) {
        result.errors.forEach((error) => {
          if (error.sourceLocations && error.sourceLocations.length > 0) {
            error.sourceLocations.forEach((location) => {
            })
          }
        })
      }
      return policyText // Return original if formatting fails
    }
  } catch (e: any) {
    return policyText // Return original on error
  }
}

/**
 * Handle policy text change
 */
const onPolicyChange = (value: string) => {
  newRule.policy = value
  debouncedValidate(value)
}

/**
 * Handle policy text blur - format on blur
 */
const onPolicyBlur = async () => {
  if (newRule.policy.trim()) {
    const formatted = await formatPolicyText(newRule.policy)
    if (formatted !== newRule.policy) {
      newRule.policy = formatted
      // Re-validate after formatting
      debouncedValidate(formatted)
    }
  }
}

const handleCreateRule = async () => {
  if (!newRule.policy.trim() || !newRule.description.trim()) {
    toast.warning('Please fill in all fields')
    return
  }
  
  if (validationErrors.value.length > 0) {
    toast.warning('Please fix validation errors before saving')
    return
  }
  
  try {
    await createRule(newRule)
    // Set status after creation (if disabled)
    if (!newRule.isActive) {
      // Use the formatted policy text
      const policyToUse = newRule.policy.trim()
      await setRuleStatus(policyToUse, false)
    }
    showCreateModal.value = false
    newRule.policy = ''
    newRule.description = ''
    newRule.isActive = true
    validationErrors.value = []
    validationWarnings.value = []
  } catch (e) {
    // Error handled by composable
  }
}

const handleEditRule = async (rule: Policy) => {
  ruleToEdit.value = rule
  newRule.description = rule.description
  newRule.isActive = rule.isActive
  validationErrors.value = []
  validationWarnings.value = []
  
  // Format policy text when opening edit modal
  try {
    const formatted = await formatPolicyText(rule.policy)
    newRule.policy = formatted
    // Validate the formatted policy
    validatePolicy(formatted)
  } catch (e) {
    // If formatting fails, use original policy
    newRule.policy = rule.policy
    validatePolicy(rule.policy)
  }
  
  showEditModal.value = true
}

const handleUpdateRule = async () => {
  if (!ruleToEdit.value) return
  
  if (!newRule.policy.trim() || !newRule.description.trim()) {
    toast.warning('Please fill in all fields')
    return
  }
  
  if (validationErrors.value.length > 0) {
    toast.warning('Please fix validation errors before saving')
    return
  }
  
  try {
    // Update status first (using old policy text) if it changed
    // This ensures we can find the policy even if content changes
    if (newRule.isActive !== ruleToEdit.value.isActive) {
      await setRuleStatus(ruleToEdit.value.policy, newRule.isActive)
    }
    // Then update policy content (if policy text changed)
    if (ruleToEdit.value.policy !== newRule.policy || ruleToEdit.value.description !== newRule.description) {
      await updateRule(ruleToEdit.value.policy, newRule)
    }
    showEditModal.value = false
    ruleToEdit.value = null
    newRule.policy = ''
    newRule.description = ''
    newRule.isActive = true
    validationErrors.value = []
    validationWarnings.value = []
  } catch (e) {
    // Error handled by composable
  }
}

const handleCancelEdit = () => {
  showEditModal.value = false
  ruleToEdit.value = null
  newRule.policy = ''
  newRule.description = ''
  newRule.isActive = true
  validationErrors.value = []
  validationWarnings.value = []
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
    <!-- Toolbar - Always show if there's data OR if there's a search query -->
    <div class="flex items-center justify-between gap-4" v-if="rules.length > 0 || searchQuery || filterEffect">
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
          <button
            v-if="searchQuery"
            @click="searchQuery = ''"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text))]"
            title="Clear search"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
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

    <!-- Empty state toolbar (when no rules at all) -->
    <div class="flex items-center justify-end gap-4" v-if="rules.length === 0 && !loading && !searchQuery && !filterEffect">
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
      :empty-message="searchQuery || filterEffect ? 'No rules match your search criteria.' : 'No rules found. Create your first rule to get started.'"
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

      <template #status="{ row }">
        <!-- Status pill with improved styling -->
        <span
          class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border-2 shadow-sm"
          :class="row.isActive
            ? 'border-emerald-500/50 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-500/60 shadow-emerald-500/10'
            : 'border-amber-500/50 bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-500/60 shadow-amber-500/10'"
        >
          <span
            class="h-2 w-2 rounded-full animate-pulse"
            :class="row.isActive ? 'bg-emerald-500' : 'bg-amber-500'"
          />
          <span>{{ row.isActive ? 'Enabled' : 'Disabled' }}</span>
        </span>
      </template>
      
      <template #actions="{ row }">
        <div class="flex gap-1">
          <button 
            @click="handleEditRule(row)"
            class="icon-btn text-[rgb(var(--text-muted))] hover:text-indigo-500"
            title="Edit rule"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button 
            @click="confirmDelete(row)"
            class="icon-btn text-[rgb(var(--text-muted))] hover:text-red-500"
            title="Delete rule"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
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

        <!-- Status Toggle -->
        <div class="flex items-center justify-between p-4 rounded-lg border-2 border-[rgb(var(--border))] bg-[rgb(var(--surface-elevated))]">
          <div>
            <label class="block text-sm font-semibold text-[rgb(var(--text))] mb-0.5">Rule Status</label>
            <p class="text-xs text-[rgb(var(--text-muted))]">Enable or disable this rule</p>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              v-model="newRule.isActive"
              class="sr-only peer"
            />
            <div class="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-500 dark:peer-checked:bg-emerald-600"></div>
            <span class="ml-3 text-sm font-medium text-[rgb(var(--text))]">
              {{ newRule.isActive ? 'Enabled' : 'Disabled' }}
            </span>
          </label>
        </div>
        
        <div>
          <div class="flex items-center justify-between mb-1.5">
            <label class="block text-xs font-semibold text-[rgb(var(--text-secondary))]">Policy</label>
            <span v-if="isValidating" class="text-xs text-[rgb(var(--text-muted))]">Validating...</span>
            <span v-else-if="validationErrors.length > 0" class="text-xs text-red-500">{{ validationErrors.length }} error(s)</span>
            <span v-else-if="newRule.policy.trim()" class="text-xs text-green-500">Valid</span>
          </div>
          <textarea 
            :value="newRule.policy"
            @input="onPolicyChange(($event.target as HTMLTextAreaElement).value)"
            @blur="onPolicyBlur"
            rows="8"
            placeholder="permit(principal, action, resource) when { ... };"
            :class="[
              'input resize-none font-mono text-xs',
              validationErrors.length > 0 && 'ring-2 ring-red-500'
            ]"
          />
          
          <!-- Validation Errors -->
          <div v-if="validationErrors.length > 0" class="mt-2 space-y-1">
            <div 
              v-for="(error, idx) in validationErrors" 
              :key="idx"
              class="p-2 rounded bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
            >
              <p class="text-xs text-red-700 dark:text-red-300">{{ error.message }}</p>
              <p v-if="error.help" class="text-xs text-red-600 dark:text-red-400 mt-0.5">{{ error.help }}</p>
              <div v-if="error.sourceLocations && error.sourceLocations.length > 0" class="mt-1">
                <p class="text-xs text-red-600 dark:text-red-400">
                  Position: {{ error.sourceLocations[0].start }}-{{ error.sourceLocations[0].end }}
                </p>
              </div>
            </div>
          </div>
          
          <!-- Validation Warnings -->
          <div v-if="validationWarnings.length > 0" class="mt-2 space-y-1">
            <div 
              v-for="(warning, idx) in validationWarnings" 
              :key="idx"
              class="p-2 rounded bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800"
            >
              <p class="text-xs text-amber-700 dark:text-amber-300">{{ warning.message }}</p>
              <p v-if="warning.help" class="text-xs text-amber-600 dark:text-amber-400 mt-0.5">{{ warning.help }}</p>
            </div>
          </div>
        </div>
        
        <div class="flex gap-3 justify-end pt-2">
          <UiButton type="button" variant="outline" @click="showCreateModal = false; newRule.isActive = true; validationErrors = []; validationWarnings = []">
            Cancel
          </UiButton>
          <UiButton type="submit" :loading="loading" :disabled="validationErrors.length > 0">
            Create Rule
          </UiButton>
        </div>
      </form>
    </UiModal>

    <!-- Edit Modal -->
    <UiModal v-model="showEditModal" title="Edit Rule">
      <form @submit.prevent="handleUpdateRule" class="space-y-5">
        <div>
          <label class="block text-xs font-semibold text-[rgb(var(--text-secondary))] mb-1.5">Description</label>
          <input 
            v-model="newRule.description"
            type="text"
            placeholder="Allow engineers to query LLM"
            class="input"
          />
        </div>

        <!-- Status Toggle -->
        <div class="flex items-center justify-between p-4 rounded-lg border-2 border-[rgb(var(--border))] bg-[rgb(var(--surface-elevated))]">
          <div>
            <label class="block text-sm font-semibold text-[rgb(var(--text))] mb-0.5">Rule Status</label>
            <p class="text-xs text-[rgb(var(--text-muted))]">Enable or disable this rule</p>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              v-model="newRule.isActive"
              class="sr-only peer"
            />
            <div class="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-500 dark:peer-checked:bg-emerald-600"></div>
            <span class="ml-3 text-sm font-medium text-[rgb(var(--text))]">
              {{ newRule.isActive ? 'Enabled' : 'Disabled' }}
            </span>
          </label>
        </div>
        
        <div>
          <div class="flex items-center justify-between mb-1.5">
            <label class="block text-xs font-semibold text-[rgb(var(--text-secondary))]">Policy</label>
            <span v-if="isValidating" class="text-xs text-[rgb(var(--text-muted))]">Validating...</span>
            <span v-else-if="validationErrors.length > 0" class="text-xs text-red-500">{{ validationErrors.length }} error(s)</span>
            <span v-else-if="newRule.policy.trim()" class="text-xs text-green-500">Valid</span>
          </div>
          <textarea 
            :value="newRule.policy"
            @input="onPolicyChange(($event.target as HTMLTextAreaElement).value)"
            @blur="onPolicyBlur"
            rows="8"
            placeholder="permit(principal, action, resource) when { ... };"
            :class="[
              'input resize-none font-mono text-xs',
              validationErrors.length > 0 && 'ring-2 ring-red-500'
            ]"
          />
          
          <!-- Validation Errors -->
          <div v-if="validationErrors.length > 0" class="mt-2 space-y-1">
            <div 
              v-for="(error, idx) in validationErrors" 
              :key="idx"
              class="p-2 rounded bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
            >
              <p class="text-xs text-red-700 dark:text-red-300">{{ error.message }}</p>
              <p v-if="error.help" class="text-xs text-red-600 dark:text-red-400 mt-0.5">{{ error.help }}</p>
              <div v-if="error.sourceLocations && error.sourceLocations.length > 0" class="mt-1">
                <p class="text-xs text-red-600 dark:text-red-400">
                  Position: {{ error.sourceLocations[0].start }}-{{ error.sourceLocations[0].end }}
                </p>
              </div>
            </div>
          </div>
          
          <!-- Validation Warnings -->
          <div v-if="validationWarnings.length > 0" class="mt-2 space-y-1">
            <div 
              v-for="(warning, idx) in validationWarnings" 
              :key="idx"
              class="p-2 rounded bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800"
            >
              <p class="text-xs text-amber-700 dark:text-amber-300">{{ warning.message }}</p>
              <p v-if="warning.help" class="text-xs text-amber-600 dark:text-amber-400 mt-0.5">{{ warning.help }}</p>
            </div>
          </div>
        </div>
        
        <div class="flex gap-3 justify-end pt-2">
          <UiButton type="button" variant="outline" @click="handleCancelEdit">
            Cancel
          </UiButton>
          <UiButton type="submit" :loading="loading" :disabled="validationErrors.length > 0">
            Update Rule
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
