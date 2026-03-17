---
title: User Management
weight: 40
---

Manage users, API keys, and access in ZIRI.

## Creating Users

### Via UI

1. Go to **Users** page
2. Click **Create User**
3. Fill in:
    - **Email**: User's email address
    - **Name**: User's full name
    - **Tenant**: Tenant identifier (optional)
    - **Role**: Role ID (optional)
    - **Is Agent**: Check for service accounts
    - **Rate Limit**: Requests per minute (default: 100)
    - **Create API Key**: Enable if the user should receive a key now
4. Click **Create User**

API key creation is optional. If email delivery is disabled, the create response includes a generated password.

### Via API

```bash
curl -X POST http://localhost:3100/api/users \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@example.com",
    "name": "Alice",
    "tenant": "engineering",
    "roleId": "analyst",
    "isAgent": false,
    "limitRequestsPerMinute": 100,
    "createApiKey": true
  }'
```

## API Keys

### Automatic Creation

API keys can be created during user creation (`createApiKey: true`) or later from the Keys page/API. The key format is:

```
ziri_<uuidv4withoutdashes>
```

### Viewing Keys

1. Go to **Keys** page
2. Find the key for your user
3. Click on it to view details

> The full key is only shown once when created. After that, only the hash is shown.

### Creating Additional Keys

```bash
curl -X POST http://localhost:3100/api/keys \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-123"
  }'
```

### Rotating Keys

Rotate (replace) a user's API key:

```bash
curl -X POST http://localhost:3100/api/keys/user-123/rotate \
  -H "Authorization: Bearer your-token"
```

> The old key is deleted immediately. Make sure users update their applications.

## Managing Users

### Update User

1. Go to **Users** page
2. Click on a user
3. Click **Edit**
4. Update fields
5. Click **Save**

### Delete User

1. Go to **Users** page
2. Click on a user
3. Click **Delete**
4. Confirm deletion

> This deletes the user and all their keys. This cannot be undone.

### Reset Password

1. Go to **Users** page
2. Click on a user
3. Click **Reset Password**

The new password is shown (or emailed if email is configured).

## Rate Limits

Set rate limits per user:

-   **Default**: 100 requests per minute
-   **Unlimited**: Set to 0 or null
-   **Custom**: Set any number

Rate limits apply to all keys for that user.

## Tenants

Use tenants to organize users:

-   `engineering`
-   `research`
-   `sales`
-   `executive`
-   `ml_engineering`

Use tenant values in policies for tenant-scoped access control.

## Roles

Roles are modeled as Cedar `Role` entities and attached as parent relationships on `User` entities.

-   Assign one role per user with `roleId` during create or update.
-   Remove a role by sending `roleId: null` in user updates.
-   Manage role entities from **Settings → Roles** or `/api/roles`.

## Service Accounts

Mark users as agents (service accounts):

-   `isAgent: true` - Service account
-   `isAgent: false` - Regular user

Service accounts typically have higher rate limits and may have different policies.

## Best Practices

1. Organize by department.
2. Set appropriate limits per user.
3. Rotate API keys regularly.
4. Monitor usage via audit logs.
5. Delete users who no longer need access.

## Common Tasks

### Onboard New User

1. Create user with email, name, and optional tenant.
2. Get API key from Keys page.
3. Share API key securely.
4. Create policies allowing their access.
5. Test with a sample request.

### Offboard User

1. Revoke their API keys (delete keys) or delete the user.
2. Update policies if needed.
3. Archive audit logs if required.

### Change Tenant

1. Update the user's tenant.
2. Update policies if tenant-based.
3. Verify access still works.

## Next Steps

-   [Policy Examples](/docs/guides/policy-examples)
-   [Monitoring Guide](/docs/guides/monitoring)
-   [Users API](/docs/api-reference/admin-endpoints/users)
