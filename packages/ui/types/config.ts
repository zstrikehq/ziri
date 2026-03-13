export interface GatewayConfig {
    server?: {
        host?: string
        port?: number
    }
    publicUrl?: string

    email?: {
        enabled?: boolean
        provider?: string
        options?: Record<string, unknown>
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

    proxyUrl?: string
    port?: number
    logLevel?: 'debug' | 'info' | 'warn' | 'error'
    rootKey?: string
}

export const defaultConfig: GatewayConfig = {
    server: {
        host: '127.0.0.1',
        port: 3100
    },
    publicUrl: '',
    email: {
        enabled: false,
        provider: 'manual'
    },
    proxyUrl: '',
    port: 3100,
    logLevel: 'info',
    rootKey: ''
}
