---
title: Roles
weight: 25
---

Manage Cedar `Role` entities used for RBAC.

## List Roles

Get roles with optional pagination and search.

### Endpoint

```
GET /api/roles
```

### Query Parameters

-   `search` - Filter roles by ID substring (optional)
-   `limit` - Results per page (optional, default: 100)
-   `offset` - Pagination offset (optional)
-   `usage` - Include `usageCount` for each role (`true` or `false`, optional)

### Example Request

```bash
curl -H "Authorization: Bearer your-token" \
  "http://localhost:3100/api/roles?usage=true&limit=20"
```

### Success Response

Without usage:

```json
{
	"roles": [
		{ "id": "analyst" },
		{ "id": "admin" }
	],
	"total": 2
}
```

With usage:

```json
{
	"roles": [
		{ "id": "analyst", "usageCount": 4 },
		{ "id": "admin", "usageCount": 1 }
	],
	"total": 2
}
```

## Create Role

Create a role by ID.

### Endpoint

```
POST /api/roles
```

### Request Body

```typescript
{
  id: string // Required
}
```

### Example Request

```bash
curl -X POST http://localhost:3100/api/roles \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "analyst"
  }'
```

### Success Response

```json
{
	"role": {
		"id": "analyst"
	}
}
```

### Error Responses

#### Missing ID

```json
{
	"error": "id is required"
}
```

Status: 400

#### Invalid ID Format

```json
{
	"error": "Role id must contain only letters, numbers, underscores and hyphens"
}
```

Status: 400

#### Role Already Exists

```json
{
	"error": "Role already exists"
}
```

Status: 409

## Delete Role

Delete a role by ID.

### Endpoint

```
DELETE /api/roles/:id
```

### Example Request

```bash
curl -X DELETE http://localhost:3100/api/roles/analyst \
  -H "Authorization: Bearer your-token"
```

### Success Response

Status: 204 (No Content)

### Error Responses

#### Role In Use

```json
{
	"error": "Cannot delete role: 2 user(s) have this role. Reassign or remove the role from those users first."
}
```

Status: 409

#### Role Not Found

```json
{
	"error": "Entity not found"
}
```

Status: 404

