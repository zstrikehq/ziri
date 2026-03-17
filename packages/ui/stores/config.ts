import { defineStore } from 'pinia'
import { extractApiErrorMessage } from '~/composables/useApiError'
import { useAdminAuthStore } from '~/stores/admin-auth'
import type { GatewayConfig } from '~/types/config'
import { defaultConfig } from '~/types/config'
import { getCookie, setCookie } from '~/utils/cookies'

const STORAGE_KEY = 'llm-gateway-config'
const STORAGE_DAYS = 365

function getAdminAuthHeader(): string | null {
  const adminAuthStore = useAdminAuthStore()
  return adminAuthStore.accessToken ? `Bearer ${adminAuthStore.accessToken}` : null
}

function resolvePort(config: Record<string, any>): number {
  return config.port || config.server?.port || 3100
}

function normalizeGatewayConfig(config: Record<string, any>): GatewayConfig {
  const port = resolvePort(config)
  return {
    server: config.server || {
      host: config.host || '127.0.0.1',
      port
    },
    publicUrl: config.publicUrl || '',
    email: config.email || {
      enabled: false,
      provider: 'manual'
    },
    proxyUrl: config.proxyUrl || '',
    port,
    logLevel: config.logLevel || 'info'
  }
}

function getPersistedState(config: GatewayConfig): Partial<GatewayConfig> {
  return {
    server: config.server || {
      host: '127.0.0.1',
      port: config.port || 3100
    },
    publicUrl: config.publicUrl || '',
    email: config.email || {
      enabled: false,
      provider: 'manual'
    },
    proxyUrl: config.proxyUrl || '',
    port: config.port || config.server?.port || 3100,
    logLevel: config.logLevel || 'info'
  }
}

export const useConfigStore = defineStore('config', {
  state: () => ({
    ...defaultConfig
  }),

  getters: {
    isConfigured: (state) => !!(state.server?.port || state.port)
  },

  actions: {
    async loadFromStorage() {
      if (!import.meta.client) {
        return
      }

      try {
        const authHeader = getAdminAuthHeader()
        const headers: Record<string, string> = {}
        if (authHeader) headers.Authorization = authHeader

        const response = await fetch('/api/config', { headers })
        if (response.ok) {
          const config = await response.json()
          const normalized = normalizeGatewayConfig(config)
          this.$patch(normalized)
          setCookie(STORAGE_KEY, JSON.stringify(this.$state), STORAGE_DAYS)
          return
        }
      } catch {
      }

      const stored = getCookie(STORAGE_KEY)
      if (!stored) return

      try {
        const parsed = JSON.parse(stored)
        this.$patch(normalizeGatewayConfig(parsed))
      } catch {
      }
    },

    async saveToStorage() {
      if (!import.meta.client) return

      const configToSave: Partial<GatewayConfig> = {
        server: this.server || {
          host: '127.0.0.1',
          port: this.port || 3100
        },
        publicUrl: this.publicUrl || '',
        email: this.email || {
          enabled: false,
          provider: 'manual'
        },
        logLevel: this.logLevel || 'info'
      }

      setCookie(STORAGE_KEY, JSON.stringify(getPersistedState(this.$state)), STORAGE_DAYS)

      try {
        const authHeader = getAdminAuthHeader()
        if (!authHeader) return

        const response = await fetch('/api/config', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: authHeader
          },
          body: JSON.stringify(configToSave)
        })

        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: response.statusText }))
          throw new Error(extractApiErrorMessage({ data: error }, 'Failed to save configuration'))
        }
      } catch (error) {
        throw error
      }
    },

    async updateConfig(config: Partial<GatewayConfig>) {
      this.$patch(config)
      if (config.email) {
        this.email = JSON.parse(JSON.stringify(config.email)) as typeof this.email
      }
      await this.saveToStorage()
      await new Promise(resolve => setTimeout(resolve, 50))
    },

    async resetToDefaults() {
      this.$patch(defaultConfig)
      await this.saveToStorage()
    }
  }
})
