 
 
import { readConfig, type ZiriConfig } from './config/index.js'
import { getRootKey, initializeRootKey } from './utils/root-key.js'

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
  rootKey: string
  logLevel: 'debug' | 'info' | 'warn' | 'error'
  ssl?: {
    enabled: boolean
    cert: string
    key: string
  }
  email?: {
    enabled: boolean
    provider: string
    options?: Record<string, unknown>
    fromByProvider?: Record<string, string>
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
    mailgun?: {
      apiKey: string
      domain: string
      apiUrl?: string
    }
    ses?: {
      accessKeyId: string
      secretAccessKey: string
      region: string
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
  
  let rootKey = getRootKey()
  if (!rootKey) {
    rootKey = initializeRootKey()
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
      options: fileConfig.email.options,
      fromByProvider: fileConfig.email.fromByProvider,
      smtp: fileConfig.email.smtp,
      sendgrid: fileConfig.email.sendgrid,
      mailgun: fileConfig.email.mailgun,
      ses: fileConfig.email.ses,
      from: fileConfig.email.from
    }
  }

  let sslConfig: ProxyConfig['ssl'] = undefined
  const sslEnabled = process.env.SSL_ENABLED === 'true' || fileConfig?.ssl?.enabled
  const sslCert = process.env.SSL_CERT_PATH || fileConfig?.ssl?.cert
  const sslKey = process.env.SSL_KEY_PATH || fileConfig?.ssl?.key
  if (sslEnabled && sslCert && sslKey) {
    sslConfig = {
      enabled: true,
      cert: sslCert,
      key: sslKey
    }
  }

  return {
    mode,
    port,
    host,
    publicUrl: fileConfig?.publicUrl,
    ssl: sslConfig,
    backendUrl: fileConfig?.backendUrl,
    pdpUrl: fileConfig?.pdpUrl,
    projectId: fileConfig?.projectId,
    orgId: fileConfig?.orgId,
    clientId: fileConfig?.clientId,
    clientSecret: fileConfig?.clientSecret,
    rootKey,
    logLevel: ((fileConfig as any)?.logLevel as ProxyConfig['logLevel']) || DEFAULT_LOG_LEVEL,
    email: emailConfig
  }
}
