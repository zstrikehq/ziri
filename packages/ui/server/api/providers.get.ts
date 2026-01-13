// Proxy providers API to proxy server

import { getAuthHeader } from '../utils/auth'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const proxyUrl = config.public.proxyUrl || 'http://localhost:3100'
  const authHeader = getAuthHeader(event)
  
  if (!authHeader) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Authentication required'
    })
  }
  
  try {
    const headers: Record<string, string> = {}
    if (authHeader.startsWith('Bearer ')) {
      headers['Authorization'] = authHeader
    } else {
      headers['X-Master-Key'] = authHeader
    }
    
    const response = await fetch(`${proxyUrl}/api/providers`, {
      headers
    })
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }))
      throw createError({
        statusCode: response.status,
        statusMessage: error.error || response.statusText
      })
    }
    
    const data = await response.json()
    console.log('[API] Providers response:', { hasProviders: !!data.providers, count: data.providers?.length || 0 })
    // Normalize response format (proxy returns { providers: [...] }, composable expects { data: [...] })
    return {
      data: data.providers || []
    }
  } catch (error: any) {
    if (error.statusCode) {
      throw error
    }
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to proxy request: ${error.message}`
    })
  }
})
