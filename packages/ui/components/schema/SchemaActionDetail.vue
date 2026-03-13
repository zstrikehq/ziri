<script setup lang="ts">
import type { NormalizedAction, NormalizedSchema } from '~/utils/schema-explorer'
import { shortName } from '~/utils/schema-explorer'
import { highlightText } from '~/utils/highlight'

const props = defineProps<{
  action: NormalizedAction
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
        <h3 class="text-base font-semibold text-[rgb(var(--text))]">{{ action.name }}</h3>
        <span v-if="action.kind === 'actionGroup'" class="px-1.5 py-0.5 text-xs font-bold uppercase tracking-wider rounded bg-lime-50 dark:bg-lime-900/40 text-lime-800 dark:text-lime-200">
          Action Group
        </span>
        <span v-else class="px-1.5 py-0.5 text-xs font-bold uppercase tracking-wider rounded bg-emerald-50 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200">
          Action
        </span>
      </div>
      <p v-if="action.namespace" class="text-xs text-[rgb(var(--text-muted))]">
        Namespace: <span class="font-mono">{{ action.namespace }}</span>
      </p>
    </div> -->

    <!-- Member Of (parent action groups) -->
    <div v-if="action.memberOf.length > 0">
      <h4 class="text-xs font-semibold uppercase tracking-wider text-[rgb(var(--text-muted))] mb-2">Member Of</h4>
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="parentId in action.memberOf"
          :key="parentId"
          class="px-2 py-0.5 text-xs font-mono rounded-full bg-lime-50 dark:bg-lime-900/20 text-lime-800 dark:text-lime-200 border border-lime-200 dark:border-lime-800 hover:bg-lime-100 dark:hover:bg-lime-900/40 transition-colors cursor-pointer"
          @click="emit('navigate', 'action', parentId)"
        >
          <span v-html="highlightText(shortName(parentId), searchQuery)"></span>
        </button>
      </div>
    </div>

    <!-- Principal Types -->
    <div v-if="action.principalTypes.length > 0">
      <h4 class="text-xs font-semibold uppercase tracking-wider text-[rgb(var(--text-muted))] mb-2">Principal Types</h4>
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="pt in action.principalTypes"
          :key="pt"
          class="px-2 py-0.5 text-xs font-mono rounded-full bg-lime-50 dark:bg-lime-900/20 text-lime-800 dark:text-lime-200 border border-lime-200 dark:border-lime-800 hover:bg-lime-100 dark:hover:bg-lime-900/40 transition-colors cursor-pointer"
          @click="emit('navigate', 'entity', pt)"
        >
          <span v-html="highlightText(shortName(pt), searchQuery)"></span>
        </button>
      </div>
    </div>

    <!-- Resource Types -->
    <div v-if="action.resourceTypes.length > 0">
      <h4 class="text-xs font-semibold uppercase tracking-wider text-[rgb(var(--text-muted))] mb-2">Resource Types</h4>
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="rt in action.resourceTypes"
          :key="rt"
          class="px-2 py-0.5 text-xs font-mono rounded-full bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800 hover:bg-orange-100 dark:hover:bg-orange-900/40 transition-colors cursor-pointer"
          @click="emit('navigate', 'entity', rt)"
        >
          <span v-html="highlightText(shortName(rt), searchQuery)"></span>
        </button>
      </div>
    </div>

    <!-- Context -->
    <div v-if="action.contextType || action.contextAttributes.length > 0">
      <h4 class="text-xs font-semibold uppercase tracking-wider text-[rgb(var(--text-muted))] mb-2">
        Context
        <button
          v-if="action.contextType"
          class="ml-1 font-mono text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer normal-case"
          @click="emit('navigate', 'commonType', action.namespace ? action.namespace + '::' + action.contextType : action.contextType!)"
        >
          → <span v-html="highlightText(action.contextType, searchQuery)"></span>
        </button>
      </h4>
      <SchemaAttributeTree
        v-if="action.contextAttributes.length > 0"
        :attributes="action.contextAttributes"
        :schema="schema"
        :namespace="action.namespace"
        :depth="0"
        :searchQuery="searchQuery"
        @navigate="(type, id) => emit('navigate', type, id)"
      />
      <p v-else-if="!action.contextType" class="text-xs text-[rgb(var(--text-muted))] italic">Empty context (no attributes)</p>
    </div>

    <!-- Child Actions (for action groups) -->
    <div v-if="action.children.length > 0">
      <h4 class="text-xs font-semibold uppercase tracking-wider text-[rgb(var(--text-muted))] mb-2">
        Child Actions
        <span class="font-normal">({{ action.children.length }})</span>
      </h4>
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="childId in action.children"
          :key="childId"
          class="px-2 py-0.5 text-xs font-mono rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors cursor-pointer"
          @click="emit('navigate', 'action', childId)"
        >
          <span v-html="highlightText(shortName(childId), searchQuery)"></span>
        </button>
      </div>
    </div>

    <!-- No appliesTo (action group with no children yet) -->
    <div v-if="action.kind === 'actionGroup' && action.children.length === 0 && action.principalTypes.length === 0">
      <p class="text-xs text-[rgb(var(--text-muted))] italic">
        Abstract action group with no child actions.
      </p>
    </div>
  </div>
</template>