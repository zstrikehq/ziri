import { format, formatDistanceToNow } from 'date-fns'

export function formatDate(date: string | Date): string {
    if (!date) return '-'
    const d = typeof date === 'string' ? new Date(date) : date
    return format(d, 'MMM d, yyyy HH:mm')
}

export function formatDateShort(date: string | Date): string {
    if (!date) return '-'
    const d = typeof date === 'string' ? new Date(date) : date
    return format(d, 'MMM d, HH:mm')
}

export function formatRelativeTime(date: string | Date): string {
    if (!date) return '-'
    const d = typeof date === 'string' ? new Date(date) : date
    return formatDistanceToNow(d, { addSuffix: true })
}

export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 4,
        maximumFractionDigits: 4
    }).format(amount)
}

export function formatPercent(value: number, total: number): number {
    if (total === 0) return 0
    return Math.min(100, (value / total) * 100)
}

export function maskApiKey(key: string): string {
    if (!key || key.length < 10) return key
    return `${key.slice(0, 7)}...${key.slice(-4)}`
}
