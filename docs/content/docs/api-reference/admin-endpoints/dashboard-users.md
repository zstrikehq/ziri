---
title: Dashboard Users
weight: 22
---

Manage admin/dashboard users who can access the ZIRI management UI.

## Endpoints

All endpoints require an admin bearer token.

-   `GET /api/dashboard-users` - List dashboard users
-   `GET /api/dashboard-users/:userId` - Get one dashboard user
-   `POST /api/dashboard-users` - Create dashboard user
-   `PUT /api/dashboard-users/:userId` - Update dashboard user
-   `DELETE /api/dashboard-users/:userId` - Delete dashboard user
-   `POST /api/dashboard-users/:userId/disable` - Disable dashboard user
-   `POST /api/dashboard-users/:userId/enable` - Enable dashboard user
-   `POST /api/dashboard-users/:userId/reset-password` - Reset dashboard user password

## Create Dashboard User

### Endpoint

```
POST /api/dashboard-users
```

### Request Body

```typescript
{
  email: string; // Required
  name: string;  // Required
  role: 'admin' | 'viewer' | 'user_admin' | 'policy_admin'; // Required
}
```

### Error Codes

-   `MISSING_FIELDS` - Required fields are missing
-   `INVALID_ROLE` - Role is not valid
-   `USER_EXISTS` - Email already exists

## Update Dashboard User

### Endpoint

```
PUT /api/dashboard-users/:userId
```

### Request Body

```typescript
{
  email?: string;
  name?: string;
  role?: 'admin' | 'viewer' | 'user_admin' | 'policy_admin';
}
```

### Error Codes

-   `USER_NOT_FOUND`
-   `INVALID_ROLE`
-   `EMAIL_EXISTS`
-   `SELF_MODIFICATION_FORBIDDEN`

## Delete / Disable / Enable / Reset Password

These management operations are protected by internal authorization checks and may return:

-   `USER_NOT_FOUND`
-   `SELF_MODIFICATION_FORBIDDEN`
-   `ACCESS_DENIED`

Reset password returns the new password when email delivery is unavailable, or sends email when configured.

