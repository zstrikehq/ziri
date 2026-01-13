import { defineStore } from 'pinia'
import type { GatewayConfig } from '~/types/config'
import { defaultConfig } from '~/types/config'

const STORAGE_KEY = 'llm-gateway-config'

export const useConfigStore = defineStore('config', {
    state: () => ({
        ...defaultConfig
    }),

    getters: {
        isConfigured: (state) => {
            return !!(state.projectId && state.orgId && state.clientId && state.clientSecret)
        }
    },

    actions: {
        async loadFromStorage() {
            console.log('[CONFIG STORE] loadFromStorage called')
            if (!import.meta.client) {
                console.log('[CONFIG STORE] Not on client, skipping')
                return
            }

            // Try to load from config file API first (when served via CLI)
            try {
                const response = await fetch('/api/config')
                if (response.ok) {
                    const config = await response.json()
                    console.log('[CONFIG STORE] Loaded from config file:', {
                        projectId: config.projectId,
                        orgId: config.orgId,
                        hasClientId: !!config.clientId,
                        hasClientSecret: !!config.clientSecret
                    })
                    // Map config file format to UI config format
                    const uiConfig = {
                        projectId: config.projectId || '',
                        orgId: config.orgId || '',
                        clientId: config.clientId || '',
                        clientSecret: config.clientSecret || '',
                        pdpUrl: config.pdpUrl || '',
                        proxyUrl: config.proxyUrl || '',
                        port: config.port || 3100,
                        logLevel: config.logLevel || 'info',
                        masterKey: config.masterKey || ''
                    }
                    this.$patch(uiConfig)
                    // Also sync to localStorage as backup
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.$state))
                    console.log('[CONFIG STORE] Config loaded from file and synced to localStorage')
                    return
                } else if (response.status === 404) {
                    console.log('[CONFIG STORE] Config file not found, trying localStorage')
                } else {
                    console.warn('[CONFIG STORE] Failed to load from config file, trying localStorage')
                }
            } catch (error) {
                // API endpoint not available (UI running standalone or not via CLI)
                console.log('[CONFIG STORE] Config API not available, using localStorage:', error)
            }

            // Fallback to localStorage
            const stored = localStorage.getItem(STORAGE_KEY)
            console.log('[CONFIG STORE] localStorage value:', stored ? 'exists' : 'null')
            if (stored) {
                try {
                    const parsed = JSON.parse(stored)
                    console.log('[CONFIG STORE] Parsed config:', {
                        projectId: parsed.projectId,
                        orgId: parsed.orgId,
                        hasClientId: !!parsed.clientId,
                        hasClientSecret: !!parsed.clientSecret,
                        clientIdLength: parsed.clientId?.length || 0,
                        clientSecretLength: parsed.clientSecret?.length || 0
                    })
                    // Use $patch for reactivity - patch all properties
                    this.$patch({
                        projectId: parsed.projectId || '',
                        orgId: parsed.orgId || '',
                        clientId: parsed.clientId || '',
                        clientSecret: parsed.clientSecret || '',
                        pdpUrl: parsed.pdpUrl || '',
                        proxyUrl: parsed.proxyUrl || '',
                        port: parsed.port || 3100,
                        logLevel: parsed.logLevel || 'info',
                        masterKey: parsed.masterKey || ''
                    })
                    console.log('[CONFIG STORE] After $patch:', {
                        projectId: this.projectId,
                        orgId: this.orgId,
                        hasClientId: !!this.clientId,
                        hasClientSecret: !!this.clientSecret,
                        clientIdLength: this.clientId?.length || 0,
                        clientSecretLength: this.clientSecret?.length || 0,
                        isConfigured: this.isConfigured
                    })
                } catch (e) {
                    console.error('[CONFIG STORE] Failed to parse stored config:', e)
                }
            } else {
                console.log('[CONFIG STORE] No stored config found in localStorage')
            }
        },

        async saveToStorage() {
            if (!import.meta.client) return

            const configToSave = {
                projectId: this.projectId,
                orgId: this.orgId,
                clientId: this.clientId,
                clientSecret: this.clientSecret,
                pdpUrl: this.pdpUrl,
                proxyUrl: this.proxyUrl,
                port: this.port,
                logLevel: this.logLevel
            }

            // Always save to localStorage as backup - save the full state
            const stateToSave = {
                projectId: this.projectId,
                orgId: this.orgId,
                clientId: this.clientId,
                clientSecret: this.clientSecret,
                pdpUrl: this.pdpUrl,
                proxyUrl: this.proxyUrl,
                port: this.port,
                logLevel: this.logLevel,
                masterKey: this.masterKey
            }
            localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave))
            console.log('[CONFIG STORE] Saved to localStorage:', {
                projectId: this.projectId,
                orgId: this.orgId,
                hasClientId: !!this.clientId,
                hasClientSecret: !!this.clientSecret,
                isConfigured: this.isConfigured
            })

            // Try to save to config file via API (when served via CLI)
            try {
                const response = await fetch('/api/config', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        backendUrl: 'https://api-dev.authzebra.com', // Always include fixed backend URL
                        orgId: configToSave.orgId,
                        projectId: configToSave.projectId,
                        clientId: configToSave.clientId,
                        clientSecret: configToSave.clientSecret,
                        pdpUrl: configToSave.pdpUrl,
                        proxyUrl: configToSave.proxyUrl,
                        port: configToSave.port,
                        logLevel: configToSave.logLevel
                    })
                })

                if (response.ok) {
                    console.log('[CONFIG STORE] Saved to config file via API')
                } else {
                    console.warn('[CONFIG STORE] Failed to save to config file, but saved to localStorage')
                }
            } catch (error) {
                // API endpoint not available (UI running standalone)
                console.log('[CONFIG STORE] Config API not available, only saved to localStorage:', error)
            }
        },

        async updateConfig(config: Partial<GatewayConfig>) {
            // Use $patch for proper reactivity
            this.$patch(config)
            console.log('[CONFIG STORE] After $patch in updateConfig:', {
                projectId: this.projectId,
                orgId: this.orgId,
                hasClientId: !!this.clientId,
                hasClientSecret: !!this.clientSecret,
                isConfigured: this.isConfigured
            })
            await this.saveToStorage()
            // Wait a bit to ensure state is persisted
            await new Promise(resolve => setTimeout(resolve, 50))
            console.log('[CONFIG STORE] After saveToStorage:', {
                projectId: this.projectId,
                orgId: this.orgId,
                hasClientId: !!this.clientId,
                hasClientSecret: !!this.clientSecret,
                isConfigured: this.isConfigured
            })
        },

        async resetToDefaults() {
            // Use $patch for proper reactivity
            this.$patch(defaultConfig)
            await this.saveToStorage()
        }
    }
})
