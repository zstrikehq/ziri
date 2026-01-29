# Providers

Manage LLM provider configurations.

## List Providers

Get a paginated list of providers with search and sorting.

### Endpoint

```
GET /api/providers
```

### Query Parameters

- `search` - Search in name, displayName, baseUrl (optional)
- `limit` - Results per page (optional)
- `offset` - Pagination offset (optional)
- `sortBy` - Column to sort by (optional)
- `sortOrder` - `asc` or `desc` (optional)

### Example Request

```bash
curl -H "Authorization: Bearer your-token" \
  "http://localhost:3100/api/providers?search=openai&limit=10"
```

### Success Response

```json
{
  "providers": [
    {
      "id": 1,
      "name": "openai",
      "displayName": "OpenAI",
      "baseUrl": "https://api.openai.com/v1",
      "createdAt": "2025-01-01 12:00:00",
      "updatedAt": "2025-01-01 12:00:00"
    }
  ],
  "total": 1
}
```

## Get Provider

Get a single provider by name.

### Endpoint

```
GET /api/providers/:name
```

### Example Request

```bash
curl -H "Authorization: Bearer your-token" \
  http://localhost:3100/api/providers/openai
```

### Success Response

```json
{
  "provider": {
    "id": 1,
    "name": "openai",
    "displayName": "OpenAI",
    "baseUrl": "https://api.openai.com/v1",
    "createdAt": "2025-01-01 12:00:00",
    "updatedAt": "2025-01-01 12:00:00"
  }
}
```

### Error Responses

#### Provider Not Found

```json
{
  "error": "Provider not found",
  "code": "PROVIDER_NOT_FOUND"
}
```

Status: 404

## Create or Update Provider

Create a new provider or update an existing one.

### Endpoint

```
POST /api/providers
```

### Request Body

```typescript
{
  name: string           // Required: Provider name (e.g., "openai")
  apiKey: string        // Required: Provider API key (encrypted before storage)
  metadata?: {          // Optional: Additional metadata
    displayName?: string
    baseUrl?: string
    // ... other fields
  }
}
```

### Example Request

```bash
curl -X POST http://localhost:3100/api/providers \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "openai",
    "apiKey": "sk-...",
    "metadata": {
      "displayName": "OpenAI",
      "baseUrl": "https://api.openai.com/v1"
    }
  }'
```

### Success Response

```json
{
  "provider": {
    "id": 1,
    "name": "openai",
    "displayName": "OpenAI",
    "baseUrl": "https://api.openai.com/v1",
    "createdAt": "2025-01-01 12:00:00",
    "updatedAt": "2025-01-01 12:00:00"
  }
}
```

The API key is encrypted before storage. It's never returned in responses.

### Error Responses

#### Missing Fields

```json
{
  "error": "name and apiKey are required",
  "code": "MISSING_FIELDS"
}
```

Status: 400

#### Invalid API Key

```json
{
  "error": "Invalid API key format",
  "code": "INVALID_API_KEY"
}
```

Status: 400

## Delete Provider

Delete a provider configuration.

### Endpoint

```
DELETE /api/providers/:name
```

### Example Request

```bash
curl -X DELETE http://localhost:3100/api/providers/openai \
  -H "Authorization: Bearer your-token"
```

### Success Response

```json
{
  "success": true
}
```

### Error Responses

#### Provider Not Found

```json
{
  "error": "Provider not found",
  "code": "PROVIDER_NOT_FOUND"
}
```

Status: 404

## Test Provider

Test if a provider's API key works.

### Endpoint

```
POST /api/providers/:name/test
```

### Example Request

```bash
curl -X POST http://localhost:3100/api/providers/openai/test \
  -H "Authorization: Bearer your-token"
```

### Success Response

```json
{
  "success": true,
  "message": "Provider connection successful"
}
```

### Error Responses

#### Connection Failed

```json
{
  "error": "Provider connection failed: Invalid API key",
  "code": "CONNECTION_FAILED"
}
```

Status: 400

Provider API keys are encrypted before storage. They're decrypted automatically when making requests to the provider.

## Supported Providers

Common providers:
- `openai` - OpenAI (GPT models, embeddings, images)
- `anthropic` - Anthropic (Claude models)
- Others can be added via the API

## Next Steps

- See [Provider Setup Guide](/guides/provider-setup) for detailed setup
