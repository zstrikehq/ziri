<script setup lang="ts">
interface Props {
  text: string
  size?: 'sm' | 'md'
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md'
})

const copied = ref(false)

const copy = async () => {
  try {
    await navigator.clipboard.writeText(props.text)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch (err) {
    console.error('Failed to copy:', err)
  }
}

const sizeClasses = {
  sm: 'p-1.5',
  md: 'p-2'
}

const iconClasses = {
  sm: 'w-3.5 h-3.5',
  md: 'w-4 h-4'
}
</script>

<template>
  <button
    @click.stop="copy"
    class="icon-btn relative"
    :class="[sizeClasses[size], { 'text-green-500 animate-pulse-glow': copied }]"
    :title="copied ? 'Copied!' : 'Copy to clipboard'"
  >
    <Transition name="copy-icon" mode="out-in">
      <svg v-if="copied" key="check" :class="iconClasses[size]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
      </svg>
      <svg v-else key="copy" :class="iconClasses[size]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    </Transition>
  </button>
</template>

<style scoped>
.copy-icon-enter-active,
.copy-icon-leave-active {
  transition: all 0.15s ease;
}

.copy-icon-enter-from {
  opacity: 0;
  transform: scale(0.5);
}

.copy-icon-leave-to {
  opacity: 0;
  transform: scale(0.5);
}
</style>
