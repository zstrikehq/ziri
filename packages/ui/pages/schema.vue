<script setup lang="ts">
import { useSchema } from '~/composables/useSchema'
import { useConfigStore } from '~/stores/config'
import { useCedarWasm } from '~/composables/useCedarWasm'
import { useToast } from '~/composables/useToast'
import { formatDate } from '~/utils/formatters'
import type { ValidationError } from '~/composables/useCedarWasm'
import { useInternalAuth } from '~/composables/useInternalAuth'

const configStore = useConfigStore()
const { getSchema, updateSchema, lastSyncedAt, loading } = useSchema()
const { schemaToJson, schemaToText, validateCedarSchema, validateJsonSchema } = useCedarWasm()
const toast = useToast()
const { checkAction } = useInternalAuth()

const permissionsLoading = ref(true)
const canUpdateSchema = ref(false)

 
const viewMode = ref<'json' | 'cedar'>('cedar')
const isEditing = ref(false)
const isSaving = ref(false)

 
const schemaContent = ref('')
const validationErrors = ref<ValidationError[]>([])
const validationDebounceTimer = ref<NodeJS.Timeout | null>(null)

 
onMounted(async () => {

  permissionsLoading.value = true
  try {
    const check = await checkAction('update_schema', 'schema')
    canUpdateSchema.value = check.allowed
  } finally {
    permissionsLoading.value = false
  }
  
  await nextTick()
  
  if (configStore.isConfigured) {
    try {
      await loadSchema()
    } catch (e) {
 
    }
  }
})

 
const loadSchema = async () => {
  try {
 
    const data = await getSchema(viewMode.value)
    
    if (viewMode.value === 'cedar') {
 
      if (data.schemaCedarText) {
        schemaContent.value = data.schemaCedarText
      } else if (typeof data.schema === 'string') {
        schemaContent.value = data.schema
      } else {
 
        schemaContent.value = await convertJsonToCedar(data.schemaJson || data.schema)
      }
    } else {
 
      if (data.schemaJson) {
        schemaContent.value = JSON.stringify(data.schemaJson, null, 2)
      } else if (typeof data.schema === 'object') {
        schemaContent.value = JSON.stringify(data.schema, null, 2)
      } else {
 
        const jsonSchema = await convertCedarToJson(data.schema)
        schemaContent.value = JSON.stringify(jsonSchema, null, 2)
      }
    }
    
    isEditing.value = false
    validationErrors.value = []
  } catch (e: any) {
    toast.error(`Failed to load schema: ${e.message}`)
  }
}

 
const convertJsonToCedar = async (jsonSchema: any): Promise<string> => {
  try {
    const jsonStr = typeof jsonSchema === 'string' ? jsonSchema : JSON.stringify(jsonSchema)
    const parsed = JSON.parse(jsonStr)
    const result = await schemaToText(parsed)
    
    if ('text' in result) {
      return result.text
    } else {
      throw new Error(result.errors.map(e => e.message).join(', '))
    }
  } catch (e: any) {
    throw e
  }
}

 
const convertCedarToJson = async (cedarText: string): Promise<any> => {
  try {
    const result = await schemaToJson(cedarText)
    
    if ('json' in result) {
      return result.json
    } else {
      throw new Error(result.errors.map(e => e.message).join(', '))
    }
  } catch (e: any) {
    throw e
  }
}

 
const validateSchema = async () => {
  if (!schemaContent.value.trim()) {
    validationErrors.value = []
    return
  }
  
  try {
    if (viewMode.value === 'cedar') {
 
      const result = await validateCedarSchema(schemaContent.value)
      validationErrors.value = result.errors
    } else {
 
      try {
        const parsed = JSON.parse(schemaContent.value)
        const result = await validateJsonSchema(parsed)
        validationErrors.value = result.errors
      } catch (parseError: any) {
        validationErrors.value = [{
          message: `JSON Parse Error: ${parseError.message}`,
          help: null,
          sourceLocations: []
        }]
      }
    }
  } catch (e: any) {
    validationErrors.value = [{
      message: e.message || 'Validation failed',
      help: null,
      sourceLocations: []
    }]
  }
}

 
const debouncedValidate = () => {
  if (validationDebounceTimer.value) {
    clearTimeout(validationDebounceTimer.value)
  }
  
  validationDebounceTimer.value = setTimeout(() => {
    validateSchema()
  }, 500)
}

 
const onSchemaChange = (value: string) => {
  schemaContent.value = value
  debouncedValidate()
}

 
const onModeSwitch = async (newMode: 'json' | 'cedar') => {
  if (isEditing.value && schemaContent.value.trim()) {
 
    try {
      if (viewMode.value === 'cedar' && newMode === 'json') {
 
        const jsonSchema = await convertCedarToJson(schemaContent.value)
        schemaContent.value = JSON.stringify(jsonSchema, null, 2)
      } else if (viewMode.value === 'json' && newMode === 'cedar') {
 
        const parsed = JSON.parse(schemaContent.value)
        schemaContent.value = await convertJsonToCedar(parsed)
      }
      
      viewMode.value = newMode
      await validateSchema()
    } catch (e: any) {
      toast.error(`Failed to convert schema: ${e.message}`)
      return
    }
  } else {
 
    viewMode.value = newMode
    await loadSchema()
  }
}

 
const handleSave = async () => {

  const check = await checkAction('update_schema', 'schema')
  if (!check.allowed) {
    toast.error('You do not have permission to update the schema')
    return
  }
  
  if (validationErrors.value.length > 0) {
    toast.warning('Please fix validation errors before saving')
    return
  }
  
  isSaving.value = true
  try {
    let cedarTextToSave: string
    
    if (viewMode.value === 'cedar') {
 
      cedarTextToSave = schemaContent.value
      
 
      const validationResult = await validateCedarSchema(cedarTextToSave)
      if (!validationResult.valid) {
        validationErrors.value = validationResult.errors
        toast.warning('Please fix validation errors before saving')
        return
      }
      
 
      await updateSchema(cedarTextToSave, 'cedar')
    } else {
 
      const parsed = JSON.parse(schemaContent.value)
      
 
      const validationResult = await validateJsonSchema(parsed)
      if (!validationResult.valid) {
        validationErrors.value = validationResult.errors
        toast.warning('Please fix validation errors before saving')
        return
      }
      
 
      cedarTextToSave = await convertJsonToCedar(parsed)
      await updateSchema(cedarTextToSave, 'cedar')
    }
    
 
 
    await loadSchema()
    
    isEditing.value = false
    toast.success('Schema saved successfully')
  } catch (e: any) {
    toast.error(`Failed to save schema: ${e.message}`)
  } finally {
    isSaving.value = false
  }
}

 
const handleCancel = async () => {
  isEditing.value = false
  validationErrors.value = []
  await loadSchema()
}

 
const startEditing = async () => {

  const check = await checkAction('update_schema', 'schema')
  if (!check.allowed) {
    toast.error('You do not have permission to edit the schema')
    return
  }
  
  isEditing.value = true
  validationErrors.value = []
}

const displayLastSynced = computed(() => lastSyncedAt.value || new Date())
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- Permissions Loading Skeleton -->
    <div v-if="permissionsLoading" class="h-full flex flex-col">
      <!-- Toolbar Skeleton -->
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-3">
          <div class="skeleton-shimmer h-6 w-12 rounded-full"></div>
          <div class="skeleton-shimmer h-4 w-32 rounded"></div>
        </div>
        <div class="flex items-center gap-2">
          <div class="skeleton-shimmer h-9 w-20 rounded-lg"></div>
          <div class="skeleton-shimmer h-9 w-20 rounded-lg"></div>
          <div class="skeleton-shimmer h-9 w-16 rounded-lg"></div>
          <div class="skeleton-shimmer h-9 w-16 rounded-lg"></div>
          <div class="skeleton-shimmer h-9 w-10 rounded-lg"></div>
        </div>
      </div>
      
      <!-- Editor Skeleton -->
      <div class="flex-1 card">
        <div class="skeleton-shimmer h-full w-full rounded-lg" style="min-height: 400px;"></div>
      </div>
    </div>

    <!-- Main Content (only show after permissions load) -->
    <template v-else>
      <!-- Toolbar -->
      <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-3">
        <span class="badge badge-neutral">v1.0</span>
        <span class="text-xs text-[rgb(var(--text-muted))]">
          Synced: {{ formatDate(displayLastSynced) }}
        </span>
        <span v-if="validationErrors.length > 0" class="badge badge-danger">
          {{ validationErrors.length }} error(s)
        </span>
        <span v-else-if="isEditing && schemaContent.trim()" class="badge badge-success">
          Valid
        </span>
      </div>
      <div class="flex items-center gap-2">
        <div class="flex items-center gap-1 rounded-lg border-2 border-[rgb(var(--border))] p-1">
          <button
            @click="onModeSwitch('json')"
            :class="[
              'px-3 py-1 rounded text-xs font-medium transition-all',
              viewMode === 'json'
                ? 'bg-indigo-500 text-white'
                : 'text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text))]'
            ]"
          >
            JSON
          </button>
          <button
            @click="onModeSwitch('cedar')"
            :class="[
              'px-3 py-1 rounded text-xs font-medium transition-all',
              viewMode === 'cedar'
                ? 'bg-indigo-500 text-white'
                : 'text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text))]'
            ]"
          >
            Cedar
          </button>
        </div>
        
        <template v-if="!isEditing">
          <UiButton size="sm" variant="outline" :loading="loading" @click="loadSchema">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </UiButton>
          <!-- <UiButton v-if="canUpdateSchema" size="sm" @click="startEditing">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </UiButton> -->
        </template>
        
        <template v-else>
          <UiButton size="sm" variant="outline" @click="handleCancel" :disabled="isSaving">
            Cancel
          </UiButton>
          <UiButton 
            size="sm" 
            @click="handleSave"
            :disabled="!canUpdateSchema || validationErrors.length > 0" 
            :loading="isSaving"
          >
            Save
          </UiButton>
        </template>
        
        <UiCopyButton :text="schemaContent" />
      </div>
    </div>
    
    <!-- Validation Errors -->
    <div v-if="validationErrors.length > 0 && isEditing" class="mb-4 space-y-2">
      <div 
        v-for="(error, idx) in validationErrors" 
        :key="idx"
        class="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800"
      >
        <div class="flex items-start gap-2">
          <svg class="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div class="flex-1">
            <p class="text-sm font-medium text-red-700 dark:text-red-300">
              {{ error.message }}
            </p>
            <p v-if="error.help" class="text-xs text-red-600 dark:text-red-400 mt-1">
              {{ error.help }}
            </p>
            <p v-if="error.sourceLocations && error.sourceLocations.length > 0" class="text-xs text-red-600 dark:text-red-400 mt-1">
              Position: {{ error.sourceLocations[0].start }}-{{ error.sourceLocations[0].end }}
            </p>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Schema Editor -->
    <div class="flex-1 min-h-0 card p-0 overflow-hidden">
      <div v-if="loading && !isEditing" class="p-6">
        <UiLoadingSkeleton :lines="15" height="h-5" />
      </div>
      <textarea 
        v-else
        :value="schemaContent" 
        @input="onSchemaChange(($event.target as HTMLTextAreaElement).value)"
        @blur="validateSchema"
        :readonly="!isEditing"
        :class="[
          'w-full h-full p-5 font-mono text-xs bg-transparent text-[rgb(var(--text))] border-0 resize-none focus:outline-none leading-relaxed',
          !isEditing && 'cursor-default',
          isEditing && validationErrors.length > 0 && 'ring-2 ring-red-500'
        ]"
        spellcheck="false"
        placeholder="Loading schema..."
      />
      </div>
    </template>
  </div>
</template>
