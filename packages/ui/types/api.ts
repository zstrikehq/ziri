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
        }>
    }
}

export interface SchemaApiResponse {
    data: {
        schema: CedarSchema
        version: string
    }
}
