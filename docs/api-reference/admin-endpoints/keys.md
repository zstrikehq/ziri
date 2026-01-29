# Keys

Manage API keys for users.

## List Keys

Get all API keys.

### Endpoint

```
GET /api/keys
```

### Example Request

```bash
curl -H "Authorization: Bearer your-token" \
  http://localhost:3100/api/keys
```

### Success Response

```json
{
  "keys": [
    {
      "id": "key-123",
      "auth_id": "user-123",
      "key_hash": "abc...",
      "status": 1,
      "created_at": "2025-01-01 12:00:00"
    }
  ]
}
```

## Get User Keys

Get all keys for a specific user.

### Endpoint

```
GET /api/keys/user/:userId
```

### Example Request

```bash
curl -H "Authorization: Bearer your-token" \
  http://localhost:3100/api/keys/user/user-123
```

### Success Response

```json
{
  "keys": [
    {
      "id": "key-123",
      "auth_id": "user-123",
      "key_hash": "abc...",
      "status": 1,
      "created_at": "2025-01-01 12:00:00"
    }
  ]
}
```

## Create Key

Create a new API key for a user.

### Endpoint

```
POST /api/keys
```

### Request Body

```typescript
{
  userId: string  // Required: User ID
}
```

### Example Request

```bash
curl -X POST http://localhost:3100/api/keys \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-123"
  }'
```

### Success Response

```json
{
  "apiKey": "sk-zs-user-123-abc456def789",
  "userId": "user-123",
  "message": "API key created successfully. Save the key - it won't be shown again!"
}
```

**Important**: Save the API key immediately. It won't be shown again.

### Error Responses

#### Missing User ID

```json
{
  "error": "userId is required",
  "code": "MISSING_USER_ID"
}
```

Status: 400

#### User Not Found

```json
{
  "error": "User not found",
  "code": "USER_NOT_FOUND"
}
```

Status: 404

## Rotate Key

Rotate (replace) a user's API key. The old key is deleted and a new one is created.

### Endpoint

```
POST /api/keys/:userId/rotate
```

### Example Request

```bash
curl -X POST http://localhost:3100/api/keys/user-123/rotate \
  -H "Authorization: Bearer your-token"
```

### Success Response

```json
{
  "apiKey": "sk-zs-user-123-new-key-hash",
  "userId": "user-123",
  "message": "API key rotated successfully. Save the new key - it won't be shown again!"
}
```

**Important**: Save the new API key immediately. The old key is no longer valid.

### Error Responses

#### User Not Found

```json
{
  "error": "User not found",
  "code": "USER_NOT_FOUND"
}
```

Status: 404

## Delete Keys by User

Delete all keys for a user.

### Endpoint

```
DELETE /api/keys/:userId
```

### Example Request

```bash
curl -X DELETE http://localhost:3100/api/keys/user-123 \
  -H "Authorization: Bearer your-token"
```

### Success Response

```json
{
  "success": true
}
```

### Error Responses

#### No Keys Found

```json
{
  "error": "No keys found for user",
  "code": "KEY_NOT_FOUND"
}
```

Status: 404

## Delete Key by ID

Delete a specific key by its ID.

### Endpoint

```
DELETE /api/keys/id/:keyId
```

### Example Request

```bash
curl -X DELETE http://localhost:3100/api/keys/id/key-123 \
  -H "Authorization: Bearer your-token"
```

### Success Response

```json
{
  "success": true
}
```

### Error Responses

#### Key Not Found

```json
{
  "error": "API key not found",
  "code": "KEY_NOT_FOUND"
}
```

Status: 404

## API Key Format

API keys follow this format:

```
sk-zs-{userId}-{hash}
```

Example: `sk-zs-user-123-abc456def789`

- `sk-zs-` - Prefix identifying ZIRI keys
- `{userId}` - User ID extracted from the key
- `{hash}` - Random hash for security

## Key Status

Keys have a status:
- `1` - Active
- `0` - Revoked

Revoked keys cannot be used for requests.

## Next Steps

- See [Users API](/api-reference/admin-endpoints/users) for user management
