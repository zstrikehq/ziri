import { useAuthStore } from '~/stores/auth'
import { useConfigStore } from '~/stores/config'

export function useAuth() {
    const authStore = useAuthStore()
    const configStore = useConfigStore()

    const generateId = () => {
        return Math.random().toString(36).substring(2, 7)
    }

    const getToken = async (): Promise<string> => {
        console.log('[AUTH] getToken called')
        // Return cached token if still valid
        if (authStore.isAuthenticated && authStore.token) {
            console.log('[AUTH] ✅ Using cached token')
            return authStore.token
        }

        console.log('[AUTH] No valid token, fetching new one...')
        console.log('[AUTH] Config:', {
            backendUrl: configStore.backendUrl,
            orgId: configStore.orgId,
            projectId: configStore.projectId,
            hasClientId: !!configStore.clientId,
            hasClientSecret: !!configStore.clientSecret
        })

        authStore.setLoading(true)
        authStore.setError(null)

        try {
            const config = useRuntimeConfig()
            const baseUrl = config.public.backendUrl || configStore.backendUrl

            // Ensure audience format: orgId:projectId
            const audience = `${configStore.orgId}:${configStore.projectId}`
            console.log('[AUTH] Audience:', audience)
            console.log('[AUTH] Token endpoint:', `${baseUrl}/oauth2/token`)

            const response = await $fetch<{
                access_token: string
                token_type: string
                expires_in: number
            }>(`${baseUrl}/oauth2/token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'x-op-id': generateId(),
                    'x-session-id': generateId()
                },
                body: new URLSearchParams({
                    grant_type: 'client_credentials',
                    client_id: configStore.clientId,
                    client_secret: configStore.clientSecret,
                    audience: audience
                })
            })

            console.log('[AUTH] ✅ Token received, expires in:', response.expires_in)
            authStore.setToken(response.access_token, response.expires_in)
            return response.access_token
        } catch (e: any) {
            const errorMsg = e.data?.message || e.message || 'Authentication failed'
            console.error('[AUTH] ❌ Authentication failed:', errorMsg, e)
            authStore.setError(errorMsg)
            throw new Error(errorMsg)
        } finally {
            authStore.setLoading(false)
        }
    }

    const testConnection = async (): Promise<{ success: boolean; error?: string }> => {
        try {
            // Clear existing token to force a fresh auth
            authStore.clearToken()
            await getToken()
            return { success: true }
        } catch (e: any) {
            return { success: false, error: e.message }
        }
    }

    const logout = () => {
        authStore.clearToken()
    }

    return {
        getToken,
        testConnection,
        logout,
        isAuthenticated: computed(() => authStore.isAuthenticated),
        isLoading: computed(() => authStore.isLoading),
        error: computed(() => authStore.error)
    }
}
