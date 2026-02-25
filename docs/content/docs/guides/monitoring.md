---
title: Monitoring
weight: 50
---

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
    - **Search**: Search in `auth_id`, model, `request_id`
3. Click on a log entry to see details

### Via API

```bash
curl -H "Authorization: Bearer your-token" \
  "http://localhost:3100/api/audit?decision=Deny&limit=20"
```

## Statistics

### Via UI

Go to the **Analytics** page (or the main dashboard cards) to see:

-   Total requests
-   Allowed vs denied
-   Total cost
-   Cost by provider
-   Cost by model

### Via API

```bash
curl -H "Authorization: Bearer your-token" \
  http://localhost:3100/api/stats/overview
```

## Cost Tracking

### Via UI

On the **Analytics** page you can:

1. View cost summaries (Daily Cost Trend, Cost by Provider, Cost by Model)
2. Filter by time range
3. Break down costs by provider, model, and other dimensions

### Via API

```bash
curl -H "Authorization: Bearer your-token" \
  "http://localhost:3100/api/costs/summary?groupBy=provider"
```

## Real-Time Updates

Use Server-Sent Events for real-time updates:

```javascript
const eventSource = new EventSource("/api/events?token=your-token");

eventSource.onmessage = (event) => {
	const data = JSON.parse(event.data);
	if (data.type === "audit_log_created") {
		// Update UI with new log entry
	}
};
```

## Key Metrics to Monitor

**Request Volume** – Total requests per day/week/month, per user, per provider/model.  
**Authorization Decisions** – Allow vs deny ratio, common denial reasons, policy effectiveness.  
**Costs** – Daily/monthly spending, cost per user/provider/model, trends.  
**Performance** – Average response time, authorization evaluation time, provider response time.  
**Errors** – Rate limit hits, authorization denials, provider errors, queue full errors.

## Setting Up Alerts

### High Denial Rate

```bash
denial_rate = denied_requests / total_requests
if denial_rate > 0.1:
    alert("High denial rate")
```

### Budget Alerts

```bash
if daily_spend > daily_budget:
    alert("Daily budget exceeded")
```

### Error Rate

```bash
error_rate = errors / total_requests
if error_rate > 0.05:
    alert("High error rate")
```

## Log Analysis

-   **Find denied requests**: `GET /api/audit?decision=Deny&limit=100`
-   **Find expensive requests**: `GET /api/audit?sortBy=actual_cost&sortOrder=desc&limit=10`
-   **Find requests by user**: `GET /api/audit?authId=user-123`
-   **Find requests by model**: `GET /api/audit?model=gpt-4`

## Cost Analysis

-   **By provider**: `GET /api/costs/summary?groupBy=provider`
-   **By model**: `GET /api/costs/summary?groupBy=model`
-   **By user**: `GET /api/costs/summary?groupBy=user`
-   **Trends**: `GET /api/costs/summary?groupBy=day&startDate=2025-01-01`

## Performance Monitoring

-   **Response times** – Inspect timing in audit logs.
-   **Rate limit hits** – `GET /api/audit?search=rate+limit`
-   **Queue full errors** – `GET /api/audit?search=queue+full`

## Best Practices

1. Review logs regularly.
2. Set up alerts on high denial or error rates.
3. Monitor costs and trends.
4. Archive old logs to maintain performance.
5. Export data for deeper analysis.

## Next Steps

-   [Audit API](/docs/api-reference/admin-endpoints/audit)
-   [Costs API](/docs/api-reference/admin-endpoints/costs)
-   [Stats API](/docs/api-reference/admin-endpoints/stats)
