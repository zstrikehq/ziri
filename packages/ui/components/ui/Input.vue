<script setup lang="ts">
interface Props {
  modelValue?: string | number
  label?: string
  type?: 'text' | 'password' | 'email' | 'number' | 'url'
  placeholder?: string
  error?: string
  disabled?: boolean
  required?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  type: 'text',
  disabled: false,
  required: false
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
}>()

const showPassword = ref(false)
const isFocused = ref(false)

const inputType = computed(() => {
  if (props.type === 'password' && showPassword.value) {
    return 'text'
  }
  return props.type
})

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  const value = props.type === 'number' ? parseFloat(target.value) || 0 : target.value
  emit('update:modelValue', value)
}
</script>

<template>
  <div class="space-y-1.5">
    <label v-if="label" class="block text-xs font-semibold text-[rgb(var(--text-secondary))]">
      {{ label }}
      <span v-if="required" class="text-red-500 ml-0.5">*</span>
    </label>
    <div class="relative group">
      <input
        :type="inputType"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :required="required"
        @input="handleInput"
        @focus="isFocused = true"
        @blur="isFocused = false"
        class="input"
        :class="{ 
          'border-red-500 focus:border-red-500': error, 
          'pr-10': type === 'password',
          'opacity-50 cursor-not-allowed': disabled
        }"
      />
      <button
        v-if="type === 'password'"
        type="button"
        @click="showPassword = !showPassword"
        class="absolute right-3 top-1/2 -translate-y-1/2 text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text))] transition-colors"
      >
        <svg v-if="showPassword" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
        <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
        </svg>
      </button>
    </div>
    <p v-if="error" class="text-xs font-medium text-red-500">{{ error }}</p>
  </div>
</template>
