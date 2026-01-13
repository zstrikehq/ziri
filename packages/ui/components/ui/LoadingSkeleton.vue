<script setup lang="ts">
interface Props {
  lines?: number
  height?: string
}

const props = withDefaults(defineProps<Props>(), {
  lines: 3,
  height: 'h-4'
})
</script>

<template>
  <div class="space-y-2">
    <div 
      v-for="i in lines" 
      :key="i" 
      class="bg-[rgb(var(--surface-elevated))] rounded-lg"
      :class="height"
      :style="{ width: `${70 + Math.random() * 30}%` }"
    >
    </div>
  </div>
</template>
