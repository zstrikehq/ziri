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
    user_id: string
    name: string
    email: string
    role: string
    department: string
    security_clearance: number
    training_completed: boolean
    years_of_service: CedarDecimal
    daily_spend_limit: CedarDecimal
    monthly_spend_limit: CedarDecimal
    current_daily_spend: CedarDecimal
    current_monthly_spend: CedarDecimal
    last_daily_reset: string
    last_monthly_reset: string
    allowed_ip_ranges: CedarIp[]
    status: 'active' | 'revoked'
    created_at: string
    team?: string  // Optional field from backend
}

export interface Entity {
    uid: EntityUid
    attrs: EntityAttrs
    parents: EntityUid[]
}

export interface Key {
    userId: string
    name: string
    email: string
    role: string
    department: string
    apiKey: string
    currentDailySpend: number
    dailySpendLimit: number
    currentMonthlySpend: number
    monthlySpendLimit: number
    status: 'active' | 'revoked'
    createdAt: string
    lastUsedAt?: string
}

export interface CreateKeyInput {
    userId: string
    // Entity attributes (moved from user creation)
    role?: string
    department?: string
    securityClearance?: number
    trainingCompleted?: boolean
    yearsOfService?: number
    // Spend limits
    dailySpendLimit?: number
    monthlySpendLimit?: number
}
