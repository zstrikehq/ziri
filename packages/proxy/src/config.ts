 
 
import { readConfig, type ZiriConfig } from './config/index.js'
import { getMasterKey, initializeMasterKey } from './utils/master-key.js'

export interface ProxyConfig {
  mode: 'local' | 'live'
  port: number
  host: string
  publicUrl?: string
  backendUrl?: string
  pdpUrl?: string
  projectId?: string
  orgId?: string
  clientId?: string
  clientSecret?: string
  masterKey: string
  logLevel: 'debug' | 'info' | 'warn' | 'error'
  email?: {
    enabled: boolean
    provider: 'smtp' | 'sendgrid' | 'manual'
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
}

const DEFAULT_PORT = 3100
const DEFAULT_HOST = '127.0.0.1'
const DEFAULT_MODE = 'local' as const
const DEFAULT_LOG_LEVEL = 'info' as const

export function loadConfig(): ProxyConfig {
  let fileConfig: ZiriConfig | null = null
  
  try {
    fileConfig = readConfig()
  } catch (error) {
 
    console.warn('[CONFIG] Config file not found, using defaults')
  }
  
  let masterKey = getMasterKey()
  if (!masterKey) {
    masterKey = initializeMasterKey()
  }

  const mode = fileConfig?.mode || DEFAULT_MODE
  const serverConfig = fileConfig?.server || {}
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : (serverConfig.port || (fileConfig as any)?.port || DEFAULT_PORT)
  const host = process.env.HOST || serverConfig.host || DEFAULT_HOST

 
  let emailConfig: ProxyConfig['email'] = undefined
  if (fileConfig?.email) {
    emailConfig = {
      enabled: fileConfig.email.enabled ?? false,
      provider: fileConfig.email.provider || 'manual',
      smtp: fileConfig.email.smtp,
      sendgrid: fileConfig.email.sendgrid,
      from: fileConfig.email.from
    }
  }

  return {
    mode,
    port,
    host,
    publicUrl: fileConfig?.publicUrl,
 
    backendUrl: fileConfig?.backendUrl,
    pdpUrl: fileConfig?.pdpUrl,
    projectId: fileConfig?.projectId,
    orgId: fileConfig?.orgId,
    clientId: fileConfig?.clientId,
    clientSecret: fileConfig?.clientSecret,
    masterKey,
    logLevel: ((fileConfig as any)?.logLevel as ProxyConfig['logLevel']) || DEFAULT_LOG_LEVEL,
    email: emailConfig
  }
}
