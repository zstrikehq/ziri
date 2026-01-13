<script setup lang="ts">
import { useSchema } from '~/composables/useSchema'
import { useConfigStore } from '~/stores/config'
import { useCedarSchema } from '~/composables/useCedarSchema'
import { formatDate } from '~/utils/formatters'

const configStore = useConfigStore()
const { getSchema, refreshSchema, schemaString, schema, lastSyncedAt, loading } = useSchema()
const { jsonToCedar } = useCedarSchema()

// View mode: 'json' or 'cedar'
const viewMode = ref<'json' | 'cedar'>('json')

// Auto-load schema when page mounts (if config is set)
onMounted(async () => {
  console.log('[SCHEMA PAGE] onMounted called')
  console.log('[SCHEMA PAGE] Config state:', {
    projectId: configStore.projectId,
    isConfigured: configStore.isConfigured
  })
  
  // Wait a tick to ensure config is loaded
  await nextTick()
  console.log('[SCHEMA PAGE] After nextTick, isConfigured:', configStore.isConfigured)
  
  if (configStore.isConfigured) {
    console.log('[SCHEMA PAGE] ✅ Config is set, loading schema...')
    try {
      await getSchema()
      console.log('[SCHEMA PAGE] ✅ Schema loaded')
    } catch (e) {
      console.error('[SCHEMA PAGE] Error loading schema:', e)
    }
  } else {
    console.log('[SCHEMA PAGE] ❌ Config not set, skipping schema load')
  }
})

// Demo schema
const demoSchema = ref(`{
  "": {
    "entityTypes": {
      "User": {
        "shape": {
          "type": "Record",
          "attributes": {
            "user_id": { "type": "String" },
            "name": { "type": "String" },
            "email": { "type": "String" },
            "role": { "type": "String" },
            "department": { "type": "String" },
            "security_clearance": { "type": "Long" },
            "training_completed": { "type": "Boolean" },
            "years_of_service": { "type": "Extension", "name": "decimal" },
            "daily_spend_limit": { "type": "Extension", "name": "decimal" },
            "monthly_spend_limit": { "type": "Extension", "name": "decimal" },
            "current_daily_spend": { "type": "Extension", "name": "decimal" },
            "current_monthly_spend": { "type": "Extension", "name": "decimal" },
            "allowed_ip_ranges": { 
              "type": "Set", 
              "element": { "type": "Extension", "name": "ipaddr" } 
            },
            "status": { "type": "String" },
            "created_at": { "type": "String" }
          }
        }
      }
    },
    "actions": {
      "llm_query": {
        "appliesTo": {
          "principalTypes": ["User"],
          "resourceTypes": ["Model"]
        }
      }
    }
  }
}`)

const displaySchema = computed(() => {
  if (viewMode.value === 'cedar') {
    try {
      // Use schema from store if available, otherwise parse from string
      const jsonSchema = schema.value || (schemaString.value ? JSON.parse(schemaString.value) : JSON.parse(demoSchema.value))
      const cedarFormat = jsonToCedar(jsonSchema)
      return cedarFormat || schemaString.value || demoSchema.value
    } catch (e) {
      console.error('Failed to convert to Cedar format:', e)
      return schemaString.value || demoSchema.value
    }
  }
  return schemaString.value || demoSchema.value
})

const displayLastSynced = computed(() => lastSyncedAt.value || new Date())

const toggleViewMode = () => {
  viewMode.value = viewMode.value === 'json' ? 'cedar' : 'json'
}

const handleRefresh = async () => {
  try {
    await refreshSchema()
  } catch (e) {
    // Error handled by composable
  }
}
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- Toolbar -->
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-3">
        <span class="badge badge-neutral">v1.0</span>
        <span class="text-xs text-[rgb(var(--text-muted))]">
          Synced: {{ formatDate(displayLastSynced) }}
        </span>
      </div>
      <div class="flex items-center gap-2">
        <div class="flex items-center gap-1 rounded-lg border-2 border-[rgb(var(--border))] p-1">
          <button
            @click="viewMode = 'json'"
            :class="[
              'px-3 py-1 rounded text-xs font-medium transition-all',
              viewMode === 'json'
                ? 'bg-indigo-500 text-white'
                : 'text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text))]'
            ]"
          >
            JSON
          </button>
          <button
            @click="viewMode = 'cedar'"
            :class="[
              'px-3 py-1 rounded text-xs font-medium transition-all',
              viewMode === 'cedar'
                ? 'bg-indigo-500 text-white'
                : 'text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text))]'
            ]"
          >
            Cedar
          </button>
        </div>
        <UiButton size="sm" variant="outline" :loading="loading" @click="handleRefresh">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </UiButton>
        <UiCopyButton :text="displaySchema" />
      </div>
    </div>
    
    <!-- Schema Viewer -->
    <div class="flex-1 min-h-0 card p-0 overflow-hidden">
      <div v-if="loading" class="p-6">
        <UiLoadingSkeleton :lines="15" height="h-5" />
      </div>
      <textarea 
        v-else
        :value="displaySchema" 
        readonly
        class="w-full h-full p-5 font-mono text-xs bg-transparent text-[rgb(var(--text))] border-0 resize-none focus:outline-none leading-relaxed"
        spellcheck="false"
      />
    </div>
  </div>
</template>
