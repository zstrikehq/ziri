import { createHash, randomUUID } from 'crypto'

export function generateApiKey(): string {
  const uuidWithoutDashes = randomUUID().replace(/-/g, '')
  return `ziri_${uuidWithoutDashes}`
}

export function validateApiKeyFormat(apiKey: string): boolean {
  if (!apiKey.startsWith('ziri_')) return false
  const uuid = apiKey.substring(5)
  if (!/^[0-9a-f]{32}$/.test(uuid)) return false
  return uuid[12] === '4' && /[89ab]/.test(uuid[16] || '')
}

export function hashApiKey(apiKey: string): string {
  return createHash('sha256').update(apiKey).digest('hex')
}
