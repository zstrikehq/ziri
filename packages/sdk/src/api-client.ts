// API client for making authenticated requests

import type { AuthProvider } from '@zs-ai/auth-plugin'

export interface ApiClientConfig {
  backendUrl: string
  projectId: string
  authProvider: AuthProvider
}

export class ApiClient {
  private config: ApiClientConfig
  private sessionId: string

  constructor(config: ApiClientConfig) {
    this.config = config
    this.sessionId = Math.random().toString(36).substring(2, 7)
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 7)
  }

  async request<T>(
    endpoint: string,
    options: {
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
      body?: any
      headers?: Record<string, string>
      query?: Record<string, any>
    } = {}
  ): Promise<T> {
    const token = await this.config.authProvider.getToken()

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'x-project-id': this.config.projectId,
      'x-op-id': this.generateId(),
      'x-session-id': this.sessionId,
      ...options.headers
    }

    // Build URL with query params
    let url = `${this.config.backendUrl}${endpoint}`
    if (options.query) {
      const params = new URLSearchParams()
      Object.entries(options.query).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value))
        }
      })
      const queryString = params.toString()
      if (queryString) {
        url += `?${queryString}`
      }
    }

    const response = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`API error ${response.status}: ${error}`)
    }

    return response.json() as T
  }
}
