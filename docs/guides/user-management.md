# User Management

Manage users, API keys, and access in ZIRI.

## Creating Users

### Via UI

1. Go to **Users** page
2. Click **Create User**
3. Fill in:
   - **Email**: User's email address
   - **Name**: User's full name
   - **Department**: Department name (e.g., "engineering")
   - **Is Agent**: Check for service accounts
   - **Rate Limit**: Requests per minute (default: 100)
4. Click **Create User**

An API key is automatically created for the user.

### Via API

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

## API Keys

### Automatic Creation

When you create a user, an API key is automatically created. The key format is:

```
sk-zs-{userId}-{hash}
```

### Viewing Keys

1. Go to **Keys** page
2. Find the key for your user
3. Click on it to view details

**Note**: The full key is only shown once when created. After that, only the hash is shown.

### Creating Additional Keys

Create additional keys for a user:

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

1. Go to **Keys** page
2. Find the user's key
3. Click **Rotate**

Or via API:

```bash
curl -X POST http://localhost:3100/api/keys/user-123/rotate \
  -H "Authorization: Bearer your-token"
```

**Warning**: The old key is deleted immediately. Make sure users update their applications.

## Managing Users

### Update User

Update a user's email or name:

1. Go to **Users** page
2. Click on a user
3. Click **Edit**
4. Update fields
5. Click **Save**

### Delete User

Delete a user and all their API keys:

1. Go to **Users** page
2. Click on a user
3. Click **Delete**
4. Confirm deletion

**Warning**: This deletes the user and all their keys. This cannot be undone.

### Reset Password

Reset a user's password:

1. Go to **Users** page
2. Click on a user
3. Click **Reset Password**

The new password is shown (or emailed if email is configured).

## Rate Limits

Set rate limits per user:

- **Default**: 100 requests per minute
- **Unlimited**: Set to 0 or null
- **Custom**: Set any number

Rate limits apply to all keys for that user.

## Departments

Use departments to organize users:

- **engineering** - Engineering team
- **research** - Research team
- **sales** - Sales team
- **executive** - Executive team
- **ml_engineering** - ML engineering team

Use departments in policies for department-based access control.

## Service Accounts

Mark users as agents (service accounts):

- **isAgent: true** - Service account
- **isAgent: false** - Regular user

Service accounts typically have higher rate limits and may have different policies.

## Best Practices

1. **Organize by department** - Use consistent department names
2. **Set appropriate limits** - Don't set limits too low or too high
3. **Rotate keys regularly** - Rotate keys periodically for security
4. **Monitor usage** - Check audit logs to see who's using what
5. **Delete unused users** - Remove users who no longer need access

## Common Tasks

### Onboard New User

1. Create user with email, name, department
2. Get API key from Keys page
3. Share API key with user securely
4. Create policies allowing their access
5. Test with a sample request

### Offboard User

1. Revoke their API keys (delete keys)
2. Or delete the user entirely
3. Update policies if needed
4. Archive audit logs if required

### Change Department

1. Update user's department
2. Update policies if department-based
3. Verify access still works

## Next Steps

- [Policy Examples](/guides/policy-examples) - Create department-based policies
- [Monitoring Guide](/guides/monitoring) - Monitor user activity
- [Users API](/api-reference/admin-endpoints/users) - Manage users via API
