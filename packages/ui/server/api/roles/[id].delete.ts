import { getRouterParam, createError } from 'h3'
import { proxyJsonRequest } from '../../utils/proxy-request'

export default defineEventHandler((event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'id is required' })
  }
  return proxyJsonRequest(event, {
    path: `/api/roles/${encodeURIComponent(id)}`,
    method: 'DELETE',
    authMode: 'bearer'
  })
})
