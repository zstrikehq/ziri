# Config File

The `config.json` file stores server configuration.

## Location

- **Windows**: `%APPDATA%\ziri\config.json`
- **macOS/Linux**: `~/.ziri/config.json`
- **Docker**: `/data/config.json` (when `CONFIG_DIR=/data`)

## File Structure

```json
{
  "mode": "local",
  "server": {
    "host": "127.0.0.1",
    "port": 3100
  },
  "publicUrl": "",
  "email": {
    "enabled": false,
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
    "sendgrid": {
      "apiKey": "SG...."
    },
    "from": "noreply@example.com"
  },
  "logLevel": "info"
}
```

## Fields

### mode

Server mode: `"local"` or `"live"`.

- `local` - Local mode (default)
- `live` - Backend API + External PDP

### server

Server binding configuration.

- `host` - Host to bind to (default: `127.0.0.1`)
- `port` - Port to listen on (default: `3100`)

**Note**: Changes require server restart.

### publicUrl

Public URL where users can access ZIRI. Used in:
- Email notifications
- API responses
- SDK default URL

Example: `"https://ziri.example.com"`

### email

Email service configuration.

**Enabled**: Set `enabled: true` to enable email.

**Provider**: `"smtp"`, `"sendgrid"`, or `"manual"`.

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
    "apiKey": "SG.your-api-key"
  },
  "from": "noreply@example.com"
}
```

### logLevel

Logging level: `"debug"`, `"info"`, `"warn"`, `"error"`.

Default: `"info"`


## Default Config

If no config file exists, ZIRI uses these defaults:

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
  "logLevel": "info"
}
```

## Updating Config

### Via UI

Use the Config page in the admin UI. Changes are saved automatically.

### Via API

```bash
curl -X POST http://localhost:3100/api/config \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "server": {
      "port": 3101
    }
  }'
```

### Via File

Edit `config.json` directly. Restart the server for server settings to take effect.

## Validation

ZIRI validates the config file on load. Invalid config causes startup to fail with an error message.

## Next Steps

- [Environment Variables](/configuration/environment-variables) - Override config with env vars
- [Email Setup](/configuration/email-setup) - Detailed email configuration
