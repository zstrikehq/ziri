<script setup lang="ts">
import { useRules } from '~/composables/useRules'
import { useConfigStore } from '~/stores/config'
import { useToast } from '~/composables/useToast'
import { useSchema } from '~/composables/useSchema'
import { useCedarWasm } from '~/composables/useCedarWasm'
import { useDebounce } from '~/composables/useDebounce'
import { useAdminAuth } from '~/composables/useAdminAuth'
import { useInternalAuth } from '~/composables/useInternalAuth'
import AIPolicyChatModal from '~/components/AIPolicyChatModal.vue'
import type { Policy, CreatePolicyInput } from '~/types/cedar'
import type { ValidationError } from '~/composables/useCedarWasm'

const configStore = useConfigStore()
const { listRules, createRule, updateRule, deleteRule, setRuleStatus, rules, loading } = useRules()
const { getSchema } = useSchema()
const { validatePolicies, formatPolicy } = useCedarWasm()
const toast = useToast()
const { checkActions, checkAction } = useInternalAuth()


const permissionsLoading = ref(true)
const canCreatePolicy = ref(false)
const canUpdatePolicy = ref(false)
const canDeletePolicy = ref(false)
const canPatchPolicyStatus = ref(false)
const canGeneratePolicyWithAI = ref(false)

 
const showCreateModal = ref(false)
const showEditModal = ref(false)
const showDeleteModal = ref(false)
const showTemplateModal = ref(false)
const showAIChatModal = ref(false)
const ruleToDelete = ref<Policy | null>(null)
const ruleToEdit = ref<Policy | null>(null)
const isOpeningFromTemplate = ref(false)

interface PolicyTemplate {
  id: string
  category: string
  title: string
  description: string
  policy: string
}

const templates = ref<PolicyTemplate[]>([])
const templatesLoading = ref(false)

 
const searchQuery = ref('')
const filterEffect = ref<'' | 'permit' | 'forbid'>('')

 
const currentPage = ref(1)
const itemsPerPage = ref(20)
const totalRules = ref(0)

 
const sortBy = ref<string | null>(null)
const sortOrder = ref<'asc' | 'desc' | null>(null)

 
const newRule = reactive<CreatePolicyInput & { isActive: boolean }>({
  policy: '',
  description: '',
  isActive: true
})

 
const validationErrors = ref<ValidationError[]>([])
const validationWarnings = ref<ValidationError[]>([])
const isValidating = ref(false)

 
const debouncedSearchQuery = useDebounce(searchQuery, 300)

 
const fetchRules = async () => {
  try {
    const result = await listRules({
      search: debouncedSearchQuery.value || undefined,
      effect: filterEffect.value || undefined,
      limit: itemsPerPage.value,
      offset: (currentPage.value - 1) * itemsPerPage.value,
      sortBy: sortBy.value,
      sortOrder: sortOrder.value
    })
    totalRules.value = result.total || 0
  } catch (e) {
 
  }
}

 
const handleSort = (newSortBy: string | null, newSortOrder: 'asc' | 'desc' | null) => {
  sortBy.value = newSortBy
  sortOrder.value = newSortOrder
 
  currentPage.value = 1
}

 
watch([debouncedSearchQuery, filterEffect, currentPage, itemsPerPage, sortBy, sortOrder], () => {
  fetchRules()
})

 
watch(showCreateModal, (isOpen) => {
  if (isOpen) {
    if (!isOpeningFromTemplate.value) {
      newRule.policy = ''
      newRule.description = ''
      newRule.isActive = true
      validationErrors.value = []
      validationWarnings.value = []
      ruleToEdit.value = null
    }
    isOpeningFromTemplate.value = false
  }
})

watch(showTemplateModal, async (isOpen) => {
  if (isOpen) {
    console.log('[RULES] Template modal opened, fetching templates...', { 
      templatesCount: templates.value.length, 
      isLoading: templatesLoading.value 
    })
    if (templates.value.length === 0 && !templatesLoading.value) {
      await fetchTemplates()
    }
  }
})

const fetchTemplates = async () => {
  console.log('[RULES] fetchTemplates called')
  templatesLoading.value = true
  try {
    const { getAuthHeader } = useAdminAuth()
    const authHeader = getAuthHeader()
    
    console.log('[RULES] Auth header:', authHeader ? 'present' : 'missing')
    
    if (!authHeader) {
      console.warn('[RULES] No auth header, skipping template fetch')
      templatesLoading.value = false
      return
    }
    
    console.log('[RULES] Fetching from /api/policies/templates')
    const response = await fetch('/api/policies/templates', {
      headers: {
        'Authorization': authHeader
      }
    })
    
    console.log('[RULES] Response status:', response.status, response.ok)
    
    if (response.ok) {
      const data = await response.json()
      console.log('[RULES] Templates received:', data.templates?.length || 0)
      templates.value = data.templates || []
    } else {
      const error = await response.json().catch(() => ({ error: response.statusText }))
      console.error('[RULES] Response error:', error)
      throw new Error(error.error || 'Failed to load templates')
    }
  } catch (error: any) {
    console.error('[RULES] Failed to fetch templates:', error)
    toast.error(error.message || 'Failed to load policy templates')
  } finally {
    templatesLoading.value = false
  }
}

const useTemplate = async (template: PolicyTemplate) => {
  showTemplateModal.value = false
  
  await nextTick()
  
  isOpeningFromTemplate.value = true
  newRule.policy = template.policy
  newRule.description = template.title
  newRule.isActive = true
  validationErrors.value = []
  validationWarnings.value = []
  
  showCreateModal.value = true
  
  await nextTick()
  validatePolicy(template.policy)
}

const handleOpenTemplateModal = async () => {
  console.log('[RULES] Template button clicked')
  showTemplateModal.value = true
  if (templates.value.length === 0 && !templatesLoading.value) {
    await fetchTemplates()
  }
}

const groupedTemplates = computed(() => {
  const grouped: Record<string, PolicyTemplate[]> = {}
  templates.value.forEach(template => {
    if (!grouped[template.category]) {
      grouped[template.category] = []
    }
    grouped[template.category].push(template)
  })
  return grouped
})

 
onMounted(async () => {

  permissionsLoading.value = true
  try {
    const permissions = await checkActions([
      { action: 'create_policy', resourceType: 'policies' },
      { action: 'update_policy', resourceType: 'policies' },
      { action: 'delete_policy', resourceType: 'policies' },
      { action: 'patch_policy_status', resourceType: 'policies' },
      { action: 'generate_policy_with_ai', resourceType: 'policies' }
    ])
    
    canCreatePolicy.value = permissions.results.find(r => r.action === 'create_policy')?.allowed || false
    canUpdatePolicy.value = permissions.results.find(r => r.action === 'update_policy')?.allowed || false
    canDeletePolicy.value = permissions.results.find(r => r.action === 'delete_policy')?.allowed || false
    canPatchPolicyStatus.value = permissions.results.find(r => r.action === 'patch_policy_status')?.allowed || false
    canGeneratePolicyWithAI.value = permissions.results.find(r => r.action === 'generate_policy_with_ai')?.allowed || false
  } finally {
    permissionsLoading.value = false
  }
  
  await nextTick()
  

  const route = useRoute()
  if (route.query.create === 'true' && route.query.policy) {
    try {
      const policyText = decodeURIComponent(route.query.policy as string)
      isOpeningFromTemplate.value = true
      newRule.policy = policyText
      newRule.description = 'AI Generated Policy'
      newRule.isActive = true
      validationErrors.value = []
      validationWarnings.value = []
      

      await navigateTo('/rules', { replace: true })
      

      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))
      

      showCreateModal.value = true
      await nextTick()
      validatePolicy(policyText)
    } catch (e: any) {
      console.error('[RULES] Failed to load policy from URL:', e)
      toast.error('Failed to load policy from URL')
    }
  }
  
  if (configStore.isConfigured) {
    await fetchRules()
  }
})

const columns = [
  { key: 'effect', header: 'Effect', class: 'w-24', sortable: true },
  { key: 'description', header: 'Description', sortable: true },
  { key: 'status', header: 'Status', class: 'w-32', sortable: true },
  { key: 'actions', header: '', class: 'w-32' }
]

 
const validatePolicy = async (policyText: string) => {
  if (!policyText.trim()) {
    validationErrors.value = []
    validationWarnings.value = []
    return
  }
  
  isValidating.value = true
  try {
 
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

 
let validationTimer: NodeJS.Timeout | null = null
const debouncedValidate = (policyText: string) => {
  if (validationTimer) {
    clearTimeout(validationTimer)
  }
  
  validationTimer = setTimeout(() => {
    validatePolicy(policyText)
  }, 500)
}

 
const formatPolicyText = async (policyText: string) => {
  if (!policyText.trim()) return policyText
  
  try {
    const result = await formatPolicy(policyText, 4)
    if ('formatted' in result) {
      return result.formatted
    } else {
 
      if (result.errors && result.errors.length > 0) {
        result.errors.forEach((error) => {
          if (error.sourceLocations && error.sourceLocations.length > 0) {
            error.sourceLocations.forEach((location) => {
            })
          }
        })
      }
      return policyText
    }
  } catch (e: any) {
    return policyText
  }
}

 
const onPolicyChange = (value: string) => {
  newRule.policy = value
  debouncedValidate(value)
}

 
const onPolicyBlur = async () => {
  if (newRule.policy.trim()) {
    const formatted = await formatPolicyText(newRule.policy)
    if (formatted !== newRule.policy) {
      newRule.policy = formatted
 
      debouncedValidate(formatted)
    }
  }
}

const handleCreateRule = async () => {

  const check = await checkAction('create_policy', 'policies')
  if (!check.allowed) {
    toast.error('You do not have permission to create policies')
    return
  }
  
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
 
    if (!newRule.isActive) {

      const statusCheck = await checkAction('patch_policy_status', 'policies')
      if (!statusCheck.allowed) {
        toast.error('You do not have permission to change policy status')
        return
      }
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
 
  }
}

const handleEditRule = async (rule: Policy) => {
  ruleToEdit.value = rule
  newRule.description = rule.description
  newRule.isActive = rule.isActive
  validationErrors.value = []
  validationWarnings.value = []
  
 
  try {
    const formatted = await formatPolicyText(rule.policy)
    newRule.policy = formatted
 
    validatePolicy(formatted)
  } catch (e) {
 
    newRule.policy = rule.policy
    validatePolicy(rule.policy)
  }
  
  showEditModal.value = true
}

const handleUpdateRule = async () => {
  if (!ruleToEdit.value) return
  

  const check = await checkAction('update_policy', 'policies')
  if (!check.allowed) {
    toast.error('You do not have permission to update policies')
    return
  }
  
  if (!newRule.policy.trim() || !newRule.description.trim()) {
    toast.warning('Please fill in all fields')
    return
  }
  
  if (validationErrors.value.length > 0) {
    toast.warning('Please fix validation errors before saving')
    return
  }
  
  try {
 
 
    if (newRule.isActive !== ruleToEdit.value.isActive) {

      const statusCheck = await checkAction('patch_policy_status', 'policies')
      if (!statusCheck.allowed) {
        toast.error('You do not have permission to change policy status')
        return
      }
      await setRuleStatus(ruleToEdit.value.policy, newRule.isActive)
    }
 
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

const confirmDelete = async (rule: Policy) => {

  const check = await checkAction('delete_policy', 'policies')
  if (!check.allowed) {
    toast.error('You do not have permission to delete policies')
    return
  }
  
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
 
  }
}

const handleUseAIPolicy = async (policy: string) => {

  const check = await checkAction('generate_policy_with_ai', 'policies')
  if (!check.allowed) {
    toast.error('You do not have permission to generate policies with AI')
    return
  }

}
</script>

<template>
  <div class="space-y-4">
    <!-- Permissions Loading Skeleton -->
    <div v-if="permissionsLoading" class="space-y-4">
      <!-- Toolbar Skeleton -->
      <div class="flex items-center justify-between gap-4">
        <div class="flex-1 flex items-center gap-3">
          <div class="relative flex-1 max-w-md">
            <div class="skeleton-shimmer h-10 rounded-lg" style="width: 100%;"></div>
          </div>
          <div class="skeleton-shimmer h-10 w-32 rounded-lg"></div>
        </div>
        <div class="flex gap-2">
          <div class="skeleton-shimmer h-10 w-24 rounded-lg"></div>
          <div class="skeleton-shimmer h-10 w-32 rounded-lg"></div>
          <div class="skeleton-shimmer h-10 w-28 rounded-lg"></div>
        </div>
      </div>
      <!-- Table Skeleton -->
      <div class="overflow-x-auto rounded-xl border-2 border-[rgb(var(--border))] bg-[rgb(var(--surface))]">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b-2 border-[rgb(var(--border))]">
              <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[rgb(var(--text-muted))]">
                <div class="skeleton-shimmer h-4 w-16 rounded"></div>
              </th>
              <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[rgb(var(--text-muted))]">
                <div class="skeleton-shimmer h-4 w-20 rounded"></div>
              </th>
              <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[rgb(var(--text-muted))]">
                <div class="skeleton-shimmer h-4 w-12 rounded"></div>
              </th>
              <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[rgb(var(--text-muted))]">
                <div class="skeleton-shimmer h-4 w-16 rounded"></div>
              </th>
              <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[rgb(var(--text-muted))]">
                <div class="skeleton-shimmer h-4 w-20 rounded"></div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="i in 5" :key="i" class="border-b border-[rgb(var(--border))]">
              <td class="px-4 py-3">
                <div class="skeleton-shimmer h-4 rounded" :style="{ width: `${60 + Math.random() * 30}%` }"></div>
              </td>
              <td class="px-4 py-3">
                <div class="skeleton-shimmer h-4 rounded" :style="{ width: `${70 + Math.random() * 20}%` }"></div>
              </td>
              <td class="px-4 py-3">
                <div class="skeleton-shimmer h-6 w-16 rounded-full"></div>
              </td>
              <td class="px-4 py-3">
                <div class="skeleton-shimmer h-6 w-20 rounded-full"></div>
              </td>
              <td class="px-4 py-3">
                <div class="skeleton-shimmer h-4 rounded" :style="{ width: `${50 + Math.random() * 20}%` }"></div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Main Content (only show after permissions load) -->
    <template v-else>
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
      <div class="flex gap-2">
        <UiButton variant="outline" @click="handleOpenTemplateModal">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Templates
        </UiButton>
        <UiButton v-if="canGeneratePolicyWithAI" variant="outline" @click="showAIChatModal = true">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          Create with AI
        </UiButton>
        <UiButton v-if="canCreatePolicy" @click="showCreateModal = true">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Create Rule
        </UiButton>
      </div>
    </div>

    <!-- Empty state toolbar (when no rules at all) -->
    <div class="flex items-center justify-end gap-2" v-if="rules.length === 0 && !loading && !searchQuery && !filterEffect">
      <UiButton variant="outline" @click="showTemplateModal = true">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Templates
      </UiButton>
      <UiButton v-if="canGeneratePolicyWithAI" variant="outline" @click="showAIChatModal = true">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
        Create with AI
      </UiButton>
      <UiButton v-if="canCreatePolicy" @click="showCreateModal = true">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Create Rule
      </UiButton>
    </div>

    <!-- Rules Table -->
    <UiTable 
      :columns="columns" 
      :data="rules" 
      :loading="loading" 
      :paginated="true"
      :current-page="currentPage"
      :items-per-page="itemsPerPage"
      :total-items="totalRules"
      :sort-by="sortBy"
      :sort-order="sortOrder"
      :empty-message="searchQuery || filterEffect ? 'No rules match your search criteria.' : 'No rules found. Create your first rule to get started.'"
      @update:current-page="currentPage = $event"
      @update:items-per-page="itemsPerPage = $event"
      @update:sort="handleSort"
    >
      <template #empty-action>
        <UiButton v-if="canCreatePolicy && !searchQuery" @click="showCreateModal = true">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Create Rule
        </UiButton>
        <UiButton v-if="canGeneratePolicyWithAI && !searchQuery" @click="showAIChatModal = true">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          Create with AI
        </UiButton>
      </template>
      <template #effect="{ row }">
        <span :class="row.effect === 'permit' ? 'badge-success' : 'badge-danger'" class="badge">
          {{ row.effect }}
        </span>
      </template>
      
      <template #description="{ row }">
        <div>
          <p class="text-[rgb(var(--text))] font-medium truncate max-w-md">{{ row.description }}</p>
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
            v-if="canUpdatePolicy"
            @click="handleEditRule(row)"
            class="icon-btn text-[rgb(var(--text-muted))] hover:text-indigo-500"
            title="Edit rule"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button 
            v-if="canDeletePolicy"
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
          <div v-if="validationErrors.length > 0" class="mt-2 space-y-1 max-h-40 overflow-y-auto">
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
          <div v-if="validationWarnings.length > 0" class="mt-2 space-y-1 max-h-40 overflow-y-auto">
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

    <!-- Template Selector Modal -->
    <UiModal v-model="showTemplateModal" title="Policy Templates" size="lg">
      <div v-if="templatesLoading" class="flex items-center justify-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
      <div v-else-if="templates.length === 0" class="text-center py-8 text-[rgb(var(--text-muted))]">
        No templates available
      </div>
      <div v-else class="space-y-6 max-h-[70vh] overflow-y-auto">
        <div v-for="(categoryTemplates, category) in groupedTemplates" :key="category" class="space-y-3">
          <h3 class="text-sm font-semibold text-[rgb(var(--text-secondary))] uppercase tracking-wide border-b border-[rgb(var(--border))] pb-2">
            {{ category }}
          </h3>
          <div class="space-y-3">
            <div 
              v-for="template in categoryTemplates" 
              :key="template.id"
              class="p-4 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface-elevated))] hover:border-indigo-400 transition-colors"
            >
              <div class="space-y-3">
                <div>
                  <h4 class="font-semibold text-[rgb(var(--text))] mb-1">{{ template.title }}</h4>
                  <p class="text-sm text-[rgb(var(--text-muted))] mb-3">{{ template.description }}</p>
                </div>
                <div class="p-3 rounded bg-[rgb(var(--surface))] border border-[rgb(var(--border))] max-h-32 overflow-y-auto">
                  <pre class="text-xs text-[rgb(var(--text-muted))] font-mono whitespace-pre-wrap break-words">{{ template.policy }}</pre>
                </div>
                <div class="flex justify-end pt-2 border-t border-[rgb(var(--border))]">
                  <UiButton 
                    v-if="canCreatePolicy"
                    size="sm" 
                    @click="useTemplate(template)"
                  >
                    Use Template
                  </UiButton>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end">
          <UiButton variant="outline" @click="showTemplateModal = false">
            Close
          </UiButton>
        </div>
      </template>
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
          <div v-if="validationErrors.length > 0" class="mt-2 space-y-1 max-h-40 overflow-y-auto">
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
          <div v-if="validationWarnings.length > 0" class="mt-2 space-y-1 max-h-40 overflow-y-auto">
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

      <!-- AI Policy Chat Modal -->
      <AIPolicyChatModal v-model="showAIChatModal" @usePolicy="handleUseAIPolicy" />
    </template>
  </div>
</template>
