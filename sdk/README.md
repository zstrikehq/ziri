# @ziri/sdk

**ZIRI User SDK** - Lightweight client library for end users to make authorized LLM calls through the gateway.

## ✨ Features

- **Zero Dependencies** - No external dependencies, minimal bundle size
- **TypeScript Support** - Full TypeScript types included
- **Simple API** - Easy-to-use interface for making LLM requests
- **Environment Variable Support** - Configure via `ZIRI_PROXY_URL` env var

## 📦 Installation

```bash
npm install @ziri/sdk
```

## 🚀 Quick Start

```javascript
import { UserSDK } from '@ziri/sdk'

const sdk = new UserSDK({
  apiKey: 'sk-zs-your-api-key-here',
  proxyUrl: 'http://localhost:3100' // Optional, defaults to process.env.ZIRI_PROXY_URL || 'http://localhost:3100'
})

const response = await sdk.chatCompletions({
  provider: 'openai',
  model: 'gpt-4',
  messages: [
    { role: 'user', content: 'Hello!' }
  ]
})

console.log(response.choices[0].message.content)
```

## 📖 Configuration

### UserSDKConfig

```typescript
interface UserSDKConfig {
  apiKey: string
  proxyUrl?: string
}
```

### Environment Variables

You can configure the proxy URL via environment variable:

```bash
export ZS_AI_PROXY_URL=http://your-proxy-server.com:3100
```

If not provided, defaults to `http://localhost:3100`.

## 📚 API Reference

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
  // ... other provider-specific options
})
```

**Returns:** Promise with the LLM provider's response format.

## 🔒 Security

- API keys are sent via `X-API-Key` header
- All requests are validated through Cedar authorization policies
- Rate limiting and cost tracking are handled server-side

## 📝 Examples

### Basic Usage

```javascript
import { UserSDK } from '@ziri/sdk'

const sdk = new UserSDK({
  apiKey: process.env.ZS_AI_API_KEY,
  proxyUrl: process.env.ZS_AI_PROXY_URL
})

async function askQuestion(question) {
  const response = await sdk.chatCompletions({
    provider: 'openai',
    model: 'gpt-4',
    messages: [
      { role: 'user', content: question }
    ]
  })
  
  return response.choices[0].message.content
}
```

### Error Handling

```javascript
try {
  const response = await sdk.chatCompletions({
    provider: 'openai',
    model: 'gpt-4',
    messages: [{ role: 'user', content: 'Hello!' }]
  })
} catch (error) {
  if (error.status === 401) {
    console.error('Invalid API key')
  } else if (error.status === 403) {
    console.error('Request not authorized by policy')
  } else if (error.status === 429) {
    console.error('Rate limit exceeded')
  } else {
    console.error('Request failed:', error.message)
  }
}
```

## 🛠️ Development

```bash
# Build
npm run build

# Watch mode
npm run dev
```

## 📄 License

MIT
