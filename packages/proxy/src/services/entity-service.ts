 

import { loadConfig } from '../config.js'
import { randomBytes } from 'crypto'
import * as userService from './user-service.js'
import { getM2MToken } from './m2m-token-cache.js'

 
function generateOpId(): string {
  return randomBytes(8).toString('hex')
}

 
const sessionId = randomBytes(8).toString('hex')

 
import { toDecimalOne, toDecimalFour, toIp } from '../utils/cedar.js'

export interface CreateEntityInput {
  userId: string
  roleId?: string
  role?: string
  tenant?: string
  securityClearance?: number
  trainingCompleted?: boolean
  yearsOfService?: number
  dailySpendLimit?: number
  monthlySpendLimit?: number
}

 
export async function createEntityInBackend(input: CreateEntityInput): Promise<void> {
 
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
  
 
  const user = userService.getUserById(input.userId)
  if (!user) {
    throw new Error('User not found')
  }
  
 
  const token = await getM2MToken(config)
  
 
  const entity = {
    uid: { type: 'User', id: input.userId },
    attrs: {
      user_id: input.userId,
      name: user.name,
      email: user.email,
      tenant: input.tenant || '',
      security_clearance: input.securityClearance || 2,
      training_completed: input.trainingCompleted ?? false,
      years_of_service: toDecimalOne(input.yearsOfService || 0),
      daily_spend_limit: toDecimalFour(input.dailySpendLimit || 50),
      monthly_spend_limit: toDecimalFour(input.monthlySpendLimit || 500),
      current_daily_spend: toDecimalFour(0),
      current_monthly_spend: toDecimalFour(0),
      last_daily_reset: new Date().toISOString(),
      last_monthly_reset: new Date().toISOString(),
      allowed_ip_ranges: [toIp('0.0.0.0/0')],
      status: 'active',
      created_at: new Date().toISOString()
    },
    parents: input.roleId ? [{ type: 'Role', id: input.roleId }] : []
  }
  
 
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

 
export async function deleteEntityInBackend(keyHash: string): Promise<void> {
 
  const config = loadConfig()
  
  if (!config.orgId || !config.projectId || !config.clientId || !config.clientSecret) {
    throw new Error('Backend API credentials not configured')
  }
  
 
  const token = await getM2MToken(config)
  
 
  const entityName = `Key::"${keyHash}"`
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
