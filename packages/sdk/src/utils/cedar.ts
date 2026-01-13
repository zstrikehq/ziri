// Cedar utility functions

import type { CedarDecimal, CedarIp, Entity, Key, Policy } from '../types'

export function parseDecimal(value: any): number {
  if (!value || !value.__extn || value.__extn.fn !== 'decimal') {
    return 0
  }
  return parseFloat(value.__extn.arg || '0')
}

export function toDecimal(value: number): CedarDecimal {
  return {
    __extn: {
      fn: 'decimal',
      arg: value.toFixed(2)
    }
  }
}

export function toIp(value: string): CedarIp {
  return {
    __extn: {
      fn: 'ip',
      arg: value
    }
  }
}

export function extractPolicyEffect(policy: string): 'permit' | 'forbid' {
  const trimmed = policy.trim().toLowerCase()
  if (trimmed.startsWith('permit')) return 'permit'
  if (trimmed.startsWith('forbid')) return 'forbid'
  return 'permit'
}

export function isActivePolicy(description: string): boolean {
  return description.includes('#active')
}

export function mapEntityToKey(entity: Entity): Key {
  return {
    userId: entity.uid.id,
    name: entity.attrs.name || '',
    email: entity.attrs.email || '',
    role: entity.attrs.role || '',
    department: entity.attrs.department || '',
    apiKey: `sk-zs-${entity.uid.id}-${Math.random().toString(36).substring(2, 8)}`,
    currentDailySpend: parseDecimal(entity.attrs.current_daily_spend),
    dailySpendLimit: parseDecimal(entity.attrs.daily_spend_limit),
    currentMonthlySpend: parseDecimal(entity.attrs.current_monthly_spend),
    monthlySpendLimit: parseDecimal(entity.attrs.monthly_spend_limit),
    status: entity.attrs.status || 'active',
    createdAt: entity.attrs.created_at || new Date().toISOString(),
    lastUsedAt: entity.attrs.last_used_at
  }
}
