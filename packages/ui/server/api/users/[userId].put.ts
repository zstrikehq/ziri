// Proxy update user API to proxy server

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const proxyUrl = config.public.proxyUrl || 'http://localhost:3100'
  const masterKey = getHeader(event, 'x-master-key')
  const userId = getRouterParam(event, 'userId')
  const body = await readBody(event)
  
  if (!masterKey) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Master key required'
    })
  }
  
  try {
    const response = await fetch(`${proxyUrl}/api/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': masterKey
      },
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
