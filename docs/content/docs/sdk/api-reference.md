---
title: SDK API Reference
weight: 30
---

Complete reference for all SDK methods.

## UserSDK Class

### Constructor

```typescript
new UserSDK(config: UserSDKConfig)
```

**Parameters**:

-   `config.apiKey` (string, required) - ZIRI API key (format: `ziri_<uuidv4withoutdashes>`)
-   `config.proxyUrl` (string | URL, optional) - ZIRI server URL (defaults to `ZIRI_PROXY_URL` env var or `http://localhost:3100`)
-   `config.timeoutMs` (number, optional) - Request timeout in milliseconds (default: `30000`)
-   `config.fetch` (function, optional) - Custom fetch implementation (defaults to global `fetch`)

**Throws**: Error if API key format is invalid

### Methods

#### `chatCompletions`

Make a chat completion request.

```typescript
chatCompletions(params: {
  provider: string
  model: string
  messages: Array<{ role: string; content: string }>
  ipAddress?: string
  context?: Record<string, any>
  [key: string]: any
}): Promise<any>
```

**Parameters**:

-   `provider` (string, required) - Provider name (e.g., "openai")
-   `model` (string, required) - Model name (e.g., "gpt-4o-mini")
-   `messages` (array, required) - Conversation messages
-   `ipAddress` (string, optional) - Client IP address
-   `context` (object, optional) - Additional context
-   Other parameters passed through to provider

#### `embeddings`

Generate text embeddings.

```typescript
embeddings(params: {
  provider: string
  model: string
  input: string | string[] | Array<string | number[]>
  [key: string]: any
}): Promise<any>
```

**Parameters**:

-   `provider` (string, required)
-   `model` (string, required)
-   `input` (string | string[] | number[][], required)
-   Other parameters passed through to provider

#### `images`

Generate images.

```typescript
images(params: {
  provider: string
  model: string
  prompt: string
  n?: number
  size?: string
  quality?: string
  response_format?: 'url' | 'b64_json'
  [key: string]: any
}): Promise<any>
```

**Parameters**:

-   `provider` (string, required)
-   `model` (string, required)
-   `prompt` (string, required)
-   `n`, `size`, `quality`, `response_format` optional

## Error Handling

All methods throw errors on failure:

```javascript
try {
  const response = await sdk.chatCompletions({ ... })
} catch (error) {
  // error.message contains the error message
}
```

Common error messages:

-   `Request failed: 403 Authorization denied` - Policy denied the request
-   `Request failed: 429 Rate limit exceeded` - Rate limit hit
-   `Request failed: 400 Invalid API key format` - API key invalid

## Type Definitions

```typescript
interface UserSDKConfig {
	apiKey: string;
	proxyUrl?: string | URL;
	timeoutMs?: number;
	fetch?: typeof fetch;
}
```

## Next Steps

-   [Usage Guide](/docs/sdk/usage)
-   [Integration Examples](/docs/examples/integration-examples)
