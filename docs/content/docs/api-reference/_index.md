---
title: API Reference
weight: 20
---

Complete API documentation for all ZIRI endpoints.

## Endpoint Categories

### User Endpoints

Endpoints your applications call to make LLM requests:

-   [Chat Completions](/docs/api-reference/user-endpoints/chat-completions) - Chat completions with GPT, Claude, etc.
-   [Embeddings](/docs/api-reference/user-endpoints/embeddings) - Text embeddings
-   [Images](/docs/api-reference/user-endpoints/images) - Image generation

All user endpoints require an `X-API-Key` header.

### Admin Endpoints

Endpoints for managing ZIRI:

-   [Authentication](/docs/api-reference/admin-endpoints/authentication) - Admin login, token refresh
-   [Dashboard Users](/docs/api-reference/admin-endpoints/dashboard-users) - Dashboard/admin user management
-   [Users](/docs/api-reference/admin-endpoints/users) - User management
-   [Roles](/docs/api-reference/admin-endpoints/roles) - Role entity management
-   [Keys](/docs/api-reference/admin-endpoints/keys) - API key management
-   [Providers](/docs/api-reference/admin-endpoints/providers) - LLM provider configuration
-   [Policies](/docs/api-reference/admin-endpoints/policies) - Cedar policy management
-   [Schema](/docs/api-reference/admin-endpoints/schema) - Cedar schema management
-   [Config](/docs/api-reference/admin-endpoints/config) - Server configuration
-   [Audit](/docs/api-reference/admin-endpoints/audit) - Audit log queries
-   [Stats](/docs/api-reference/admin-endpoints/stats) - Statistics and analytics
-   [Entities](/docs/api-reference/admin-endpoints/entities) - Entity queries
-   [Costs](/docs/api-reference/admin-endpoints/costs) - Cost summaries
-   [Internal Audit Logs](/docs/guides/internal-audit-logs) - Admin action audit queries (`/api/internal-audit-logs`)

Admin endpoints require a Bearer token from `/api/auth/admin/login`.

### System Endpoints

System-level endpoints:

-   [Health](/docs/api-reference/system-endpoints/health) - Health checks
-   [Events](/docs/api-reference/system-endpoints/events) - Server-Sent Events for real-time updates

## Base URL

All endpoints are relative to your ZIRI server URL:

-   Local development: `http://localhost:3100`
-   Production: Your server URL

## Authentication

### User Endpoints

Include the `X-API-Key` header:

```bash
curl -H "X-API-Key: sk-zs-user-123-abc456" \
  https://your-server.com/api/chat/completions
```

### Admin Endpoints

Include the `Authorization` header with a Bearer token:

```bash
curl -H "Authorization: Bearer your-token-here" \
  https://your-server.com/api/users
```

Get a token from `/api/auth/admin/login`.

## Request IDs

Many user-facing request errors include a `requestId` field. Use it for debugging and support requests when present.

## Error Responses

Errors follow this format:

```json
{
	"error": "Human-readable error message",
	"code": "ERROR_CODE",
	"requestId": "req-123"
}
```

Common HTTP status codes:

-   `400` - Bad request (missing fields, invalid format)
-   `401` - Unauthorized (invalid API key or token)
-   `403` - Forbidden (authorization denied, key revoked)
-   `404` - Not found (resource doesn't exist)
-   `429` - Rate limit exceeded
-   `500` - Internal server error
-   `503` - Service unavailable (queue full)

## Rate Limit Headers

User endpoints include rate limit headers:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1704067200
```

## Pagination

List endpoints support pagination:

-   `limit` - Results per page (default: 10 for logs, 100 for others)
-   `offset` - Pagination offset

Responses include `total` for the total count.

## Search

Many endpoints support search:

-   `search` - Search query (searches relevant fields)
-   Search is server-side
-   Search inputs are debounced (300ms) in the UI

## Sorting

List endpoints support sorting:

-   `sortBy` - Column to sort by
-   `sortOrder` - "asc" or "desc"

Click column headers in the UI to sort.

## Next Steps

-   Start with [Chat Completions](/docs/api-reference/user-endpoints/chat-completions) for making requests
-   See [Authentication](/docs/api-reference/admin-endpoints/authentication) for admin access
-   Check [SDK Documentation](/docs/sdk/) for client library usage
