import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import type { ProviderMetadata } from './providers.js'

export interface ZiriConfig {
  mode?: 'local' | 'live'
  
  server?: {
    host?: string
    port?: number
  }
  publicUrl?: string
  
  email?: {
    enabled?: boolean
    provider?: 'smtp' | 'sendgrid' | 'manual'
    smtp?: {
      host: string
      port: number
      secure?: boolean
      auth: {
        user: string
        pass: string
      }
    }
    sendgrid?: {
      apiKey: string
    }
    from?: string
  }
  
  backendUrl?: string
  orgId?: string
  projectId?: string
  clientId?: string
  clientSecret?: string
  pdpUrl?: string
  refreshInterval?: number
  refreshFailRetry?: number
  refreshFailRetryDelay?: number
  maxStaleTime?: number
  providers?: Record<string, ProviderMetadata>
  [key: string]: any
}

export function getConfigDir(): string {
  if (process.env.CONFIG_DIR) {
    return process.env.CONFIG_DIR
  }
  if (process.platform === 'win32') {
    return join(process.env.APPDATA || homedir(), 'ziri')
  }
  return join(homedir(), '.ziri')
}

export function getConfigPath(): string {
  const configDir = getConfigDir()
  
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true })
  }
  
  return join(configDir, 'config.json')
}

export function readConfig(): ZiriConfig | null {
  const configPath = getConfigPath()
  
  if (!existsSync(configPath)) {
    return null
  }
  
  try {
    const content = readFileSync(configPath, 'utf-8')
    const config = JSON.parse(content) as Partial<ZiriConfig>
    
    const mode = config.mode || 'local'
    
    if (mode === 'live') {
      if (!config.backendUrl || !config.orgId || !config.projectId || !config.clientId || !config.clientSecret) {
        return null
      }
    }
    
    return config as ZiriConfig
  } catch (error) {
    console.error('Failed to read config:', error)
    return null
  }
}

export function writeConfig(config: Partial<ZiriConfig>): void {
  const configPath = getConfigPath()
  const existing = readConfig() || {}
  
  const merged = {
    ...existing,
    ...config
  }
  
  try {
    writeFileSync(configPath, JSON.stringify(merged, null, 2), 'utf-8')
  } catch (error) {
    console.error('Failed to save config:', error)
    throw error
  }
}

export function validateConfig(config: any): ZiriConfig {
  if (!config.backendUrl) {
    throw new Error('backendUrl is required')
  }
  if (!config.orgId) {
    throw new Error('orgId is required')
  }
  if (!config.projectId) {
    throw new Error('projectId is required')
  }
  if (!config.clientId) {
    throw new Error('clientId is required')
  }
  if (!config.clientSecret) {
    throw new Error('clientSecret is required')
  }
  
  return config as ZiriConfig
}

export function getConfigValue(key: keyof ZiriConfig): any {
  const config = readConfig()
  return config ? config[key] : undefined
}

export function setConfigValue(key: keyof ZiriConfig, value: any): void {
  writeConfig({ [key]: value })
}

export * from './providers.js'

export function getProviderMetadata(providerName: string): ProviderMetadata | null {
  const config = readConfig()
  if (!config || !config.providers) {
    return null
  }
  return config.providers[providerName] || null
}

export function setProviderMetadata(providerName: string, metadata: ProviderMetadata): void {
  const config = readConfig() || ({} as ZiriConfig)
  if (!config.providers) {
    config.providers = {}
  }
  config.providers[providerName] = metadata
  writeConfig(config)
}

export function removeProviderMetadata(providerName: string): void {
  const config = readConfig()
  if (!config || !config.providers) {
    return
  }
  delete config.providers[providerName]
  writeConfig(config)
}

export function listProviderMetadata(): Record<string, ProviderMetadata> {
  const config = readConfig()
  return config?.providers || {}
}
