# Environment Variables

Environment variables override config file settings and are useful for Docker deployments.

## CONFIG_DIR

Override the config directory location.

Set in Docker Compose:

```yaml
environment:
  - CONFIG_DIR=/data
```

**Default**:
- Windows: `%APPDATA%\ziri`
- macOS/Linux: `~/.ziri`
- Docker: `/data/` (when `CONFIG_DIR=/data` is set)

**Use case**: Docker deployments, custom storage locations

## PORT

Override the server port.

Set in Docker Compose:

```yaml
environment:
  - PORT=3100
```

**Default**: `3100`

**Use case**: Avoid port conflicts, production deployments

## HOST

Override the server host.

Set in Docker Compose:

```yaml
environment:
  - HOST=0.0.0.0
```

**Default**: `127.0.0.1`

**Use case**: Docker (use `0.0.0.0` to accept external connections)

## ZIRI_MASTER_KEY

Set a persistent master key. Prevents master key regeneration on each restart.

Set in Docker Compose:

```yaml
environment:
  - ZIRI_MASTER_KEY=your-secure-key-here
```

**Default**: Generated on each restart

**Use case**: Production deployments where you want a stable master key

## ZIRI_ENCRYPTION_KEY

Set the encryption key for sensitive data (emails, API keys).

Set in Docker Compose:

```yaml
environment:
  - ZIRI_ENCRYPTION_KEY=your-encryption-key-here
```

**Default**: Generated automatically

**Use case**: Production deployments

**Important**: If you change this, existing encrypted data becomes unreadable.

## ZIRI_PROXY_URL

Default proxy URL for SDK and client applications.

Set in Docker Compose:

```yaml
environment:
  - ZIRI_PROXY_URL=https://ziri.example.com
```

**Default**: `http://localhost:3100`

**Use case**: SDK default URL, email notifications

## NODE_ENV

Set Node.js environment.

Set in Docker Compose:

```yaml
environment:
  - NODE_ENV=production
```

**Default**: Not set (development)

**Use case**: Production deployments

## Docker Example

```yaml
environment:
  - CONFIG_DIR=/data
  - PORT=3100
  - HOST=0.0.0.0
  - ZIRI_MASTER_KEY=${MASTER_KEY}
  - ZIRI_ENCRYPTION_KEY=${ENCRYPTION_KEY}
  - NODE_ENV=production
```

Or use an `.env` file:

```bash
# .env
MASTER_KEY=your-master-key
ENCRYPTION_KEY=your-encryption-key
```

Docker Compose automatically loads `.env` files.

## Best Practices

1. **Use secrets management** - Don't hardcode keys in files
2. **Set in production** - Use environment variables for production
3. **Document defaults** - Document which env vars your deployment uses
4. **Secure storage** - Use secure secret storage (AWS Secrets Manager, etc.)

## Next Steps

- [Config File](/configuration/config-file) - Config file structure
- [Docker Compose](/deployment/docker-compose) - Docker Compose setup
