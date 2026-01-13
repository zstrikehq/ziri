// Proxy admin login API to proxy server

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const proxyUrl = config.public.proxyUrl || 'http://localhost:3100'
  const body = await readBody(event)
  
  try {
    const response = await fetch(`${proxyUrl}/api/auth/admin/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
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
