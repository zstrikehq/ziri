---
layout: home
title: ZIRI
description: Production-grade LLM Gateway with Cedar-based Authorization
---

# ZIRI

**Production-grade LLM Gateway with Cedar-based Authorization**

ZIRI sits between your applications and LLM providers like OpenAI and Anthropic. When your app makes a request, ZIRI checks if it's allowed using Cedar policies, tracks costs, enforces rate limits, and logs everything. Then it forwards authorized requests to the actual provider.

Think of it as a smart proxy that adds enterprise features to any LLM API: access control, spending limits, rate limiting, and detailed audit logs.

## What ZIRI Does

- **Cedar-Based Authorization** - Control who can use which models and when using AWS Cedar policy language
- **Rate Limiting** - Prevent abuse with per-user and per-key rate limits that persist across restarts
- **Cost Tracking** - Track spending with full precision, set daily and monthly limits, and see exactly where your money goes
- **Audit Logging** - Every authorization decision gets logged with full context for compliance and debugging
- **API Key Management** - Generate and rotate API keys securely, with automatic spend tracking per key
- **Real-Time Updates** - Dashboard updates automatically using Server-Sent Events
- **Docker Ready** - Production-ready Docker images with Docker Compose support

## Quick Start

Create a `docker-compose.yml` file:
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

Start ZIRI:

```bash
docker compose up -d
```

The proxy server starts on `http://localhost:3100` with the management UI bundled.

## Documentation

### [Getting Started](/getting-started/introduction)
Start here if you're new to ZIRI. Learn what it does, install it, and make your first request.


### [API Reference](/api-reference/)
Complete API documentation for all endpoints. User-facing endpoints for chat completions, embeddings, and images. Admin endpoints for managing users, keys, policies, and more.

### [SDK](/sdk/)
Use the `@ziri/sdk` package in your applications. Zero dependencies, simple API, TypeScript support.

### [Configuration](/configuration/)
Configure ZIRI to match your needs: environment variables, config files, email setup.

### [Deployment](/deployment/docker-compose)
Deploy ZIRI using Docker Compose.

### [Guides](/guides/policy-examples)
Step-by-step guides: create your first policy, set up providers, manage users, monitor usage.

## Architecture Overview

ZIRI acts as a gateway between your applications and LLM providers:

```
┌─────────────┐
│   Client    │
│ Application │
└──────┬──────┘
       │
       │ X-API-Key Header
       ▼
┌─────────────────────────────────┐
│      ZIRI Proxy Server          │
│  ┌───────────────────────────┐  │
│  │  Rate Limiting            │  │
│  │  Cost Estimation          │  │
│  │  Spend Reservation        │  │
│  │  Queue Management         │  │
│  └───────────────────────────┘  │
│           │                      │
│           ▼                      │
│  ┌───────────────────────────┐  │
│  │  Cedar Authorization      │  │
│  │  (Policy Evaluation)       │  │
│  └───────────────────────────┘  │
│           │                      │
│           ▼                      │
│  ┌───────────────────────────┐  │
│  │  Audit Logging            │  │
│  │  Cost Tracking            │  │
│  └───────────────────────────┘  │
└───────────┬─────────────────────┘
            │
            ▼
┌─────────────────────────┐
│   LLM Provider          │
│  (OpenAI, Anthropic)    │
└─────────────────────────┘
```

## Common Use Cases

- **Multi-Tenant SaaS** - Control access and costs per tenant with separate API keys and policies
- **Enterprise Gateways** - Centralize authorization and cost management across teams
- **Development Teams** - Prevent budget overruns with rate limits and spending caps
- **Production Apps** - Meet compliance requirements with detailed audit logs

## Next Steps

1. **[Install ZIRI](/getting-started/installation)** - Get ZIRI up and running
2. **[Create Your First Policy](/guides/first-policy)** - Learn how to create Cedar policies
3. **[Set Up Providers](/guides/provider-setup)** - Configure OpenAI, Anthropic, etc.
4. **[Use the SDK](/sdk/)** - Integrate ZIRI into your application

## Support

For issues, questions, or contributions, please refer to the project repository.
