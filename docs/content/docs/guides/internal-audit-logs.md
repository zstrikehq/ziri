---
title: Internal Audit Logs
weight: 55
---

Monitor sensitive admin actions (config changes, user management, policy updates, etc.) using **Internal Audit Logs**.

This guide explains what is recorded, how to view it in the UI, and how to query it via the API and events stream.

## What Internal Audit Logs Track

Internal audit logs capture **actions performed by dashboard admins** inside ZIRI, for example:

- Viewing or updating **Configuration**
- Managing **dashboard users** (creating, disabling, changing roles)
- Viewing **authorization/audit logs** and analytics
- Other sensitive admin‑only operations

Each entry records:

- **Actor** – `dashboardUserId` and role (e.g. `admin`, `viewer`, `user_admin`, `policy_admin`)
- **Action** – internal action name (e.g. `get_config`, `update_config`, `list_dashboard_users`)
- **Resource Type** – area being accessed (e.g. `config`, `audit`, `dashboard_users`, `analytics`)
- **Decision** – `permit` or `forbid` from internal Cedar policies
- **Outcome Status** – `success`, `failed`, or `denied_before_action`
- **Timing** – auth evaluation time and total action duration
- **Context** – HTTP method, path, IP address, user agent, and a hash of the request body

Internal audit logs are separate from the main authorization **Logs** (which track end‑user LLM requests).

## Viewing Internal Logs in the UI

### Permissions

The Internal Logs page is **admin‑only**:

- Only dashboard users with role `admin` can see **Settings → Internal Logs**.
- Access is further enforced by internal Cedar policies (action `view_internal_audit`).

### Page Location

1. Log in as an admin (for example, the built‑in `ziri` admin).
2. Open the sidebar and go to **Settings → Internal Logs**.

On this page you can:

- Filter by **decision**, **outcome status**, **user**, **action**, **resource type**, and **time range**
- Search by keyword (user ID, action, request ID, etc.)
- Sort and paginate results
- Click into entries to inspect detailed context

The table updates in near real‑time via Server‑Sent Events.

> Internal log events where `action === "view_internal_audit"` are intentionally ignored in the UI to prevent infinite refresh loops.

## Querying Internal Audit Logs via API

### Endpoint

```bash
GET /api/internal-audit-logs
```

This endpoint requires an authenticated admin session (`Authorization: Bearer ...`) and internal authorization (`view_internal_audit`).

### Query Parameters

- `search` – Search across key fields (optional)
- `decision` – `permit` or `forbid` (optional)
- `outcomeStatus` – `success`, `failed`, or `denied_before_action` (optional)
- `userId` – Filter by dashboard user ID (optional)
- `action` – Filter by internal action (e.g. `update_config`) (optional)
- `resourceType` – Filter by resource type (e.g. `config`, `audit`, `dashboard_users`) (optional)
- `from` / `to` – ISO timestamps for time range (optional)
- `limit` – Results per page (optional, default: 20)
- `offset` – Pagination offset (optional)
- `sortBy` – Column key to sort by (optional)
- `sortOrder` – `"asc"` or `"desc"` (optional)

### Example Request

```bash
curl -H "Authorization: Bearer your-token" \
  "http://localhost:3100/api/internal-audit-logs?decision=permit&outcomeStatus=success&limit=20"
```

### Example Response

```json
{
  "items": [
    {
      "id": 1,
      "request_id": "internal_req_abc123",
      "dashboard_user_id": "dash-123",
      "dashboard_user_role": "admin",
      "action": "update_config",
      "resource_type": "config",
      "resource_id": "global",
      "decision": "permit",
      "outcome_status": "success",
      "outcome_code": "CONFIG_UPDATED",
      "request_method": "POST",
      "request_path": "/api/config",
      "request_timestamp": "2025-01-01T12:00:00Z",
      "auth_duration_ms": 3,
      "action_duration_ms": 120
    }
  ],
  "total": 1
}
```

Field names may evolve over time; use them in a read‑only way unless you’re building a tightly coupled integration.

## Real‑Time Internal Audit Events

Internal audit log changes are also sent over the SSE events stream as `internal_audit_log_created` events.

See [Events API](/docs/api-reference/system-endpoints/events) for full details. At a high level:

```javascript
const eventSource = new EventSource("/api/events?token=your-token");

eventSource.addEventListener("message", (event) => {
  const data = JSON.parse(event.data);

  if (data.type === "internal_audit_log_created") {
    // Update your custom UI or monitoring system
  }
});
```

Typical payload:

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

## When to Use Internal vs External Logs

- Use **Logs** (`/logs` page, `/api/audit`) to understand **end‑user / API key traffic**: who called what model, cost, and authorization decisions.
- Use **Internal Logs** (`/settings/internal-audit`, `/api/internal-audit-logs`) to understand **admin activity inside ZIRI**: who changed config, who viewed logs, who managed users, and whether those actions succeeded or failed.

