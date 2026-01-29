# Costs

Get cost summaries and analytics.

## Get Cost Summary

Get cost summaries with optional grouping and filtering.

### Endpoint

```
GET /api/costs/summary
```

### Query Parameters

- `executionKey` - Filter by API key ID (optional)
- `provider` - Filter by provider (optional)
- `model` - Filter by model (optional)
- `startDate` - Start date (ISO format, optional)
- `endDate` - End date (ISO format, optional)
- `groupBy` - Group by: `day`, `week`, `month`, `provider`, `model`, `user` (optional)

### Example Request

```bash
# Get total costs
curl -H "Authorization: Bearer your-token" \
  http://localhost:3100/api/costs/summary

# Get costs by provider
curl -H "Authorization: Bearer your-token" \
  "http://localhost:3100/api/costs/summary?groupBy=provider"

# Get costs for date range
curl -H "Authorization: Bearer your-token" \
  "http://localhost:3100/api/costs/summary?startDate=2025-01-01T00:00:00Z&endDate=2025-01-31T23:59:59Z&groupBy=day"
```

### Success Response

Total summary:

```json
{
  "data": {
    "total": 1234.56,
    "count": 1000
  }
}
```

Grouped by provider:

```json
{
  "data": {
    "openai": 1000.00,
    "anthropic": 234.56
  }
}
```

Grouped by day:

```json
{
  "data": [
    {
      "date": "2025-01-01",
      "total": 45.67,
      "count": 100
    },
    {
      "date": "2025-01-02",
      "total": 50.23,
      "count": 120
    }
  ]
}
```

### Error Responses

#### Summary Error

```json
{
  "error": "Failed to get cost summary",
  "code": "COSTS_SUMMARY_ERROR"
}
```

Status: 500

## Grouping Options

- `day` - Group by day
- `week` - Group by week
- `month` - Group by month
- `provider` - Group by provider name
- `model` - Group by model name
- `user` - Group by user/API key

## Use Cases

- **Cost analysis** - See spending trends
- **Budgeting** - Track costs over time
- **Reporting** - Generate cost reports
- **Optimization** - Identify expensive models/users

## Next Steps

- Check [Audit API](/api-reference/admin-endpoints/audit) for detailed cost logs
- Read [Monitoring Guide](/guides/monitoring) for cost monitoring
