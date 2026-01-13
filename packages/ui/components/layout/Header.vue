<script setup lang="ts">
interface Props {
  title?: string
}

const props = defineProps<Props>()
</script>

<template>
  <header class="h-12 flex-shrink-0 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-between px-4">
    <h1 v-if="title" class="text-sm font-medium text-gray-900 dark:text-gray-100">
      {{ title }}
    </h1>
    <div v-else />
    
    <div class="flex items-center gap-2">
      <slot name="actions" />
      <LayoutThemeToggle />
    </div>
  </header>
</template>
