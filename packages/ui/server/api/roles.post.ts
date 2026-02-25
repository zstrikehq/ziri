import { readBody } from 'h3'
import { proxyJsonRequest } from '../utils/proxy-request'

export default defineEventHandler(async (event) => {
  const body = await readBody(event).catch(() => ({}))
  return proxyJsonRequest(event, {
    path: '/api/roles',
    method: 'POST',
    authMode: 'bearer',
    body
  })
})
