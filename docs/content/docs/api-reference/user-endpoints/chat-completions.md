---
title: Chat Completions
weight: 10
---

Make chat completion requests to LLM providers through ZIRI.

## Endpoint

```
POST /api/chat/completions
```

## Authentication

Include your API key in the `X-API-Key` header:

```bash
curl -H "X-API-Key: sk-zs-user-123-abc456" \
  https://your-server.com/api/chat/completions
```

## Request Body

```typescript
{
  provider: string          // Required: "openai", "anthropic", etc.
  model: string             // Required: "gpt-4", "claude-3-opus", etc.
  messages: Array<{         // Required: Conversation messages
    role: string            // "system", "user", "assistant"
    content: string         // Message content
  }>
  max_tokens?: number       // Optional: Maximum tokens in response
  temperature?: number      // Optional: 0-2, controls randomness
  top_p?: number           // Optional: Nucleus sampling
  frequency_penalty?: number // Optional: -2 to 2
  presence_penalty?: number  // Optional: -2 to 2
  stop?: string[]          // Optional: Stop sequences
  stream?: boolean         // Optional: Stream responses (not yet supported)
  // ... other provider-specific parameters
}
```

## Example Request

```bash
curl -X POST http://localhost:3100/api/chat/completions \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sk-zs-user-123-abc456" \
  -d '{
    "provider": "openai",
    "model": "gpt-4o-mini",
    "messages": [
      {"role": "user", "content": "Hello, ZIRI!"}
    ],
    "max_tokens": 100
  }'
```

## Success Response

```json
{
	"id": "chatcmpl-123",
	"object": "chat.completion",
	"created": 1704067200,
	"model": "gpt-4o-mini",
	"choices": [
		{
			"index": 0,
			"message": {
				"role": "assistant",
				"content": "Hello! How can I help you?"
			},
			"finish_reason": "stop"
		}
	],
	"usage": {
		"prompt_tokens": 10,
		"completion_tokens": 8,
		"total_tokens": 18
	}
}
```

Response format matches the provider's format (OpenAI or Anthropic).

## Rate Limit Headers

Every response includes:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1704067200
```

## Error Responses

### Missing API Key

```json
{
	"error": "API key required. Include X-API-Key header.",
	"code": "API_KEY_REQUIRED",
	"requestId": "req-123"
}
```

Status: 400

### Invalid API Key Format

```json
{
	"error": "Invalid API key format",
	"code": "INVALID_API_KEY_FORMAT",
	"requestId": "req-123"
}
```

Status: 401

### API Key Not Found

```json
{
	"error": "API key not found or invalid",
	"code": "API_KEY_INVALID",
	"requestId": "req-123"
}
```

Status: 403

### Missing Required Fields

```json
{
	"error": "provider, model, and messages are required",
	"code": "MISSING_FIELDS",
	"requestId": "req-123"
}
```

Status: 400

### Rate Limit Exceeded

```json
{
	"error": "Rate limit exceeded",
	"code": "RATE_LIMIT_EXCEEDED",
	"requestId": "req-123",
	"retryAfter": 15,
	"resetAt": "2025-01-01T12:00:00Z"
}
```

Status: 429

Includes `Retry-After` header.

### Queue Full

```json
{
	"error": "Server busy - queue full",
	"code": "QUEUE_FULL",
	"requestId": "req-123"
}
```

Status: 503

### Authorization Denied

```json
{
	"error": "Authorization denied: Policy policy1 denied the request",
	"code": "AUTHORIZATION_DENIED",
	"reason": "Policy policy1 denied the request",
	"requestId": "req-123"
}
```

Status: 403

Check your policies if you see this.

### Provider Not Found

```json
{
	"error": "Provider not found",
	"code": "PROVIDER_NOT_FOUND",
	"requestId": "req-123"
}
```

Status: 404

Add the provider in the admin UI first.

### Provider Key Missing

```json
{
	"error": "Provider API key not configured",
	"code": "PROVIDER_KEY_MISSING",
	"requestId": "req-123"
}
```

Status: 500

Configure the provider's API key in the admin UI.

### LLM Provider Error

```json
{
	"error": "OpenAI API error: Rate limit exceeded",
	"code": "LLM_PROVIDER_ERROR",
	"requestId": "req-123"
}
```

Status: 500

The LLM provider returned an error. Check the error message for details.

## Using the SDK

```javascript
import { UserSDK } from "@ziri/sdk";

const sdk = new UserSDK({
	apiKey: "sk-zs-user-123-abc456",
	proxyUrl: "http://localhost:3100",
});

const response = await sdk.chatCompletions({
	provider: "openai",
	model: "gpt-4o-mini",
	messages: [{ role: "user", content: "Hello, ZIRI!" }],
	max_tokens: 100,
});

console.log(response.choices[0].message.content);
```

## Request Flow

1. API key validated
2. Model capability checked
3. Cost estimated
4. Spend reserved
5. Rate limit checked
6. Queue slot acquired
7. Policies evaluated
8. Request forwarded to provider
9. Cost tracked
10. Response returned

## Common Issues

**"Authorization denied"** - Check that you have a policy allowing completions. Default policies deny everything.

**"Rate limit exceeded"** - You've hit your rate limit. Wait for the reset time or increase your limit.

**"Provider not found"** - Add the provider in the admin UI first.

**"Model does not support completion"** - The model you're using doesn't support chat completions. Use an embedding or image model instead.

## Next Steps

-   See [Embeddings](/api-reference/user-endpoints/embeddings) for text embeddings
-   Check [Images](/api-reference/user-endpoints/images) for image generation
-   See [Policy Examples](/guides/policy-examples) for policy examples
