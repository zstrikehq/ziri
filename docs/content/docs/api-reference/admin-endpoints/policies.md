---
title: Policies
weight: 50
---

Manage Cedar authorization policies.

## List Policies

Get a paginated list of policies with search, filtering, and sorting.

### Endpoint

```
GET /api/policies
```

### Query Parameters

-   `search` - Search in description and policy content (optional)
-   `limit` - Results per page (optional, default: 100)
-   `offset` - Pagination offset (optional)
-   `effect` - Filter by `permit` or `forbid` (optional)
-   `sortBy` - Column to sort by: `description`, `status`, `effect`, `createdAt`, `updatedAt` (optional)
-   `sortOrder` - `asc` or `desc` (optional)

### Example Request

```bash
curl -H "Authorization: Bearer your-token" \
  "http://localhost:3100/api/policies?search=engineering&effect=permit&limit=10"
```

### Success Response

```json
{
	"data": {
		"policies": [
			{
				"policy": "permit (principal, action == Action::\"completion\", resource) when { principal.status == \"active\" };",
				"description": "Allow completions for active keys",
				"isActive": true,
				"effect": "permit"
			}
		]
	},
	"total": 1
}
```

## Get Policy Templates

Get available policy templates.

### Endpoint

```
GET /api/policies/templates
```

### Example Request

```bash
curl -H "Authorization: Bearer your-token" \
  http://localhost:3100/api/policies/templates
```

### Success Response

```json
{
	"templates": [
		{
			"id": "allow-completion-active-keys",
			"category": "Basic Access",
			"title": "Allow completion for active user keys",
			"description": "Allows completion action for any user key with active status.",
			"policy": "permit (principal, action == Action::\"completion\", resource) when { principal.status == \"active\" };"
		}
	]
}
```

## Create Policy

Create a new Cedar policy.

### Endpoint

```
POST /api/policies
```

### Request Body

```typescript
{
	policy: string; // Required: Cedar policy text
	description: string; // Required: Policy description
}
```

The policy text must include an ID annotation:

```cedar
@id("allow-completion-active-keys")
permit (
    principal,
    action == Action::"completion",
    resource
)
when {
    principal.status == "active"
};
```

### Example Request

```bash
curl -X POST http://localhost:3100/api/policies \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "policy": "@id(\"allow-completion-active-keys\") permit (principal, action == Action::\"completion\", resource) when { principal.status == \"active\" };",
    "description": "Allow completions for active keys"
  }'
```

### Success Response

```json
{
	"success": true,
	"message": "Policy created successfully"
}
```

### Error Responses

#### Missing Fields

```json
{
	"error": "Policy and description are required",
	"code": "POLICY_MISSING_FIELDS"
}
```

Status: 400

#### Missing Policy ID

```json
{
	"error": "Policy must include @id(\"your-id\") at the start.",
	"code": "POLICY_ID_REQUIRED"
}
```

Status: 400

#### Policy ID Already Exists

```json
{
	"error": "This Policy ID is already in use.",
	"code": "POLICY_ID_EXISTS"
}
```

Status: 409

## Update Policy

Update an existing policy. Replaces the entire policy.

### Endpoint

```
PUT /api/policies
```

### Request Body

```typescript
{
	oldPolicy: string; // Required: Current policy text
	policy: string; // Required: New policy text
	description: string; // Required: Policy description
}
```

### Example Request

```bash
curl -X PUT http://localhost:3100/api/policies \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "oldPolicy": "@id(\"allow-completion-active-keys\") permit (principal, action == Action::\"completion\", resource) when { principal.status == \"active\" };",
    "policy": "@id(\"allow-completion-engineering\") permit (principal, action == Action::\"completion\", resource) when { principal.status == \"active\" && principal.user.tenant == \"engineering\" };",
    "description": "Allow completions for active engineering keys"
  }'
```

## Update Policy Status

Activate or deactivate a policy without editing the policy body.

### Endpoint

```
PATCH /api/policies/status
```

### Request Body

```typescript
{
  policy: string;   // Required: exact policy text
  isActive: boolean // Required
}
```

### Example Request

```bash
curl -X PATCH http://localhost:3100/api/policies/status \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "policy": "@id(\"allow-completion-active-keys\") permit (principal, action == Action::\"completion\", resource) when { principal.status == \"active\" };",
    "isActive": false
  }'
```

### Success Response

```json
{
	"success": true,
	"message": "Policy deactivated successfully"
}
```

### Success Response

```json
{
	"success": true,
	"message": "Policy updated successfully"
}
```

## Delete Policy

Delete a policy.

### Endpoint

```
DELETE /api/policies
```

### Request Body

```typescript
{
	policy: string; // Required: Policy text to delete
}
```

### Example Request

```bash
curl -X DELETE http://localhost:3100/api/policies \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "policy": "@id(\"allow-completion-active-keys\") permit (principal, action == Action::\"completion\", resource) when { principal.status == \"active\" };"
  }'
```

### Success Response

```json
{
	"success": true,
	"message": "Policy deleted successfully"
}
```

## Policy Format

Policies are written in Cedar syntax:

```cedar
@id("policy-name")
permit (
    principal,
    action,
    resource
)
when {
    // conditions
};
```

Or to forbid:

```cedar
@id("forbid-policy")
forbid (
    principal,
    action == Action::"completion",
    resource
)
when {
    // conditions
};
```

## Policy Status

Policies have a status:

-   `isActive: true` - Policy is evaluated
-   `isActive: false` - Policy is ignored

Only active policies are evaluated during authorization.

## Policy Effect

Policies have an effect:

-   `permit` - Allows requests when conditions match
-   `forbid` - Blocks requests when conditions match

Forbid policies take precedence over permit policies.

## Next Steps

-   See [Policy Examples](/docs/guides/policy-examples) for real-world policies
-   Check [First Policy Guide](/docs/guides/first-policy) for step-by-step creation
