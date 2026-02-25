---
title: Events
weight: 20
---

Server-Sent Events (SSE) endpoint for real-time updates.

## Event Stream

Connect to the event stream to receive real-time updates.

### Endpoint

```
GET /api/events
```

### Authentication

Include a Bearer token in the `Authorization` header or as a `token` query parameter:

```bash
# Using header
curl -H "Authorization: Bearer your-token" \
  http://localhost:3100/api/events

# Using query parameter
curl "http://localhost:3100/api/events?token=your-token"
```

### Example Request (JavaScript)

```javascript
const eventSource = new EventSource("/api/events?token=your-token", {
	headers: {
		Authorization: "Bearer your-token",
	},
});

eventSource.onmessage = (event) => {
	const data = JSON.parse(event.data);
	console.log("Event:", data);
};

eventSource.onerror = (error) => {
	console.error("SSE error:", error);
};
```

### Connection

The connection is established with:

```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

### Heartbeat

The server sends heartbeat messages every 30 seconds:

```
: heartbeat
```

This keeps the connection alive and helps detect disconnections.

## Event Types

### Audit Log Created

Sent when a new external authorization audit log entry is created:

```json
{
  "type": "audit_log_created",
  "data": {
    "auditLogId": 123,
    "requestId": "req-456",
    "timestamp": "2025-01-01T12:00:00Z",
    "decision": "permit",
    "provider": "openai",
    "model": "gpt-4"
  }
}
```

### Internal Audit Log Created

Sent when an internal admin action is logged (for the **Internal Logs** page):

```json
{
  "type": "internal_audit_log_created",
  "data": {
    "internalAuditLogId": 42,
    "requestId": "internal_req_xxx",
    "dashboardUserId": "dash-123",
    "action": "update_config",
    "resourceType": "config",
    "resourceId": "global",
    "outcomeStatus": "success",
    "outcomeCode": "CONFIG_UPDATED",
    "decision": "permit"
  }
}
```

> Note: the Internal Logs UI filters out `view_internal_audit` events to avoid infinite refresh loops; you should do the same if you build your own SSE consumers.

### Other Events

Additional event types may be added in the future.

## Event Format

Events are sent in SSE format:

```
data: {"type":"audit_log_created","data":{...}}

```

Each event is a JSON object with `type` and `data` fields.

## Error Responses

### Authentication Required

If authentication fails:

```json
{
	"error": "Admin authentication required",
	"code": "ADMIN_AUTH_REQUIRED"
}
```

Status: 401

## Connection Handling

### Automatic Reconnection

SSE clients typically auto-reconnect on disconnect. The server handles reconnections gracefully.

### Connection Cleanup

When a client disconnects:

-   Event listeners are removed
-   Heartbeat interval is cleared
-   Resources are freed

### Multiple Connections

Multiple clients can connect simultaneously. Each receives all events.

## Use Cases

-   **Real-time dashboard** - Update UI automatically
-   **Live monitoring** - See requests as they happen
-   **Notifications** - Alert on important events
-   **Analytics** - Stream data to analytics systems

## Browser Support

Use `EventSource` API in browsers:

```javascript
const eventSource = new EventSource("/api/events?token=your-token");

eventSource.addEventListener("audit_log_created", (event) => {
	const data = JSON.parse(event.data);
	// Handle event
});
```

## Node.js Support

Use a library like `eventsource`:

```javascript
import EventSource from "eventsource";

const eventSource = new EventSource(
	"http://localhost:3100/api/events?token=your-token"
);

eventSource.onmessage = (event) => {
	const data = JSON.parse(event.data);
	// Handle event
};
```

## Best Practices

1. **Handle errors** - Implement error handling and reconnection logic
2. **Filter events** - Filter events client-side if needed
3. **Rate limiting** - Don't overwhelm the UI with too many events
4. **Cleanup** - Close connections when done

## Next Steps

-   See [Health API](/api-reference/system-endpoints/health) for health checks
-   Check [Monitoring Guide](/guides/monitoring) for real-time monitoring
