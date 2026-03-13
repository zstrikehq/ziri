<script setup lang="ts">
import type { NormalizedEntity, NormalizedSchema } from '~/utils/schema-explorer'
import { shortName } from '~/utils/schema-explorer'
import { highlightText } from '~/utils/highlight'

const props = defineProps<{
  entity: NormalizedEntity
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
        <h3 class="text-base font-semibold text-[rgb(var(--text))]">{{ entity.name }}</h3>
        <span v-if="entity.kind === 'enum'" class="px-1.5 py-0.5 text-xs font-bold uppercase tracking-wider rounded bg-amber-50 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200">
          Enum
        </span>
        <span v-else class="px-1.5 py-0.5 text-xs font-bold uppercase tracking-wider rounded bg-lime-50 dark:bg-lime-900/40 text-lime-800 dark:text-lime-200">
          Entity
        </span>
      </div>
      <p v-if="entity.namespace" class="text-xs text-[rgb(var(--text-muted))]">
        Namespace: <span class="font-mono">{{ entity.namespace }}</span>
      </p>
    </div> -->

    <!-- Enum Values -->
    <div v-if="entity.kind === 'enum' && entity.enumValues?.length">
      <h4 class="text-xs font-semibold uppercase tracking-wider text-[rgb(var(--text-muted))] mb-2">Valid Values</h4>
      <div class="flex flex-wrap gap-1.5">
        <span
          v-for="val in entity.enumValues"
          :key="val"
          class="px-2 py-0.5 text-xs font-mono rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
        >
          <span v-html="highlightText(`&quot;${val}&quot;`, searchQuery)"></span>
        </span>
      </div>
    </div>

    <!-- Attributes (recursive tree — handles unlimited nesting) -->
    <div>
      <h4 class="text-xs font-semibold uppercase tracking-wider text-[rgb(var(--text-muted))] mb-2">
        Attributes
        <span v-if="entity.attributes.length > 0" class="text-[rgb(var(--text-muted))] font-normal">({{ entity.attributes.length }})</span>
      </h4>
      <SchemaAttributeTree
        v-if="entity.attributes.length > 0"
        :attributes="entity.attributes"
        :schema="schema"
        :namespace="entity.namespace"
        :depth="0"
        :searchQuery="searchQuery"
        @navigate="(type, id) => emit('navigate', type, id)"
      />
      <p v-else-if="entity.kind === 'entity'" class="text-xs text-[rgb(var(--text-muted))]">No attributes</p>
    </div>

    <!-- Tags -->
    <div v-if="entity.tags">
      <h4 class="text-xs font-semibold uppercase tracking-wider text-[rgb(var(--text-muted))] mb-2">Tags</h4>
      <p class="text-xs text-[rgb(var(--text-secondary))]">
        Dynamic key-value pairs with values of type
        <span class="font-mono font-semibold text-[rgb(var(--text))]" v-html="highlightText(entity.tags.type, searchQuery)"></span>
      </p>
    </div>

    <!-- Parent Membership -->
    <div v-if="entity.parents.length > 0">
      <h4 class="text-xs font-semibold uppercase tracking-wider text-[rgb(var(--text-muted))] mb-2">Member Of</h4>
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="parent in entity.parents"
          :key="parent"
          class="px-2 py-0.5 text-xs font-mono rounded-full bg-lime-50 dark:bg-lime-900/20 text-lime-800 dark:text-lime-200 border border-lime-200 dark:border-lime-800 hover:bg-lime-100 dark:hover:bg-lime-900/40 transition-colors cursor-pointer"
          @click="emit('navigate', 'entity', parent)"
        >
          <span v-html="highlightText(shortName(parent), searchQuery)"></span>
        </button>
      </div>
    </div>

    <!-- Parent Of (entity types that have this type as parent) -->
    <div v-if="entity.parentOf && entity.parentOf.length > 0">
      <h4 class="text-xs font-semibold uppercase tracking-wider text-[rgb(var(--text-muted))] mb-2">Parent Of</h4>
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="childId in entity.parentOf"
          :key="childId"
          class="px-2 py-0.5 text-xs font-mono rounded-full bg-lime-50 dark:bg-lime-900/20 text-lime-800 dark:text-lime-200 border border-lime-200 dark:border-lime-800 hover:bg-lime-100 dark:hover:bg-lime-900/40 transition-colors cursor-pointer"
          @click="emit('navigate', 'entity', childId)"
        >
          <span v-html="highlightText(shortName(childId), searchQuery)"></span>
        </button>
      </div>
    </div>

    <!-- Referenced By -->
    <div v-if="entity.referencedBy.length > 0">
      <h4 class="text-xs font-semibold uppercase tracking-wider text-[rgb(var(--text-muted))] mb-2">Referenced By</h4>
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="ref in entity.referencedBy"
          :key="ref"
          class="px-2 py-0.5 text-xs font-mono rounded-full bg-lime-50 dark:bg-lime-900/20 text-lime-800 dark:text-lime-200 border border-lime-200 dark:border-lime-800 hover:bg-lime-100 dark:hover:bg-lime-900/40 transition-colors cursor-pointer"
          @click="emit('navigate', 'entity', ref)"
        >
          <span v-html="highlightText(shortName(ref), searchQuery)"></span>
        </button>
      </div>
    </div>

    <!-- Used in Actions -->
    <div v-if="entity.usedInActions.asPrincipal.length > 0 || entity.usedInActions.asResource.length > 0">
      <h4 class="text-xs font-semibold uppercase tracking-wider text-[rgb(var(--text-muted))] mb-2">Used in Actions</h4>
      <div class="space-y-2">
        <div v-if="entity.usedInActions.asPrincipal.length > 0">
          <p class="text-xs uppercase tracking-wider text-[rgb(var(--text-muted))] mb-1">As Principal</p>
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="actionId in entity.usedInActions.asPrincipal"
              :key="actionId"
              class="px-2 py-0.5 text-xs font-mono rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors cursor-pointer"
              @click="emit('navigate', 'action', actionId)"
            >
              <span v-html="highlightText(shortName(actionId), searchQuery)"></span>
            </button>
          </div>
        </div>
        <div v-if="entity.usedInActions.asResource.length > 0">
          <p class="text-xs uppercase tracking-wider text-[rgb(var(--text-muted))] mb-1">As Resource</p>
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="actionId in entity.usedInActions.asResource"
              :key="actionId"
              class="px-2 py-0.5 text-xs font-mono rounded-full bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800 hover:bg-orange-100 dark:hover:bg-orange-900/40 transition-colors cursor-pointer"
              @click="emit('navigate', 'action', actionId)"
            >
              <span v-html="highlightText(shortName(actionId), searchQuery)"></span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>