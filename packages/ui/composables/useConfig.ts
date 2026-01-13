import { useConfigStore } from '~/stores/config'
import type { GatewayConfig } from '~/types/config'

export function useConfig() {
    const configStore = useConfigStore()

    const loadConfig = () => {
        configStore.loadFromStorage()
    }

    const saveConfig = (config: Partial<GatewayConfig>) => {
        configStore.updateConfig(config)
    }

    const resetConfig = () => {
        configStore.resetToDefaults()
    }

    return {
        loadConfig,
        saveConfig,
        resetConfig,
        config: computed(() => configStore.$state),
        isConfigured: computed(() => configStore.isConfigured)
    }
}
