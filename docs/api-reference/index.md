# API Reference

Complete API documentation for all ZIRI endpoints.

## Endpoint Categories

### User Endpoints

Endpoints your applications call to make LLM requests:

- [Chat Completions](/api-reference/user-endpoints/chat-completions) - Chat completions with GPT, Claude, etc.
- [Embeddings](/api-reference/user-endpoints/embeddings) - Text embeddings
- [Images](/api-reference/user-endpoints/images) - Image generation

All user endpoints require an `X-API-Key` header.

### Admin Endpoints

Endpoints for managing ZIRI:

- [Authentication](/api-reference/admin-endpoints/authentication) - Admin login, token refresh
- [Users](/api-reference/admin-endpoints/users) - User management
- [Keys](/api-reference/admin-endpoints/keys) - API key management
- [Providers](/api-reference/admin-endpoints/providers) - LLM provider configuration
- [Policies](/api-reference/admin-endpoints/policies) - Cedar policy management
- [Schema](/api-reference/admin-endpoints/schema) - Cedar schema management
- [Config](/api-reference/admin-endpoints/config) - Server configuration
- [Audit](/api-reference/admin-endpoints/audit) - Audit log queries
- [Stats](/api-reference/admin-endpoints/stats) - Statistics and analytics
- [Entities](/api-reference/admin-endpoints/entities) - Entity queries
- [Costs](/api-reference/admin-endpoints/costs) - Cost summaries

Admin endpoints require a Bearer token from `/api/auth/admin/login`.

### System Endpoints

System-level endpoints:

- [Health](/api-reference/system-endpoints/health) - Health checks
- [Events](/api-reference/system-endpoints/events) - Server-Sent Events for real-time updates

## Base URL

All endpoints are relative to your ZIRI server URL:

- Local development: `http://localhost:3100`
- Production: Your server URL

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

All responses include a `requestId` field. Use this for debugging and support requests.

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
- `400` - Bad request (missing fields, invalid format)
- `401` - Unauthorized (invalid API key or token)
- `403` - Forbidden (authorization denied, key revoked)
- `404` - Not found (resource doesn't exist)
- `429` - Rate limit exceeded
- `500` - Internal server error
- `503` - Service unavailable (queue full)

## Rate Limit Headers

User endpoints include rate limit headers:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1704067200
```

## Pagination

List endpoints support pagination:

- `limit` - Results per page (default: 10 for logs, 100 for others)
- `offset` - Pagination offset

Responses include `total` for the total count.

## Search

Many endpoints support search:

- `search` - Search query (searches relevant fields)
- Search is server-side
- Search inputs are debounced (300ms) in the UI

## Sorting

List endpoints support sorting:

- `sortBy` - Column to sort by
- `sortOrder` - "asc" or "desc"

Click column headers in the UI to sort.

## Next Steps

- Start with [Chat Completions](/api-reference/user-endpoints/chat-completions) for making requests
- See [Authentication](/api-reference/admin-endpoints/authentication) for admin access
- Check [SDK Documentation](/sdk/) for client library usage
