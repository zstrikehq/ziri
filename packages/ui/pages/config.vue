<script setup lang="ts">
import { useConfigStore } from '~/stores/config'
import { useAuth } from '~/composables/useAuth'
import { useSchema } from '~/composables/useSchema'
import { useRules } from '~/composables/useRules'
import { useKeys } from '~/composables/useKeys'
import { useToast } from '~/composables/useToast'

const configStore = useConfigStore()
const { testConnection } = useAuth()
const { getSchema } = useSchema()
const { listRules } = useRules()
const { listKeys } = useKeys()
const toast = useToast()

const isTesting = ref(false)
const isSaving = ref(false)
const showMasterKey = ref(false)

// Local form state
const form = reactive({
  projectId: '',
  orgId: '',
  clientId: '',
  clientSecret: '',
  pdpUrl: '',
  proxyUrl: '',
  port: 3100,
  logLevel: 'info' as 'debug' | 'info' | 'warn' | 'error'
})

onMounted(async () => {
  form.projectId = configStore.projectId
  form.orgId = configStore.orgId
  form.clientId = configStore.clientId
  form.clientSecret = configStore.clientSecret
  form.pdpUrl = configStore.pdpUrl
  form.proxyUrl = configStore.proxyUrl || window.location.origin
  form.port = configStore.port
  form.logLevel = configStore.logLevel
  
  // Load master key if available
  try {
    const response = await fetch('/api/config')
    if (response.ok) {
      const config = await response.json()
      if (config.masterKey) {
        configStore.masterKey = config.masterKey
      }
    }
  } catch (e) {
    // Ignore
  }
})

const saveConfig = async () => {
  isSaving.value = true
  try {
    await configStore.updateConfig(form)
    // Wait for next tick and a small delay to ensure reactive state is updated and localStorage is written
    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Verify the config was saved correctly
    console.log('[CONFIG PAGE] After save, isConfigured:', configStore.isConfigured)
    console.log('[CONFIG PAGE] Config values:', {
      projectId: configStore.projectId,
      orgId: configStore.orgId,
      hasClientId: !!configStore.clientId,
      hasClientSecret: !!configStore.clientSecret
    })
    
    toast.success('Configuration saved successfully')
    
    // Auto-load data after saving config (if connection is valid)
    if (configStore.isConfigured) {
      try {
        // Test connection first
        const connectionResult = await testConnection()
        if (connectionResult.success) {
          // Load all data in parallel
          await Promise.allSettled([
            getSchema().catch(() => {}),
            listRules().catch(() => {}),
            listKeys().catch(() => {})
          ])
          toast.info('Data loaded successfully')
        }
      } catch (e) {
        // Connection test failed, but config is saved
        console.warn('Could not load data after saving config:', e)
      }
    }
  } catch (e: any) {
    toast.error('Failed to save configuration')
  } finally {
    isSaving.value = false
  }
}

const handleTestConnection = async () => {
  isTesting.value = true
  try {
    await configStore.updateConfig(form)
    await nextTick()
    const result = await testConnection()
    if (result.success) {
      toast.success('Connection successful! Token obtained.')
      
      // Auto-load data after successful connection test
      try {
        await Promise.allSettled([
          getSchema().catch(() => {}),
          listRules().catch(() => {}),
          listKeys().catch(() => {})
        ])
        toast.info('Data loaded successfully')
      } catch (e) {
        console.warn('Could not load data:', e)
      }
    } else {
      toast.error(`Connection failed: ${result.error}`)
    }
  } catch (e: any) {
    toast.error(`Connection failed: ${e.message}`)
  } finally {
    isTesting.value = false
  }
}

const resetToDefaults = async () => {
  await configStore.resetToDefaults()
  await nextTick()
  form.projectId = configStore.projectId
  form.orgId = configStore.orgId
  form.clientId = configStore.clientId
  form.clientSecret = configStore.clientSecret
  form.pdpUrl = configStore.pdpUrl
  form.proxyUrl = configStore.proxyUrl || window.location.origin
  form.port = configStore.port
  form.logLevel = configStore.logLevel
  toast.info('Configuration reset to defaults')
}

const copyMasterKey = () => {
  if (configStore.masterKey) {
    navigator.clipboard.writeText(configStore.masterKey)
    toast.success('Master key copied to clipboard')
  }
}
</script>

<template>
  <form @submit.prevent="saveConfig" class="max-w-2xl space-y-6">
    <!-- Cedar Backend Configuration -->
    <section class="card">
      <div class="flex items-center gap-3 mb-5">
        <div class="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
          <svg class="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
          </svg>
        </div>
        <h3 class="text-sm font-bold text-[rgb(var(--text))]">Cedar Backend</h3>
      </div>
      <div class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <UiInput v-model="form.projectId" label="Project ID" placeholder="my-project-id" />
          <UiInput v-model="form.orgId" label="Organization ID" placeholder="my-org-id" />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <UiInput v-model="form.clientId" label="Client ID" placeholder="client-id" />
          <UiInput v-model="form.clientSecret" label="Client Secret" type="password" placeholder="••••••••" />
        </div>
        <div>
          <UiInput v-model="form.pdpUrl" label="PDP URL" type="url" placeholder="http://localhost:8180" />
          <p class="text-xs text-[rgb(var(--text-secondary))] mt-1.5">
            Policy Decision Point URL for authorization
          </p>
        </div>
        <div class="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <p class="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-1">Backend URL</p>
          <p class="text-xs text-blue-700 dark:text-blue-300">
            Fixed to: <code class="font-mono">https://api-dev.authzebra.com</code>
          </p>
        </div>
      </div>
    </section>

    <!-- Proxy Settings -->
    <section class="card">
      <div class="flex items-center gap-3 mb-5">
        <div class="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
          <svg class="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <h3 class="text-sm font-bold text-[rgb(var(--text))]">Proxy Settings</h3>
      </div>
      <div class="space-y-4">
        <div>
          <UiInput v-model="form.proxyUrl" label="Proxy URL" type="url" placeholder="http://localhost:3100" />
          <p class="text-xs text-[rgb(var(--text-secondary))] mt-1.5">
            Optional: Proxy server URL (defaults to current origin)
          </p>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <UiInput v-model.number="form.port" label="Port" type="number" />
          <div>
            <label class="block text-xs font-semibold text-[rgb(var(--text-secondary))] mb-1.5">Log Level</label>
            <select 
              v-model="form.logLevel"
              class="input"
            >
              <option value="debug">Debug</option>
              <option value="info">Info</option>
              <option value="warn">Warn</option>
              <option value="error">Error</option>
            </select>
          </div>
        </div>
      </div>
    </section>

    <!-- Master Key (Read-only) -->
    <section class="card" v-if="configStore.masterKey">
      <div class="flex items-center gap-3 mb-5">
        <div class="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
          <svg class="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
        </div>
        <h3 class="text-sm font-bold text-[rgb(var(--text))]">Master Key</h3>
      </div>
      <div class="space-y-3">
        <div class="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
          <div class="flex items-center justify-between mb-2">
            <p class="text-xs font-semibold text-yellow-900 dark:text-yellow-100">Master Key</p>
            <div class="flex gap-2">
              <button
                type="button"
                @click="showMasterKey = !showMasterKey"
                class="text-xs px-2 py-1 rounded bg-yellow-100 dark:bg-yellow-800 text-yellow-900 dark:text-yellow-100 hover:bg-yellow-200 dark:hover:bg-yellow-700 transition-colors"
              >
                {{ showMasterKey ? 'Hide' : 'Show' }}
              </button>
              <button
                type="button"
                @click="copyMasterKey"
                class="text-xs px-2 py-1 rounded bg-yellow-100 dark:bg-yellow-800 text-yellow-900 dark:text-yellow-100 hover:bg-yellow-200 dark:hover:bg-yellow-700 transition-colors"
              >
                Copy
              </button>
            </div>
          </div>
          <code class="text-xs font-mono text-yellow-800 dark:text-yellow-200 break-all">
            {{ showMasterKey ? configStore.masterKey : '••••••••••••••••••••••••••••••••' }}
          </code>
        </div>
        <p class="text-xs text-[rgb(var(--text-secondary))]">
          ⚠️ This master key is required for all admin operations. Store it securely.
        </p>
      </div>
    </section>

    <!-- Actions -->
    <div class="flex gap-3">
      <UiButton type="submit" :loading="isSaving">
        Save Configuration
      </UiButton>
      <UiButton type="button" variant="outline" :loading="isTesting" @click="handleTestConnection">
        Test Connection
      </UiButton>
      <UiButton type="button" variant="ghost" @click="resetToDefaults">
        Reset
      </UiButton>
    </div>
  </form>
</template>
