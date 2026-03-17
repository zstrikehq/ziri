---
title: Embeddings
weight: 20
---

Generate text embeddings through ZIRI.

## Endpoint

```
POST /api/embeddings
```

## Authentication

Include your API key in the `X-API-Key` header.

## Request Body

```typescript
{
  provider: string                    // Required: "openai", etc.
  model: string                       // Required: "text-embedding-3-small", etc.
  input: string | string[] | number[][] // Required: Text to embed
  encoding_format?: string            // Optional: "float" or "base64"
  dimensions?: number                 // Optional: Embedding dimensions
  // ... other provider-specific parameters
}
```

The `input` field can be:

-   A single string
-   An array of strings
-   An array of number arrays (for base64 encoded embeddings)

## Example Request

```bash
curl -X POST http://localhost:3100/api/embeddings \
  -H "Content-Type: application/json" \
  -H "X-API-Key: <your_ziri_api_key>" \
  -d '{
    "provider": "openai",
    "model": "text-embedding-3-small",
    "input": "Hello, ZIRI!"
  }'
```

Multiple texts:

```bash
curl -X POST http://localhost:3100/api/embeddings \
  -H "Content-Type: application/json" \
  -H "X-API-Key: <your_ziri_api_key>" \
  -d '{
    "provider": "openai",
    "model": "text-embedding-3-small",
    "input": ["Hello", "World"]
  }'
```

## Success Response

```json
{
  "object": "list",
  "data": [
    {
      "object": "embedding",
      "index": 0,
      "embedding": [0.1, 0.2, 0.3, ...]
    }
  ],
  "model": "text-embedding-3-small",
  "usage": {
    "prompt_tokens": 2,
    "total_tokens": 2
  }
}
```

Response format matches the provider's format.

## Cost Calculation

Embeddings only charge for input tokens. There's no output cost.

Cost = input tokens × input cost per token

## Error Responses

Same error codes as [Chat Completions](/api-reference/user-endpoints/chat-completions), plus:

### Model Does Not Support Embeddings

```json
{
	"error": "Model gpt-4o does not support embedding action. Use text-embedding-3-small instead.",
	"code": "ACTION_NOT_SUPPORTED",
	"requestId": "req-123"
}
```

Status: 400

The model you're using doesn't support embeddings. Use an embedding model instead.

## Using the SDK

```javascript
import { UserSDK } from "@ziri/sdk";

const sdk = new UserSDK({
	apiKey: "<your_ziri_api_key>",
	proxyUrl: "http://localhost:3100",
});

const response = await sdk.embeddings({
	provider: "openai",
	model: "text-embedding-3-small",
	input: "Hello, ZIRI!",
});

console.log(response.data[0].embedding);
```

## Supported Models

Common embedding models:

-   OpenAI: `text-embedding-3-small`, `text-embedding-3-large`, `text-embedding-ada-002`
-   Check your provider's documentation for other models

## Next Steps

-   See [Chat Completions](/api-reference/user-endpoints/chat-completions) for chat
-   Check [Images](/api-reference/user-endpoints/images) for image generation
