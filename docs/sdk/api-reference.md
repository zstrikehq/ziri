# SDK API Reference

Complete reference for all SDK methods.

## UserSDK Class

### Constructor

```typescript
new UserSDK(config: UserSDKConfig)
```

**Parameters**:
- `config.apiKey` (string, required) - ZIRI API key
- `config.proxyUrl` (string, optional) - ZIRI server URL

**Throws**: Error if API key format is invalid

### Methods

## chatCompletions

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
- `provider` (string, required) - Provider name (e.g., "openai")
- `model` (string, required) - Model name (e.g., "gpt-4o-mini")
- `messages` (array, required) - Conversation messages
- `ipAddress` (string, optional) - Client IP address
- `context` (object, optional) - Additional context
- Other parameters passed through to provider

**Returns**: Promise resolving to provider response

**Throws**: Error if request fails

**Example**:
```javascript
const response = await sdk.chatCompletions({
  provider: 'openai',
  model: 'gpt-4o-mini',
  messages: [
    { role: 'user', content: 'Hello!' }
  ],
  max_tokens: 100
})
```

## embeddings

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
- `provider` (string, required) - Provider name
- `model` (string, required) - Embedding model name
- `input` (string | string[] | number[][], required) - Text(s) to embed
- Other parameters passed through to provider

**Returns**: Promise resolving to embeddings response

**Throws**: Error if request fails

**Example**:
```javascript
const response = await sdk.embeddings({
  provider: 'openai',
  model: 'text-embedding-3-small',
  input: 'Hello, ZIRI!'
})
```

## images

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
- `provider` (string, required) - Provider name
- `model` (string, required) - Image model name (e.g., "dall-e-3")
- `prompt` (string, required) - Image description
- `n` (number, optional) - Number of images (default: 1)
- `size` (string, optional) - Image size (e.g., "1024x1024")
- `quality` (string, optional) - Quality: "standard" or "hd"
- `response_format` (string, optional) - "url" or "b64_json"
- Other parameters passed through to provider

**Returns**: Promise resolving to images response

**Throws**: Error if request fails

**Example**:
```javascript
const response = await sdk.images({
  provider: 'openai',
  model: 'dall-e-3',
  prompt: 'A white cat',
  size: '1024x1024',
  quality: 'standard'
})
```

## getUserId

Get the user ID extracted from the API key.

```typescript
getUserId(): string
```

**Returns**: User ID string

**Example**:
```javascript
const userId = sdk.getUserId()
console.log(userId) // "user-123"
```

## Error Handling

All methods throw errors on failure:

```javascript
try {
  const response = await sdk.chatCompletions({ ... })
} catch (error) {
  // error.message contains the error message
  // Check error.message for specific error codes
}
```

Common error messages:
- `"Request failed: 403 Authorization denied"` - Policy denied the request
- `"Request failed: 429 Rate limit exceeded"` - Rate limit hit
- `"Request failed: 400 Invalid API key format"` - API key invalid

## Type Definitions

```typescript
interface UserSDKConfig {
  apiKey: string
  proxyUrl?: string
}
```

## Next Steps

- [Usage Guide](/sdk/usage) - Learn how to use the SDK
- [Integration Examples](/examples/integration-examples) - Real-world examples
