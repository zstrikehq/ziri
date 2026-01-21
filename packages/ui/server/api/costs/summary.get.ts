// Proxy /api/costs/summary to proxy server

import { getAuthHeader } from '../../utils/auth'

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
    const query = getQuery(event)
    const params = new URLSearchParams()
    
    if (query.executionKey) params.append('executionKey', query.executionKey as string)
    if (query.provider) params.append('provider', query.provider as string)
    if (query.model) params.append('model', query.model as string)
    if (query.startDate) params.append('startDate', query.startDate as string)
    if (query.endDate) params.append('endDate', query.endDate as string)
    if (query.groupBy) params.append('groupBy', query.groupBy as string)
    
    const response = await fetch(`${proxyUrl}/api/costs/summary?${params.toString()}`, {
      headers: {
        'Authorization': authHeader.startsWith('Bearer ') ? authHeader : `Bearer ${authHeader}`
      }
    })
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }))
      throw createError({
        statusCode: response.status,
        statusMessage: error.error || response.statusText
      })
    }
    
    return await response.json()
  } catch (error: any) {
    if (error.statusCode) {
      throw error
    }
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to get cost summary: ${error.message}`
    })
  }
})
