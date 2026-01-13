// Management SDK - for managing keys, policies, schema

import { ApiClient } from './api-client.js'
import type { AuthProvider } from '@zs-ai/auth-plugin'
import { M2MAuthProvider } from '@zs-ai/auth-plugin'
import { readConfig } from '@zs-ai/config'
import type {
  Key,
  CreateKeyInput,
  Policy,
  CreatePolicyInput,
  Schema,
  EntitiesResponse,
  PoliciesResponse,
  SchemaResponse,
  Entity
} from './types.js'
import { mapEntityToKey, extractPolicyEffect, isActivePolicy, toDecimal, toIp } from './utils/cedar.js'

export interface ManagementSDKConfig {
  backendUrl?: string
  projectId?: string
  authProvider?: AuthProvider
  orgId?: string
  clientId?: string
  clientSecret?: string
  // If config not provided, will auto-load from config file
}

export class ManagementSDK {
  private apiClient: ApiClient
  private projectId: string

  constructor(config: ManagementSDKConfig = {}) {
    // Auto-load from config file if not provided
    let finalConfig = { ...config }
    
    if (!finalConfig.backendUrl || !finalConfig.projectId || !finalConfig.authProvider) {
      const fileConfig = readConfig()
      if (fileConfig) {
        finalConfig = {
          backendUrl: finalConfig.backendUrl || fileConfig.backendUrl,
          projectId: finalConfig.projectId || fileConfig.projectId,
          orgId: finalConfig.orgId || fileConfig.orgId,
          clientId: finalConfig.clientId || fileConfig.clientId,
          clientSecret: finalConfig.clientSecret || fileConfig.clientSecret,
          ...finalConfig
        }
        
        // Create auth provider if not provided
        if (!finalConfig.authProvider && finalConfig.clientId && finalConfig.clientSecret && finalConfig.backendUrl && finalConfig.orgId && finalConfig.projectId) {
          finalConfig.authProvider = new M2MAuthProvider({
            backendUrl: finalConfig.backendUrl,
            orgId: finalConfig.orgId,
            projectId: finalConfig.projectId,
            clientId: finalConfig.clientId,
            clientSecret: finalConfig.clientSecret
          })
        }
      }
    }
    
    if (!finalConfig.backendUrl || !finalConfig.projectId || !finalConfig.authProvider) {
      throw new Error('Missing required config. Provide config or run "zs-ai config init"')
    }

    this.apiClient = new ApiClient({
      backendUrl: finalConfig.backendUrl,
      projectId: finalConfig.projectId,
      authProvider: finalConfig.authProvider
    })
    this.projectId = finalConfig.projectId
  }

  // User Management API (via Proxy)
  async listUsers(): Promise<any[]> {
    // This will call proxy API, but for now we'll keep it simple
    // Proxy URL should be configured separately
    throw new Error('User management via SDK not yet implemented. Use Proxy API directly.')
  }

  // Keys (Entities) API
  async listKeys(): Promise<Key[]> {
    const response = await this.apiClient.request<EntitiesResponse>(
      `/api/v2025-01/projects/${this.projectId}/entities`
    )
    return response.data.map(mapEntityToKey)
  }

  async getKey(userId: string): Promise<Key> {
    const response = await this.apiClient.request<EntitiesResponse>(
      `/api/v2025-01/projects/${this.projectId}/entities`,
      {
        query: { uid: `User::"${userId}"` }
      }
    )
    if (response.data.length === 0) {
      throw new Error('Key not found')
    }
    return mapEntityToKey(response.data[0])
  }

  async createKey(input: CreateKeyInput): Promise<{ userId: string; apiKey: string }> {
    const entity: Entity = {
      uid: { type: 'User', id: input.userId },
      attrs: {
        user_id: input.userId,
        name: input.name,
        email: input.email,
        role: input.role,
        department: input.department,
        security_clearance: 2,
        training_completed: false,
        years_of_service: toDecimal(0),
        daily_spend_limit: toDecimal(input.dailySpendLimit),
        monthly_spend_limit: toDecimal(input.monthlySpendLimit),
        current_daily_spend: toDecimal(0),
        current_monthly_spend: toDecimal(0),
        last_daily_reset: new Date().toISOString(),
        last_monthly_reset: new Date().toISOString(),
        allowed_ip_ranges: [toIp('0.0.0.0/0')],
        status: 'active',
        created_at: new Date().toISOString()
      },
      parents: []
    }

    await this.apiClient.request(
      `/api/v2025-01/projects/${this.projectId}/entity`,
      {
        method: 'POST',
        body: { entity, status: 1 }
      }
    )

    // Generate API key with format: sk-zs-{userId}-{hash}
    const hash = Math.random().toString(36).substring(2, 8)
    const apiKey = `sk-zs-${input.userId}-${hash}`

    return { userId: input.userId, apiKey }
  }

  async updateKey(userId: string, updates: Partial<CreateKeyInput>): Promise<void> {
    // Get existing entity first
    const existing = await this.getKey(userId)
    
    const entity: Entity = {
      uid: { type: 'User', id: userId },
      attrs: {
        user_id: userId,
        name: updates.name ?? existing.name,
        email: updates.email ?? existing.email,
        role: updates.role ?? existing.role,
        department: updates.department ?? existing.department,
        security_clearance: 2,
        training_completed: false,
        years_of_service: toDecimal(0),
        daily_spend_limit: toDecimal(updates.dailySpendLimit ?? existing.dailySpendLimit),
        monthly_spend_limit: toDecimal(updates.monthlySpendLimit ?? existing.monthlySpendLimit),
        current_daily_spend: toDecimal(existing.currentDailySpend),
        current_monthly_spend: toDecimal(existing.currentMonthlySpend),
        last_daily_reset: new Date().toISOString(),
        last_monthly_reset: new Date().toISOString(),
        allowed_ip_ranges: [toIp('0.0.0.0/0')],
        status: existing.status,
        created_at: existing.createdAt
      },
      parents: []
    }

    await this.apiClient.request(
      `/api/v2025-01/projects/${this.projectId}/entity`,
      {
        method: 'PUT',
        body: { entity, status: 1 }
      }
    )
  }

  async revokeKey(userId: string): Promise<void> {
    const entity: Entity = {
      uid: { type: 'User', id: userId },
      attrs: {
        user_id: userId,
        name: '',
        email: '',
        role: '',
        department: '',
        security_clearance: 2,
        training_completed: false,
        years_of_service: toDecimal(0),
        daily_spend_limit: toDecimal(0),
        monthly_spend_limit: toDecimal(0),
        current_daily_spend: toDecimal(0),
        current_monthly_spend: toDecimal(0),
        last_daily_reset: new Date().toISOString(),
        last_monthly_reset: new Date().toISOString(),
        allowed_ip_ranges: [toIp('0.0.0.0/0')],
        status: 'revoked',
        created_at: new Date().toISOString()
      },
      parents: []
    }

    await this.apiClient.request(
      `/api/v2025-01/projects/${this.projectId}/entity`,
      {
        method: 'PUT',
        body: { entity, status: 1 }
      }
    )
  }

  // Policies API
  async listPolicies(): Promise<Policy[]> {
    const response = await this.apiClient.request<PoliciesResponse>(
      `/api/v2025-01/projects/${this.projectId}/policies`
    )

    return response.data.policies.map(p => ({
      policy: p.policy,
      description: p.description,
      effect: extractPolicyEffect(p.policy),
      isActive: isActivePolicy(p.description)
    }))
  }

  async createPolicy(input: CreatePolicyInput): Promise<Policy> {
    await this.apiClient.request(
      `/api/v2025-01/projects/${this.projectId}/policies`,
      {
        method: 'POST',
        body: {
          policy: input.policy,
          description: input.description
        }
      }
    )

    return {
      policy: input.policy,
      description: input.description,
      effect: extractPolicyEffect(input.policy),
      isActive: isActivePolicy(input.description)
    }
  }

  async deletePolicy(policy: string): Promise<void> {
    await this.apiClient.request(
      `/api/v2025-01/projects/${this.projectId}/policies`,
      {
        method: 'DELETE',
        body: { policy }
      }
    )
  }

  // Schema API
  async getSchema(): Promise<Schema> {
    const response = await this.apiClient.request<SchemaResponse>(
      `/api/v2025-01/projects/${this.projectId}/schema`
    )

    return {
      schema: response.data.schema,
      version: response.data.version
    }
  }

  async updateSchema(schema: Schema['schema']): Promise<void> {
    await this.apiClient.request(
      `/api/v2025-01/projects/${this.projectId}/schema`,
      {
        method: 'POST',
        body: { schema }
      }
    )
  }
}
