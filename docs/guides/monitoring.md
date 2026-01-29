# Monitoring

Monitor ZIRI usage, costs, and performance.

## Audit Logs

View all authorization decisions in the audit logs.

### Via UI

1. Go to **Logs** page
2. Use filters:
   - **Decision**: Allow or Deny
   - **Provider**: Filter by provider
   - **Model**: Filter by model
   - **Date Range**: Filter by time
   - **Search**: Search in auth_id, model, request_id
3. Click on a log entry to see details

### Via API

```bash
curl -H "Authorization: Bearer your-token" \
  "http://localhost:3100/api/logs?decision=Deny&limit=20"
```

## Statistics

Get overview statistics:

### Via UI

Go to **Stats** page to see:
- Total requests
- Allowed vs denied
- Total cost
- Cost by provider
- Cost by model

### Via API

```bash
curl -H "Authorization: Bearer your-token" \
  http://localhost:3100/api/stats/overview
```

## Cost Tracking

Track spending:

### Via UI

1. Go to **Costs** page
2. View cost summaries
3. Filter by date range
4. Group by day, week, month, provider, model, or user

### Via API

```bash
curl -H "Authorization: Bearer your-token" \
  "http://localhost:3100/api/costs/summary?groupBy=provider"
```

## Real-Time Updates

Use Server-Sent Events for real-time updates:

```javascript
const eventSource = new EventSource('/api/events?token=your-token')

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data)
  if (data.type === 'audit_log_created') {
    // Update UI with new log entry
  }
}
```

## Key Metrics to Monitor

### Request Volume

- Total requests per day/week/month
- Requests per user
- Requests per provider/model

### Authorization Decisions

- Allow vs deny ratio
- Common denial reasons
- Policy effectiveness

### Costs

- Daily/monthly spending
- Cost per user
- Cost per provider/model
- Cost trends over time

### Performance

- Average response time
- Authorization evaluation time
- Provider response time

### Errors

- Rate limit hits
- Authorization denials
- Provider errors
- Queue full errors

## Setting Up Alerts

### High Denial Rate

Alert if denial rate exceeds threshold:

```bash
# Check denial rate
denial_rate = denied_requests / total_requests

if denial_rate > 0.1:  # 10%
    alert("High denial rate")
```

### Budget Alerts

Alert if spending exceeds budget:

```bash
# Check daily spending
if daily_spend > daily_budget:
    alert("Daily budget exceeded")
```

### Error Rate

Alert if error rate is high:

```bash
# Check error rate
error_rate = errors / total_requests

if error_rate > 0.05:  # 5%
    alert("High error rate")
```

## Log Analysis

### Common Queries

**Find denied requests**:
```bash
GET /api/logs?decision=Deny&limit=100
```

**Find expensive requests**:
```bash
GET /api/logs?sortBy=actual_cost&sortOrder=desc&limit=10
```

**Find requests by user**:
```bash
GET /api/logs?authId=user-123
```

**Find requests by model**:
```bash
GET /api/logs?model=gpt-4
```

## Cost Analysis

### By Provider

See which provider costs the most:

```bash
GET /api/costs/summary?groupBy=provider
```

### By Model

See which models are most expensive:

```bash
GET /api/costs/summary?groupBy=model
```

### By User

See which users spend the most:

```bash
GET /api/costs/summary?groupBy=user
```

### Trends

See cost trends over time:

```bash
GET /api/costs/summary?groupBy=day&startDate=2025-01-01
```

## Performance Monitoring

### Response Times

Check average response times in audit logs. Each log entry includes timing information.

### Rate Limit Hits

Monitor rate limit hits:

```bash
GET /api/logs?search=rate+limit
```

### Queue Full Errors

Monitor queue full errors:

```bash
GET /api/logs?search=queue+full
```

## Best Practices

1. **Review logs regularly** - Check logs daily for issues
2. **Set up alerts** - Alert on high denial rates or errors
3. **Monitor costs** - Track spending trends
4. **Archive old logs** - Keep system performant
5. **Export for analysis** - Use external tools for complex analysis

## Next Steps

- [Audit API](/api-reference/admin-endpoints/audit) - Query logs programmatically
- [Costs API](/api-reference/admin-endpoints/costs) - Get cost summaries
- [Stats API](/api-reference/admin-endpoints/stats) - Get overview statistics
