// Client-side plugin to load config on app initialization
export default defineNuxtPlugin(async () => {
    console.log('[PLUGIN] config.client.ts - Plugin running')
    const configStore = useConfigStore()
    
    // Load config from config file API (or localStorage fallback) when app starts
    console.log('[PLUGIN] Loading config from storage...')
    await configStore.loadFromStorage()
    console.log('[PLUGIN] Config loaded, isConfigured:', configStore.isConfigured)
})
