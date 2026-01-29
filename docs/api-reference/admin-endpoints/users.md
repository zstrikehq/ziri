# Users

Manage users in your ZIRI instance.

## List Users

Get a paginated list of users with search and sorting.

### Endpoint

```
GET /api/users
```

### Query Parameters

- `search` - Search in name, email, userId (optional)
- `limit` - Results per page (optional, default: no limit)
- `offset` - Pagination offset (optional)
- `sortBy` - Column to sort by: `name`, `email`, `userId`, `createdAt`, `updatedAt` (optional)
- `sortOrder` - `asc` or `desc` (optional)

### Example Request

```bash
curl -H "Authorization: Bearer your-token" \
  "http://localhost:3100/api/users?search=alice&limit=10&offset=0&sortBy=name&sortOrder=asc"
```

### Success Response

```json
{
  "users": [
    {
      "id": "user-123",
      "userId": "user-123",
      "email": "alice@example.com",
      "name": "Alice",
      "department": "engineering",
      "isAgent": false,
      "status": 1,
      "createdAt": "2025-01-01 12:00:00",
      "updatedAt": "2025-01-01 12:00:00",
      "lastSignIn": "2025-01-01 13:00:00"
    }
  ],
  "total": 1
}
```

## Get User

Get a single user by ID.

### Endpoint

```
GET /api/users/:userId
```

### Example Request

```bash
curl -H "Authorization: Bearer your-token" \
  http://localhost:3100/api/users/user-123
```

### Success Response

```json
{
  "user": {
    "id": "user-123",
    "userId": "user-123",
    "email": "alice@example.com",
    "name": "Alice",
    "department": "engineering",
    "isAgent": false,
    "status": 1,
    "createdAt": "2025-01-01 12:00:00",
    "updatedAt": "2025-01-01 12:00:00",
    "lastSignIn": "2025-01-01 13:00:00"
  }
}
```

### Error Responses

#### User Not Found

```json
{
  "error": "User not found",
  "code": "USER_NOT_FOUND"
}
```

Status: 404

## Create User

Create a new user. An API key is automatically created.

### Endpoint

```
POST /api/users
```

### Request Body

```typescript
{
  email: string                    // Required
  name: string                    // Required
  department: string              // Required
  isAgent?: boolean               // Optional, default: false
  limitRequestsPerMinute?: number // Optional, default: 100
}
```

### Example Request

```bash
curl -X POST http://localhost:3100/api/users \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@example.com",
    "name": "Alice",
    "department": "engineering",
    "isAgent": false,
    "limitRequestsPerMinute": 100
  }'
```

### Success Response

If email is configured:

```json
{
  "user": {
    "id": "user-123",
    "userId": "user-123",
    "email": "alice@example.com",
    "name": "Alice",
    "department": "engineering",
    "isAgent": false,
    "status": 1,
    "createdAt": "2025-01-01 12:00:00",
    "updatedAt": "2025-01-01 12:00:00"
  },
  "message": "User created successfully. Credentials have been sent to the user's email address."
}
```

If email is not configured:

```json
{
  "user": {
    "id": "user-123",
    "userId": "user-123",
    "email": "alice@example.com",
    "name": "Alice",
    "department": "engineering",
    "isAgent": false,
    "status": 1,
    "createdAt": "2025-01-01 12:00:00",
    "updatedAt": "2025-01-01 12:00:00"
  },
  "password": "generated-password-here",
  "message": "User created successfully. Save the password - it won't be shown again! Email was not sent (email service not configured or failed)."
}
```

**Important**: Save the password if shown. It won't be displayed again.

### Error Responses

#### Missing Fields

```json
{
  "error": "email, name, and department are required",
  "code": "MISSING_FIELDS"
}
```

Status: 400

#### User Exists

```json
{
  "error": "User with this email already exists",
  "code": "USER_EXISTS"
}
```

Status: 409

## Update User

Update a user's email or name.

### Endpoint

```
PUT /api/users/:userId
```

### Request Body

```typescript
{
  email?: string  // Optional
  name?: string   // Optional
}
```

### Example Request

```bash
curl -X PUT http://localhost:3100/api/users/user-123 \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newemail@example.com",
    "name": "Alice Updated"
  }'
```

### Success Response

```json
{
  "user": {
    "id": "user-123",
    "userId": "user-123",
    "email": "newemail@example.com",
    "name": "Alice Updated",
    "department": "engineering",
    "isAgent": false,
    "status": 1,
    "createdAt": "2025-01-01 12:00:00",
    "updatedAt": "2025-01-01 14:00:00"
  }
}
```

### Error Responses

#### User Not Found

```json
{
  "error": "User not found",
  "code": "USER_NOT_FOUND"
}
```

Status: 404

#### Email Exists

```json
{
  "error": "Email already in use",
  "code": "EMAIL_EXISTS"
}
```

Status: 409

## Delete User

Delete a user and all their API keys.

### Endpoint

```
DELETE /api/users/:userId
```

### Example Request

```bash
curl -X DELETE http://localhost:3100/api/users/user-123 \
  -H "Authorization: Bearer your-token"
```

### Success Response

```json
{
  "success": true
}
```

### Error Responses

#### User Not Found

```json
{
  "error": "User not found",
  "code": "USER_NOT_FOUND"
}
```

Status: 404

## Reset Password

Reset a user's password and optionally email it.

### Endpoint

```
POST /api/users/:userId/reset-password
```

### Example Request

```bash
curl -X POST http://localhost:3100/api/users/user-123/reset-password \
  -H "Authorization: Bearer your-token"
```

### Success Response

If email is configured:

```json
{
  "password": undefined,
  "emailSent": true,
  "message": "Password reset successfully. The new password has been sent to the user's email address."
}
```

If email is not configured:

```json
{
  "password": "new-password-here",
  "emailSent": false,
  "message": "Password reset successfully. Save the password - it won't be shown again! Email was not sent (email service not configured or failed)."
}
```

**Important**: Save the password if shown. It won't be displayed again.

### Error Responses

#### User Not Found

```json
{
  "error": "User not found",
  "code": "USER_NOT_FOUND"
}
```

Status: 404

## Next Steps

- See [Keys API](/api-reference/admin-endpoints/keys) for API key management
- Check [User Management Guide](/guides/user-management) for best practices
