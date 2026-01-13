// Proxy test provider API to proxy server

import { getAuthHeader } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const proxyUrl = config.public.proxyUrl || 'http://localhost:3100'
  const authHeader = getAuthHeader(event)
  const name = getRouterParam(event, 'name')
  
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
    
    const response = await fetch(`${proxyUrl}/api/providers/${name}/test`, {
      method: 'POST',
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
    // Normalize response format - proxy returns { success: true, message: string }
    // UI expects { status: string, models?: number }
    return {
      data: {
        status: data.success ? 'success' : 'failed',
        message: data.message,
        models: data.models // Include if available
      }
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
