// Entity service - creates entities in Backend API

import { loadConfig } from '../config.js'
import { randomBytes } from 'crypto'
import * as userService from './user-service.js'
import { getM2MToken } from './m2m-token-cache.js'

// Generate unique IDs for requests
function generateOpId(): string {
  return randomBytes(8).toString('hex')
}

// Generate session ID (persists for the lifetime of the service)
const sessionId = randomBytes(8).toString('hex')

// Cedar utility functions (copied from SDK to avoid dependency)
function toDecimal(value: number): { __extn: { fn: string; arg: string } } {
  return {
    __extn: {
      fn: 'decimal',
      arg: value.toFixed(2)
    }
  }
}

function toIp(value: string): { __extn: { fn: string; arg: string } } {
  return {
    __extn: {
      fn: 'ip',
      arg: value
    }
  }
}

export interface CreateEntityInput {
  userId: string
  // Entity attributes (from key creation, not user)
  role?: string
  department?: string
  securityClearance?: number
  trainingCompleted?: boolean
  yearsOfService?: number
  // Spend limits
  dailySpendLimit?: number
  monthlySpendLimit?: number
}

/**
 * Create entity in Backend API
 */
export async function createEntityInBackend(input: CreateEntityInput): Promise<void> {
  // Reload config to get latest values (in case config was updated after proxy started)
  const config = loadConfig()
  
  console.log('[ENTITY SERVICE] Config values:', {
    hasOrgId: !!config.orgId,
    hasProjectId: !!config.projectId,
    hasClientId: !!config.clientId,
    hasClientSecret: !!config.clientSecret,
    orgId: config.orgId,
    projectId: config.projectId,
    clientId: config.clientId ? '***' : undefined,
    clientSecret: config.clientSecret ? '***' : undefined
  })
  
  if (!config.orgId || !config.projectId || !config.clientId || !config.clientSecret) {
    console.error('[ENTITY SERVICE] Missing credentials:', {
      orgId: config.orgId || 'MISSING',
      projectId: config.projectId || 'MISSING',
      clientId: config.clientId ? 'PRESENT' : 'MISSING',
      clientSecret: config.clientSecret ? 'PRESENT' : 'MISSING'
    })
    throw new Error('Backend API credentials not configured. Please configure the gateway in the UI first.')
  }
  
  // Get user details (only for name and email - role/department come from input)
  const user = userService.getUserById(input.userId)
  if (!user) {
    throw new Error('User not found')
  }
  
  // Get M2M token (from cache or fetch new)
  const token = await getM2MToken(config)
  
  // Create entity (use fields from input, not from user)
  const entity = {
    uid: { type: 'User', id: input.userId },
    attrs: {
      user_id: input.userId,
      name: user.name, // From user
      email: user.email, // From user
      role: input.role || '', // From key creation input
      department: input.department || '', // From key creation input
      security_clearance: input.securityClearance || 2,
      training_completed: input.trainingCompleted ?? false,
      years_of_service: toDecimal(input.yearsOfService || 0),
      daily_spend_limit: toDecimal(input.dailySpendLimit || 50),
      monthly_spend_limit: toDecimal(input.monthlySpendLimit || 500),
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
  
  // Make request to Backend API
  const opId = generateOpId()
  const response = await fetch(`${config.backendUrl}/api/v2025-01/projects/${config.projectId}/entity`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'x-project-id': config.projectId,
      'x-op-id': opId,
      'x-session-id': sessionId
    },
    body: JSON.stringify({ entity, status: 1 })
  })
  
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to create entity in Backend API: ${response.status} ${errorText}`)
  }
}

/**
 * Delete entity from Backend API
 */
export async function deleteEntityInBackend(userId: string): Promise<void> {
  // Reload config to get latest values
  const config = loadConfig()
  
  if (!config.orgId || !config.projectId || !config.clientId || !config.clientSecret) {
    throw new Error('Backend API credentials not configured')
  }
  
  // Get M2M token (from cache or fetch new)
  const token = await getM2MToken(config)
  
  // Delete entity: DELETE /entity?entityName=User::"userId"
  const entityName = `User::"${userId}"`
  const opId = generateOpId()
  
  const response = await fetch(
    `${config.backendUrl}/api/v2025-01/projects/${config.projectId}/entity?entityName=${encodeURIComponent(entityName)}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-project-id': config.projectId,
        'x-op-id': opId,
        'x-session-id': sessionId
      }
    }
  )
  
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to delete entity in Backend API: ${response.status} ${errorText}`)
  }
}
