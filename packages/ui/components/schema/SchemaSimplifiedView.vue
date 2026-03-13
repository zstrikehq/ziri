<!-- <script setup lang="ts">
import type { NormalizedSchema, NormalizedEntity, NormalizedAction, NormalizedCommonType } from '~/utils/schema-explorer'
import { filterSchema, shortName } from '~/utils/schema-explorer'

const props = defineProps<{
  schema: NormalizedSchema
}>()


const searchQuery = ref('')

const filtered = computed(() => filterSchema(props.schema, searchQuery.value))


type SelectionType = 'entity' | 'action' | 'commonType'

const selectedType = ref<SelectionType | null>(null)
const selectedId = ref<string | null>(null)

const selectedEntity = computed(() =>
  selectedType.value === 'entity' && selectedId.value
    ? props.schema.entityMap.get(selectedId.value)
    : undefined
)

const selectedAction = computed(() =>
  selectedType.value === 'action' && selectedId.value
    ? props.schema.actionMap.get(selectedId.value)
    : undefined
)

const selectedCommonType = computed(() =>
  selectedType.value === 'commonType' && selectedId.value
    ? props.schema.commonTypeMap.get(selectedId.value)
    : undefined
)

function select(type: SelectionType, id: string) {
  selectedType.value = type
  selectedId.value = id
}

function handleNavigate(type: SelectionType, id: string) {

  if (type === 'entity') {
    if (props.schema.entityMap.has(id)) { select('entity', id); return }
    const found = props.schema.entities.find(e => e.name === id || e.id === id)
    if (found) { select('entity', found.id); return }
  }
  if (type === 'action') {
    if (props.schema.actionMap.has(id)) { select('action', id); return }
    const found = props.schema.actions.find(a => a.name === id || a.id === id)
    if (found) { select('action', found.id); return }
  }
  if (type === 'commonType') {
    if (props.schema.commonTypeMap.has(id)) { select('commonType', id); return }
    const found = props.schema.commonTypes.find(ct => ct.name === id || ct.id === id)
    if (found) { select('commonType', found.id); return }
  }
}


const sectionsCollapsed = reactive({
  entities: false,
  commonTypes: false,
  actionGroups: false,
  actions: false,
})


const filteredActionGroups = computed(() => filtered.value.actions.filter(a => a.kind === 'actionGroup'))
const filteredActionItems = computed(() => filtered.value.actions.filter(a => a.kind === 'action'))


watch(
  () => props.schema,
  (s) => {
    if (!selectedId.value && s.entities.length > 0) {
      select('entity', s.entities[0].id)
    }
  },
  { immediate: true }
)
</script>

<template>
  <div class="flex h-full min-h-0 border-2 border-[rgb(var(--border))] rounded-lg overflow-hidden bg-[rgb(var(--surface))]">
    <div class="w-[280px] min-w-[220px] max-w-[340px] shrink-0 flex flex-col border-r border-[rgb(var(--border))] bg-[rgb(var(--surface))]">
      <div class="p-2 border-b-2 border-[rgb(var(--border))]">
        <div class="relative">
          <svg class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[rgb(var(--text-muted))]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search schema..."
            class="input pl-8 pr-3 py-1.5 text-xs"
          />
        </div>
      </div>

      <div class="px-3 py-1.5 text-xs text-[rgb(var(--text-muted))] flex gap-3 border-b-2 border-[rgb(var(--border))] bg-[rgb(var(--surface-elevated))]">
        <span>{{ schema.stats.totalEntities + schema.stats.totalEnums }} entities</span>
        <span>{{ schema.stats.totalCommonTypes }} types</span>
        <span>{{ schema.stats.totalActions + schema.stats.totalActionGroups }} actions</span>
      </div>

      <div class="flex-1 overflow-y-auto">
        <div v-if="filtered.entities.length > 0">
          <button
            class="w-full flex items-center justify-between px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--surface-elevated))] transition-colors"
            @click="sectionsCollapsed.entities = !sectionsCollapsed.entities"
          >
            <span>Entities ({{ filtered.entities.length }})</span>
            <svg
              class="w-3 h-3 transition-transform"
              :class="sectionsCollapsed.entities ? '-rotate-90' : ''"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <div v-show="!sectionsCollapsed.entities">
            <button
              v-for="entity in filtered.entities"
              :key="entity.id"
              class="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left transition-colors"
              :class="selectedId === entity.id
                ? 'bg-lime-50 dark:bg-lime-900/30 text-lime-800 dark:text-lime-200 border-r-2 border-lime-500'
                : 'text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--surface-elevated))]'"
              @click="select('entity', entity.id)"
            >
              <span
                class="shrink-0 w-1.5 h-1.5 rounded-full"
                :class="entity.kind === 'enum' ? 'bg-amber-400' : 'bg-lime-400'"
              ></span>
              <span class="font-mono truncate">{{ entity.name }}</span>
              <span v-if="entity.kind === 'enum'" class="ml-auto text-xs text-amber-600 dark:text-amber-400 shrink-0">enum</span>
              <span v-if="entity.tags" class="ml-auto text-xs text-lime-700 dark:text-lime-200 shrink-0">tags</span>
            </button>
          </div>
        </div>

        <div v-if="filtered.commonTypes.length > 0">
          <button
            class="w-full flex items-center justify-between px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--surface-elevated))] transition-colors"
            @click="sectionsCollapsed.commonTypes = !sectionsCollapsed.commonTypes"
          >
            <span>Common Types ({{ filtered.commonTypes.length }})</span>
            <svg
              class="w-3 h-3 transition-transform"
              :class="sectionsCollapsed.commonTypes ? '-rotate-90' : ''"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <div v-show="!sectionsCollapsed.commonTypes">
            <button
              v-for="ct in filtered.commonTypes"
              :key="ct.id"
              class="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left transition-colors"
              :class="selectedId === ct.id
                ? 'bg-lime-50 dark:bg-lime-900/30 text-lime-800 dark:text-lime-200 border-r-2 border-lime-500'
                : 'text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--surface-elevated))]'"
              @click="select('commonType', ct.id)"
            >
              <span class="shrink-0 w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span class="font-mono truncate">{{ ct.name }}</span>
              <span class="ml-auto text-xs text-[rgb(var(--text-muted))] shrink-0">{{ ct.type }}</span>
            </button>
          </div>
        </div>

        <div v-if="filteredActionGroups.length > 0">
          <button
            class="w-full flex items-center justify-between px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--surface-elevated))] transition-colors"
            @click="sectionsCollapsed.actionGroups = !sectionsCollapsed.actionGroups"
          >
            <span>Action Groups ({{ filteredActionGroups.length }})</span>
            <svg
              class="w-3 h-3 transition-transform"
              :class="sectionsCollapsed.actionGroups ? '-rotate-90' : ''"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <div v-show="!sectionsCollapsed.actionGroups">
            <button
              v-for="ag in filteredActionGroups"
              :key="ag.id"
              class="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left transition-colors"
              :class="selectedId === ag.id
                ? 'bg-lime-50 dark:bg-lime-900/30 text-lime-800 dark:text-lime-200 border-r-2 border-lime-500'
                : 'text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--surface-elevated))]'"
              @click="select('action', ag.id)"
            >
              <span class="shrink-0 w-1.5 h-1.5 rounded-full bg-lime-500"></span>
              <span class="font-mono truncate">{{ ag.name }}</span>
              <span class="ml-auto text-xs text-[rgb(var(--text-muted))] shrink-0">{{ ag.children.length }} children</span>
            </button>
          </div>
        </div>

        <div v-if="filteredActionItems.length > 0">
          <button
            class="w-full flex items-center justify-between px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--surface-elevated))] transition-colors"
            @click="sectionsCollapsed.actions = !sectionsCollapsed.actions"
          >
            <span>Actions ({{ filteredActionItems.length }})</span>
            <svg
              class="w-3 h-3 transition-transform"
              :class="sectionsCollapsed.actions ? '-rotate-90' : ''"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <div v-show="!sectionsCollapsed.actions">
            <button
              v-for="action in filteredActionItems"
              :key="action.id"
              class="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left transition-colors"
              :class="selectedId === action.id
                ? 'bg-lime-50 dark:bg-lime-900/30 text-lime-800 dark:text-lime-200 border-r-2 border-lime-500'
                : 'text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--surface-elevated))]'"
              @click="select('action', action.id)"
            >
              <span class="shrink-0 w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span class="font-mono truncate">{{ action.name }}</span>
            </button>
          </div>
        </div>

        <div
          v-if="filtered.entities.length === 0 && filtered.actions.length === 0 && filtered.commonTypes.length === 0"
          class="px-3 py-6 text-center"
        >
          <p class="text-xs text-[rgb(var(--text-muted))]">No results for "{{ searchQuery }}"</p>
        </div>
      </div>
    </div>

    <div class="flex-1 min-w-0 overflow-y-auto p-4">
      <SchemaEntityDetail
        v-if="selectedEntity"
        :entity="selectedEntity"
        :schema="schema"
        @navigate="handleNavigate"
      />
      <SchemaActionDetail
        v-if="selectedAction"
        :action="selectedAction"
        :schema="schema"
        @navigate="handleNavigate"
      />
      <SchemaCommonTypeDetail
        v-if="selectedCommonType"
        :commonType="selectedCommonType"
        :schema="schema"
        @navigate="handleNavigate"
      />

      <div
        v-if="!selectedEntity && !selectedAction && !selectedCommonType"
        class="h-full flex items-center justify-center"
      >
        <div class="text-center">
          <svg class="w-10 h-10 mx-auto mb-2 text-[rgb(var(--text-muted))]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p class="text-sm text-[rgb(var(--text-muted))]">Select an item to view details</p>
        </div>
      </div>
    </div>
  </div>
</template> -->





















<script setup lang="ts">
import type { NormalizedSchema, NormalizedEntity, NormalizedAction, NormalizedCommonType } from '~/utils/schema-explorer'
import { filterSchema, shortName } from '~/utils/schema-explorer'
import { useDebounce } from '~/composables/useDebounce'
import { highlightText } from '~/utils/highlight'

const props = defineProps<{
  schema: NormalizedSchema
}>()


const searchQuery = ref('')
const debouncedSearchQuery = useDebounce(searchQuery, 300)
const filtered = computed(() => filterSchema(props.schema, debouncedSearchQuery.value))


const sectionsCollapsed = reactive({
  entities: false,
  commonTypes: false,
  actionGroups: false,
  actions: false,
})


const expandedItems = reactive(new Set<string>())
const userExpandedItems = reactive(new Set<string>())

function toggleItem(id: string) {
  if (expandedItems.has(id)) {
    expandedItems.delete(id)
    userExpandedItems.delete(id)
  } else {
    expandedItems.add(id)
    userExpandedItems.add(id)
  }
}

function isExpanded(id: string): boolean {
  return expandedItems.has(id)
}


watch(debouncedSearchQuery, (query) => {
  const hasQuery = query && query.trim().length > 0
  
  if (hasQuery) {

    sectionsCollapsed.entities = false
    sectionsCollapsed.commonTypes = false
    sectionsCollapsed.actionGroups = false
    sectionsCollapsed.actions = false
    

    filtered.value.entities.forEach(e => expandedItems.add(e.id))
    filtered.value.commonTypes.forEach(ct => expandedItems.add(ct.id))
    filtered.value.actions.forEach(a => expandedItems.add(a.id))
  } else {

    const itemsToKeep = new Set(userExpandedItems)
    expandedItems.clear()
    itemsToKeep.forEach(id => expandedItems.add(id))
  }
}, { immediate: false })


function handleNavigate(type: 'entity' | 'action' | 'commonType', id: string) {

  let resolvedId = id
  if (type === 'entity') {
    if (!props.schema.entityMap.has(id)) {
      const found = props.schema.entities.find(e => e.name === id || e.id === id)
      if (found) resolvedId = found.id
    }
  } else if (type === 'action') {
    if (!props.schema.actionMap.has(id)) {
      const found = props.schema.actions.find(a => a.name === id || a.id === id)
      if (found) resolvedId = found.id
    }
  } else if (type === 'commonType') {
    if (!props.schema.commonTypeMap.has(id)) {
      const found = props.schema.commonTypes.find(ct => ct.name === id || ct.id === id)
      if (found) resolvedId = found.id
    }
  }


  if (type === 'entity') sectionsCollapsed.entities = false
  if (type === 'commonType') sectionsCollapsed.commonTypes = false
  if (type === 'action') {
    const action = props.schema.actionMap.get(resolvedId)
    if (action?.kind === 'actionGroup') {
      sectionsCollapsed.actionGroups = false
    } else {
      sectionsCollapsed.actions = false
    }
  }


  expandedItems.add(resolvedId)
  userExpandedItems.add(resolvedId)


  searchQuery.value = ''


  nextTick(() => {
    const el = document.getElementById(`schema-item-${resolvedId}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })

      el.classList.add('ring-2', 'ring-lime-400', 'ring-offset-1')
      setTimeout(() => {
        el.classList.remove('ring-2', 'ring-lime-400', 'ring-offset-1')
      }, 1500)
    }
  })
}


const filteredActionGroups = computed(() => filtered.value.actions.filter(a => a.kind === 'actionGroup'))
const filteredActionItems = computed(() => filtered.value.actions.filter(a => a.kind === 'action'))


function entitySummary(entity: NormalizedEntity): string {
  if (entity.kind === 'enum') {
    return (entity.enumValues || []).slice(0, 3).join(', ') + (entity.enumValues && entity.enumValues.length > 3 ? '…' : '')
  }
  const parts: string[] = []
  if (entity.attributes.length > 0) parts.push(`${entity.attributes.length} attrs`)
  if (entity.tags) parts.push(`tags: ${entity.tags.type}`)
  if (entity.parents.length > 0) parts.push(`in: ${entity.parents.map(p => shortName(p)).join(', ')}`)
  if (entity.parentOf?.length) parts.push(`parent of: ${entity.parentOf.map(p => shortName(p)).join(', ')}`)
  return parts.join(' · ')
}

function actionSummary(action: NormalizedAction): string {
  if (action.kind === 'actionGroup') {
    return `${action.children.length} child action${action.children.length === 1 ? '' : 's'}`
  }
  const principals = action.principalTypes.map(p => shortName(p)).join(', ') || '—'
  const resources = action.resourceTypes.map(r => shortName(r)).join(', ') || '—'
  return `${principals} → ${resources}`
}

function commonTypeSummary(ct: NormalizedCommonType): string {
  const parts: string[] = [ct.type]
  if (ct.attributes.length > 0) parts.push(`${ct.attributes.length} attrs`)
  if (ct.usedBy.length > 0) parts.push(`used by ${ct.usedBy.length}`)
  return parts.join(' · ')
}

const hasResults = computed(() =>
  filtered.value.entities.length > 0 ||
  filtered.value.actions.length > 0 ||
  filtered.value.commonTypes.length > 0
)
</script>

<template>
  <div class="h-full flex flex-col border border-[rgb(var(--border))] rounded-lg overflow-hidden bg-[rgb(var(--surface))]">
    <div class="shrink-0 flex items-center gap-3 px-3 py-2 border-b border-[rgb(var(--border))] bg-[rgb(var(--surface))]">
      <div class="relative flex-1 max-w-sm">
        <svg class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[rgb(var(--text-muted))]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search entities, actions, types..."
          class="input w-full pl-8 pr-3 py-1.5 text-xs"
          aria-label="Search schema entities, actions, and types"
          aria-describedby="search-description"
        />
        <span id="search-description" class="sr-only">Search will automatically expand matching items and highlight matches</span>
      </div>
      <div class="hidden sm:flex items-center gap-2 text-[10px] text-[rgb(var(--text-muted))]">
        <span class="inline-flex items-center gap-1">
          <span class="w-1.5 h-1.5 rounded-full bg-lime-400"></span>
          {{ schema.stats.totalEntities + schema.stats.totalEnums }} entities
        </span>
        <span class="inline-flex items-center gap-1">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          {{ schema.stats.totalCommonTypes }} types
        </span>
        <span class="inline-flex items-center gap-1">
          <span class="w-1.5 h-1.5 rounded-full bg-lime-500"></span>
          {{ schema.stats.totalActions + schema.stats.totalActionGroups }} actions
        </span>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto">

      <div v-if="filtered.entities.length > 0">
        <button
          class="sticky top-0 z-10 w-full flex items-center justify-between px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-[rgb(var(--text-muted))] bg-[rgb(var(--surface-elevated))] border-b border-[rgb(var(--border))] hover:text-[rgb(var(--text-secondary))] transition-colors"
          @click="sectionsCollapsed.entities = !sectionsCollapsed.entities"
        >
          <span class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-lime-400"></span>
            Entities ({{ filtered.entities.length }})
          </span>
          <svg
            class="w-3.5 h-3.5 transition-transform duration-150"
            :class="sectionsCollapsed.entities ? '-rotate-90' : ''"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <div v-show="!sectionsCollapsed.entities">
          <div
            v-for="entity in filtered.entities"
            :key="entity.id"
            :id="`schema-item-${entity.id}`"
            class="border-b border-[rgb(var(--border))]/60 transition-shadow duration-300"
          >
            <button
              class="w-full flex items-center gap-2 px-3 py-2 text-left transition-colors group"
              :class="isExpanded(entity.id)
                ? 'bg-lime-50/60 dark:bg-lime-950/20'
                : 'hover:bg-[rgb(var(--surface-elevated))]/60'"
              @click="toggleItem(entity.id)"
            >
              <svg
                class="w-3 h-3 text-[rgb(var(--text-muted))] transition-transform duration-150 shrink-0"
                :class="isExpanded(entity.id) ? '' : '-rotate-90'"
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>

              <span class="font-mono text-xs font-semibold text-[rgb(var(--text))]" v-html="highlightText(entity.name, debouncedSearchQuery)"></span>

              <span
                class="px-1.5 py-px text-[9px] font-bold uppercase tracking-wider rounded shrink-0"
                :class="entity.kind === 'enum'
                  ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200'
                  : 'bg-lime-50 dark:bg-lime-900/30 text-lime-800 dark:text-lime-200'"
              >
                {{ entity.kind }}
              </span>

              <span class="ml-auto text-[10px] text-[rgb(var(--text-muted))] truncate max-w-[50%] text-right" v-html="highlightText(entitySummary(entity), debouncedSearchQuery)"></span>
            </button>

            <div v-if="isExpanded(entity.id)" class="px-4 pb-3 pt-1 bg-[rgb(var(--surface))]/50">
              <SchemaEntityDetail
                :entity="entity"
                :schema="schema"
                :searchQuery="debouncedSearchQuery"
                @navigate="handleNavigate"
              />
            </div>
          </div>
        </div>
      </div>

      <div v-if="filtered.commonTypes.length > 0">
        <button
          class="sticky top-0 z-10 w-full flex items-center justify-between px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-[rgb(var(--text-muted))] bg-[rgb(var(--surface-elevated))] border-b border-[rgb(var(--border))] hover:text-[rgb(var(--text-secondary))] transition-colors"
          @click="sectionsCollapsed.commonTypes = !sectionsCollapsed.commonTypes"
        >
          <span class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
            Common Types ({{ filtered.commonTypes.length }})
          </span>
          <svg
            class="w-3.5 h-3.5 transition-transform duration-150"
            :class="sectionsCollapsed.commonTypes ? '-rotate-90' : ''"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <div v-show="!sectionsCollapsed.commonTypes">
          <div
            v-for="ct in filtered.commonTypes"
            :key="ct.id"
            :id="`schema-item-${ct.id}`"
            class="border-b border-[rgb(var(--border))]/60 transition-shadow duration-300"
          >
            <button
              class="w-full flex items-center gap-2 px-3 py-2 text-left transition-colors group"
              :class="isExpanded(ct.id)
                ? 'bg-lime-50/60 dark:bg-lime-950/20'
                : 'hover:bg-[rgb(var(--surface-elevated))]/60'"
              @click="toggleItem(ct.id)"
            >
              <svg
                class="w-3 h-3 text-[rgb(var(--text-muted))] transition-transform duration-150 shrink-0"
                :class="isExpanded(ct.id) ? '' : '-rotate-90'"
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>

              <span class="font-mono text-xs font-semibold text-[rgb(var(--text))]" v-html="highlightText(ct.name, debouncedSearchQuery)"></span>

              <span class="px-1.5 py-px text-[9px] font-bold uppercase tracking-wider rounded shrink-0 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200">
                type
              </span>

              <span class="ml-auto text-[10px] text-[rgb(var(--text-muted))] truncate max-w-[50%] text-right" v-html="highlightText(commonTypeSummary(ct), debouncedSearchQuery)"></span>
            </button>

            <div v-if="isExpanded(ct.id)" class="px-4 pb-3 pt-1 bg-[rgb(var(--surface))]/50">
              <SchemaCommonTypeDetail
                :commonType="ct"
                :schema="schema"
                :searchQuery="debouncedSearchQuery"
                @navigate="handleNavigate"
              />
            </div>
          </div>
        </div>
      </div>

      <div v-if="filteredActionGroups.length > 0">
        <button
          class="sticky top-0 z-10 w-full flex items-center justify-between px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-[rgb(var(--text-muted))] bg-[rgb(var(--surface-elevated))] border-b border-[rgb(var(--border))] hover:text-[rgb(var(--text-secondary))] transition-colors"
          @click="sectionsCollapsed.actionGroups = !sectionsCollapsed.actionGroups"
        >
          <span class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-lime-500"></span>
            Action Groups ({{ filteredActionGroups.length }})
          </span>
          <svg
            class="w-3.5 h-3.5 transition-transform duration-150"
            :class="sectionsCollapsed.actionGroups ? '-rotate-90' : ''"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <div v-show="!sectionsCollapsed.actionGroups">
          <div
            v-for="ag in filteredActionGroups"
            :key="ag.id"
            :id="`schema-item-${ag.id}`"
            class="border-b border-[rgb(var(--border))]/60 transition-shadow duration-300"
          >
            <button
              class="w-full flex items-center gap-2 px-3 py-2 text-left transition-colors group"
              :class="isExpanded(ag.id)
                ? 'bg-lime-50/60 dark:bg-lime-950/20'
                : 'hover:bg-[rgb(var(--surface-elevated))]/60'"
              @click="toggleItem(ag.id)"
            >
              <svg
                class="w-3 h-3 text-[rgb(var(--text-muted))] transition-transform duration-150 shrink-0"
                :class="isExpanded(ag.id) ? '' : '-rotate-90'"
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>

              <span class="font-mono text-xs font-semibold text-[rgb(var(--text))]" v-html="highlightText(ag.name, debouncedSearchQuery)"></span>

              <span class="px-1.5 py-px text-[9px] font-bold uppercase tracking-wider rounded shrink-0 bg-lime-50 dark:bg-lime-900/30 text-lime-800 dark:text-lime-200">
                group
              </span>

              <span class="ml-auto text-[10px] text-[rgb(var(--text-muted))] truncate max-w-[50%] text-right" v-html="highlightText(actionSummary(ag), debouncedSearchQuery)"></span>
            </button>

            <div v-if="isExpanded(ag.id)" class="px-4 pb-3 pt-1 bg-[rgb(var(--surface))]/50">
              <SchemaActionDetail
                :action="ag"
                :schema="schema"
                :searchQuery="debouncedSearchQuery"
                @navigate="handleNavigate"
              />
            </div>
          </div>
        </div>
      </div>

      <div v-if="filteredActionItems.length > 0">
        <button
          class="sticky top-0 z-10 w-full flex items-center justify-between px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-[rgb(var(--text-muted))] bg-[rgb(var(--surface-elevated))] border-b border-[rgb(var(--border))] hover:text-[rgb(var(--text-secondary))] transition-colors"
          @click="sectionsCollapsed.actions = !sectionsCollapsed.actions"
        >
          <span class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-lime-500"></span>
            Actions ({{ filteredActionItems.length }})
          </span>
          <svg
            class="w-3.5 h-3.5 transition-transform duration-150"
            :class="sectionsCollapsed.actions ? '-rotate-90' : ''"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <div v-show="!sectionsCollapsed.actions">
          <div
            v-for="action in filteredActionItems"
            :key="action.id"
            :id="`schema-item-${action.id}`"
            class="border-b border-[rgb(var(--border))]/60 transition-shadow duration-300"
          >
            <button
              class="w-full flex items-center gap-2 px-3 py-2 text-left transition-colors group"
              :class="isExpanded(action.id)
                ? 'bg-lime-50/60 dark:bg-lime-950/20'
                : 'hover:bg-[rgb(var(--surface-elevated))]/60'"
              @click="toggleItem(action.id)"
            >
              <svg
                class="w-3 h-3 text-[rgb(var(--text-muted))] transition-transform duration-150 shrink-0"
                :class="isExpanded(action.id) ? '' : '-rotate-90'"
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>

              <span class="font-mono text-xs font-semibold text-[rgb(var(--text))]" v-html="highlightText(action.name, debouncedSearchQuery)"></span>

              <span class="px-1.5 py-px text-[9px] font-bold uppercase tracking-wider rounded shrink-0 bg-lime-50 dark:bg-lime-900/30 text-lime-800 dark:text-lime-200">
                action
              </span>

              <template v-if="action.memberOf.length > 0">
                <span
                  v-for="parentId in action.memberOf"
                  :key="parentId"
                  class="px-1 py-px text-[9px] rounded bg-lime-50/70 dark:bg-lime-900/20 text-lime-700 dark:text-lime-200"
                >
                  <span v-html="highlightText(shortName(parentId), debouncedSearchQuery)"></span>
                </span>
              </template>

              <span class="ml-auto text-[10px] text-[rgb(var(--text-muted))] truncate max-w-[50%] text-right font-mono" v-html="highlightText(actionSummary(action), debouncedSearchQuery)"></span>
            </button>

            <div v-if="isExpanded(action.id)" class="px-4 pb-3 pt-1 bg-[rgb(var(--surface))]/50">
              <SchemaActionDetail
                :action="action"
                :schema="schema"
                :searchQuery="debouncedSearchQuery"
                @navigate="handleNavigate"
              />
            </div>
          </div>
        </div>
      </div>

      <div v-if="!hasResults" class="px-4 py-12 text-center">
        <svg class="w-8 h-8 mx-auto mb-2 text-[rgb(var(--text-muted))]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <p v-if="debouncedSearchQuery" class="text-xs text-[rgb(var(--text-muted))]">
          No results for "<span class="font-semibold">{{ debouncedSearchQuery }}</span>"
        </p>
        <p v-else class="text-xs text-[rgb(var(--text-muted))]">
          Schema is empty — no entities or actions found.
        </p>
      </div>

    </div>
  </div>
</template>