// Helper to get auth header from request (supports both Authorization and X-Master-Key for backward compatibility)

export function getAuthHeader(event: any): string | null {
  const authHeader = getHeader(event, 'authorization') || getHeader(event, 'x-master-key')
  return authHeader || null
}

export function getAuthHeaders(event: any): Record<string, string> {
  const authHeader = getAuthHeader(event)
  if (!authHeader) {
    return {}
  }
  
  const headers: Record<string, string> = {}
  if (authHeader.startsWith('Bearer ')) {
    headers['Authorization'] = authHeader
  } else {
    headers['X-Master-Key'] = authHeader
  }
  return headers
}
