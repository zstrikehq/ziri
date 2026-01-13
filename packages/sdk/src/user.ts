// User SDK - for making LLM calls with authorization
// Updated for new architecture: JWT auth + API key, proxy server, PDP-only

import { readConfig } from '@zs-ai/config'

export interface UserSDKConfig {
  apiKey: string  // API key (sk-zs-{userId}-{hash})
  proxyUrl: string  // Proxy server URL (e.g., http://localhost:3100)
  userId?: string  // Optional: userId (can be extracted from API key)
  password?: string  // Optional: password (for initial login)
  accessToken?: string  // Optional: access token (if already authenticated)
  refreshToken?: string  // Optional: refresh token (if already authenticated)
  // If proxyUrl not provided, will try to load from config or env
}

interface TokenResponse {
  accessToken: string
  refreshToken: string
  expiresIn: number
  tokenType: string
}

export class UserSDK {
  private config: UserSDKConfig
  private accessToken: string | null = null
  private refreshToken: string | null = null
  private tokenExpiry: Date | null = null

  constructor(config: UserSDKConfig) {
    // Auto-load from config file if not provided
    let finalConfig = { ...config }
    
    if (!finalConfig.proxyUrl) {
      const fileConfig = readConfig()
      if (fileConfig) {
        finalConfig.proxyUrl = (fileConfig as any).proxyUrl || process.env.ZS_AI_PROXY_URL || 'http://localhost:3100'
      } else {
        finalConfig.proxyUrl = process.env.ZS_AI_PROXY_URL || 'http://localhost:3100'
      }
    }
    
    // Validate required fields
    if (!finalConfig.apiKey) {
      throw new Error('apiKey is required')
    }
    
    if (!finalConfig.proxyUrl) {
      throw new Error('proxyUrl is required. Provide in config or set ZS_AI_PROXY_URL env var')
    }
    
    // Validate API key format
    this.validateApiKey(finalConfig.apiKey)
    
    // Extract userId from API key if not provided
    if (!finalConfig.userId) {
      finalConfig.userId = this.extractUserId(finalConfig.apiKey)
    }
    
    this.config = finalConfig
    
    // Set tokens if provided
    if (finalConfig.accessToken) {
      this.accessToken = finalConfig.accessToken
    }
    if (finalConfig.refreshToken) {
      this.refreshToken = finalConfig.refreshToken
    }
    
    // If password provided, login automatically
    if (finalConfig.password && !this.accessToken) {
      // Login will be done on first request if needed
    }
  }

  private validateApiKey(apiKey: string): void {
    if (!apiKey.startsWith('sk-zs-')) {
      throw new Error('Invalid API key format. Expected format: sk-zs-{userId}-{hash}')
    }
  }

  private extractUserId(apiKey: string): string {
    // Format: sk-zs-{userId}-{hash}
    const parts = apiKey.substring(6).split('-')
    if (parts.length < 2) {
      throw new Error('Invalid API key format')
    }
    return parts[0] // userId is the first part after sk-zs-
  }

  /**
   * Login with userId and password to get JWT tokens
   */
  async login(userId?: string, password?: string): Promise<TokenResponse> {
    const loginUserId = userId || this.config.userId
    const loginPassword = password || this.config.password
    
    if (!loginUserId || !loginPassword) {
      throw new Error('userId and password are required for login')
    }
    
    const loginUrl = `${this.config.proxyUrl}/api/auth/login`
    
    let response: Response
    try {
      response = await fetch(loginUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: loginUserId,
          password: loginPassword
        })
      })
    } catch (error: any) {
      // Handle fetch failures (network errors, connection refused, etc.)
      const errorMessage = error.message || 'Unknown error'
      const errorCode = error.code || ''
      
      if (errorCode === 'ECONNREFUSED' || errorMessage.includes('ECONNREFUSED')) {
        throw new Error(
          `Cannot connect to proxy server at ${this.config.proxyUrl}. ` +
          `Please ensure the proxy server is running. ` +
          `Start it with: npm start or zs-ai start`
        )
      }
      
      if (errorMessage.includes('fetch failed') || errorMessage.includes('network')) {
        throw new Error(
          `Network error connecting to proxy server at ${this.config.proxyUrl}. ` +
          `Error: ${errorMessage}. ` +
          `Please check: 1) Proxy server is running, 2) URL is correct, 3) Network connectivity`
        )
      }
      
      throw new Error(`Login request failed: ${errorMessage}. URL: ${loginUrl}`)
    }
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText })) as { error?: string }
      throw new Error(`Login failed: ${error.error || response.statusText} (Status: ${response.status})`)
    }
    
    const tokens = await response.json() as TokenResponse
    
    // Store tokens
    this.accessToken = tokens.accessToken
    this.refreshToken = tokens.refreshToken
    this.tokenExpiry = new Date(Date.now() + tokens.expiresIn * 1000)
    
    return tokens
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(): Promise<string> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available. Please login again.')
    }
    
    const refreshUrl = `${this.config.proxyUrl}/api/auth/refresh`
    
    let response: Response
    try {
      response = await fetch(refreshUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          refreshToken: this.refreshToken
        })
      })
    } catch (error: any) {
      const errorMessage = error.message || 'Unknown error'
      const errorCode = error.code || ''
      
      if (errorCode === 'ECONNREFUSED' || errorMessage.includes('ECONNREFUSED')) {
        throw new Error(
          `Cannot connect to proxy server at ${this.config.proxyUrl}. ` +
          `Please ensure the proxy server is running.`
        )
      }
      
      throw new Error(`Token refresh request failed: ${errorMessage}. URL: ${refreshUrl}`)
    }
    
    if (!response.ok) {
      // Refresh token expired or invalid, need to login again
      this.accessToken = null
      this.refreshToken = null
      this.tokenExpiry = null
      
      const error = await response.json().catch(() => ({ error: response.statusText })) as { error?: string }
      throw new Error(`Token refresh failed: ${error.error || response.statusText}. Please login again.`)
    }
    
    const result = await response.json() as { accessToken: string; expiresIn: number }
    
    // Update access token
    this.accessToken = result.accessToken
    this.tokenExpiry = new Date(Date.now() + result.expiresIn * 1000)
    
    return result.accessToken
  }

  /**
   * Get access token (login if needed, refresh if expired)
   */
  private async getAccessToken(): Promise<string> {
    // If we have a valid token, return it
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken
    }
    
    // If we have a refresh token, try to refresh
    if (this.refreshToken) {
      try {
        return await this.refreshAccessToken()
      } catch (error) {
        // Refresh failed, need to login again
        console.warn('[SDK] Token refresh failed, attempting login...')
      }
    }
    
    // Need to login
    if (!this.config.password) {
      throw new Error('No access token and no password provided. Please login or provide password in config.')
    }
    
    await this.login()
    
    if (!this.accessToken) {
      throw new Error('Login failed - no access token received')
    }
    
    return this.accessToken
  }

  /**
   * Make chat completion request
   */
  async chatCompletions(params: {
    provider: string
    model: string
    messages: Array<{ role: string; content: string }>
    ipAddress?: string
    context?: Record<string, any>
    [key: string]: any
  }): Promise<any> {
    // Get access token (login or refresh if needed)
    let accessToken: string
    try {
      accessToken = await this.getAccessToken()
    } catch (error: any) {
      throw new Error(`Authentication failed: ${error.message}`)
    }
    
    // Make request to proxy server
    const response = await fetch(`${this.config.proxyUrl}/api/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-API-Key': this.config.apiKey
      },
      body: JSON.stringify({
        provider: params.provider,
        model: params.model,
        messages: params.messages,
        ...Object.fromEntries(
          Object.entries(params).filter(([key]) => 
            !['provider', 'ipAddress', 'context'].includes(key)
          )
        )
      })
    })
    
    // Handle token expiration
    if (response.status === 401) {
      const error = await response.json().catch(() => ({ error: 'Unauthorized' })) as { code?: string; error?: string }
      if (error.code === 'TOKEN_EXPIRED') {
        // Try to refresh token and retry
        try {
          accessToken = await this.refreshAccessToken()
          
          // Retry request
          const retryResponse = await fetch(`${this.config.proxyUrl}/api/chat/completions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
              'X-API-Key': this.config.apiKey
            },
            body: JSON.stringify({
              provider: params.provider,
              model: params.model,
              messages: params.messages,
              ...Object.fromEntries(
                Object.entries(params).filter(([key]) => 
                  !['provider', 'ipAddress', 'context'].includes(key)
                )
              )
            })
          })
          
          if (!retryResponse.ok) {
            const retryError = await retryResponse.text()
            throw new Error(`Request failed after token refresh: ${retryResponse.status} ${retryError}`)
          }
          
          return retryResponse.json()
        } catch (refreshError: any) {
          throw new Error(`Token refresh failed: ${refreshError.message}. Please login again.`)
        }
      }
    }
    
    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Request failed: ${response.status} ${error}`)
    }
    
    return response.json()
  }

  /**
   * Logout (revoke refresh token)
   */
  async logout(): Promise<void> {
    if (this.refreshToken) {
      try {
        await fetch(`${this.config.proxyUrl}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            refreshToken: this.refreshToken
          })
        })
      } catch (error) {
        // Ignore logout errors
      }
    }
    
    this.accessToken = null
    this.refreshToken = null
    this.tokenExpiry = null
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.logout().catch(() => {})
  }
}
