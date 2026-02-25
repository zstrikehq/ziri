<script setup lang="ts">
import { useSchema } from '~/composables/useSchema'
import { useConfigStore } from '~/stores/config'
import { useCedarWasm } from '~/composables/useCedarWasm'
import { useToast } from '~/composables/useToast'
import { useApiError } from '~/composables/useApiError'
import { formatDate } from '~/utils/formatters'
import type { ValidationError } from '~/composables/useCedarWasm'
import { useInternalAuth } from '~/composables/useInternalAuth'
import { parseSchemaJson } from '~/utils/schema-explorer'
import type { NormalizedSchema } from '~/utils/schema-explorer'
import type * as Monaco from 'monaco-editor'

const monacoEditor = useMonacoEditor();
const configStore = useConfigStore()
const { getSchema, updateSchema, lastSyncedAt, loading, schema: schemaFromStore } = useSchema()
const { schemaToJson, schemaToText, validateCedarSchema, validateJsonSchema } = useCedarWasm()
const toast = useToast()
const { checkAction } = useInternalAuth()
const { getUserMessage } = useApiError()

const permissionsLoading = ref(true)
const canUpdateSchema = ref(false)


const activeTab = ref<'simplified' | 'json' | 'cedar'>('simplified')


const viewMode = computed<'json' | 'cedar'>(() => {
  return activeTab.value === 'json' ? 'json' : 'cedar'
})
const isEditing = ref(false)
const isSaving = ref(false)

const schemaContent = ref('')
const validationErrors = ref<ValidationError[]>([])
const validationDebounceTimer = ref<NodeJS.Timeout | null>(null)


const normalizedSchema = ref<NormalizedSchema | null>(null)
const simplifiedError = ref<string | null>(null)


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


    await buildSimplifiedModel(data.schemaJson || (typeof data.schema === 'object' ? data.schema : null))
  } catch (e: any) {
    toast.error(getUserMessage(e))
  }
}

const buildSimplifiedModel = async (schemaJsonFromApi?: any) => {
  simplifiedError.value = null
  try {
    let jsonObj: any

    if (schemaJsonFromApi != null && typeof schemaJsonFromApi === 'object') {
      jsonObj = schemaJsonFromApi
    } else if (activeTab.value === 'json' && schemaContent.value.trim()) {
      jsonObj = JSON.parse(schemaContent.value)
    } else if (schemaContent.value.trim()) {

      const result = await schemaToJson(schemaContent.value)
      if ('json' in result) {
        normalizedSchema.value = parseSchemaJson(result.json)
      } else {
        simplifiedError.value = result.errors.map((e: any) => e.message).join(', ')
        normalizedSchema.value = null
      }
      return
    } else {
      normalizedSchema.value = parseSchemaJson({})
      return
    }

    normalizedSchema.value = parseSchemaJson(jsonObj)
  } catch (e: any) {
    simplifiedError.value = e.message || 'Failed to build simplified view'
    normalizedSchema.value = null
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
    await setMarkersFromErrors([])
    return
  }
  
  try {
    if (activeTab.value === 'cedar') {
      const result = await validateCedarSchema(schemaContent.value)
      validationErrors.value = result.errors
    } else if (activeTab.value === 'json') {
      let parsed: any
      try {
        parsed = JSON.parse(schemaContent.value)
      } catch (parseError: any) {
        const posMatch = parseError.message.match(/position\s+(\d+)/i)
        const sourceLocations = posMatch
          ? [{ start: parseInt(posMatch[1]), end: parseInt(posMatch[1]) + 1 }]
          : []

        validationErrors.value = [{
          message: `JSON Parse Error: ${parseError.message}`,
          help: null,
          sourceLocations
        }]
        await setMarkersFromErrors(validationErrors.value)
        return
      }

      try {
        const result = await Promise.race([
          validateJsonSchema(parsed),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Schema validation timed out')), 5000)
          )
        ])
        validationErrors.value = result.errors
      } catch (wasmError: any) {
        validationErrors.value = [{
          message: wasmError.message || 'JSON schema validation failed',
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

  await setMarkersFromErrors(validationErrors.value)
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


const onTabSwitch = async (newTab: 'simplified' | 'json' | 'cedar') => {
  if (newTab === 'simplified') {

    activeTab.value = newTab
    if (!normalizedSchema.value) {
      await buildSimplifiedModel(schemaFromStore.value)
    }
  } else {

    if (isEditing.value && schemaContent.value.trim() && activeTab.value !== 'simplified') {
      try {
        const currentMode = activeTab.value === 'json' ? 'json' : 'cedar'
        if (currentMode === 'cedar' && newTab === 'json') {
          const jsonSchema = await convertCedarToJson(schemaContent.value)
          schemaContent.value = JSON.stringify(jsonSchema, null, 2)
        } else if (currentMode === 'json' && newTab === 'cedar') {
          const parsed = JSON.parse(schemaContent.value)
          schemaContent.value = await convertJsonToCedar(parsed)
        }
        
        activeTab.value = newTab
        await validateSchema()
      } catch (e: any) {
        toast.error(getUserMessage(e))
        return
      }
    } else {
      activeTab.value = newTab
      await loadSchema()
    }
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
    
    if (activeTab.value === 'cedar') {
      cedarTextToSave = schemaContent.value
      
      const validationResult = await validateCedarSchema(cedarTextToSave)
      if (!validationResult.valid) {
        validationErrors.value = validationResult.errors
        toast.warning('Please fix validation errors before saving')
        return
      }
      
      await updateSchema(cedarTextToSave, 'cedar')
    } else if (activeTab.value === 'json') {
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
    toast.error(getUserMessage(e))
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
const hasEditorErrors = computed(() => validationErrors.value.length > 0)
const editorLang = computed(() => {
  return activeTab.value === 'cedar' ? 'cedar-schema' : 'custom-json'
})


const editorInstance = ref<Monaco.editor.IStandaloneCodeEditor | null>(null)

const schemaEditor = ref({
    cursorPos: {
        line: 1,
        column: 1
    },
    hasError: false,
    schemaConversionError: [] as string[]
});

const cursorPositionDisplay = computed(() => {
  return `${schemaEditor.value.cursorPos.line}:${schemaEditor.value.cursorPos.column}`
})

const setMarkersFromErrors = async (errors: ValidationError[]) => {
    const editor = editorInstance.value
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

const onEditorMounted = (editor: Monaco.editor.IStandaloneCodeEditor) => {
    editorInstance.value = editor
    monacoEditor.setTheme();
    editor.onDidChangeCursorPosition(({ position }) => {
        schemaEditor.value.cursorPos = { line: position.lineNumber, column: position.column };
    });
}

const onSchemaContentChanged = async (editor: Monaco.editor.IStandaloneCodeEditor) => {
    const model = editor.getModel();
    if (model) {
        if (!model.isDisposed()) {
            await validateSchema();
            editor.onDidChangeModelContent(() => {
                debouncedValidate();
            });
        }
    }
}

const monitorSchemaMarkerChanges = async (editor: Monaco.editor.IStandaloneCodeEditor) => {
    const monaco = await useMonaco();
    const model = editor.getModel();
    if (monaco && model) {
        monaco.editor.onDidChangeMarkers((uris: readonly Monaco.Uri[]) => {
            if (uris.some((uri: Monaco.Uri) => uri.toString() === model.uri.toString())) {
                const markers = monaco.editor.getModelMarkers({ resource: model.uri });
                schemaEditor.value.hasError = markers.length > 0;
            }
        });
    }
}

const formatValidationMessage = (message: string) => {
  return getUserMessage({ message })
}


watch(activeTab, async (tab) => {
  if (tab === 'simplified' && !normalizedSchema.value) {
    await buildSimplifiedModel(schemaFromStore.value)
  } else if (tab !== 'simplified' && !schemaContent.value) {
    await loadSchema()
  }
})
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- Permissions Loading Skeleton -->
    <div v-if="permissionsLoading" class="h-full flex flex-col">
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
      <div class="flex-1 card">
        <div class="skeleton-shimmer h-full w-full rounded-lg" style="min-height: 400px;"></div>
      </div>
    </div>

    <!-- Main Content -->
    <template v-else>
      <!-- Toolbar -->
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-3">
          <!-- Simplified | JSON | Cedar tab switcher -->
          <div class="flex items-center gap-1 rounded-lg border-2 border-[rgb(var(--border))] p-1">
            <button
              @click="onTabSwitch('simplified')"
              :class="[
                'px-3 py-1 rounded text-xs font-medium transition-all',
                activeTab === 'simplified'
                  ? 'bg-indigo-500 text-white'
                  : 'text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text))]'
              ]"
            >
              Simplified
            </button>
            <button
              @click="onTabSwitch('json')"
              :class="[
                'px-3 py-1 rounded text-xs font-medium transition-all',
                activeTab === 'json'
                  ? 'bg-indigo-500 text-white'
                  : 'text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text))]'
              ]"
            >
              JSON
            </button>
            <button
              @click="onTabSwitch('cedar')"
              :class="[
                'px-3 py-1 rounded text-xs font-medium transition-all',
                activeTab === 'cedar'
                  ? 'bg-indigo-500 text-white'
                  : 'text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text))]'
              ]"
            >
              Cedar
            </button>
          </div>

          <span class="badge badge-neutral">v1.0</span>
          <span class="text-xs text-[rgb(var(--text-muted))]">
            Synced: {{ formatDate(displayLastSynced) }}
          </span>
          <span v-if="(activeTab === 'json' || activeTab === 'cedar') && (schemaEditor.hasError || validationErrors.length > 0)" class="badge badge-danger">
            {{ validationErrors.length }} error(s)
          </span>
          <span v-else-if="(activeTab === 'json' || activeTab === 'cedar') && isEditing && schemaContent.trim()" class="badge badge-success">
            Valid
          </span>
        </div>

        <div class="flex items-center gap-2">
          <!-- Editor controls for JSON/Cedar tabs -->
          <template v-if="activeTab === 'json' || activeTab === 'cedar'">
            <template v-if="!isEditing">
              <UiButton size="sm" variant="outline" :loading="loading" @click="loadSchema">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </UiButton>
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
          </template>

          <!-- Simplified tab: only refresh -->
          <template v-if="activeTab === 'simplified'">
            <UiButton size="sm" variant="outline" :loading="loading" @click="loadSchema">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </UiButton>
          </template>
        </div>
      </div>
      
      <!-- ── SIMPLIFIED TAB ──────────────────────────────────────────────── -->
      <template v-if="activeTab === 'simplified'">
        <!-- Loading -->
        <div v-if="loading" class="flex-1 min-h-0 card overflow-hidden p-6">
          <UiLoadingSkeleton :lines="15" height="h-5" />
        </div>

        <!-- Error state -->
        <div v-else-if="simplifiedError" class="flex-1 min-h-0 card overflow-hidden p-6">
          <div class="flex flex-col items-center justify-center h-full gap-3">
            <svg class="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p class="text-sm text-[rgb(var(--text-muted))] text-center max-w-md">
              Couldn't build simplified view from schema.
            </p>
            <p class="text-xs text-red-500 dark:text-red-400 text-center max-w-md font-mono">
              {{ simplifiedError }}
            </p>
            <button
              class="mt-2 px-4 py-1.5 text-xs font-medium rounded-lg bg-indigo-500 text-white hover:bg-indigo-600 transition-colors"
              @click="onTabSwitch('cedar')"
            >
              Open Cedar Tab
            </button>
          </div>
        </div>

        <!-- Simplified view -->
        <div v-else-if="normalizedSchema" class="flex-1 min-h-0">
          <SchemaSimplifiedView :schema="normalizedSchema" />
        </div>

        <!-- Empty schema -->
        <div v-else class="flex-1 min-h-0 card overflow-hidden p-6">
          <div class="flex flex-col items-center justify-center h-full gap-2">
            <p class="text-sm text-[rgb(var(--text-muted))]">Schema loaded but no entities or actions found.</p>
          </div>
        </div>
      </template>

      <!-- ── JSON/CEDAR TABS (Monaco editor) ──────────────────────────────── -->
      <template v-if="activeTab === 'json' || activeTab === 'cedar'">
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
                  {{ formatValidationMessage(error.message) }}
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
        <div v-if="loading && !isEditing" class="flex-1 min-h-0 card overflow-hidden p-6">
          <UiLoadingSkeleton :lines="15" height="h-5" />
        </div>
        <div v-else class="flex-1 min-h-0 flex flex-col card overflow-hidden p-0">
          <MonacoEditor
            :key="activeTab"
            v-model="schemaContent"
            :lang="editorLang"
            :options="{ ...monacoEditor.options, readOnly: !isEditing }"
            class="flex-1 min-h-0"
            @load="(editor) => { onEditorMounted(editor); onSchemaContentChanged(editor); monitorSchemaMarkerChanges(editor); }"
          />
          <div class="shrink-0 flex items-center justify-between text-xs px-2 py-1 bg-neutral-200 dark:bg-slate-900 text-neutral-500 dark:text-neutral-400">
            <span class="font-medium uppercase tracking-wide">{{ activeTab === 'cedar' ? 'Cedar' : 'JSON' }}</span>
            <span class="flex items-center gap-3">
              <span class="inline-flex items-center gap-1" :class="isEditing ? 'text-amber-600 dark:text-amber-400' : ''">
                <span class="inline-block w-1.5 h-1.5 rounded-full" :class="isEditing ? 'bg-amber-500' : 'bg-neutral-400 dark:bg-neutral-500'"></span>
                {{ isEditing ? 'EDIT' : 'READ' }}
              </span>
              |
              <span>Ln {{ schemaEditor.cursorPos.line }}, Col {{ schemaEditor.cursorPos.column }}</span>
            </span>
          </div>
        </div>
      </template>
    </template>
  </div>
</template>