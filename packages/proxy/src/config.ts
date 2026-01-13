// Configuration management

import { readConfig, type ZsAiConfig } from '@zs-ai/config'
import { getMasterKey } from './utils/master-key.js'

export interface ProxyConfig {
  port: number
  backendUrl: string  // Fixed: https://api-dev.authzebra.com
  pdpUrl?: string
  projectId?: string
  orgId?: string
  clientId?: string
  clientSecret?: string
  masterKey: string
  logLevel: 'debug' | 'info' | 'warn' | 'error'
}

const DEFAULT_PORT = 3100
const DEFAULT_BACKEND_URL = 'https://api-dev.authzebra.com'
const DEFAULT_LOG_LEVEL = 'info' as const

export function loadConfig(): ProxyConfig {
  let fileConfig: ZsAiConfig | null = null
  
  try {
    fileConfig = readConfig()
  } catch (error) {
    // Config file might not exist yet, that's okay
    console.warn('[CONFIG] Config file not found, using defaults')
  }
  
  // Master key is required
  const masterKey = getMasterKey()
  if (!masterKey) {
    throw new Error('Master key not found. Set ZS_AI_MASTER_KEY env var or initialize proxy.')
  }

  return {
    port: (fileConfig as any)?.port || DEFAULT_PORT,
    backendUrl: DEFAULT_BACKEND_URL,  // Always fixed
    pdpUrl: fileConfig?.pdpUrl,
    projectId: fileConfig?.projectId,
    orgId: fileConfig?.orgId,
    clientId: fileConfig?.clientId,
    clientSecret: fileConfig?.clientSecret,
    masterKey,
    logLevel: ((fileConfig as any)?.logLevel as ProxyConfig['logLevel']) || DEFAULT_LOG_LEVEL
  }
}
