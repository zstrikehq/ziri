// Global auth guard middleware - role-based access control

export default defineNuxtRouteMiddleware(async (to) => {
    // Only run on client side
    if (import.meta.server) {
        return
    }

    // Skip API routes
    if (to.path.startsWith('/api/')) {
        return
    }

    // Always allow access to login page
    if (to.path === '/login') {
        return
    }

    // Check both admin and user authentication
    const { useAdminAuthStore } = await import('~/stores/admin-auth')
    const { useUserAuthStore } = await import('~/stores/user-auth')
    
    const adminAuthStore = useAdminAuthStore()
    const userAuthStore = useUserAuthStore()
    
    // Load auth state from storage
    adminAuthStore.loadFromStorage()
    userAuthStore.loadFromStorage()
    
    // Wait for Pinia reactivity to update
    await nextTick()
    
    // Check server session for admin (detect server restart)
    if (adminAuthStore.isAuthenticated) {
      try {
        const sessionValid = await adminAuthStore.checkServerSession()
        if (!sessionValid) {
          // Server restarted, user was logged out
          const toast = useToast()
          toast.warning('Server restarted. Please login again.')
          return navigateTo('/login')
        }
      } catch (error) {
        // If check fails, don't block navigation but log error
        console.error('[AUTH] Failed to check server session:', error)
      }
    }
    
    const isAdminAuthenticated = adminAuthStore.isAuthenticated
    const isUserAuthenticated = userAuthStore.isAuthenticated
    const userRole = userAuthStore.user?.role || adminAuthStore.user?.role

    // If not authenticated at all, redirect to login
    if (!isAdminAuthenticated && !isUserAuthenticated) {
        const toast = useToast()
        toast.warning('Please login to continue')
        return navigateTo('/login')
    }

    // Define admin-only pages
    const adminOnlyPages = [
        '/dashboard',
        '/',
        '/users',
        '/keys',
        '/providers',
        '/rules',
        '/schema',
        '/logs',
        '/analytics',
        '/config'
    ]

    // Define user pages (accessible by both admin and user)
    const userPages = [
        '/me'
    ]

    // Check if trying to access admin-only page
    const isAdminPage = adminOnlyPages.some(page => to.path === page || to.path.startsWith(page + '/'))
    
    // Check if trying to access user page
    const isUserPage = userPages.some(page => to.path === page || to.path.startsWith(page + '/'))

    // Admin pages require admin role
    if (isAdminPage && userRole !== 'admin') {
        const toast = useToast()
        toast.warning('Admin access required')
        return navigateTo('/me')
    }

    // User pages accessible by both admin and user
    if (isUserPage) {
        return
    }

    // Admin pages - allow access if authenticated as admin
    if (isAdminAuthenticated && userRole === 'admin' && isAdminPage) {
        return
    }
})
