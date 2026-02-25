---
title: Docker Compose
weight: 10
---

Use Docker Compose to manage ZIRI with a single command.

## docker-compose.yml

Create a `docker-compose.yml` file:

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
            - NODE_ENV=production
        restart: unless-stopped

volumes:
    ziri-data:
```

## Starting

Start ZIRI:

```bash
docker compose up -d
```

The `-d` flag runs in detached mode (background).

## Stopping

Stop ZIRI:

```bash
docker compose down
```

This stops and removes the container but keeps the volume.

## Viewing Logs

View logs:

```bash
docker compose logs
```

Follow logs:

```bash
docker compose logs -f
```

## Updating

To update to a new version:

```bash
docker compose pull
docker compose up -d
```

## Volume Management

### List Volumes

```bash
docker volume ls
```

### Inspect Volume

```bash
docker volume inspect ziri-data
```

### Backup Volume

```bash
docker run --rm -v ziri-data:/data -v $(pwd):/backup \
  alpine tar czf /backup/ziri-backup.tar.gz /data
```

### Restore Volume

```bash
docker run --rm -v ziri-data:/data -v $(pwd):/backup \
  alpine tar xzf /backup/ziri-backup.tar.gz -C /
```

### Remove Volume

**Warning**: This deletes all data.

```bash
docker compose down -v
```

## Environment Variables

Set environment variables in `docker-compose.yml`:

```yaml {filename="docker-compose.yml"}
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

## Restart Policy

The `restart: unless-stopped` policy means:

-   Container restarts automatically if it crashes
-   Container restarts on Docker daemon restart
-   Container doesn't restart if you stop it manually

## Health Checks

Add a health check:

```yaml {filename="docker-compose.yml"}
healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:3100/health"]
    interval: 30s
    timeout: 10s
    retries: 3
```

## Next Steps

-   [Production Deployment](/docs/deployment/production) - Production setup
-   [Configuration](/docs/configuration/) - Configure ZIRI
