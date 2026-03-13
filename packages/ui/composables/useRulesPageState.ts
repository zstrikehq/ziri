import type * as Monaco from 'monaco-editor'
import { useAdminAuth } from '~/composables/useAdminAuth'
import { extractApiErrorMessage, useApiError } from '~/composables/useApiError'
import { useCedarWasm, type ValidationError } from '~/composables/useCedarWasm'
import { useDebounce } from '~/composables/useDebounce'
import { useInternalAuth } from '~/composables/useInternalAuth'
import { useRules } from '~/composables/useRules'
import { useSchema } from '~/composables/useSchema'
import { useToast } from '~/composables/useToast'
import { useConfigStore } from '~/stores/config'
import type { CreatePolicyInput, Policy } from '~/types/cedar'
import { formatPolicyWithId, parsePolicyId, stripPolicyId } from '~/utils/cedar'

interface PolicyTemplate {
  id: string
  category: string
  title: string
  description: string
  policy: string
}

type RuleFormState = CreatePolicyInput & {
  isActive: boolean
  policyId: string
}

function normalizePolicyIntoForm(newRule: RuleFormState, policyText: string, description: string): string {
  const parsedId = parsePolicyId(policyText)
  newRule.policyId = parsedId ?? ''
  newRule.policy = parsedId ? stripPolicyId(policyText) : policyText
  newRule.description = description
  newRule.isActive = true
  return parsedId ? formatPolicyWithId(parsedId, newRule.policy) : policyText
}

export function useRulesPageState() {
  const configStore = useConfigStore()
  const route = useRoute()
  const { listRules, createRule, updateRule, deleteRule, setRuleStatus, rules, loading } = useRules()
  const { getSchema } = useSchema()
  const { validatePolicies, formatPolicy } = useCedarWasm()
  const toast = useToast()
  const { checkActions, checkAction } = useInternalAuth()
  const { getUserMessage } = useApiError()

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

  const templates = ref<PolicyTemplate[]>([])
  const templatesLoading = ref(false)

  const searchQuery = ref('')
  const filterEffect = ref<'' | 'permit' | 'forbid'>('')

  const currentPage = ref(1)
  const itemsPerPage = ref(20)
  const totalRules = ref(0)

  const sortBy = ref<string | null>(null)
  const sortOrder = ref<'asc' | 'desc' | null>(null)

  const newRule = reactive<RuleFormState>({
    policy: '',
    description: '',
    isActive: true,
    policyId: ''
  })

  const validationErrors = ref<ValidationError[]>([])
  const validationWarnings = ref<ValidationError[]>([])
  const isValidating = ref(false)
  const debouncedSearchQuery = useDebounce(searchQuery, 300)

  const monacoEditor = useMonacoEditor()
  const policyEditorInstance = shallowRef<Monaco.editor.IStandaloneCodeEditor | null>(null)
  const policyCursorPos = ref({ line: 1, column: 1 })

  const columns = [
    { key: 'effect', header: 'Effect', class: 'w-24', sortable: true },
    { key: 'description', header: 'Description', sortable: true },
    { key: 'status', header: 'Status', class: 'w-32', sortable: true },
    { key: 'actions', header: '', class: 'w-32' }
  ]

  const resetRuleForm = () => {
    newRule.policy = ''
    newRule.description = ''
    newRule.policyId = ''
    newRule.isActive = true
    validationErrors.value = []
    validationWarnings.value = []
  }

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
    } catch {
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
    if (!isOpen) return
    if (!isOpeningFromTemplate.value) {
      resetRuleForm()
      ruleToEdit.value = null
    }
    isOpeningFromTemplate.value = false
  })

  watch(showTemplateModal, async (isOpen) => {
    if (isOpen && templates.value.length === 0 && !templatesLoading.value) {
      await fetchTemplates()
    }
  })

  const fetchTemplates = async () => {
    templatesLoading.value = true
    try {
      const { getAuthHeader } = useAdminAuth()
      const authHeader = getAuthHeader()
      if (!authHeader) return

      const response = await fetch('/api/policies/templates', {
        headers: { Authorization: authHeader }
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: response.statusText }))
        throw new Error(extractApiErrorMessage({ data: error }, 'Failed to load templates'))
      }

      const data = await response.json()
      templates.value = data.templates || []
    } catch (error: any) {
      toast.error(getUserMessage(error))
    } finally {
      templatesLoading.value = false
    }
  }

  const useTemplate = async (template: PolicyTemplate) => {
    showTemplateModal.value = false
    await nextTick()

    isOpeningFromTemplate.value = true
    const fullPolicy = normalizePolicyIntoForm(newRule, template.policy, template.title)
    validationErrors.value = []
    validationWarnings.value = []

    showCreateModal.value = true
    await nextTick()
    validatePolicy(fullPolicy)
  }

  const handleOpenTemplateModal = async () => {
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

  const loadPermissions = async () => {
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
  }

  const openAiGeneratedPolicyFromQuery = async () => {
    if (route.query.create !== 'true' || !route.query.policy) return

    try {
      const policyText = decodeURIComponent(route.query.policy as string)
      isOpeningFromTemplate.value = true
      const fullPolicy = normalizePolicyIntoForm(newRule, policyText, 'AI Generated Policy')
      validationErrors.value = []
      validationWarnings.value = []

      await navigateTo('/rules', { replace: true })
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      showCreateModal.value = true
      await nextTick()
      validatePolicy(fullPolicy)
    } catch (error: any) {
      toast.error(getUserMessage(error))
    }
  }

  onMounted(async () => {
    await loadPermissions()
    await nextTick()
    await openAiGeneratedPolicyFromQuery()
    if (configStore.isConfigured) {
      await fetchRules()
    }
  })

  const setPolicyMarkers = async (errors: ValidationError[]) => {
    const editor = policyEditorInstance.value
    if (!editor) return
    const model = editor.getModel()
    if (!model || model.isDisposed()) return

    const markers: Monaco.editor.IMarkerData[] = errors.map((err) => {
      if (err.sourceLocations && err.sourceLocations.length > 0) {
        const loc = err.sourceLocations[0]
        const startPos = model.getPositionAt(loc.start)
        const endPos = model.getPositionAt(loc.end)
        return {
          severity: 8,
          message: err.message + (err.help ? `\n${err.help}` : ''),
          startLineNumber: startPos.lineNumber,
          startColumn: startPos.column,
          endLineNumber: endPos.lineNumber,
          endColumn: endPos.column,
        }
      }
      return {
        severity: 8,
        message: err.message + (err.help ? `\n${err.help}` : ''),
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: 1,
        endColumn: model.getLineMaxColumn(1),
      }
    })

    await monacoEditor.setEditorMarker(model, markers)
  }

  const validatePolicy = async (policyText: string) => {
    if (!policyText.trim()) {
      validationErrors.value = []
      validationWarnings.value = []
      await setPolicyMarkers([])
      return
    }

    isValidating.value = true
    try {
      const schemaData = await getSchema('json')
      const schema = schemaData.schemaJson || schemaData.schema
      const result = await validatePolicies(policyText, schema)
      validationErrors.value = result.errors
      validationWarnings.value = result.warnings
    } catch (error: any) {
      validationErrors.value = [{
        message: `Validation failed: ${error.message}`,
        help: null,
        sourceLocations: []
      }]
      validationWarnings.value = []
    } finally {
      isValidating.value = false
    }

    await setPolicyMarkers(validationErrors.value)
  }

  let validationTimer: ReturnType<typeof setTimeout> | null = null
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
      }
      return policyText
    } catch {
      return policyText
    }
  }

  const onPolicyEditorLoad = (editor: Monaco.editor.IStandaloneCodeEditor) => {
    policyEditorInstance.value = editor
    monacoEditor.setTheme()

    editor.onDidChangeCursorPosition(({ position }) => {
      policyCursorPos.value = { line: position.lineNumber, column: position.column }
    })

    if (newRule.policy.trim()) {
      validatePolicy(newRule.policy)
    }

    editor.onDidChangeModelContent(() => {
      const value = editor.getValue()
      newRule.policy = value
      debouncedValidate(value)
    })
  }

  const onPolicyMarkerChanges = async (editor: Monaco.editor.IStandaloneCodeEditor) => {
    const monaco = await useMonaco()
    const model = editor.getModel()
    if (!monaco || !model) return

    monaco.editor.onDidChangeMarkers((uris: Monaco.Uri[]) => {
      if (uris.some((uri: Monaco.Uri) => uri.toString() === model.uri.toString())) {
      }
    })
  }

  const handleCreateRule = async () => {
    const check = await checkAction('create_policy', 'policies')
    if (!check.allowed) {
      toast.error('You do not have permission to create policies')
      return
    }

    if (!newRule.policyId.trim()) {
      toast.warning('Policy ID is required')
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

    const fullPolicy = formatPolicyWithId(newRule.policyId.trim(), newRule.policy)

    try {
      await createRule({ policy: fullPolicy, description: newRule.description })
      if (!newRule.isActive) {
        const statusCheck = await checkAction('patch_policy_status', 'policies')
        if (!statusCheck.allowed) {
          toast.error('You do not have permission to change policy status')
          return
        }
        await setRuleStatus(fullPolicy, false)
      }
      showCreateModal.value = false
      resetRuleForm()
      currentPage.value = 1
      await fetchRules()
    } catch {
    }
  }

  const handleEditRule = async (rule: Policy) => {
    ruleToEdit.value = rule
    newRule.description = rule.description
    newRule.isActive = rule.isActive
    validationErrors.value = []
    validationWarnings.value = []

    const parsedId = parsePolicyId(rule.policy)
    newRule.policyId = parsedId ?? ''
    const body = parsedId ? stripPolicyId(rule.policy) : rule.policy

    try {
      const formatted = await formatPolicyText(body)
      newRule.policy = formatted
      validatePolicy(parsedId ? formatPolicyWithId(parsedId, formatted) : formatted)
    } catch {
      newRule.policy = body
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

    if (!newRule.policyId.trim()) {
      toast.warning('Policy ID is required')
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

    const fullPolicy = formatPolicyWithId(newRule.policyId.trim(), newRule.policy)

    try {
      if (newRule.isActive !== ruleToEdit.value.isActive) {
        const statusCheck = await checkAction('patch_policy_status', 'policies')
        if (!statusCheck.allowed) {
          toast.error('You do not have permission to change policy status')
          return
        }
        await setRuleStatus(ruleToEdit.value.policy, newRule.isActive)
      }

      if (ruleToEdit.value.policy !== fullPolicy || ruleToEdit.value.description !== newRule.description) {
        await updateRule(ruleToEdit.value.policy, { policy: fullPolicy, description: newRule.description })
      }

      showEditModal.value = false
      ruleToEdit.value = null
      resetRuleForm()
    } catch {
    }
  }

  const handleCancelCreate = () => {
    showCreateModal.value = false
    resetRuleForm()
  }

  const handleCancelEdit = () => {
    showEditModal.value = false
    ruleToEdit.value = null
    resetRuleForm()
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
      await fetchRules()
      const total = totalRules.value || 0
      const maxIndex = (currentPage.value - 1) * itemsPerPage.value
      if (currentPage.value > 1 && maxIndex >= total) {
        currentPage.value = currentPage.value - 1
      }
    } catch {
    }
  }

  const formatValidationMessage = (message: string) => getUserMessage({ message })

  return {
    permissionsLoading,
    canCreatePolicy,
    canUpdatePolicy,
    canDeletePolicy,
    canPatchPolicyStatus,
    canGeneratePolicyWithAI,
    showCreateModal,
    showEditModal,
    showDeleteModal,
    showTemplateModal,
    showAIChatModal,
    templates,
    templatesLoading,
    searchQuery,
    filterEffect,
    currentPage,
    itemsPerPage,
    totalRules,
    sortBy,
    sortOrder,
    newRule,
    validationErrors,
    validationWarnings,
    isValidating,
    groupedTemplates,
    rules,
    loading,
    columns,
    policyCursorPos,
    monacoEditor,
    fetchRules,
    handleSort,
    useTemplate,
    handleOpenTemplateModal,
    onPolicyEditorLoad,
    onPolicyMarkerChanges,
    handleCreateRule,
    handleEditRule,
    handleUpdateRule,
    handleCancelCreate,
    handleCancelEdit,
    confirmDelete,
    handleDeleteRule,
    formatValidationMessage
  }
}
