import { proxyJsonRequest } from '../utils/proxy-request'

export default defineEventHandler((event) => {
  const query = getQuery(event)
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null) params.set(key, String(value))
  }
  const qs = params.toString()
  return proxyJsonRequest(event, {
    path: `/api/policies${qs ? '?' + qs : ''}`,
    authMode: 'bearer'
  })
})
