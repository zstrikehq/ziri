 

export interface EntityUid {
  type: string
  id: string
}

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
  last_used_at?: string
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
  name: string
  email: string
  role: string
  department: string
  dailySpendLimit: number
  monthlySpendLimit: number
}

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
  [namespace: string]: {
    entityTypes?: Record<string, any>
    actions?: Record<string, any>
    commonTypes?: Record<string, any>
  }
}

export interface Schema {
  schema: CedarSchema
  version: string
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

export interface SchemaResponse {
  data: {
    schema: CedarSchema
    version: string
  }
}
