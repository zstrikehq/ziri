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

## ZIRI_ROOT_KEY

Set a persistent **root key** for the built-in `ziri` admin. Prevents the root key from changing on each restart.

```yaml
environment:
    - ZIRI_ROOT_KEY=your-secure-key-here
```

**Default**: If not set, ZIRI generates a new root key on startup.  
**Use case**: Production deployments where you want a stable, known root key for `ziri` admin login and `x-root-key` access.

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
    - ZIRI_ROOT_KEY=${ROOT_KEY}
    - ZIRI_ENCRYPTION_KEY=${ENCRYPTION_KEY}
    - NODE_ENV=production
```

Or use an `.env` file:

```bash {filename=".env"}
# .env
ROOT_KEY=your-root-key
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
