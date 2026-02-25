export interface ProxyJsonRequestOpts {
  path: string
  method?: string
  authMode?: 'none' | 'passthrough' | 'bearer'
  requireAuth?: boolean
  body?: unknown
  extraHeaders?: Record<string, string>
  networkErrorMessage?: string
  authRequiredMessage?: string
  authHeaderSource?: 'both' | 'root-key-only'
}

export async function proxyJsonRequest(event: any, opts: ProxyJsonRequestOpts): Promise<unknown> {
  const config = useRuntimeConfig()
  const proxyUrl = (config.public as { proxyUrl?: string }).proxyUrl || 'http://localhost:3100'
  const method = opts.method ?? 'GET'
  const authMode = opts.authMode ?? 'passthrough'
  const requireAuth = opts.requireAuth ?? (authMode !== 'none')
  const networkErrorMessage = opts.networkErrorMessage ?? 'Failed to proxy request'
  const authRequiredMessage = opts.authRequiredMessage ?? 'Authentication required'

  let authHeader: string | null = null
  if (authMode !== 'none') {
    const source = opts.authHeaderSource ?? 'both'
    authHeader = source === 'root-key-only'
      ? getHeader(event, 'x-root-key') || null
      : getHeader(event, 'authorization') || getHeader(event, 'x-root-key') || null
  }

  if (requireAuth && !authHeader) {
    throw createError({ statusCode: 401, statusMessage: authRequiredMessage })
  }

  const headers: Record<string, string> = { ...opts.extraHeaders }
  if (authMode === 'passthrough' && authHeader) {
    if (authHeader.startsWith('Bearer ')) {
      headers['Authorization'] = authHeader
    } else {
      headers['X-Root-Key'] = authHeader
    }
  } else if (authMode === 'bearer' && authHeader) {
    headers['Authorization'] = authHeader.startsWith('Bearer ') ? authHeader : `Bearer ${authHeader}`
  }

  if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  const url = `${proxyUrl.replace(/\/$/, '')}${opts.path.startsWith('/') ? '' : '/'}${opts.path}`
  const fetchOpts: RequestInit = {
    method,
    headers,
    ...(opts.body !== undefined && { body: JSON.stringify(opts.body) })
  }

  try {
    const response = await fetch(url, fetchOpts)
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }))
      const statusMessage =
        (typeof error.error === 'string' && error.error.trim().length > 0 ? error.error : null) ||
        (typeof error.message === 'string' && error.message.trim().length > 0 ? error.message : null) ||
        response.statusText
      throw createError({ statusCode: response.status, statusMessage })
    }
    if (response.status === 204) {
      return null
    }
    const contentType = response.headers.get('content-type') || ''
    if (!contentType.toLowerCase().includes('application/json')) {
      return null
    }
    return await response.json()
  } catch (err: any) {
    if (err.statusCode) throw err
    throw createError({
      statusCode: 500,
      statusMessage: `${networkErrorMessage}: ${err.message}`
    })
  }
}
