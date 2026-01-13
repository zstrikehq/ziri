import { ref } from 'vue'
import { useAuth } from './useAuth'
import { useConfigStore } from '~/stores/config'

export function useApi() {
    const { getToken } = useAuth()
    const configStore = useConfigStore()

    const loading = ref(false)
    const error = ref<string | null>(null)

    // Generate a session ID once per session (module scope)
    // In a real app, this might persist in sessionStorage
    const sessionId = ref(Math.random().toString(36).substring(2, 7))

    const generateId = () => {
        return Math.random().toString(36).substring(2, 7)
    }

    const apiCall = async <T>(
        endpoint: string,
        options: {
            method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
            body?: any
            headers?: Record<string, string>
            query?: Record<string, any>
        } = {}
    ): Promise<T> => {
        console.log('[API] Making request:', options.method || 'GET', endpoint)
        loading.value = true
        error.value = null

        try {
            const token = await getToken()
            console.log('[API] Token obtained:', token ? 'yes' : 'no')
            const config = useRuntimeConfig()
            const baseUrl = config.public.backendUrl || configStore.backendUrl
            console.log('[API] Base URL:', baseUrl)
            console.log('[API] Project ID:', configStore.projectId)

            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'x-project-id': configStore.projectId,
                'x-op-id': generateId(),
                'x-session-id': sessionId.value,
                ...options.headers
            }

            const url = `${baseUrl}${endpoint}`
            console.log('[API] Full URL:', url)
            console.log('[API] Request options:', {
                method: options.method || 'GET',
                hasBody: !!options.body,
                hasQuery: !!options.query
            })

            const response = await $fetch<T>(url, {
                method: options.method || 'GET',
                headers,
                body: options.body,
                query: options.query
            })

            console.log('[API] ✅ Request successful')
            return response
        } catch (e: any) {
            const errorMsg = e.data?.message || e.message || 'API request failed'
            console.error('[API] ❌ Request failed:', errorMsg, e)
            error.value = errorMsg
            // Don't throw for 404s on list operations if acceptable, but generally we want to throw
            throw new Error(errorMsg)
        } finally {
            loading.value = false
        }
    }

    return {
        apiCall,
        loading,
        error
    }
}
