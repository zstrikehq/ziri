import type { CedarDecimal, CedarIp } from '~/types/entity'

export function parseDecimal(value: CedarDecimal | undefined): number {
    if (!value || !value.__extn || value.__extn.fn !== 'decimal') {
        return 0
    }
    return parseFloat(value.__extn.arg) || 0
}

export function toDecimal(value: number): CedarDecimal {
    // Backend requires max 4 decimal places
    const rounded = Math.round(value * 10000) / 10000
    return {
        __extn: {
            fn: 'decimal',
            arg: rounded.toFixed(4).replace(/\.?0+$/, '') || '0'
        }
    }
}

export function parseIp(value: CedarIp | undefined): string {
    if (!value || !value.__extn || value.__extn.fn !== 'ip') {
        return ''
    }
    return value.__extn.arg
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

export function formatSchemaForDisplay(schema: any): string {
    return JSON.stringify(schema, null, 2)
}
