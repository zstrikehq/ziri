<script setup lang="ts">
interface Props {
  modelValue: boolean
  label?: string
  helpText?: string
  disabled?: boolean
  id?: string
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const toggleId = props.id || `toggle-${Math.random().toString(36).substring(2, 9)}`

const toggle = () => {
  if (!props.disabled) {
    emit('update:modelValue', !props.modelValue)
  }
}
</script>

<template>
  <div class="space-y-2 ">
    <label 
      :for="toggleId" 
      class="block text-sm font-medium text-[rgb(var(--text))] cursor-pointer"
      @click="toggle"
    >
      {{ label }}
    </label>
    <div class="flex items-center gap-3">
      <button
        :id="toggleId"
        type="button"
        role="switch"
        :aria-checked="modelValue"
        :disabled="disabled"
        @click="toggle"
        :class="[
          'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-lime-400 disabled:cursor-not-allowed disabled:opacity-50',
          modelValue 
            ? 'bg-lime-600 dark:bg-lime-500' 
            : 'bg-gray-200 dark:bg-gray-700'
        ]"
      >
        <span
          :class="[
            'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
            modelValue ? 'translate-x-5' : 'translate-x-0'
          ]"
        />
      </button>
      <p v-if="helpText" class="text-xs text-[rgb(var(--text-secondary))]">
        {{ helpText }}
      </p>
    </div>
  </div>
</template>
