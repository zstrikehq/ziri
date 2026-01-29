# Policies

Manage Cedar authorization policies.

## List Policies

Get a paginated list of policies with search, filtering, and sorting.

### Endpoint

```
GET /api/rules
```

### Query Parameters

- `search` - Search in description and policy content (optional)
- `limit` - Results per page (optional, default: 100)
- `offset` - Pagination offset (optional)
- `effect` - Filter by `permit` or `forbid` (optional)
- `sortBy` - Column to sort by: `description`, `status`, `effect`, `createdAt`, `updatedAt` (optional)
- `sortOrder` - `asc` or `desc` (optional)

### Example Request

```bash
curl -H "Authorization: Bearer your-token" \
  "http://localhost:3100/api/rules?search=engineering&effect=permit&limit=10"
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
GET /api/rules/templates
```

### Example Request

```bash
curl -H "Authorization: Bearer your-token" \
  http://localhost:3100/api/rules/templates
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
POST /api/rules
```

### Request Body

```typescript
{
  policy: string      // Required: Cedar policy text
  description: string // Required: Policy description
}
```

### Example Request

```bash
curl -X POST http://localhost:3100/api/rules \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "policy": "permit (principal, action == Action::\"completion\", resource) when { principal.status == \"active\" };",
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
  "error": "Policy and description are required"
}
```

Status: 400

## Update Policy

Update an existing policy. Replaces the entire policy.

### Endpoint

```
PUT /api/rules
```

### Request Body

```typescript
{
  oldPolicy: string   // Required: Current policy text
  policy: string      // Required: New policy text
  description: string // Required: Policy description
}
```

### Example Request

```bash
curl -X PUT http://localhost:3100/api/rules \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "oldPolicy": "permit (principal, action == Action::\"completion\", resource) when { principal.status == \"active\" };",
    "policy": "permit (principal, action == Action::\"completion\", resource) when { principal.status == \"active\" && principal.user.department == \"engineering\" };",
    "description": "Allow completions for active engineering keys"
  }'
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
DELETE /api/rules
```

### Request Body

```typescript
{
  policy: string  // Required: Policy text to delete
}
```

### Example Request

```bash
curl -X DELETE http://localhost:3100/api/rules \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "policy": "permit (principal, action == Action::\"completion\", resource) when { principal.status == \"active\" };"
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
- `isActive: true` - Policy is evaluated
- `isActive: false` - Policy is ignored

Only active policies are evaluated during authorization.

## Policy Effect

Policies have an effect:
- `permit` - Allows requests when conditions match
- `forbid` - Blocks requests when conditions match

Forbid policies take precedence over permit policies.

## Next Steps

- See [Policy Examples](/guides/policy-examples) for real-world policies
- See [Policy Examples](/guides/policy-examples) for more examples
- Check [First Policy Guide](/guides/first-policy) for step-by-step creation
