# Stats

Get overview statistics about your ZIRI instance.

## Get Overview Stats

Get high-level statistics.

### Endpoint

```
GET /api/stats/overview
```

### Example Request

```bash
curl -H "Authorization: Bearer your-token" \
  http://localhost:3100/api/stats/overview
```

### Success Response

```json
{
  "totalRequests": 12345,
  "permitCount": 12000,
  "forbidCount": 345,
  "totalCost": 1234.56
}
```

### Response Fields

- `totalRequests` - Total number of requests processed
- `permitCount` - Number of allowed requests
- `forbidCount` - Number of denied requests
- `totalCost` - Total cost across all requests

### Error Responses

#### Stats Error

```json
{
  "error": "Failed to get overview statistics",
  "code": "STATS_ERROR"
}
```

Status: 500

## Use Cases

- **Dashboard** - Display key metrics
- **Monitoring** - Quick health check
- **Reporting** - High-level summaries

## Next Steps

- See [Audit API](/api-reference/admin-endpoints/audit) for detailed log queries
- Check [Costs API](/api-reference/admin-endpoints/costs) for cost summaries
- Read [Monitoring Guide](/guides/monitoring) for monitoring tips
