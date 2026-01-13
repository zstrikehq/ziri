// PDP (Policy Decision Point) service

import { config } from '../index.js'

export interface PDPRequest {
  principal: string
  action: string
  resource: string
  context?: Record<string, any>
}

export interface PDPResponse {
  decision: 'Allow' | 'Deny'
  diagnostics?: {
    reason?: string[]
    errors?: string[]
  }
}

/**
 * Authorize request using PDP
 */
export async function authorizeRequest(request: PDPRequest): Promise<PDPResponse> {
  if (!config.pdpUrl) {
    throw new Error('PDP URL not configured')
  }
  
  try {
    const requestBody = {
      principal: request.principal,
      action: request.action,
      resource: request.resource,
      context: {
        request_time: new Date().toISOString(),
        ...request.context
      }
    }
    
    console.log('[PDP] Authorization request:', JSON.stringify(requestBody, null, 2))
    
    const response = await fetch(`${config.pdpUrl}/authorize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-project-id': config.projectId || ''
      },
      body: JSON.stringify(requestBody)
    })
    
    if (!response.ok) {
      // Handle error response
      try {
        const errorData = await response.json() as {
          code?: number
          description?: string
          data?: {
            decision: string
            diagnostics?: {
              reason?: string[]
              errors?: string[]
            }
          }
        }
        
        return {
          decision: 'Deny',
          diagnostics: {
            errors: [errorData.data?.diagnostics?.errors?.[0] || errorData.description || `PDP returned error: ${response.statusText}`]
          }
        }
      } catch {
        return {
          decision: 'Deny',
          diagnostics: {
            errors: [`PDP returned error: ${response.statusText}`]
          }
        }
      }
    }
    
    const result = await response.json() as {
      decision: string
      diagnostics?: {
        reason?: string[]
        errors?: string[]
      }
      data?: {
        decision: string
        diagnostics?: {
          reason?: string[]
          errors?: string[]
        }
      }
    }
    
    // Handle nested data structure
    const decision = result.data?.decision || result.decision
    const errors = result.data?.diagnostics?.errors || result.diagnostics?.errors || []
    
    return {
      decision: decision === 'Allow' ? 'Allow' : 'Deny',
      diagnostics: result.data?.diagnostics || result.diagnostics
    }
  } catch (error: any) {
    throw new Error(`PDP request failed: ${error.message}`)
  }
}
