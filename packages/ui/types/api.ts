import type { Entity } from './entity'
import type { Policy, CedarSchema } from './cedar'

export interface ApiResponse<T> {
    data: T
}

export interface TokenResponse {
    access_token: string
    token_type: string
    expires_in: number
}

export interface EntitiesResponse {
    data: Entity[]
}

export interface PoliciesResponse {
    data: {
        policies: Array<{
            policy: string
            description: string
            isActive: boolean
        }>
    }
}

export interface SchemaApiResponse {
    data: {
        schema: CedarSchema | string  // Can be JSON object or Cedar text string
        schemaJson?: CedarSchema  // JSON format (if available)
        version: string
        format?: 'json' | 'cedar'  // Format indicator
    }
}
