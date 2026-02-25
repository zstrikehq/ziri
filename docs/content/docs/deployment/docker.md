---
title: Docker
weight: 5
---

Run ZIRI using Docker (without Docker Compose).

## Pull the Image

```bash
docker pull ziri/proxy:latest
```

## Run the Container

```bash
docker run -d \
  --name ziri-proxy \
  -p 3100:3100 \
  -v ziri-data:/data \
  -e CONFIG_DIR=/data \
  -e PORT=3100 \
  -e HOST=0.0.0.0 \
  ziri/proxy:latest
```

## Viewing Logs

```bash
docker logs ziri-proxy
```

Follow logs:

```bash
docker logs -f ziri-proxy
```

## Stopping the Container

```bash
docker stop ziri-proxy
docker rm ziri-proxy
```

## Data Persistence

Data is stored in the Docker volume `ziri-data`. The volume persists even if the container is removed.

## Accessing the UI

Once running, access the UI at `http://localhost:3100`.

## Next Steps

-   [Docker Compose](/docs/deployment/docker-compose)
-   [Configuration](/docs/configuration/)
