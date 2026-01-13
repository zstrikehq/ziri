<script setup lang="ts">
interface Props {
  modelValue: boolean
  title?: string
  size?: 'sm' | 'md' | 'lg'
  closable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  closable: true
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const close = () => {
  if (props.closable) {
    emit('update:modelValue', false)
  }
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl'
}

// Close on escape key
onMounted(() => {
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && props.modelValue && props.closable) {
      close()
    }
  }
  document.addEventListener('keydown', handleEscape)
  onUnmounted(() => {
    document.removeEventListener('keydown', handleEscape)
  })
})
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="modelValue" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <!-- Backdrop -->
        <div 
          class="absolute inset-0 bg-black/60 backdrop-blur-sm" 
          @click="close"
        />
        
        <!-- Modal content -->
        <div 
          class="relative w-full card animate-scale-in"
          :class="sizeClasses[size]"
        >
          <!-- Header -->
          <div v-if="title || closable" class="flex items-center justify-between mb-5">
            <h3 v-if="title" class="text-base font-bold text-[rgb(var(--text))]">
              {{ title }}
            </h3>
            <button 
              v-if="closable"
              @click="close"
              class="ml-auto icon-btn"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <!-- Body -->
          <slot />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from > div:last-child,
.modal-leave-to > div:last-child {
  transform: scale(0.95);
}
</style>
