---
title: Production
weight: 30
---

Deploy ZIRI using Docker Compose.

## Basic Setup

```yaml {filename="docker-compose.yml"}
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

Once ZIRI is running, share the URL:

-   Local: `http://your-server-ip:3100`
-   With domain: `https://ziri.yourdomain.com` (via reverse proxy)

## Environment Variables

```yaml
environment:
    - CONFIG_DIR=/data
    - PORT=3100
    - HOST=0.0.0.0
    - ZIRI_ENCRYPTION_KEY=${ENCRYPTION_KEY}
    - ROTATE_ROOT_KEY=false
```

Use a `.env` file for secrets:

```bash {filename=".env"}
# .env
ENCRYPTION_KEY=your-encryption-key
```

## Data Persistence

Data lives in the Docker volume `ziri-data`:

-   Configuration
-   Database
-   User data
-   Policies
-   Audit logs

The volume persists across restarts and updates.

## Backup

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

```bash
docker compose pull
docker compose up -d
```

## Monitoring

```bash
curl http://localhost:3100/health
docker compose logs -f
```

## Next Steps

-   [Docker Compose Guide](/docs/deployment/docker-compose)
-   [Configuration](/docs/configuration/)
