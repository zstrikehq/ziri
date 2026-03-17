---
title: Installation
weight: 30
---

Install ZIRI using Docker Compose.

## Prerequisites

-   **Docker** and **Docker Compose** installed on your system
-   An OpenAI API key (or Anthropic, for testing)

## Quick Installation

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
        restart: unless-stopped

volumes:
    ziri-data:
```

Start ZIRI:

```bash
docker compose up -d
```

View logs:

```bash
docker compose logs -f
```

The server starts on `http://localhost:3100`. Access the admin UI at the same URL.

## Configuration

ZIRI stores configuration and data in a Docker volume (`ziri-data`). This includes:

-   Server configuration
-   Database
-   User data
-   Policies

The volume persists even if you stop or remove the container.

## Verifying Installation

### Check Server Health

```bash
curl http://localhost:3100/health
```

Expected response:

```json
{
	"status": "ok",
	"timestamp": "2025-01-XX...",
	"sessionId": "session-..."
}
```

### Access Admin UI

Open `http://localhost:3100` in your browser. You should see the login page.

On first run, ZIRI generates a **root key** and stores it in the config directory as `.ziri-root-key`.

With the example `docker-compose.yml` (which sets `CONFIG_DIR=/data`), the file lives at `/data/.ziri-root-key` inside the container. You can read it like this:

```bash
docker compose exec proxy cat /data/.ziri-root-key
```

Use this root key to log in to the admin UI:

-   **Username / Email**: `ziri` or `ziri@ziri.local`
-   **Password**: The root key from `.ziri-root-key`

## Stopping ZIRI

Stop ZIRI:

```bash
docker compose down
```

This stops the container but keeps the volume (your data is safe).

To remove everything including data:

```bash
docker compose down -v
```

**Warning**: This deletes all data.

## Updating ZIRI

To update to a new version:

```bash
docker compose pull
docker compose up -d
```

## Custom Port

To use a different port, change the port mapping:

```yaml {filename="docker-compose.yml"}
ports:
    - "8080:3100" # Access via localhost:8080
```

## Troubleshooting

### Port Already in Use

If port 3100 is already in use, change the port mapping in `docker-compose.yml`:

```yaml {filename="docker-compose.yml"}
ports:
    - "3101:3100" # Use port 3101 instead
```

### Container Won't Start

Check logs:

```bash
docker compose logs
```

Common issues:

-   Port conflict
-   Volume permission issues
-   Insufficient Docker resources

### Can't Access UI

Make sure:

-   Container is running: `docker compose ps`
-   Port is mapped correctly
-   Firewall allows the port

## Next Steps

After installation:

1. [Quick Start](/docs/getting-started/quickstart) - Make your first request
2. [Configuration](/docs/configuration/) - Set up providers and email
3. [Docker Compose Guide](/docs/deployment/docker-compose) - More Docker details
