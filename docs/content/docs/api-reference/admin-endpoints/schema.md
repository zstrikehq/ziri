---
title: Schema
weight: 60
---

Manage the Cedar schema that defines entity types, actions, and context.

## Get Schema

Get the current Cedar schema.

### Endpoint

```
GET /api/schema
```

### Query Parameters

-   `format` - `cedar` or `json` (optional, default: `json`)

### Example Request

```bash
# Get as JSON
curl -H "Authorization: Bearer your-token" \
  http://localhost:3100/api/schema

# Get as Cedar text
curl -H "Authorization: Bearer your-token" \
  "http://localhost:3100/api/schema?format=cedar"
```

### Success Response (JSON format)

```json
{
	"data": {
		"schema": {
			"User": {
				"memberOfTypes": [],
				"shape": {
					"type": "Record",
					"attributes": {
						"user_id": { "type": "String" },
						"email": { "type": "String" },
						"department": { "type": "String" }
					}
				}
			}
		},
		"version": "1.0.0",
		"format": "json"
	}
}
```

### Success Response (Cedar format)

```json
{
  "data": {
    "schema": "entity User = { user_id: __cedar::String, email: __cedar::String, ... };",
    "schemaJson": { ... },
    "version": "1.0.0",
    "format": "cedar"
  }
}
```

## Update Schema

Update the Cedar schema. The schema is validated before saving.

### Endpoint

```
POST /api/schema
```

### Query Parameters

-   `format` - `cedar` or `json` (optional, inferred from schema type)

### Request Body

For Cedar text format:

```typescript
{
	schema: string; // Cedar schema as text
}
```

For JSON format:

```typescript
{
	schema: object; // Cedar schema as JSON
}
```

### Example Request (Cedar text)

```bash
curl -X POST "http://localhost:3100/api/schema?format=cedar" \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "schema": "entity User = { user_id: __cedar::String, email: __cedar::String, department: __cedar::String };"
  }'
```

### Success Response

```json
{
  "success": true,
  "data": {
    "schema": "entity User = { ... };",
    "schemaJson": { ... },
    "version": "1.0.0",
    "format": "cedar"
  }
}
```

### Error Responses

#### Schema Required

```json
{
	"error": "Schema is required"
}
```

Status: 400

#### Invalid Schema

```json
{
	"error": "Failed to update schema",
	"message": "Schema validation failed: ..."
}
```

Status: 500

## Schema Storage

The schema is stored and loaded automatically. You typically don't need to modify it unless you're extending ZIRI's capabilities.

## Schema Version

The schema has a version number that increments when updated. This helps track schema changes over time.

## Modifying the Schema

Be careful when modifying the schema:

1. **Breaking changes** - Changing entity attributes can break existing policies
2. **Validation** - The schema is validated before saving
3. **Policies** - Existing policies must match the new schema
4. **Entities** - Entity data must match the new schema

## Default Schema

The default schema includes:

-   **RequestContext** - Context variables (day_of_week, hour, ip_address, etc.)
-   **User** entity - User attributes
-   **UserKey** entity - API key attributes
-   **Resource** entity - Generic resource
-   **Actions** - completion, embedding, image_generation, fine_tuning, moderation

## Next Steps

-   See [Policy Examples](/guides/policy-examples) for policy usage
