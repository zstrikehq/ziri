---
title: Environment Variables
weight: 10
---

Environment variables override config file settings and are useful for Docker deployments.

## CONFIG_DIR

Override the config directory location.

Set in Docker Compose:

```yaml
environment:
    - CONFIG_DIR=/data
```

**Default**:

-   Windows: `%APPDATA%\ziri`
-   macOS/Linux: `~/.ziri`
-   Docker: `/data/` (when `CONFIG_DIR=/data` is set)

**Use case**: Docker deployments, custom storage locations.

## PORT

Override the server port.

```yaml
environment:
    - PORT=3100
```

**Default**: `3100`  
**Use case**: Avoid port conflicts, production deployments.

## HOST

Override the server host.

```yaml
environment:
    - HOST=0.0.0.0
```

**Default**: `127.0.0.1`  
**Use case**: Docker (use `0.0.0.0` to accept external connections).

## ROTATE_ROOT_KEY

Control whether the root key is rotated on each startup.

```yaml
environment:
    - ROTATE_ROOT_KEY=true
```

**Default**: Not set (treated as `false`) — ZIRI generates a root key on first start and reuses the value from `.ziri-root-key` on subsequent restarts.  
**Use case**: Set to `true` in environments where you want a new root key on every start and are comfortable invalidating existing sessions/credentials.

## ZIRI_ENCRYPTION_KEY

Set the encryption key for sensitive data (emails, API keys). This is the value read by the proxy at runtime.

```yaml
environment:
    - ZIRI_ENCRYPTION_KEY=your-encryption-key-here
```

**Default**: If not set, ZIRI generates an encryption key on first start.  
**Use case**: Production deployments where you want a stable, known encryption key. Changing it will invalidate previously encrypted data.

## ZIRI_PROXY_URL

Default proxy URL for SDK and client applications.

```yaml
environment:
    - ZIRI_PROXY_URL=https://ziri.example.com
```

**Default**: `http://localhost:3100`  
**Use case**: SDK default URL, email notifications.

## NODE_ENV

Set Node.js environment.

```yaml
environment:
    - NODE_ENV=production
```

**Default**: Not set (development)  
**Use case**: Production deployments.

## Docker Example

```yaml
environment:
    - CONFIG_DIR=/data
    - PORT=3100
    - HOST=0.0.0.0
    - ZIRI_ENCRYPTION_KEY=${ENCRYPTION_KEY}
    - ROTATE_ROOT_KEY=false
    - NODE_ENV=production
```

Or use an `.env` file:

```bash {filename=".env"}
# .env
ENCRYPTION_KEY=your-encryption-key
```

Docker Compose automatically loads `.env` files.

## Best Practices

1. **Use secrets management** - Don’t hardcode keys in files.
2. **Set in production** - Favor environment variables for production.
3. **Document defaults** - Track which env vars your deployment uses.
4. **Secure storage** - Use secret stores (AWS Secrets Manager, etc.).

## Next Steps

-   [Config File](/docs/configuration/config-file)
-   [Docker Compose Guide](/docs/deployment/docker-compose)
