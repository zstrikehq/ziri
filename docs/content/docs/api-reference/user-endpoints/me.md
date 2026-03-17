---
title: User Profile
weight: 4
---

Self-service endpoints for authenticated users to view their profile, API keys, usage statistics, and rotate keys. All endpoints require a Bearer token obtained via `POST /api/auth/login`.

## Get Current User

```
GET /api/me
```

### Authentication

Bearer token in Authorization header.

### Success Response

```json
{
	"userId": "user-123",
	"email": "alice@example.com",
	"name": "Alice",
	"role": "user",
	"status": 1,
	"createdAt": "2025-01-15T10:00:00.000Z",
	"updatedAt": "2025-01-15T10:00:00.000Z",
	"lastLogin": "2025-06-01T14:30:00.000Z"
}
```

### Error Responses

| Status | Code | Description                     |
| ------ | ---- | ------------------------------- |
| 401    | -    | Missing or invalid Bearer token |
| 404    | -    | User not found                  |

---

## Get User Keys

```
GET /api/me/keys
```

Returns the authenticated user's API key metadata. The full key value is never returned — only a suffix for identification.

### Success Response

```json
{
	"data": [
		{
			"uid": { "type": "UserKey", "id": "key-user-123" },
			"attrs": { ... },
			"apiKey": null,
			"keySuffix": "-----",
			"currentDailySpend": 12.50,
			"currentMonthlySpend": 85.00,
			"lastDailyReset": "2025-06-01T00:00:00.000Z",
			"lastMonthlyReset": "2025-06-01T00:00:00.000Z"
		}
	]
}
```

| Field                 | Description                                    |
| --------------------- | ---------------------------------------------- |
| `apiKey`              | Always `null` — full key is never returned     |
| `keySuffix`           | Last characters of key hash for identification |
| `currentDailySpend`   | Spend accumulated since last daily reset       |
| `currentMonthlySpend` | Spend accumulated since last monthly reset     |

---

## Get Usage Statistics

```
GET /api/me/usage
```

Returns aggregated usage statistics for the authenticated user.

### Success Response

```json
{
	"currentDailySpend": 12.5,
	"dailySpendLimit": 0,
	"currentMonthlySpend": 85.0,
	"monthlySpendLimit": 0,
	"totalRequests": 1547,
	"totalTokens": 2340000,
	"lastDailyReset": "2025-06-01T00:00:00.000Z",
	"lastMonthlyReset": "2025-06-01T00:00:00.000Z"
}
```

| Field                 | Description                              |
| --------------------- | ---------------------------------------- |
| `currentDailySpend`   | Cost accumulated today                   |
| `dailySpendLimit`     | Daily spend cap (0 = unlimited)          |
| `currentMonthlySpend` | Cost accumulated this month              |
| `monthlySpendLimit`   | Monthly spend cap (0 = unlimited)        |
| `totalRequests`       | Total permitted requests across all time |
| `totalTokens`         | Total tokens consumed across all time    |

---

## Rotate API Key

```
POST /api/me/rotate
```

Generates a new API key for the authenticated user and revokes the existing one. The new key is returned once — store it immediately.

### Success Response

```json
{
	"apiKey": "<your_ziri_api_key>",
	"userId": "user-123",
	"message": "Key rotated. Save the new key — you won't see it again."
}
```

### Error Responses

| Status | Code | Description                                 |
| ------ | ---- | ------------------------------------------- |
| 401    | -    | Missing or invalid Bearer token             |
| 404    | -    | User not found or no existing key to rotate |
