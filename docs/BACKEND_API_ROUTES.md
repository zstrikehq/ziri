# Backend API Routes - Complete Specification

This document lists **ALL** backend API routes required for the ZS AI Gateway to work.

## Base URL
All routes are prefixed with: `{backendUrl}/api/v2025-01/projects/{projectId}`

## Authentication

### 1. OAuth2 Token (M2M Authentication)
**Used by**: Management SDK, UI (for admin operations)

```
POST /oauth2/token

Headers:
  Content-Type: application/x-www-form-urlencoded
  x-op-id: {operation-id}
  x-session-id: {session-id}

Body (form-urlencoded):
  grant_type: client_credentials
  client_id: {clientId}
  client_secret: {clientSecret}
  audience: {orgId}:{projectId}

Response:
  {
    access_token: string
    token_type: "Bearer"
    expires_in: number
  }
```

---

## Entities (API Keys)

### 2. List All Entities (Keys)
**Used by**: Management SDK, UI

```
GET /api/v2025-01/projects/{projectId}/entities

Headers:
  Authorization: Bearer {m2m-token}
  x-project-id: {projectId}
  x-op-id: {operation-id}
  x-session-id: {session-id}

Query Parameters (optional):
  uid: User::"{userId}"  // Filter by specific user

Response:
  {
    data: Entity[]
  }

Entity Structure:
  {
    uid: { type: "User", id: string }
    attrs: {
      user_id: string
      name: string
      email: string
      role: string
      department: string
      security_clearance: number
      training_completed: boolean
      years_of_service: Decimal
      daily_spend_limit: Decimal
      monthly_spend_limit: Decimal
      current_daily_spend: Decimal
      current_monthly_spend: Decimal
      last_daily_reset: string (ISO 8601)
      last_monthly_reset: string (ISO 8601)
      allowed_ip_ranges: Ip[]
      status: "active" | "revoked"
      created_at: string (ISO 8601)
    }
    parents: []
  }
```

### 3. Create Entity (Create Key)
**Used by**: Management SDK, UI

```
POST /api/v2025-01/projects/{projectId}/entity

Headers:
  Authorization: Bearer {m2m-token}
  x-project-id: {projectId}
  Content-Type: application/json
  x-op-id: {operation-id}
  x-session-id: {session-id}

Body:
  {
    entity: Entity  // See Entity Structure above
    status: 1
  }

Response:
  {
    success: true
    // Entity created
  }
```

### 4. Update Entity (Update/Revoke Key)
**Used by**: Management SDK, UI

```
PUT /api/v2025-01/projects/{projectId}/entity

Headers:
  Authorization: Bearer {m2m-token}
  x-project-id: {projectId}
  Content-Type: application/json
  x-op-id: {operation-id}
  x-session-id: {session-id}

Body:
  {
    entity: Entity  // Full entity or partial update
    status: 1
  }

Response:
  {
    success: true
    // Entity updated
  }
```

---

## Policies (Rules)

### 5. List All Policies
**Used by**: Management SDK, UI, User SDK (local mode)

```
GET /api/v2025-01/projects/{projectId}/policies

Headers:
  Authorization: Bearer {m2m-token} OR Bearer {user-api-key}
  x-project-id: {projectId}
  x-op-id: {operation-id}
  x-session-id: {session-id}

Response:
  {
    data: {
      policies: Array<{
        policy: string  // Cedar policy string
        description: string
      }>
    }
  }
```

### 6. Create Policy
**Used by**: Management SDK, UI

```
POST /api/v2025-01/projects/{projectId}/policies

Headers:
  Authorization: Bearer {m2m-token}
  x-project-id: {projectId}
  Content-Type: application/json
  x-op-id: {operation-id}
  x-session-id: {session-id}

Body:
  {
    policy: string  // Cedar policy string
    description: string
  }

Response:
  {
    success: true
    // Policy created
  }
```

### 7. Delete Policy
**Used by**: Management SDK, UI

```
DELETE /api/v2025-01/projects/{projectId}/policies

Headers:
  Authorization: Bearer {m2m-token}
  x-project-id: {projectId}
  Content-Type: application/json
  x-op-id: {operation-id}
  x-session-id: {session-id}

Body:
  {
    policy: string  // Cedar policy string to delete
  }

Response:
  {
    success: true
    // Policy deleted
  }
```

---

## Schema

### 8. Get Schema
**Used by**: Management SDK, UI, User SDK (local mode)

```
GET /api/v2025-01/projects/{projectId}/schema

Headers:
  Authorization: Bearer {m2m-token} OR Bearer {user-api-key}
  x-project-id: {projectId}
  x-op-id: {operation-id}
  x-session-id: {session-id}

Response:
  {
    data: {
      schema: object  // Cedar schema JSON
      version: string
    }
  }
```

### 9. Update Schema
**Used by**: Management SDK, UI

```
POST /api/v2025-01/projects/{projectId}/schema

Headers:
  Authorization: Bearer {m2m-token}
  x-project-id: {projectId}
  Content-Type: application/json
  x-op-id: {operation-id}
  x-session-id: {session-id}

Body:
  {
    schema: object  // Cedar schema JSON
  }

Response:
  {
    success: true
    version: string  // New schema version
    // Schema updated
  }
```

---

## LLM Chat Completions (Gateway Endpoint)

### 10. Chat Completions (Gateway Proxy)
**Used by**: User SDK (end-users)

```
POST /api/v2025-01/projects/{projectId}/chat/completions

Headers:
  Authorization: Bearer {user-api-key}  // User's API key (sk-zs-user-123-abc)
  x-project-id: {projectId}
  Content-Type: application/json

Body:
  {
    provider: string  // "openai", "anthropic", etc.
    model: string  // "gpt-4", "claude-3-opus", etc.
    messages: Array<{
      role: "user" | "assistant" | "system"
      content: string
    }>
    temperature?: number
    max_tokens?: number
    // ... other LLM provider parameters
  }

Response:
  {
    // Standard LLM provider response format
    id: string
    object: "chat.completion"
    created: number
    model: string
    choices: Array<{
      index: number
      message: {
        role: string
        content: string
      }
      finish_reason: string
    }>
    usage: {
      prompt_tokens: number
      completion_tokens: number
      total_tokens: number
    }
  }
```

**Backend Implementation Notes:**
1. Validate user API key (extract userId from `sk-zs-{userId}-{hash}`)
2. Check authorization using Cedar policies:
   - Principal: `User::"{userId}"`
   - Action: `Action::QueryLLM`
   - Resource: `Resource::Model::{model}`
3. Retrieve provider API key from storage (decrypt with master key)
4. Make request to LLM provider:
   - OpenAI: `POST https://api.openai.com/v1/chat/completions`
   - Anthropic: `POST https://api.anthropic.com/v1/messages`
5. Return LLM provider response to end-user

---

## Authorization (PDP - Policy Decision Point)

### 11. Authorize Request (Live Mode)
**Used by**: User SDK (when `authMode: 'live'`)

```
POST {pdpUrl}/authorize

Headers:
  Content-Type: application/json
  x-project-id: {projectId}

Body:
  {
    principal: string  // e.g., "User::\"user-123\""
    action: string  // e.g., "Action::QueryLLM"
    resource: string  // e.g., "Resource::Model::gpt-4"
    context: {
      request_time: string (ISO 8601)
      model: string
      provider: string
      messageCount: number
      ipAddress?: string
      // ... other context
    }
  }

Response:
  {
    decision: "Allow" | "Deny"
    diagnostics: {
      reason: string[]
      errors: string[]
    }
  }
```

**Note**: This endpoint is on the PDP server (separate from main backend), but is required for live mode authorization.

---

## Summary Table

| # | Method | Endpoint | Auth | Used By | Purpose |
|---|--------|----------|------|---------|---------|
| 1 | POST | `/oauth2/token` | None | Management SDK, UI | Get M2M token |
| 2 | GET | `/api/v2025-01/projects/{projectId}/entities` | M2M | Management SDK, UI | List API keys |
| 3 | POST | `/api/v2025-01/projects/{projectId}/entity` | M2M | Management SDK, UI | Create API key |
| 4 | PUT | `/api/v2025-01/projects/{projectId}/entity` | M2M | Management SDK, UI | Update/Revoke key |
| 5 | GET | `/api/v2025-01/projects/{projectId}/policies` | M2M or User | Management SDK, UI, User SDK | List policies |
| 6 | POST | `/api/v2025-01/projects/{projectId}/policies` | M2M | Management SDK, UI | Create policy |
| 7 | DELETE | `/api/v2025-01/projects/{projectId}/policies` | M2M | Management SDK, UI | Delete policy |
| 8 | GET | `/api/v2025-01/projects/{projectId}/schema` | M2M or User | Management SDK, UI, User SDK | Get schema |
| 9 | POST | `/api/v2025-01/projects/{projectId}/schema` | M2M | Management SDK, UI | Update schema |
| 10 | POST | `/api/v2025-01/projects/{projectId}/chat/completions` | User API Key | User SDK | LLM gateway proxy |
| 11 | POST | `{pdpUrl}/authorize` | None | User SDK (live mode) | Authorization check |

---

## Required Headers

### Common Headers (All Routes)
- `x-project-id`: Project ID (required for all routes)
- `x-op-id`: Operation ID (for tracking, optional but recommended)
- `x-session-id`: Session ID (for tracking, optional but recommended)

### Authentication Headers
- **M2M Routes**: `Authorization: Bearer {m2m-token}` (from `/oauth2/token`)
- **User Routes**: `Authorization: Bearer {user-api-key}` (format: `sk-zs-{userId}-{hash}`)

---

## Error Responses

All endpoints should return errors in this format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

HTTP Status Codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

---

## Data Types

### Decimal
Cedar Decimal type - represented as string in JSON (e.g., `"10.50"`)

### Ip
Cedar Ip type - represented as string in JSON (e.g., `"192.168.1.1"` or `"192.168.1.0/24"`)

### Entity UID
Format: `{type}::"{id}"` (e.g., `User::"user-123"`)

---

## Implementation Priority

### Critical (Must Have)
1. ✅ `/oauth2/token` - Authentication
2. ✅ `/api/v2025-01/projects/{projectId}/entities` - List keys
3. ✅ `/api/v2025-01/projects/{projectId}/entity` - Create/Update keys
4. ✅ `/api/v2025-01/projects/{projectId}/policies` - List/Create/Delete policies
5. ✅ `/api/v2025-01/projects/{projectId}/schema` - Get/Update schema
6. ✅ `/api/v2025-01/projects/{projectId}/chat/completions` - **LLM Gateway (Most Important)**

### Optional (For Live Mode)
7. `{pdpUrl}/authorize` - External PDP endpoint (if using live mode)

---

## Notes

1. **Provider API Keys**: The backend must store provider API keys (OpenAI, Anthropic, etc.) securely. These are used in the `/chat/completions` endpoint.

2. **Authorization Flow**: 
   - For `/chat/completions`, the backend should:
     - Extract userId from user API key
     - Check Cedar policies locally OR call PDP
     - If authorized, retrieve provider API key and make LLM call

3. **User API Key Format**: `sk-zs-{userId}-{hash}`
   - Extract userId: first part after `sk-zs-`
   - Example: `sk-zs-user-123-abcxyz` → userId: `user-123`

4. **Cedar Policy Format**: Policies are Cedar policy strings that need to be evaluated.

5. **Schema Versioning**: Schema has a version field that should increment on updates.
