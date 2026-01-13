export default defineNuxtRouteMiddleware(async (to) => {
    console.log('[MIDDLEWARE] Running for path:', to.path)
    
    // Only run on client side
    if (import.meta.server) {
        console.log('[MIDDLEWARE] Skipping on server')
        return
    }

    // Skip API routes - they're handled by server API routes
    if (to.path.startsWith('/api/')) {
        console.log('[MIDDLEWARE] Skipping API route')
        return
    }

    // Always allow access to login page
    if (to.path === '/login') {
        console.log('[MIDDLEWARE] Allowing access to login page')
        return
    }

    // Check admin authentication FIRST (before anything else)
    const { useAdminAuthStore } = await import('~/stores/admin-auth')
    const adminAuthStore = useAdminAuthStore()
    adminAuthStore.loadFromStorage()

    if (!adminAuthStore.isAuthenticated) {
        console.log('[MIDDLEWARE] ❌ Not authenticated, redirecting to /login')
        const toast = useToast()
        toast.warning('Please login to continue')
        return navigateTo('/login')
    }

    // If authenticated, allow access to config page
    if (to.path === '/config') {
        console.log('[MIDDLEWARE] Allowing access to config page')
        return
    }

    // For all other pages, check if configured
    const configStore = useConfigStore()
    
    // Load config from config file API (or localStorage) before checking (important for page refreshes)
    console.log('[MIDDLEWARE] Loading config from storage...')
    await configStore.loadFromStorage()
    // Wait for next tick to ensure reactive state is updated
    await nextTick()
    
    // Force a re-check by accessing the getter directly
    const isConfigured = configStore.isConfigured
    const projectId = configStore.projectId
    const orgId = configStore.orgId
    const clientId = configStore.clientId
    const clientSecret = configStore.clientSecret
    
    console.log('[MIDDLEWARE] After loadFromStorage:', {
        projectId,
        orgId,
        hasClientId: !!clientId,
        hasClientSecret: !!clientSecret,
        clientIdLength: clientId?.length || 0,
        clientSecretLength: clientSecret?.length || 0,
        isConfigured,
        checkResult: !!(projectId && orgId && clientId && clientSecret)
    })

    // Redirect to config if not configured (but user is authenticated)
    if (!isConfigured) {
        console.log('[MIDDLEWARE] ❌ Not configured, redirecting to /config')
        console.log('[MIDDLEWARE] Debug - projectId:', projectId, 'orgId:', orgId, 'clientId:', !!clientId, 'clientSecret:', !!clientSecret)
        const toast = useToast()
        toast.warning('Please configure the gateway connection first')
        return navigateTo('/config')
    }
    
    console.log('[MIDDLEWARE] ✅ Authenticated and configured, allowing access to', to.path)
})
