<script setup lang="ts">
import type { NormalizedAttribute, NormalizedSchema } from '~/utils/schema-explorer'
import { highlightText } from '~/utils/highlight'

const props = defineProps<{
  attributes: NormalizedAttribute[]
  schema: NormalizedSchema
  namespace?: string
  depth?: number
  searchQuery?: string | null
}>()

const emit = defineEmits<{
  (e: 'navigate', type: 'entity' | 'action' | 'commonType', id: string): void
}>()

const currentDepth = computed(() => props.depth ?? 0)


const collapsed = reactive<Record<string, boolean>>({})
function toggleCollapse(name: string) {
  collapsed[name] = !collapsed[name]
}

function isClickableEntity(typeName: string): boolean {
  const ns = props.namespace || ''
  const qualified = ns ? `${ns}::${typeName}` : typeName
  return props.schema.entityMap.has(qualified) || props.schema.entities.some(e => e.name === typeName)
}

function isClickableCommonType(typeName: string): boolean {
  const ns = props.namespace || ''
  const qualified = ns ? `${ns}::${typeName}` : typeName
  return props.schema.commonTypeMap.has(qualified) || props.schema.commonTypes.some(ct => ct.name === typeName)
}

function resolveEntityId(typeName: string): string {
  const ns = props.namespace || ''
  const qualified = ns ? `${ns}::${typeName}` : typeName
  if (props.schema.entityMap.has(qualified)) return qualified
  const found = props.schema.entities.find(e => e.name === typeName)
  return found?.id || typeName
}

function resolveCommonTypeId(typeName: string): string {
  const ns = props.namespace || ''
  const qualified = ns ? `${ns}::${typeName}` : typeName
  if (props.schema.commonTypeMap.has(qualified)) return qualified
  const found = props.schema.commonTypes.find(ct => ct.name === typeName)
  return found?.id || typeName
}


const leafAttrs = computed(() => props.attributes.filter(a => !a.children?.length))
const recordAttrs = computed(() => props.attributes.filter(a => a.children?.length))


const depthAccentColors = [
  'border-l-lime-400 dark:border-l-lime-500',
  'border-l-lime-500 dark:border-l-lime-400',
  'border-l-lime-300 dark:border-l-lime-600',
  'border-l-lime-200 dark:border-l-lime-700',
]

const depthBgColors = [
  'bg-lime-50/50 dark:bg-lime-950/25',
  'bg-lime-100/40 dark:bg-lime-900/25',
  'bg-lime-200/30 dark:bg-lime-900/20',
  'bg-lime-100/50 dark:bg-lime-950/30',
]

const depthDotColors = [
  'bg-lime-400',
  'bg-lime-500',
  'bg-lime-300',
  'bg-lime-200',
]

function getAccentColor(depth: number): string {
  return depthAccentColors[Math.min(depth, depthAccentColors.length - 1)]
}
function getBgColor(depth: number): string {
  return depthBgColors[Math.min(depth, depthBgColors.length - 1)]
}
function getDotColor(depth: number): string {
  return depthDotColors[Math.min(depth, depthDotColors.length - 1)]
}
</script>

<template>
  <div>
    <!-- ── Leaf attributes (simple fields with no children) ──────────────── -->
    <div v-if="leafAttrs.length > 0" class="border border-[rgb(var(--border))] rounded-lg overflow-hidden">
      <table class="w-full text-xs">
        <!-- Only show column headers at the top level -->
        <thead v-if="currentDepth === 0">
          <tr class="bg-[rgb(var(--surface-elevated))]">
            <th class="text-left px-3 py-1.5 font-semibold text-[rgb(var(--text-muted))]">Name</th>
            <th class="text-left px-3 py-1.5 font-semibold text-[rgb(var(--text-muted))]">Type</th>
            <th class="text-center px-3 py-1.5 font-semibold text-[rgb(var(--text-muted))] w-20">Required</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="attr in leafAttrs"
            :key="attr.name"
            class="border-t border-[rgb(var(--border))] first:border-t-0 hover:bg-[rgb(var(--surface-elevated))]/50 transition-colors"
          >
            <td class="px-3 py-1.5 font-mono text-[rgb(var(--text))]" v-html="highlightText(attr.name, searchQuery)"></td>
            <td class="px-3 py-1.5">
              <button
                v-if="isClickableEntity(attr.type)"
                class="font-mono text-lime-700 dark:text-lime-200 hover:underline cursor-pointer"
                @click="emit('navigate', 'entity', resolveEntityId(attr.type))"
                v-html="highlightText(attr.type, searchQuery)"
              ></button>
              <button
                v-else-if="isClickableCommonType(attr.type)"
                class="font-mono text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                @click="emit('navigate', 'commonType', resolveCommonTypeId(attr.type))"
                v-html="highlightText(attr.type, searchQuery)"
              ></button>
              <span v-else class="font-mono text-[rgb(var(--text-secondary))]" v-html="highlightText(attr.type, searchQuery)"></span>
            </td>
            <td class="px-3 py-1.5 text-center">
              <span v-if="attr.required" class="text-emerald-600 dark:text-emerald-400">●</span>
              <span v-else class="text-[rgb(var(--text-muted))]">○</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ── Nested record blocks (each is a distinct collapsible card) ───── -->
    <div
      v-for="attr in recordAttrs"
      :key="attr.name"
      class="rounded-lg border border-[rgb(var(--border))] border-l-[3px] overflow-hidden"
      :class="[getAccentColor(currentDepth), leafAttrs.length > 0 || recordAttrs.indexOf(attr) > 0 ? 'mt-2' : '']"
    >
      <!-- Record header bar — click to collapse/expand -->
      <button
        class="w-full flex items-center gap-2 px-3 py-2 text-xs cursor-pointer select-none transition-colors"
        :class="getBgColor(currentDepth)"
        @click="toggleCollapse(attr.name)"
      >
        <!-- Chevron -->
        <svg
          class="w-3 h-3 text-[rgb(var(--text-muted))] transition-transform duration-150 shrink-0"
          :class="collapsed[attr.name] ? '-rotate-90' : ''"
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7" />
        </svg>

        <!-- Depth dot for visual tracking -->
        <span class="w-2 h-2 rounded-full shrink-0" :class="getDotColor(currentDepth)"></span>

        <!-- Attribute name -->
        <span class="font-mono font-semibold text-[rgb(var(--text))]" v-html="highlightText(attr.name, searchQuery)"></span>

        <!-- Record badge -->
        <span class="px-1.5 py-px text-[9px] font-bold uppercase tracking-widest rounded bg-[rgb(var(--border))]/80 text-[rgb(var(--text-muted))]">
          Record
        </span>

        <!-- Field count -->
        <span class="text-[10px] text-[rgb(var(--text-muted))]">
          {{ attr.children?.length }} field{{ (attr.children?.length ?? 0) === 1 ? '' : 's' }}
        </span>

        <!-- Required / Optional indicator pushed to the right -->
        <span class="ml-auto shrink-0">
          <span v-if="attr.required" class="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-[10px]">
            <span class="text-emerald-600 dark:text-emerald-400">●</span> required
          </span>
          <span v-else class="inline-flex items-center gap-1 text-[rgb(var(--text-muted))] text-[10px]">
            <span>○</span> optional
          </span>
        </span>
      </button>

      <!-- Record body — collapsible, contains recursive children -->
      <div
        v-show="!collapsed[attr.name]"
        class="px-3 py-2 border-t border-[rgb(var(--border))]/60"
      >
        <SchemaAttributeTree
          :attributes="attr.children!"
          :schema="schema"
          :namespace="namespace"
          :depth="currentDepth + 1"
          :searchQuery="searchQuery"
          @navigate="(type, id) => emit('navigate', type, id)"
        />
      </div>
    </div>
  </div>
</template>