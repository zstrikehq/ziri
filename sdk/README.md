# @ziri/sdk

## Installation

```bash
npm install @ziri/sdk
```

## Quick Start

```typescript
import { UserSDK } from '@ziri/sdk'

const sdk = new UserSDK({
  apiKey: '<your_ziri_api_key>',
  proxyUrl: 'http://localhost:3100'
})

const response = await sdk.chatCompletions({
  provider: 'openai',
  model: 'gpt-4o-mini',
  messages: [
    { role: 'user', content: 'Hello, ZIRI!' }
  ]
})

console.log(response.choices[0].message.content)
```

## Configuration

### Basic Setup

```typescript
const sdk = new UserSDK({
  apiKey: '<your_ziri_api_key>',
  proxyUrl: 'http://localhost:3100'
})
```

### Environment Variables

You can set the proxy URL via environment variable:

```bash
export ZIRI_PROXY_URL=http://your-proxy-server.com:3100
```

If not provided, it defaults to `http://localhost:3100`.

## API Reference

### `chatCompletions(options)`

Make a chat completion request through the gateway.

```typescript
const response = await sdk.chatCompletions({
  provider: 'openai' | 'anthropic',
  model: string,
  messages: Array<{
    role: 'user' | 'assistant' | 'system',
    content: string
  }>,
  temperature?: number,
  maxTokens?: number,

})
```

Returns a Promise with the provider response JSON. Errors are thrown as standard `Error` objects.

### `embeddings(options)`

Generate embeddings.

```typescript
const response = await sdk.embeddings({
  provider: 'openai',
  model: 'text-embedding-3-small',
  input: 'Your text here'
})
```

### `images(options)`

Generate images (OpenAI DALL-E compatible).

```typescript
const response = await sdk.images({
  provider: 'openai',
  model: 'dall-e-3',
  prompt: 'A cat wearing a hat',
  size?: '1024x1024' | '1792x1024' | '1024x1792',
  quality?: 'standard' | 'hd',
  n?: number
})
```

## Examples

### Basic Chat Completion

```typescript
import { UserSDK } from '@ziri/sdk'

const sdk = new UserSDK({
  apiKey: process.env.ZIRI_API_KEY!,
  proxyUrl: process.env.ZIRI_PROXY_URL
})

async function askQuestion(question: string) {
  const response = await sdk.chatCompletions({
    provider: 'openai',
    model: 'gpt-4o-mini',
    messages: [
      { role: 'user', content: question }
    ]
  })
  
  return response.choices[0].message.content
}

const answer = await askQuestion('What is ZIRI?')
console.log(answer)
```

### Error Handling

```typescript
try {
  const response = await sdk.chatCompletions({
    provider: 'openai',
    model: 'gpt-4',
    messages: [{ role: 'user', content: 'Hello!' }]
  })
} catch (error: any) {
  console.error('Request failed:', error.message)
}
```

## How It Works

The SDK is a thin wrapper around HTTP requests to the ZIRI proxy server. It:

1. Sends requests to the proxy's API endpoints (`/api/chat/completions`, etc.)
2. Includes your API key in the `X-API-Key` header
3. Returns the provider response JSON

All authorization, rate limiting, and cost tracking happens on the proxy server. The SDK just makes it easier to call the proxy from your code.

## TypeScript Support

The SDK is written in TypeScript and includes full type definitions. All methods and options are typed, so you'll get autocomplete and type checking in your IDE.

## Security

- API keys are sent via the `X-API-Key` header
- All requests are validated through Cedar authorization policies on the proxy
- Rate limiting and cost tracking are handled server-side
- Never commit API keys to version control - use environment variables

## Development

```bash
# Build
npm run build

# Watch mode (for development)
npm run dev
```