<script setup lang="ts">
import { useConfigStore } from '~/stores/config'
import { useToast } from '~/composables/useToast'
import { useAdminAuth } from '~/composables/useAdminAuth'
import { validateEmail, validateEmailOrFromAddress, getFromAddressValidationHint } from '~/utils/validators'
import { useInternalAuth } from '~/composables/useInternalAuth'
import { useApiError } from '~/composables/useApiError'

const configStore = useConfigStore()
const toast = useToast()
const { getAuthHeader } = useAdminAuth()
const { checkAction } = useInternalAuth()
const { getUserMessage } = useApiError()

const isSaving = ref(false)
const permissionsLoading = ref(true)
const canUpdateConfig = ref(false)

interface EmailProviderField {
  key: string
  label: string
  type: 'text' | 'password' | 'number' | 'checkbox' | 'url'
  required?: boolean
  placeholder?: string
  help?: string
}

interface EmailProviderDef {
  id: string
  label: string
  fields: EmailProviderField[]
  fromRequired: boolean
}

const emailProviders = ref<EmailProviderDef[]>([])

 
const form = reactive({
  publicUrl: '',
  email: {
    enabled: false,
    provider: 'manual' as string,
    options: {} as Record<string, Record<string, unknown>>,
    fromByProvider: {} as Record<string, string>
  },
  logLevel: 'info' as 'debug' | 'info' | 'warn' | 'error'
})

function isProviderScopedOptions(opts: Record<string, unknown>): boolean {
  return Object.values(opts).some(
    v => typeof v === 'object' && v !== null && !Array.isArray(v)
  )
}

const mapEmailConfigToForm = (raw: any) => {
  const e = raw || {}
  const provider = (e.provider || 'manual') as string
  const options: Record<string, Record<string, unknown>> = {}

  if (e.options && typeof e.options === 'object') {
    const opts = e.options as Record<string, unknown>
    if (isProviderScopedOptions(opts)) {
      for (const [pid, vals] of Object.entries(opts)) {
        if (vals && typeof vals === 'object' && !Array.isArray(vals)) {
          options[pid] = { ...(vals as Record<string, unknown>) }
        }
      }
    } else {
      options[provider] = { ...opts }
    }
  } else {
    const flat: Record<string, unknown> = {}
    if (provider === 'smtp' && e.smtp) {
      flat.host = e.smtp.host ?? ''
      flat.port = e.smtp.port ?? 587
      flat.secure = e.smtp.secure ?? false
      flat.user = e.smtp.auth?.user ?? ''
      flat.pass = e.smtp.auth?.pass ?? ''
    }
    if (provider === 'sendgrid' && e.sendgrid) {
      flat.apiKey = e.sendgrid.apiKey ?? ''
    }
    if (provider === 'mailgun' && e.mailgun) {
      flat.apiKey = e.mailgun.apiKey ?? ''
      flat.domain = e.mailgun.domain ?? ''
      flat.apiUrl = e.mailgun.apiUrl ?? ''
    }
    if (provider === 'ses' && e.ses) {
      flat.accessKeyId = e.ses.accessKeyId ?? ''
      flat.secretAccessKey = e.ses.secretAccessKey ?? ''
      flat.region = e.ses.region ?? 'us-east-1'
    }
    options[provider] = flat
  }

  if (!options[provider]) {
    options[provider] = {}
  }

  const fromByProvider: Record<string, string> = {}
  if (e.fromByProvider && typeof e.fromByProvider === 'object') {
    for (const [pid, val] of Object.entries(e.fromByProvider)) {
      if (typeof val === 'string') fromByProvider[pid] = val
    }
  }
  if ((e.from ?? '') && !fromByProvider[provider]) {
    fromByProvider[provider] = e.from as string
  }

  form.email = {
    enabled: e.enabled ?? false,
    provider,
    options,
    fromByProvider
  }
}

watch(() => form.email.provider, (newProvider) => {
  if (newProvider) {
    if (!form.email.options[newProvider]) form.email.options[newProvider] = {}
    if (!(newProvider in form.email.fromByProvider)) form.email.fromByProvider[newProvider] = ''
  }
}, { immediate: true })

const currentProviderOptions = computed(() => {
  const p = form.email.provider
  if (!form.email.options[p]) form.email.options[p] = {}
  return form.email.options[p] as Record<string, unknown>
})

onMounted(async () => {

  permissionsLoading.value = true
  try {
    const check = await checkAction('update_config', 'config')
    canUpdateConfig.value = check.allowed
  } finally {
    permissionsLoading.value = false
  }
 
  try {
    const authHeader = getAuthHeader()
    const headers: Record<string, string> = {}
    if (authHeader) headers['Authorization'] = authHeader
    const providersRes = await fetch('/api/config/email-providers', { headers })
    if (providersRes.ok) {
      const body = await providersRes.json()
      emailProviders.value = body.providers || []
    }
  } catch {
  }
 
  try {
    const authHeader = getAuthHeader()
    const headers: Record<string, string> = {}
    if (authHeader) headers['Authorization'] = authHeader

    const response = await fetch('/api/config', { headers })
    if (response.ok) {
      const config = await response.json()
      form.publicUrl = config.publicUrl || ''
      mapEmailConfigToForm(config.email)
      form.logLevel = config.logLevel || 'info'
    } else {

      form.publicUrl = configStore.publicUrl || ''
      const stored = configStore.email
      mapEmailConfigToForm(stored)
      form.logLevel = configStore.logLevel || 'info'
    }
  } catch (e) {

    form.publicUrl = configStore.publicUrl || ''
    const stored = configStore.email
    mapEmailConfigToForm(stored)
    form.logLevel = configStore.logLevel || 'info'
  }
})

function validateEmailConfig(): string | null {
  if (!form.email.enabled) return null
  const { provider, options, fromByProvider } = form.email
  const selected = emailProviders.value.find(p => p.id === provider)
  const providerOpts = options[provider] || {}
  const from = fromByProvider[provider] ?? ''

  if (selected) {
    for (const field of selected.fields) {
      if (!field.required) continue
      const v = providerOpts[field.key]
      if (field.type === 'checkbox') {
        if (!v) return `${field.label} is required`
      } else {
        const s = typeof v === 'string' ? v : v != null ? String(v) : ''
        if (!s.trim()) return `${field.label} is required`
      }
    }
  }

  if (selected?.fromRequired) {
    if (!from?.trim()) {
      if (provider === 'sendgrid') return 'From Address is required for SendGrid'
      if (provider === 'mailgun') return 'From Address is required for Mailgun'
      if (provider === 'ses') return 'From Address is required for AWS SES (must be verified in SES)'
      return 'From Address is required'
    }
    if (provider === 'sendgrid') {
      if (!validateEmail(from)) return 'Valid From Address is required'
    } else if (provider === 'mailgun' || provider === 'ses') {
      if (!validateEmailOrFromAddress(from)) {
        const hint = getFromAddressValidationHint(from)
        return hint || 'Valid From Address is required (e.g. noreply@example.com or "Name" <noreply@example.com>)'
      }
    }
  }

  return null
}

function buildCleanEmailPayload() {
  const currentProvider = form.email.provider
  const options: Record<string, Record<string, unknown>> = {}
  const fromByProvider: Record<string, string> = {}

  if (currentProvider) {
    options[currentProvider] = form.email.options[currentProvider] || {}
    const fromVal = form.email.fromByProvider[currentProvider]?.trim()
    if (fromVal) fromByProvider[currentProvider] = fromVal
  }

  return {
    ...form,
    email: {
      enabled: form.email.enabled,
      provider: currentProvider,
      options,
      fromByProvider
    }
  }
}

const saveConfig = async () => {

  const check = await checkAction('update_config', 'config')
  if (!check.allowed) {
    toast.error('You do not have permission to update configuration')
    return
  }

  const emailError = validateEmailConfig()
  if (emailError) {
    toast.error(emailError)
    return
  }
  
  isSaving.value = true
  try {
    await configStore.updateConfig(buildCleanEmailPayload())
    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))
    
    toast.success('Config saved')
    toast.info('Restart the server for changes to take effect')
  } catch (e: any) {
    toast.error(getUserMessage(e))
  } finally {
    isSaving.value = false
  }
}

const resetToDefaults = async () => {
  form.publicUrl = ''
  form.email = {
    enabled: false,
    provider: 'manual',
    options: {},
    fromByProvider: {}
  }
  form.logLevel = 'info'
  await configStore.updateConfig(form)
  toast.info('Configuration reset to defaults')
}
</script>

<template>
  <div class="max-w-4xl space-y-6">
    <!-- Permissions Loading Skeleton -->
    <div v-if="permissionsLoading" class="max-w-2xl space-y-6">
      <!-- Header Skeleton -->
      <div class="skeleton-shimmer h-8 w-48 rounded-lg"></div>

      <!-- Server Settings Card Skeleton -->
      <section class="card">
        <div class="flex items-center gap-3 mb-5">
          <div class="skeleton-shimmer h-10 w-10 rounded-lg"></div>
          <div class="skeleton-shimmer h-5 w-32 rounded"></div>
        </div>
        <div class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <div class="skeleton-shimmer h-4 w-16 rounded"></div>
              <div class="skeleton-shimmer h-10 w-full rounded-lg"></div>
              <div class="skeleton-shimmer h-3 w-48 rounded"></div>
            </div>
            <div class="space-y-2">
              <div class="skeleton-shimmer h-4 w-16 rounded"></div>
              <div class="skeleton-shimmer h-10 w-full rounded-lg"></div>
              <div class="skeleton-shimmer h-3 w-40 rounded"></div>
            </div>
          </div>
          <div class="space-y-2">
            <div class="skeleton-shimmer h-4 w-24 rounded"></div>
            <div class="skeleton-shimmer h-10 w-full rounded-lg"></div>
            <div class="skeleton-shimmer h-3 w-64 rounded"></div>
          </div>
          <div class="space-y-2">
            <div class="skeleton-shimmer h-4 w-20 rounded"></div>
            <div class="skeleton-shimmer h-10 w-full rounded-lg"></div>
          </div>
        </div>
      </section>

      <!-- Email Settings Card Skeleton -->
      <section class="card">
        <div class="flex items-center gap-3 mb-5">
          <div class="skeleton-shimmer h-10 w-10 rounded-lg"></div>
          <div class="skeleton-shimmer h-5 w-32 rounded"></div>
        </div>
        <div class="space-y-4">
          <div class="flex items-center gap-2">
            <div class="skeleton-shimmer h-5 w-5 rounded"></div>
            <div class="skeleton-shimmer h-5 w-32 rounded"></div>
          </div>
          <div class="space-y-2">
            <div class="skeleton-shimmer h-4 w-24 rounded"></div>
            <div class="skeleton-shimmer h-10 w-full rounded-lg"></div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <div class="skeleton-shimmer h-4 w-20 rounded"></div>
              <div class="skeleton-shimmer h-10 w-full rounded-lg"></div>
            </div>
            <div class="space-y-2">
              <div class="skeleton-shimmer h-4 w-20 rounded"></div>
              <div class="skeleton-shimmer h-10 w-full rounded-lg"></div>
            </div>
          </div>
        </div>
      </section>

      <!-- Actions Skeleton -->
      <div class="flex gap-3">
        <div class="skeleton-shimmer h-10 w-40 rounded-lg"></div>
        <div class="skeleton-shimmer h-10 w-24 rounded-lg"></div>
      </div>
    </div>

    <!-- Main Content (only show after permissions load) -->
    <template v-else>
      <form @submit.prevent="saveConfig" class="max-w-2xl space-y-6">
    <!-- Server Settings -->
    <section class="card">
      <div class="flex items-center gap-3 mb-5">
        <div class="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
          <svg class="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
          </svg>
        </div>
        <h3 class="text-sm font-bold text-[rgb(var(--text))]">Server Settings</h3>
      </div>
      <div class="space-y-4">
        <div>
          <UiInput v-model="form.publicUrl" label="Public URL" type="url" placeholder="https://your-ngrok-url.ngrok.io" :disabled="!canUpdateConfig" />
          <p class="text-xs text-[rgb(var(--text-secondary))] mt-1.5">
            Optional: Public URL for sharing with users (ngrok, Tailscale, etc.)
          </p>
        </div>
        <div>
          <label class="block text-xs font-semibold text-[rgb(var(--text-secondary))] mb-1.5">Log Level</label>
          <div class="input bg-[rgb(var(--surface-elevated))] text-[rgb(var(--text-muted))]">
            {{ (form.logLevel || 'info').toUpperCase() }}
          </div>
          <p class="text-xs text-[rgb(var(--text-secondary))] mt-1.5">
            Update log level in <code class="font-mono">%APPDATA%\ziri\config.json</code> (Windows) or <code class="font-mono">~/.ziri/config.json</code>, then restart the proxy.
          </p>
        </div>
      </div>
    </section>

    <!-- Email Settings -->
    <section class="card">
      <div class="flex items-center gap-3 mb-5">
        <div class="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
          <svg class="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 class="text-sm font-bold text-[rgb(var(--text))]">Email Settings</h3>
      </div>
      <div class="space-y-4">
        <div class="flex items-center gap-2">
          <input
            type="checkbox"
            id="emailEnabled"
            v-model="form.email.enabled"
            class="w-4 h-4 rounded border-[rgb(var(--border))]"
            :disabled="!canUpdateConfig"
          />
          <label for="emailEnabled" class="text-sm font-semibold text-[rgb(var(--text))]">
            Enable Email Service
          </label>
        </div>

        <div v-if="form.email.enabled" class="space-y-4 pl-6 border-l-2 border-[rgb(var(--border))]">
          <div>
            <label class="block text-xs font-semibold text-[rgb(var(--text-secondary))] mb-1.5">Provider</label>
            <select v-model="form.email.provider" class="input" :disabled="!canUpdateConfig">
              <option v-if="!emailProviders.length" value="manual">Manual (Log to Console)</option>
              <option v-for="p in emailProviders" :key="p.id" :value="p.id">
                {{ p.label }}
              </option>
            </select>
          </div>

          <div v-if="emailProviders.length" class="space-y-3">
            <div v-for="field in (emailProviders.find(p => p.id === form.email.provider)?.fields || [])" :key="field.key">
              <UiInput
                v-if="field.type === 'text' || field.type === 'password' || field.type === 'url' || field.type === 'number'"
                v-model="currentProviderOptions[field.key]"
                :label="field.label"
                :type="field.type === 'password' ? 'password' : (field.type === 'number' ? 'number' : 'text')"
                :placeholder="field.placeholder"
                :disabled="!canUpdateConfig"
              />
              <div v-else-if="field.type === 'checkbox'" class="flex items-center gap-2">
                <input
                  type="checkbox"
                  :id="`email-field-${field.key}`"
                  v-model="currentProviderOptions[field.key]"
                  class="w-4 h-4 rounded border-[rgb(var(--border))]"
                  :disabled="!canUpdateConfig"
                />
                <label :for="`email-field-${field.key}`" class="text-sm text-[rgb(var(--text-secondary))]">
                  {{ field.label }}
                </label>
              </div>
              <p v-if="field.help" class="text-xs text-[rgb(var(--text-secondary))] mt-1.5">
                {{ field.help }}
              </p>
            </div>
          </div>

          <div v-if="emailProviders.find(p => p.id === form.email.provider)?.fromRequired">
            <UiInput
              v-model="form.email.fromByProvider[form.email.provider]"
              label="From Address"
              type="text"
              placeholder="noreply@example.com or Name &lt;noreply@example.com&gt;"
              :disabled="!canUpdateConfig"
            />
          </div>
        </div>
      </div>
    </section>

    <!-- Actions -->
    <div class="flex gap-3">
      <UiButton type="submit" :loading="isSaving" :disabled="!canUpdateConfig">
        Save Configuration
      </UiButton>
      <UiButton type="button" variant="ghost" @click="resetToDefaults" :disabled="!canUpdateConfig">
        Reset
      </UiButton>
    </div>
      </form>
    </template>
  </div>
</template>
