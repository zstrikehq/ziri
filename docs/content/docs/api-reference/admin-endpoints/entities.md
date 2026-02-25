---
title: Entities
weight: 100
---

Query and manage Cedar entities.

## Get Entities

Get all entities with optional filtering and pagination.

### Endpoint

```
GET /api/entities
```

### Query Parameters

-   `uid` - Filter by entity UID (optional)
-   `includeApiKeys` - Include API keys in response (optional, default: false)
-   `search` - Search query (optional)
-   `limit` - Results per page (optional)
-   `offset` - Pagination offset (optional)
-   `entityType` - Filter by entity type: `User`, `Role`, `UserKey`, `Resource` (optional)
-   `sortBy` - Column to sort by (optional)
-   `sortOrder` - `asc` or `desc` (optional)

### Example Request

```bash
# Get all entities
curl -H "Authorization: Bearer your-token" \
  http://localhost:3100/api/entities

# Get UserKey entities with API keys
curl -H "Authorization: Bearer your-token" \
  "http://localhost:3100/api/entities?entityType=UserKey&includeApiKeys=true"

# Get specific entity
curl -H "Authorization: Bearer your-token" \
  "http://localhost:3100/api/entities?uid=UserKey::\"uk-123\""
```

### Success Response

```json
{
	"data": [
		{
			"uid": {
				"type": "UserKey",
				"id": "uk_user-123_key-456"
			},
			"attrs": {
				"current_daily_spend": 45.67,
				"current_monthly_spend": 1234.56,
				"status": "active",
				"user": {
					"__entity": {
						"type": "User",
						"id": "user-123"
					}
				}
			},
			"parents": []
		}
	],
	"total": 1
}
```

With `includeApiKeys=true`:

```json
{
  "data": [
    {
      "uid": {
        "type": "UserKey",
        "id": "uk_user-123_key-456"
      },
      "attrs": { ... },
      "parents": [],
      "apiKey": null,
      "keySuffix": "-----",
      "keyHash": "hash...",
      "executionKey": "key-456",
      "userKeyId": "uk_user-123_key-456"
    }
  ],
  "total": 1
}
```

## Update Entity

Update an entity's attributes or status.

### Endpoint

```
PUT /api/entities
```

### Request Body

```typescript
{
  entity: {        // Required: Entity with uid and attrs
    uid: {
      type: string
      id: string
    }
    attrs: object
  }
  status?: number  // Optional: 1 for active, 0 for inactive
}
```

### Example Request

```bash
curl -X PUT http://localhost:3100/api/entities \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "entity": {
      "uid": {
        "type": "UserKey",
        "id": "uk_user-123_key-456"
      },
      "attrs": {
        "current_daily_spend": 50.00,
        "current_monthly_spend": 1250.00,
        "status": "active"
      }
    },
    "status": 1
  }'
```

### Success Response

```json
{
	"success": true,
	"message": "Entity updated successfully"
}
```

### Error Responses

#### Entity Required

```json
{
	"error": "Entity is required"
}
```

Status: 400

#### Invalid Entity

```json
{
	"error": "Entity must have uid with type and id"
}
```

Status: 400

## Entity Types

### User Entity

```json
{
	"uid": {
		"type": "User",
		"id": "user-123"
	},
	"attrs": {
		"user_id": "user-123",
		"email": "alice@example.com",
		"tenant": "engineering",
		"is_agent": false,
		"limit_requests_per_minute": 100
	}
}
```

### Role Entity

```json
{
	"uid": {
		"type": "Role",
		"id": "analyst"
	},
	"attrs": {},
	"parents": []
}
```

### UserKey Entity

```json
{
	"uid": {
		"type": "UserKey",
		"id": "uk_user-123_key-456"
	},
	"attrs": {
		"current_daily_spend": 45.67,
		"current_monthly_spend": 1234.56,
		"last_daily_reset": "2025-01-01T00:00:00Z",
		"last_monthly_reset": "2025-01-01T00:00:00Z",
		"status": "active",
		"user": {
			"__entity": {
				"type": "User",
				"id": "user-123"
			}
		}
	}
}
```

### Resource Entity

```json
{
	"uid": {
		"type": "Resource",
		"id": "gpt-4"
	},
	"attrs": {}
}
```

## Use Cases

-   **Monitoring** - Check spend values
-   **Verification** - Verify entity structure and attributes

## Next Steps

-   See [Policy Examples](/docs/guides/policy-examples) for using entities in policies
