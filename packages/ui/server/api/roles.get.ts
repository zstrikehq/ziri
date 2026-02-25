import { getQuery } from 'h3'
import { proxyJsonRequest } from '../utils/proxy-request'

export default defineEventHandler((event) => {
  const q = getQuery(event)
  const qs = new URLSearchParams(q as Record<string, string>).toString()
  const path = qs ? `/api/roles?${qs}` : '/api/roles'
  return proxyJsonRequest(event, {
    path,
    authMode: 'bearer'
  })
})
