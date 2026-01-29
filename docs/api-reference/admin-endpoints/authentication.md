# Authentication

Admin authentication endpoints for accessing the management API.

## Admin Login

Log in as an admin user to get an access token.

### Endpoint

```
POST /api/auth/admin/login
```

### Request Body

```typescript
{
  username?: string    // Optional: Username (admin)
  email?: string       // Optional: Email (admin@ziri.local)
  password: string     // Required: Password (master key or user password)
  deviceId?: string    // Optional: Device identifier
}
```

You can use either `username` or `email`. Both work.

### Example Request

```bash
curl -X POST http://localhost:3100/api/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "your-master-key-here"
  }'
```

### Success Response

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600,
  "tokenType": "Bearer",
  "user": {
    "userId": "admin",
    "email": "admin@ziri.local",
    "role": "admin",
    "name": "Administrator"
  }
}
```

### Using the Token

Include the token in the `Authorization` header:

```bash
curl -H "Authorization: Bearer your-access-token-here" \
  http://localhost:3100/api/users
```

### Error Responses

#### Missing Credentials

```json
{
  "error": "username/email and password are required",
  "code": "MISSING_CREDENTIALS"
}
```

Status: 400

#### Invalid Credentials

```json
{
  "error": "Invalid username/email or password",
  "code": "INVALID_CREDENTIALS"
}
```

Status: 401

#### Account Inactive

```json
{
  "error": "Admin account is not active",
  "code": "ACCOUNT_INACTIVE"
}
```

Status: 403

## Token Refresh

Refresh an expired access token using a refresh token.

### Endpoint

```
POST /api/auth/refresh
```

### Request Body

```typescript
{
  refreshToken: string  // Required: Refresh token from login
}
```

### Success Response

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600,
  "tokenType": "Bearer"
}
```

### Error Responses

#### Missing Refresh Token

```json
{
  "error": "Refresh token is required",
  "code": "MISSING_REFRESH_TOKEN"
}
```

Status: 400

#### Invalid Refresh Token

```json
{
  "error": "Invalid or expired refresh token",
  "code": "INVALID_REFRESH_TOKEN"
}
```

Status: 401

## Token Expiration

- **Access tokens** - Expire after 1 hour (3600 seconds)
- **Refresh tokens** - Expire after 7 days, absolute expiration after 30 days

Use refresh tokens to get new access tokens without logging in again.

## Master Key Login

You can log in using the master key shown when the server starts:

```bash
curl -X POST http://localhost:3100/api/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "master-key-from-console"
  }'
```

The master key changes on each server restart unless you set `ZIRI_MASTER_KEY` environment variable.

## Next Steps

- See [Users API](/api-reference/admin-endpoints/users) for user management
- Check [Keys API](/api-reference/admin-endpoints/keys) for API key management
