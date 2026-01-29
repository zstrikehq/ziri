# Audit

Query audit logs and get statistics.

## Query Logs

Query audit logs with filters, search, and pagination.

### Endpoint

```
GET /api/logs
```

### Query Parameters

- `authId` - Filter by user ID (optional)
- `apiKeyId` - Filter by API key ID (optional)
- `provider` - Filter by provider (optional)
- `model` - Filter by model (optional)
- `decision` - Filter by `permit` or `forbid` (optional)
- `startDate` - Start date (ISO format, optional)
- `endDate` - End date (ISO format, optional)
- `search` - Search in auth_id, model, request_id (optional)
- `limit` - Results per page (optional, default: 10)
- `offset` - Pagination offset (optional)
- `sortBy` - Column to sort by (optional)
- `sortOrder` - `asc` or `desc` (optional)

### Example Request

```bash
curl -H "Authorization: Bearer your-token" \
  "http://localhost:3100/api/logs?decision=Deny&limit=20&startDate=2025-01-01T00:00:00Z"
```

### Success Response

```json
{
  "data": [
    {
      "id": 1,
      "request_id": "req-123",
      "auth_id": "user-123",
      "api_key_id": "key-456",
      "user_key_id": "uk-789",
      "provider": "openai",
      "model": "gpt-4",
      "action": "completion",
      "decision": "permit",
      "diagnostics": {
        "reason": ["Policy policy1 permitted the request"],
        "errors": []
      },
      "estimated_cost": 0.05,
      "actual_cost": 0.048,
      "input_tokens": 100,
      "output_tokens": 50,
      "request_time": "2025-01-01T12:00:00Z",
      "evaluation_time_ms": 5,
      "total_time_ms": 1500,
      "ip_address": "127.0.0.1",
      "created_at": "2025-01-01T12:00:00Z"
    }
  ],
  "count": 1,
  "total": 1
}
```

## Get Statistics

Get audit log statistics.

### Endpoint

```
GET /api/audit/statistics
```

### Query Parameters

- `startDate` - Start date (ISO format, optional)
- `endDate` - End date (ISO format, optional)

### Example Request

```bash
curl -H "Authorization: Bearer your-token" \
  "http://localhost:3100/api/audit/statistics?startDate=2025-01-01T00:00:00Z"
```

### Success Response

```json
{
  "data": {
    "totalRequests": 1000,
    "allowedRequests": 950,
    "deniedRequests": 50,
    "totalCost": 123.45,
    "byProvider": {
      "openai": 100.00,
      "anthropic": 23.45
    },
    "byModel": {
      "gpt-4": 50.00,
      "gpt-4o-mini": 30.00
    }
  }
}
```

### Error Responses

#### Query Error

```json
{
  "error": "Failed to query audit logs",
  "code": "AUDIT_QUERY_ERROR"
}
```

Status: 500

#### Statistics Error

```json
{
  "error": "Failed to get audit statistics",
  "code": "AUDIT_STATS_ERROR"
}
```

Status: 500

## Log Fields

Each log entry includes:

- **Request identification** - `request_id`, `auth_id`, `api_key_id`, `user_key_id`
- **Request details** - `provider`, `model`, `action`
- **Decision** - `decision` (permit/forbid), `diagnostics`
- **Cost** - `estimated_cost`, `actual_cost`, `input_tokens`, `output_tokens`
- **Timing** - `request_time`, `evaluation_time_ms`, `total_time_ms`
- **Context** - `ip_address`, `user_agent`, etc.

## Use Cases

- **Debugging** - Find why requests were denied
- **Compliance** - Audit trail for compliance requirements
- **Cost analysis** - See which users/models cost the most
- **Security** - Monitor for suspicious activity
- **Performance** - Track authorization and request times

## Next Steps

- Check [Monitoring Guide](/guides/monitoring) for log analysis
- Read [Stats API](/api-reference/admin-endpoints/stats) for overview statistics
