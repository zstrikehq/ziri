---
title: ZIRI
description: Production-grade LLM Gateway with Cedar-based Authorization
---

**Production-grade LLM Gateway with Cedar-based Authorization**

ZIRI sits between your applications and LLM providers like OpenAI and Anthropic. When your app makes a request, ZIRI checks if it's allowed using Cedar policies, tracks costs, enforces rate limits, and logs everything. Then it forwards authorized requests to the actual provider.

Think of it as a smart proxy that adds enterprise features to any LLM API: access control, spending limits, rate limiting, and detailed audit logs.

## Explore

{{< cards >}}
{{< card link="/docs/getting-started/introduction" title="Getting Started" icon="lightning-bolt" subtitle="Install ZIRI and make your first request" >}}
{{< card link="/docs/api-reference" title="API Reference" icon="document-text" subtitle="Complete documentation for all endpoints" >}}
{{< card link="/docs/sdk" title="SDK" icon="cube" subtitle="Zero-dependency client library for your apps" >}}
{{< card link="/docs/configuration" title="Configuration" icon="cog" subtitle="Environment variables, config files, email setup" >}}
{{< card link="/docs/deployment/docker-compose" title="Deployment" icon="server" subtitle="Docker Compose and production setup" >}}
{{< card link="/docs/guides/policy-examples" title="Guides" icon="academic-cap" subtitle="Policies, providers, user management" >}}
{{< /cards >}}

## What ZIRI Does

-   **Cedar-Based Authorization** — Control who can use which models and when using AWS Cedar policy language
-   **Rate Limiting** — Prevent abuse with per-user and per-key rate limits that persist across restarts
-   **Cost Tracking** — Track spending with full precision, set daily and monthly limits
-   **Audit Logging** — Every authorization decision logged with full context for compliance
-   **API Key Management** — Generate and rotate keys securely with automatic spend tracking
-   **Real-Time Updates** — Dashboard updates automatically using Server-Sent Events
-   **Docker Ready** — Production-ready Docker images with Docker Compose support

## Quick Start

{{< callout type="info" icon="lightning-bolt" >}}
Get ZIRI running in under a minute. Create a `docker-compose.yml` and run `docker compose up -d`.
{{< /callout >}}

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

The proxy server starts on `http://localhost:3100` with the management UI bundled.

## Next Steps

{{< cards cols="2" >}}
{{< card link="/docs/getting-started/installation" title="Install ZIRI" icon="download" subtitle="Get ZIRI up and running" >}}
{{< card link="/docs/guides/first-policy" title="Create Your First Policy" icon="shield-check" subtitle="Learn Cedar policy creation" >}}
{{< card link="/docs/guides/provider-setup" title="Set Up Providers" icon="server" subtitle="Configure OpenAI, Anthropic, etc." >}}
{{< card link="/docs/sdk" title="Use the SDK" icon="code" subtitle="Integrate ZIRI into your app" >}}
{{< /cards >}}

## Common Use Cases

{{< cards cols="2" >}}
{{< card link="/docs/examples/real-world-scenarios" title="Multi-Tenant SaaS" icon="office-building" subtitle="Control access and costs per tenant" >}}
{{< card link="/docs/guides/user-management" title="Enterprise Gateways" icon="users" subtitle="Centralize authorization across teams" >}}
{{< card link="/docs/guides/policy-examples" title="Development Teams" icon="adjustments" subtitle="Prevent budget overruns with limits" >}}
{{< card link="/docs/deployment/production" title="Production Apps" icon="chart-bar" subtitle="Compliance-ready audit logs" >}}
{{< /cards >}}

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

## Support

{{< callout >}}
For issues, questions, or contributions, please refer to the project repository.
{{< /callout >}}
