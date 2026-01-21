export interface CedarDecimal {
    __extn: {
        fn: 'decimal'
        arg: string
    }
}

export interface CedarIp {
    __extn: {
        fn: 'ip'
        arg: string
    }
}

export interface EntityUid {
    type: string
    id: string
}

export interface EntityAttrs {
    // User entity attributes
    user_id?: string
    email?: string
    department?: string
    is_agent?: boolean
    limit_requests_per_minute?: number
    // UserKey entity attributes
    current_daily_spend?: CedarDecimal
    current_monthly_spend?: CedarDecimal
    last_daily_reset?: string
    last_monthly_reset?: string
    status?: 'active' | 'revoked' | 'disabled'
    user?: {
        __entity: {
            type: string
            id: string
        }
    }
    // Legacy fields (for backward compatibility)
    name?: string
    role?: string
    security_clearance?: number
    training_completed?: boolean
    years_of_service?: CedarDecimal
    daily_spend_limit?: CedarDecimal
    monthly_spend_limit?: CedarDecimal
    allowed_ip_ranges?: CedarIp[]
    created_at?: string
    team?: string
    [key: string]: any // Index signature for flexibility
}

export interface Entity {
    uid: EntityUid
    attrs: EntityAttrs
    parents: EntityUid[]
}

export interface Key {
    userId: string
    userKeyId?: string // UserKey entity ID
    executionKey?: string // user_agent_keys.id for cost tracking
    apiKey: string
    currentDailySpend: number
    currentMonthlySpend: number
    status: 'active' | 'revoked' | 'disabled'
    createdAt: string
    // User info (from User entity, not UserKey)
    name?: string
    email?: string
    department?: string
    isAgent?: boolean
    limitRequestsPerMinute?: number
    // UserKey reset times
    lastDailyReset?: string
    lastMonthlyReset?: string
}

export interface CreateKeyInput {
    userId: string
    // No entity attributes - UserKey is created when user is created
    // Key creation just links to existing UserKey entity
}
