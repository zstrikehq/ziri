export interface GatewayConfig {
    projectId: string
    orgId: string
    clientId: string
    clientSecret: string
    pdpUrl: string
    proxyUrl?: string  // Optional: Proxy server URL (defaults to current origin)
    port: number
    logLevel: 'debug' | 'info' | 'warn' | 'error'
    masterKey?: string  // Read-only: Display only, not editable
}

export const defaultConfig: GatewayConfig = {
    projectId: '',
    orgId: '',
    clientId: '',
    clientSecret: '',
    pdpUrl: '',
    proxyUrl: '',
    port: 3100,
    logLevel: 'info',
    masterKey: ''
}
