<script setup lang="ts">
import type { NormalizedCommonType, NormalizedSchema } from '~/utils/schema-explorer'
import { shortName } from '~/utils/schema-explorer'
import { highlightText } from '~/utils/highlight'

const props = defineProps<{
  commonType: NormalizedCommonType
  schema: NormalizedSchema
  searchQuery?: string | null
}>()

const emit = defineEmits<{
  (e: 'navigate', type: 'entity' | 'action' | 'commonType', id: string): void
}>()
</script>

<template>
  <div class="space-y-5">
    <!-- Header -->
    <!-- <div>
      <div class="flex items-center gap-2 mb-1">
        <h3 class="text-base font-semibold text-[rgb(var(--text))]">{{ commonType.name }}</h3>
        <span class="px-1.5 py-0.5 text-xs font-bold uppercase tracking-wider rounded bg-emerald-50 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200">
          Common Type
        </span>
      </div>
      <p v-if="commonType.namespace" class="text-xs text-[rgb(var(--text-muted))]">
        Namespace: <span class="font-mono">{{ commonType.namespace }}</span>
      </p>
      <p class="text-xs text-[rgb(var(--text-secondary))] mt-1">
        Resolves to: <span class="font-mono font-semibold">{{ commonType.type }}</span>
      </p>
    </div> -->

    <!-- Attributes (if Record) -->
    <div v-if="commonType.attributes.length > 0">
      <h4 class="text-xs font-semibold uppercase tracking-wider text-[rgb(var(--text-muted))] mb-2">
        Attributes
        <span class="font-normal">({{ commonType.attributes.length }})</span>
      </h4>
      <div class="border border-[rgb(var(--border))] rounded-lg overflow-hidden">
        <table class="w-full text-xs">
          <thead>
            <tr class="bg-[rgb(var(--surface-elevated))]">
              <th class="text-left px-3 py-1.5 font-semibold text-[rgb(var(--text-muted))]">Name</th>
              <th class="text-left px-3 py-1.5 font-semibold text-[rgb(var(--text-muted))]">Type</th>
              <th class="text-center px-3 py-1.5 font-semibold text-[rgb(var(--text-muted))] w-20">Required</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="attr in commonType.attributes"
              :key="attr.name"
              class="border-t border-[rgb(var(--border))] hover:bg-[rgb(var(--surface-elevated))]/50 transition-colors"
            >
              <td class="px-3 py-1.5 font-mono text-[rgb(var(--text))]" v-html="highlightText(attr.name, searchQuery)"></td>
              <td class="px-3 py-1.5 font-mono text-[rgb(var(--text-secondary))]" v-html="highlightText(attr.type, searchQuery)"></td>
              <td class="px-3 py-1.5 text-center">
                <span v-if="attr.required" class="text-emerald-600 dark:text-emerald-400">●</span>
                <span v-else class="text-[rgb(var(--text-muted))]">○</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Used By -->
    <div v-if="commonType.usedBy.length > 0">
      <h4 class="text-xs font-semibold uppercase tracking-wider text-[rgb(var(--text-muted))] mb-2">
        Used By
        <span class="font-normal">({{ commonType.usedBy.length }})</span>
      </h4>
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="refId in commonType.usedBy"
          :key="refId"
          class="px-2 py-0.5 text-xs font-mono rounded-full border transition-colors cursor-pointer"
          :class="
            schema.entityMap.has(refId)
              ? 'bg-lime-50 dark:bg-lime-900/20 text-lime-800 dark:text-lime-200 border-lime-200 dark:border-lime-800 hover:bg-lime-100 dark:hover:bg-lime-900/40'
              : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/40'
          "
          @click="emit('navigate', schema.entityMap.has(refId) ? 'entity' : 'action', refId)"
        >
          <span v-html="highlightText(shortName(refId), searchQuery)"></span>
        </button>
      </div>
    </div>
  </div>
</template>