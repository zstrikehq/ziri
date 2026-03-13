<script setup lang="ts">
import { useToast } from '~/composables/useToast'

const { toasts, remove } = useToast()

const typeStyles = {
  success: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-green-200 dark:border-green-800',
    text: 'text-green-800 dark:text-green-200',
    icon: 'text-green-500'
  },
  error: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-800',
    text: 'text-red-800 dark:text-red-200',
    icon: 'text-red-500'
  },
  info: {
    bg: 'bg-lime-50 dark:bg-lime-900/20',
    border: 'border-lime-200 dark:border-lime-800',
    text: 'text-lime-800 dark:text-lime-200',
    icon: 'text-lime-500'
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    border: 'border-amber-200 dark:border-amber-800',
    text: 'text-amber-800 dark:text-amber-200',
    icon: 'text-amber-500'
  }
}

const icons = {
  success: 'M5 13l4 4L19 7',
  error: 'M6 18L18 6M6 6l12 12',
  info: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  warning: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
}
</script>

<template>
  <Teleport to="body">
    <div class="fixed top-4 right-4 space-y-3 max-w-sm" style="z-index: 9999;">
      <TransitionGroup name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="flex items-start gap-3 p-4 rounded-xl border-2 shadow-lg backdrop-blur-sm animate-slide-in-right"
          :class="[typeStyles[toast.type].bg, typeStyles[toast.type].border]"
        >
          <div class="flex-shrink-0 mt-0.5">
            <svg 
              class="w-5 h-5" 
              :class="typeStyles[toast.type].icon" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="icons[toast.type]" />
            </svg>
          </div>
          <p class="flex-1 text-sm font-medium" :class="typeStyles[toast.type].text">{{ toast.message }}</p>
          <button 
            @click="remove(toast.id)"
            class="flex-shrink-0 p-1 rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/5"
            :class="typeStyles[toast.type].text"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-enter-active {
  animation: slide-in-right 0.3s ease-out;
}

.toast-leave-active {
  animation: slide-out-right 0.2s ease-in forwards;
}

.toast-move {
  transition: transform 0.3s ease;
}

@keyframes slide-out-right {
  from {
    opacity: 1;
    transform: translateX(0);
  }
  to {
    opacity: 0;
    transform: translateX(100%);
  }
}
</style>
