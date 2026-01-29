# Config

Manage server configuration.

## Get Config

Get the current server configuration.

### Endpoint

```
GET /api/config
```

### Example Request

```bash
curl -H "Authorization: Bearer your-token" \
  http://localhost:3100/api/config
```

### Success Response

```json
{
  "mode": "local",
  "server": {
    "host": "127.0.0.1",
    "port": 3100
  },
  "publicUrl": "",
  "email": {
    "enabled": false
  },
  "logLevel": "info",
  "masterKey": "masked"
}
```

## Update Config

Update server configuration.

### Endpoint

```
POST /api/config
```

### Request Body

```typescript
{
  mode?: 'local' | 'live'           // Optional
  server?: {                        // Optional
    host?: string
    port?: number
  }
  publicUrl?: string                // Optional
  email?: {                         // Optional
    enabled?: boolean
    provider?: 'smtp' | 'sendgrid' | 'manual'
    smtp?: { ... }
    sendgrid?: { ... }
    from?: string
  }
  logLevel?: string                 // Optional
}
```

### Example Request

```bash
curl -X POST http://localhost:3100/api/config \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "local",
    "server": {
      "host": "0.0.0.0",
      "port": 3100
    },
    "publicUrl": "https://ziri.example.com",
    "email": {
      "enabled": true,
      "provider": "smtp",
      "smtp": {
        "host": "smtp.example.com",
        "port": 587,
        "secure": false,
        "auth": {
          "user": "user@example.com",
          "pass": "password"
        }
      },
      "from": "noreply@example.com"
    }
  }'
```

### Success Response

```json
{
  "success": true,
  "message": "Configuration saved successfully. Restart the proxy server for server settings to take effect.",
  "config": {
    "mode": "local",
    "server": {
      "host": "0.0.0.0",
      "port": 3100
    },
    "publicUrl": "https://ziri.example.com",
    "email": {
      "enabled": true,
      "provider": "smtp"
    },
    "logLevel": "info"
  }
}
```

**Note**: Server settings (host, port) require a restart to take effect.

## Configuration Fields

### Mode

- `local` - Local mode (default)

### Server

- `host` - Server host (default: `127.0.0.1`, Docker: `0.0.0.0`)
- `port` - Server port (default: `3100`)

### Public URL

The public URL where users can access ZIRI. Used in email notifications and API responses.

### Email

Email configuration for sending user credentials and password resets.

**SMTP**:
```json
{
  "enabled": true,
  "provider": "smtp",
  "smtp": {
    "host": "smtp.example.com",
    "port": 587,
    "secure": false,
    "auth": {
      "user": "user@example.com",
      "pass": "password"
    }
  },
  "from": "noreply@example.com"
}
```

**SendGrid**:
```json
{
  "enabled": true,
  "provider": "sendgrid",
  "sendgrid": {
    "apiKey": "SG...."
  },
  "from": "noreply@example.com"
}
```

### Log Level

Logging level: `debug`, `info`, `warn`, `error`.

## Configuration Precedence

Configuration is loaded in this order:

1. Environment variables (`PORT`, `HOST`, `CONFIG_DIR`)
2. Config file (`config.json`)
3. Defaults

Environment variables override config file settings.

## Config File Location

- **Windows**: `%APPDATA%\ziri\config.json`
- **macOS/Linux**: `~/.ziri/config.json`
- **Docker**: `/data/config.json` (when `CONFIG_DIR=/data`)

## Next Steps

- See [Configuration Guide](/configuration/) for detailed configuration options
- Check [Environment Variables](/configuration/environment-variables) for env var overrides
- Read [Email Setup](/configuration/email-setup) for email configuration
