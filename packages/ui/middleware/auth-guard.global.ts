 

export default defineNuxtRouteMiddleware(async (to) => {
 
    if (import.meta.server) {
        return
    }

 
    if (to.path.startsWith('/api/')) {
        return
    }

 
    if (to.path === '/login') {
        return
    }

 
    const { useAdminAuthStore } = await import('~/stores/admin-auth')
    const { useUserAuthStore } = await import('~/stores/user-auth')
    
    const adminAuthStore = useAdminAuthStore()
    const userAuthStore = useUserAuthStore()
    
 
    adminAuthStore.loadFromStorage()
    userAuthStore.loadFromStorage()
    
 
    await nextTick()
    
 
    if (adminAuthStore.isAuthenticated) {
      try {
        const sessionValid = await adminAuthStore.checkServerSession()
        if (!sessionValid) {
 
          const toast = useToast()
          toast.warning('Server restarted. Please login again.')
          return navigateTo('/login')
        }
      } catch (error) {
 
        console.error('[AUTH] Failed to check server session:', error)
      }
    }
    
    const isAdminAuthenticated = adminAuthStore.isAuthenticated
    const isUserAuthenticated = userAuthStore.isAuthenticated
    const userRole = userAuthStore.user?.role || adminAuthStore.user?.role

 
    if (!isAdminAuthenticated && !isUserAuthenticated) {
        const toast = useToast()
        toast.warning('Please login to continue')
        return navigateTo('/login')
    }

 
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
        '/config',
        '/settings/manage-users'
    ]

 
    const userPages = [
        '/me'
    ]

 
    const isAdminPage = adminOnlyPages.some(page => to.path === page || to.path.startsWith(page + '/'))
    
 
    const isUserPage = userPages.some(page => to.path === page || to.path.startsWith(page + '/'))

 

    if (to.path === '/' && to.query.create === 'true' && to.query.policy) {

        return navigateTo({
            path: '/rules',
            query: {
                create: to.query.create,
                policy: to.query.policy
            }
        })
    }



    const isDashboardUser = userRole && userRole !== 'user'
    

    if ((to.path === '/config' || to.path === '/settings/manage-users') && userRole !== 'admin') {
        const toast = useToast()
        toast.warning('Admin access required')
        return navigateTo('/')
    }
    

    if (isAdminPage && !isDashboardUser) {
        const toast = useToast()
        toast.warning('Dashboard access required')
        return navigateTo('/me')
    }


    if (isUserPage) {
        return
    }


    if (isAdminAuthenticated && isDashboardUser && isAdminPage) {
        return
    }
})
