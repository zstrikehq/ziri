// Proxy users API to proxy server

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const proxyUrl = config.public.proxyUrl || 'http://localhost:3100'
  const authHeader = getHeader(event, 'authorization') || getHeader(event, 'x-master-key')
  
  if (!authHeader) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Authentication required'
    })
  }
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  }
  if (authHeader.startsWith('Bearer ')) {
    headers['Authorization'] = authHeader
  } else {
    headers['X-Master-Key'] = authHeader
  }
  
  const body = await readBody(event)
  
  try {
    const response = await fetch(`${proxyUrl}/api/users`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
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
      statusMessage: `Failed to proxy request: ${error.message}`
    })
  }
})
