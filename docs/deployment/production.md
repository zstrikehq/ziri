# Production Deployment

Deploy ZIRI using Docker Compose.

## Basic Setup

Use Docker Compose to run ZIRI:

```yaml
services:
  proxy:
    image: ziri/proxy:latest
    ports:
      - "3100:3100"
    volumes:
      - ziri-data:/data
    environment:
      - CONFIG_DIR=/data
      - PORT=3100
      - HOST=0.0.0.0
    restart: unless-stopped

volumes:
  ziri-data:
```

Start:

```bash
docker compose up -d
```

## Exposing to Users

Once ZIRI is running, share the URL with your users:

- **Local machine**: `http://your-server-ip:3100`
- **With domain**: `https://ziri.yourdomain.com` (requires reverse proxy)

Users can:
- Make direct API requests to the URL
- Use the SDK with the proxy URL
- Use CLI tools with the proxy URL

## Environment Variables

Set environment variables for configuration:

```yaml
environment:
  - CONFIG_DIR=/data
  - PORT=3100
  - HOST=0.0.0.0
  - ZIRI_MASTER_KEY=${MASTER_KEY}
  - ZIRI_ENCRYPTION_KEY=${ENCRYPTION_KEY}
```

Use a `.env` file for secrets:

```bash
# .env
MASTER_KEY=your-master-key
ENCRYPTION_KEY=your-encryption-key
```

Docker Compose automatically loads `.env` files.

## Data Persistence

Data is stored in the Docker volume `ziri-data`. This includes:
- Configuration
- Database
- User data
- Policies
- Audit logs

The volume persists across container restarts and updates.

## Backup

Backup the volume:

```bash
docker run --rm -v ziri-data:/data -v $(pwd):/backup \
  alpine tar czf /backup/ziri-backup.tar.gz /data
```

Restore:

```bash
docker run --rm -v ziri-data:/data -v $(pwd):/backup \
  alpine tar xzf /backup/ziri-backup.tar.gz -C /
```

## Updates

Update to a new version:

```bash
docker compose pull
docker compose up -d
```

## Monitoring

Check health:

```bash
curl http://localhost:3100/health
```

View logs:

```bash
docker compose logs -f
```

## Next Steps

- [Docker Compose Guide](/deployment/docker-compose) - More Docker details
- [Configuration](/configuration/) - Configure providers and settings
