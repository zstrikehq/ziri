<script setup lang="ts">
import { useSchema } from '~/composables/useSchema'
import { useConfigStore } from '~/stores/config'
import { useCedarWasm } from '~/composables/useCedarWasm'
import { useToast } from '~/composables/useToast'
import { formatDate } from '~/utils/formatters'
import type { ValidationError } from '~/composables/useCedarWasm'

const configStore = useConfigStore()
const { getSchema, updateSchema, lastSyncedAt, loading } = useSchema()
const { schemaToJson, schemaToText, validateCedarSchema, validateJsonSchema } = useCedarWasm()
const toast = useToast()

// View/Edit mode: 'json' or 'cedar'
const viewMode = ref<'json' | 'cedar'>('cedar')
const isEditing = ref(false)
const isSaving = ref(false)

// Schema content (editable)
const schemaContent = ref('')
const validationErrors = ref<ValidationError[]>([])
const validationDebounceTimer = ref<NodeJS.Timeout | null>(null)

// Auto-load schema when page mounts (if config is set)
onMounted(async () => {
  await nextTick()
  
  if (configStore.isConfigured) {
    try {
      await loadSchema()
    } catch (e) {
      // Error handled by composable
    }
  }
})

/**
 * Load schema in the current view mode
 */
const loadSchema = async () => {
  try {
    // Always request the format we need
    const data = await getSchema(viewMode.value)
    
    if (viewMode.value === 'cedar') {
      // Load Cedar text - prefer schemaCedarText or schema if it's a string
      if (data.schemaCedarText) {
        schemaContent.value = data.schemaCedarText
      } else if (typeof data.schema === 'string') {
        schemaContent.value = data.schema
      } else {
        // Convert JSON to Cedar if we only have JSON
        schemaContent.value = await convertJsonToCedar(data.schemaJson || data.schema)
      }
    } else {
      // Load JSON - prefer schemaJson or schema if it's an object
      if (data.schemaJson) {
        schemaContent.value = JSON.stringify(data.schemaJson, null, 2)
      } else if (typeof data.schema === 'object') {
        schemaContent.value = JSON.stringify(data.schema, null, 2)
      } else {
        // Convert Cedar to JSON if we only have Cedar text
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

/**
 * Convert JSON to Cedar text
 */
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

/**
 * Convert Cedar text to JSON
 */
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

/**
 * Validate schema on blur/focus change
 */
const validateSchema = async () => {
  if (!schemaContent.value.trim()) {
    validationErrors.value = []
    return
  }
  
  try {
    if (viewMode.value === 'cedar') {
      // Validate Cedar text
      const result = await validateCedarSchema(schemaContent.value)
      validationErrors.value = result.errors
    } else {
      // Validate JSON
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

/**
 * Debounced validation
 */
const debouncedValidate = () => {
  if (validationDebounceTimer.value) {
    clearTimeout(validationDebounceTimer.value)
  }
  
  validationDebounceTimer.value = setTimeout(() => {
    validateSchema()
  }, 500)
}

/**
 * Handle schema content change
 */
const onSchemaChange = (value: string) => {
  schemaContent.value = value
  debouncedValidate()
}

/**
 * Handle mode switch
 */
const onModeSwitch = async (newMode: 'json' | 'cedar') => {
  if (isEditing.value && schemaContent.value.trim()) {
    // Convert current content to new format
    try {
      if (viewMode.value === 'cedar' && newMode === 'json') {
        // Cedar -> JSON
        const jsonSchema = await convertCedarToJson(schemaContent.value)
        schemaContent.value = JSON.stringify(jsonSchema, null, 2)
      } else if (viewMode.value === 'json' && newMode === 'cedar') {
        // JSON -> Cedar
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
    // Just switch mode and reload
    viewMode.value = newMode
    await loadSchema()
  }
}

/**
 * Save schema
 */
const handleSave = async () => {
  if (validationErrors.value.length > 0) {
    toast.warning('Please fix validation errors before saving')
    return
  }
  
  isSaving.value = true
  try {
    let cedarTextToSave: string
    
    if (viewMode.value === 'cedar') {
      // Currently in Cedar mode - validate and save Cedar text directly
      cedarTextToSave = schemaContent.value
      
      // Validate Cedar text before saving
      const validationResult = await validateCedarSchema(cedarTextToSave)
      if (!validationResult.valid) {
        validationErrors.value = validationResult.errors
        toast.warning('Please fix validation errors before saving')
        return
      }
      
      // Save as Cedar text (backend stores as Cedar text)
      await updateSchema(cedarTextToSave, 'cedar')
    } else {
      // Currently in JSON mode - parse, validate, and convert to Cedar for storage
      const parsed = JSON.parse(schemaContent.value)
      
      // Validate JSON schema
      const validationResult = await validateJsonSchema(parsed)
      if (!validationResult.valid) {
        validationErrors.value = validationResult.errors
        toast.warning('Please fix validation errors before saving')
        return
      }
      
      // Convert to Cedar text for storage (backend stores as Cedar text)
      cedarTextToSave = await convertJsonToCedar(parsed)
      await updateSchema(cedarTextToSave, 'cedar')
    }
    
    // Reload schema in current view mode to reflect changes
    // This ensures both formats are updated in the UI
    await loadSchema()
    
    isEditing.value = false
    toast.success('Schema saved successfully')
  } catch (e: any) {
    toast.error(`Failed to save schema: ${e.message}`)
  } finally {
    isSaving.value = false
  }
}

/**
 * Cancel editing
 */
const handleCancel = async () => {
  isEditing.value = false
  validationErrors.value = []
  await loadSchema()
}

/**
 * Start editing
 */
const startEditing = () => {
  isEditing.value = true
  validationErrors.value = []
}

const displayLastSynced = computed(() => lastSyncedAt.value || new Date())
</script>

<template>
  <div class="h-full flex flex-col">
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
          <!-- <UiButton size="sm" @click="startEditing">
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
            :loading="isSaving"
            :disabled="validationErrors.length > 0"
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
  </div>
</template>
