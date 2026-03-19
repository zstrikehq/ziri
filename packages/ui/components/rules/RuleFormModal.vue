<script setup lang="ts">
import type * as Monaco from 'monaco-editor'
import type { ValidationError } from '~/composables/useCedarWasm'

interface RuleFormState {
  description: string
  policyId: string
  policy: string
  isActive: boolean
}

const props = defineProps<{
  modelValue: boolean
  title: string
  submitLabel: string
  loading: boolean
  isValidating: boolean
  validationErrors: ValidationError[]
  validationWarnings: ValidationError[]
  policyCursorPos: {
    line: number
    column: number
  }
  monacoOptions: Monaco.editor.IStandaloneEditorConstructionOptions
  formState: RuleFormState
  onPolicyEditorLoad: (editor: Monaco.editor.IStandaloneCodeEditor) => void
  onPolicyMarkerChanges: (editor: Monaco.editor.IStandaloneCodeEditor) => void | Promise<void>
  formatValidationMessage: (message: string) => string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  submit: []
  cancel: []
}>()

const isOpen = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})

function handleCancel(): void {
  emit('cancel')
}

function handleSubmit(): void {
  emit('submit')
}
</script>

<template>
  <UiModal v-model="isOpen" :title="title" size="xl">
    <form @submit.prevent="handleSubmit" class="flex max-h-[78vh] flex-col">
      <div class="space-y-3 overflow-y-auto pr-1 2xl:space-y-5">
        <div>
        <label class="block text-xs font-semibold text-[rgb(var(--text-secondary))] mb-1.5">Description</label>
        <input
          v-model="formState.description"
          type="text"
          placeholder="Allow engineers to query LLM"
          class="input"
        />
        </div>

        <div>
          <label class="block text-xs font-semibold text-[rgb(var(--text-secondary))] mb-1.5">Policy ID (required)</label>
          <input
            v-model="formState.policyId"
            type="text"
            placeholder="e.g. basic-allow-user"
            class="input"
          />
        </div>

      <div class="flex items-center justify-between p-4 rounded-lg border-2 border-[rgb(var(--border))] bg-[rgb(var(--surface-elevated))]">
        <div>
          <label class="block text-sm font-semibold text-[rgb(var(--text))] mb-0.5">Policy Status</label>
          <p class="text-xs text-[rgb(var(--text-muted))]">Enable or disable this policy</p>
        </div>
        <label class="relative inline-flex items-center cursor-pointer">
          <input
            v-model="formState.isActive"
            type="checkbox"
            class="sr-only peer"
          />
          <div class="w-11 h-6 bg-gray-300 dark:bg-gray-600 rounded-full border border-[rgb(var(--border))] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[rgb(var(--color-border-accent))] peer-focus:ring-offset-2 peer-focus:ring-offset-[rgb(var(--surface-panel))] peer-checked:after:translate-x-full peer-checked:after:border-[rgb(var(--surface-panel))] after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-[rgb(var(--surface-panel))] after:border after:border-[rgb(var(--border-strong))] after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-lime-500 dark:peer-checked:bg-lime-400"></div>
          <span class="ml-3 text-sm font-medium text-[rgb(var(--text))]">
            {{ formState.isActive ? 'Enabled' : 'Disabled' }}
          </span>
        </label>
      </div>

        <div>
          <div class="flex items-center justify-between mb-1.5">
            <label class="block text-xs font-semibold text-[rgb(var(--text-secondary))]">Policy</label>
            <span v-if="isValidating" class="text-xs text-[rgb(var(--text-muted))]">Validating...</span>
            <span v-else-if="validationErrors.length > 0" class="text-xs text-red-500">{{ validationErrors.length }} error(s)</span>
            <span v-else-if="formState.policy.trim()" class="text-xs text-green-500">Valid</span>
          </div>
          <div class="rounded-lg overflow-hidden border-2" :class="validationErrors.length > 0 ? 'border-red-500' : 'border-[rgb(var(--border))]'">
            <MonacoEditor
              v-model="formState.policy"
              lang="cedar-policy"
              :options="monacoOptions"
              class="h-64"
              @load="(editor) => { onPolicyEditorLoad(editor); onPolicyMarkerChanges(editor) }"
            />
            <div class="flex items-center justify-between text-xs px-2 py-0.5 bg-neutral-200 dark:bg-slate-900 text-neutral-500 dark:text-neutral-400">
              <span class="font-medium uppercase tracking-wide">Cedar</span>
              <span>Ln {{ policyCursorPos.line }}, Col {{ policyCursorPos.column }}</span>
            </div>
          </div>

          <div v-if="validationErrors.length > 0 || validationWarnings.length > 0" class="mt-2 space-y-2">
            <div v-if="validationErrors.length > 0" class="space-y-1">
              <div
                v-for="(error, idx) in validationErrors"
                :key="idx"
                class="p-2 rounded bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
              >
                <p class="text-xs text-red-700 dark:text-red-300">{{ formatValidationMessage(error.message) }}</p>
                <p v-if="error.help" class="text-xs text-red-600 dark:text-red-400 mt-0.5">{{ error.help }}</p>
              </div>
            </div>
            <div v-if="validationWarnings.length > 0" class="space-y-1">
              <div
                v-for="(warning, idx) in validationWarnings"
                :key="idx"
                class="p-2 rounded bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800"
              >
                <p class="text-xs text-amber-700 dark:text-amber-300">{{ formatValidationMessage(warning.message) }}</p>
                <p v-if="warning.help" class="text-xs text-amber-600 dark:text-amber-400 mt-0.5">{{ warning.help }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="flex gap-3 justify-end pt-3 mt-3 border-t border-[rgb(var(--border))] shrink-0">
        <UiButton type="button" variant="outline" @click="handleCancel">
          Cancel
        </UiButton>
        <UiButton type="submit" :loading="loading" :disabled="validationErrors.length > 0">
          {{ submitLabel }}
        </UiButton>
      </div>
    </form>
  </UiModal>
</template>
