// Server session tracking - used to detect server restarts

// Server session ID (generated on server startup)
let serverSessionId: string | null = null

/**
 * Initialize server session (called on server startup)
 */
export function initializeServerSession(): string {
  // Generate a unique session ID based on server start time
  serverSessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  return serverSessionId
}

/**
 * Get current server session ID
 */
export function getServerSessionId(): string | null {
  return serverSessionId
}

/**
 * Check if server session is initialized
 */
export function hasServerSession(): boolean {
  return serverSessionId !== null
}
