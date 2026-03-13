---
title: FAQ
weight: 20
---

Frequently asked questions about ZIRI.

## General

### What is ZIRI?

ZIRI is a proxy server that sits between your applications and LLM providers. It adds authorization, rate limiting, cost tracking, and audit logging.

### Why use ZIRI instead of calling providers directly?

ZIRI adds enterprise features:

- Fine-grained access control with Cedar policies
- Rate limiting and queue management
- Cost tracking and spend limits
- Comprehensive audit logging
- Centralized API key management

### Is ZIRI open source?

Check the repository license. This documentation assumes you have access to the codebase.

## Installation

### What are the system requirements?

- Docker and Docker Compose
- 2GB+ RAM recommended
- Disk space for data (grows with usage)

### Can I run ZIRI on Windows?

Yes, ZIRI works on Windows, macOS, and Linux via Docker.

### Do I need Docker?

Yes, ZIRI is distributed as a Docker image. You need Docker and Docker Compose to run it.

## Configuration

### Where is the config file stored?

- Windows: `%APPDATA%\ziri\config.json`
- macOS/Linux: `~/.ziri/config.json`
- Docker: `/data/config.json` (when `CONFIG_DIR=/data`)

### Can I change the config directory?

Yes, set `CONFIG_DIR` environment variable:

```bash
Set `CONFIG_DIR` in Docker Compose environment variables
```

### Do I need to restart after config changes?

Server settings (host, port) require restart. Other settings (email, etc.) take effect immediately.

## API Keys

### How are API keys formatted?

Format: `ziri_<uuidv4withoutdashes>`

Example: `ziri_550e8400e29b41d4a716446655440000`

### Can I see my API key again after creation?

No, API keys are only shown once when created. If you lose it, rotate it to get a new one.

### How do I rotate an API key?

Via UI: Go to Keys page, click on the key, click Rotate.

Via API: `POST /api/keys/:userId/rotate`

The old key is deleted immediately.

## Policies

### Why are my requests denied?

By default, ZIRI denies all requests. You need to create at least one permit policy.

### How do I allow all requests?

Create a simple policy:

```cedar
permit (principal, action, resource)
when { principal.status == "active" };
```

### Can I have multiple policies?

Yes, multiple policies work together. If any permit policy matches and no forbid policies match, the request is allowed.

### How do I test a policy?

Create the policy, make a test request, check the audit log to see if it was allowed or denied.

## Costs

### Why are costs showing as 0.0000?

Costs are tracked with precision. Check the Costs API or UI for accurate cost information.

### How are costs calculated?

- **Completions**: (input tokens × input cost) + (output tokens × output cost) - (cached tokens × input cost)
- **Embeddings**: input tokens × input cost
- **Images**: number of images × price per image

### When do spend limits reset?

- Daily: Midnight UTC
- Monthly: 1st of each month

## Rate Limiting

### How does rate limiting work?

Sliding window algorithm tracks requests over a rolling 60-second window.

### What happens when I hit the rate limit?

You get HTTP 429 with `Retry-After` header telling you when to retry.

### Can I disable rate limiting?

Set `limit_requests_per_minute` to 0 or null for unlimited requests.

## Troubleshooting

### Server won't start

Check:

- Port is available
- Database file is writable
- Config file is valid
- Dependencies are installed

### UI not loading

Check:

- UI is built: `npm run build:ui`
- UI files are in `packages/proxy/dist/ui`
- Server is running
- Check server logs for UI path resolution

### Requests always denied

Check:

- At least one permit policy exists
- Policy is active
- Request matches policy conditions
- UserKey entity has `status == "active"`

## Security

### Are API keys encrypted?

API keys are hashed before storage. The original key is only shown once when created.

### Are provider keys encrypted?

Yes, provider API keys are encrypted before storage.

## Deployment

### Can I run multiple instances?

Each instance runs independently. For horizontal scaling, you'll need to configure shared storage (not currently documented).

### How do I backup the database?

Copy the `proxy.db` file. Or use Docker volume backup:

```bash
docker run --rm -v ziri-data:/data -v $(pwd):/backup \
  alpine tar czf /backup/backup.tar.gz /data
```

### How do I update ZIRI?

```bash
docker compose pull
docker compose up -d
```

## Next Steps

- [Common Issues](/docs/troubleshooting/common-issues) - Common problems and solutions
