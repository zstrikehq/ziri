import { proxyJsonRequest } from '../utils/proxy-request'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null) params.set(key, String(value))
  }
  const qs = params.toString()
  const data = await proxyJsonRequest(event, {
    path: `/api/providers${qs ? '?' + qs : ''}`,
    authMode: 'passthrough'
  }) as { providers?: unknown[]; total?: number }
  return { data: data.providers || [], total: data.total || 0 }
})
