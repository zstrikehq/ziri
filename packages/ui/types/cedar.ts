export interface Policy {
    policy: string
    description: string
    effect: 'permit' | 'forbid'
    isActive: boolean
}

export interface CreatePolicyInput {
    policy: string
    description: string
}

export interface CedarSchema {
    '': {
        entityTypes: Record<string, any>
        actions: Record<string, any>
        commonTypes?: Record<string, any>
    }
}

export interface SchemaResponse {
    schema: CedarSchema
    version: string
}
