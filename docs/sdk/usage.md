# SDK Usage

Learn how to use the ZIRI SDK in your applications.

## Initialization

Create a new SDK instance:

```javascript
import { UserSDK } from '@ziri/sdk'

const sdk = new UserSDK({
  apiKey: 'sk-zs-user-123-abc456',
  proxyUrl: 'http://localhost:3100'  // Optional if ZIRI_PROXY_URL is set
})
```

### Configuration Options

- `apiKey` (required) - Your ZIRI API key (format: `sk-zs-{userId}-{hash}`)
- `proxyUrl` (optional) - ZIRI server URL (defaults to `ZIRI_PROXY_URL` env var or `http://localhost:3100`)

## Making Requests

### Chat Completions

```javascript
const response = await sdk.chatCompletions({
  provider: 'openai',
  model: 'gpt-4o-mini',
  messages: [
    { role: 'user', content: 'Hello!' }
  ],
  max_tokens: 100
})

console.log(response.choices[0].message.content)
```

### Embeddings

```javascript
const response = await sdk.embeddings({
  provider: 'openai',
  model: 'text-embedding-3-small',
  input: 'Hello, ZIRI!'
})

console.log(response.data[0].embedding)
```

### Images

```javascript
const response = await sdk.images({
  provider: 'openai',
  model: 'dall-e-3',
  prompt: 'A white cat sitting on a windowsill',
  size: '1024x1024',
  quality: 'standard'
})

console.log(response.data[0].url)
```

## Error Handling

The SDK throws errors for failed requests:

```javascript
try {
  const response = await sdk.chatCompletions({
    provider: 'openai',
    model: 'gpt-4',
    messages: [{ role: 'user', content: 'Hello' }]
  })
} catch (error) {
  if (error.message.includes('Authorization denied')) {
    console.error('Request was denied by policy')
  } else if (error.message.includes('Rate limit exceeded')) {
    console.error('Rate limit hit, wait before retrying')
  } else {
    console.error('Request failed:', error.message)
  }
}
```

## Getting User ID

Get the user ID from the API key:

```javascript
const userId = sdk.getUserId()
console.log(userId) // "user-123"
```

## TypeScript Usage

The SDK is written in TypeScript with full type definitions:

```typescript
import { UserSDK, UserSDKConfig } from '@ziri/sdk'

const config: UserSDKConfig = {
  apiKey: 'sk-zs-user-123-abc456',
  proxyUrl: 'http://localhost:3100'
}

const sdk = new UserSDK(config)

const response = await sdk.chatCompletions({
  provider: 'openai',
  model: 'gpt-4o-mini',
  messages: [
    { role: 'user', content: 'Hello!' }
  ]
})
```

## Best Practices

1. **Reuse SDK instance** - Create one instance and reuse it
2. **Handle errors** - Always wrap requests in try-catch
3. **Set proxy URL** - Use environment variable for flexibility
4. **Validate API key** - SDK validates format on construction

## Next Steps

- [API Reference](/sdk/api-reference) - Complete method documentation
- [Integration Examples](/examples/integration-examples) - Real-world examples
