# Health

Health check endpoints for monitoring and load balancers.

## Health Check

Simple health check endpoint.

### Endpoint

```
GET /health
```

### Example Request

```bash
curl http://localhost:3100/health
```

### Success Response

```json
{
  "status": "ok",
  "timestamp": "2025-01-01T12:00:00.000Z",
  "sessionId": "session-1769666229097-mj79858"
}
```

### Response Fields

- `status` - Always `"ok"` if the server is running
- `timestamp` - Current server time (ISO format)
- `sessionId` - Server session ID (changes on restart)

## API Health Check

Same as `/health`, but under `/api` prefix.

### Endpoint

```
GET /api/health
```

### Example Request

```bash
curl http://localhost:3100/api/health
```

### Success Response

Same as `/health`:

```json
{
  "status": "ok",
  "timestamp": "2025-01-01T12:00:00.000Z",
  "sessionId": "session-1769666229097-mj79858"
}
```

## Use Cases

- **Load balancers** - Health checks for routing
- **Monitoring** - Uptime monitoring
- **Container orchestration** - Kubernetes/Docker health checks
- **Quick status** - Verify server is running

## Session ID

The `sessionId` changes on each server restart. Use it to detect restarts:

1. Store the session ID
2. On next health check, compare
3. If different, server restarted

## Next Steps

- See [Events API](/api-reference/system-endpoints/events) for real-time updates
- Check [Deployment Guide](/deployment/production) for production health checks
