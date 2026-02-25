---
title: Images
weight: 30
---

Generate images using DALL-E or other image models through ZIRI.

## Endpoint

```
POST /api/images/generations
```

## Authentication

Include your API key in the `X-API-Key` header.

## Request Body

```typescript
{
  provider: string           // Required: "openai", etc.
  model: string              // Required: "dall-e-3", "dall-e-2", etc.
  prompt: string            // Required: Image description
  n?: number                // Optional: Number of images (default: 1)
  size?: string             // Optional: Image size
  quality?: string          // Optional: "standard" or "hd" (DALL-E 3)
  response_format?: string  // Optional: "url" or "b64_json"
  // ... other provider-specific parameters
}
```

### Image Sizes

DALL-E 3:

-   `1024x1024` (default)
-   `1024x1792`
-   `1792x1024`

DALL-E 2:

-   `256x256`
-   `512x512`
-   `1024x1024`

### Quality (DALL-E 3 only)

-   `standard` (default) - Faster, lower cost
-   `hd` - Higher quality, higher cost

## Example Request

```bash
curl -X POST http://localhost:3100/api/images/generations \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sk-zs-user-123-abc456" \
  -d '{
    "provider": "openai",
    "model": "dall-e-3",
    "prompt": "A white cat sitting on a windowsill",
    "size": "1024x1024",
    "quality": "standard",
    "n": 1
  }'
```

## Success Response

```json
{
	"created": 1704067200,
	"data": [
		{
			"url": "https://oaidalleapiprodscus.blob.core.windows.net/...",
			"revised_prompt": "A white cat sitting on a windowsill, natural lighting"
		}
	]
}
```

Or with `response_format: "b64_json"`:

```json
{
	"created": 1704067200,
	"data": [
		{
			"b64_json": "iVBORw0KGgoAAAANSUhEUgAA..."
		}
	]
}
```

## Cost Calculation

Images charge per image, not per token.

Cost = number of images × price per image

Price depends on:

-   Model (dall-e-3 vs dall-e-2)
-   Quality (standard vs hd for DALL-E 3)
-   Size (1024x1024 vs 1792x1024, etc.)

## Error Responses

Same error codes as [Chat Completions](/api-reference/user-endpoints/chat-completions), plus:

### Image Config Not Found

```json
{
	"error": "Image pricing not configured for model 'dall-e-3' (standard, 1024x1024)",
	"code": "IMAGE_CONFIG_NOT_FOUND",
	"requestId": "req-123"
}
```

Status: 400

The image pricing for this model/quality/size combination isn't configured.

### Image Request Too Large

```json
{
	"error": "Requested number of images (5) exceeds maximum allowed (1)",
	"code": "IMAGE_REQUEST_TOO_LARGE",
	"requestId": "req-123"
}
```

Status: 400

The model has a maximum number of images per request (usually 1 for DALL-E 3).

### Model Does Not Support Image Generation

```json
{
	"error": "Model gpt-4o does not support image_generation action. Use dall-e-3 instead.",
	"code": "ACTION_NOT_SUPPORTED",
	"requestId": "req-123"
}
```

Status: 400

The model you're using doesn't support image generation.

## Using the SDK

```javascript
import { UserSDK } from "@ziri/sdk";

const sdk = new UserSDK({
	apiKey: "sk-zs-user-123-abc456",
	proxyUrl: "http://localhost:3100",
});

const response = await sdk.images({
	provider: "openai",
	model: "dall-e-3",
	prompt: "A white cat sitting on a windowsill",
	size: "1024x1024",
	quality: "standard",
	n: 1,
});

console.log(response.data[0].url);
```

## Supported Models

Common image models:

-   OpenAI: `dall-e-3`, `dall-e-2`
-   Check your provider's documentation for other models

## Best Practices

1. **Use appropriate sizes** - Larger images cost more
2. **Choose quality wisely** - HD costs more than standard
3. **Limit number of images** - Most models only allow 1 image per request
4. **Set spend limits** - Image generation can be expensive

## Next Steps

-   See [Chat Completions](/api-reference/user-endpoints/chat-completions) for chat
-   Check [Embeddings](/api-reference/user-endpoints/embeddings) for text embeddings
