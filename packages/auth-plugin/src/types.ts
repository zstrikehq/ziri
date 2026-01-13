export interface AuthConfig {
  backendUrl: string
  orgId: string
  projectId: string
  clientId: string
  clientSecret: string
}

export interface TokenResponse {
  access_token: string
  token_type: string
  expires_in: number
}
