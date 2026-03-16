---
title: Authentication
weight: 10
---

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
  username?: string    // Optional: Username (e.g. "ziri" or another admin user)
  email?: string       // Optional: Email (e.g. "ziri@ziri.local")
  password: string     // Required: Password (root key for ziri, or dashboard user password)
  deviceId?: string    // Optional: Device identifier
}
```

You can use either `username` or `email`. Both work.

### Example Request

```bash
# Login as built-in root admin using the root key
curl -X POST http://localhost:3100/api/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "ziri",
    "password": "your-root-key-here"
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
    "userId": "ziri",
    "email": "ziri@ziri.local",
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

#### Account Disabled

```json
{
	"error": "Account is disabled",
	"code": "ACCOUNT_DISABLED"
}
```

Status: 403

## User Login

Log in as a regular (non-admin) user to get a Bearer token for the `/api/me` endpoints.

### Endpoint

```
POST /api/auth/login
```

### Request Body

```typescript
{
  userId: string       // Required: User ID
  password: string     // Required: User password
  deviceId?: string    // Optional: Device identifier
}
```

### Example Request

```bash
curl -X POST http://localhost:3100/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-123",
    "password": "user-password-here"
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
    "userId": "user-123",
    "email": "alice@example.com",
    "role": "user",
    "name": "Alice"
  }
}
```

### Error Responses

Same error codes as Admin Login: `MISSING_CREDENTIALS` (400), `INVALID_CREDENTIALS` (401), `ACCOUNT_DISABLED` (403).

---

## Token Refresh

Refresh an expired access token using a refresh token.

### Endpoint

```
POST /api/auth/refresh
```

### Request Body

```typescript
{
	refreshToken: string; // Required: Refresh token from login
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
	"error": "refreshToken is required",
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

## Logout

Invalidate refresh tokens and end the session.

### Endpoint

```
POST /api/auth/logout
```

### Request Body

```typescript
{
  refreshToken?: string  // Optional: Specific refresh token to revoke
}
```

If no `refreshToken` is provided, the endpoint still returns success.

### Success Response

```json
{
  "success": true
}
```

---

## Token Expiration

-   **Access tokens** - Expire after 1 hour (3600 seconds)
-   **Refresh tokens** - Expire after 7 days, absolute expiration after 30 days

Use refresh tokens to get new access tokens without logging in again.

## Root Key Login

You can log in using the **root key** that ZIRI generates on first start.

- The root key is stored as `.ziri-root-key` in the config directory (`CONFIG_DIR`).
- In Docker, with `CONFIG_DIR=/data`, the file is `/data/.ziri-root-key` inside the container.

```bash
curl -X POST http://localhost:3100/api/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "ziri",
    "password": "your-root-key"
  }'
```
ZIRI reads the `.ziri-root-key` file from disk and keeps the value stable across restarts by default. If no key file exists, ZIRI generates one on startup. When `ROTATE_ROOT_KEY` is set to `true`, the root key is rotated on every startup and the file is overwritten with the new value.

## Next Steps

-   See [Users API](/docs/api-reference/admin-endpoints/users) for user management
-   Check [Keys API](/docs/api-reference/admin-endpoints/keys) for API key management
