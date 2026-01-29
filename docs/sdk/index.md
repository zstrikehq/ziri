# SDK Overview

The `@ziri/sdk` package is a zero-dependency client library for making authorized LLM requests through ZIRI.

## What is the SDK?

Instead of making HTTP requests directly, use the SDK to interact with ZIRI. It handles:
- API key validation
- Request formatting
- Error handling
- Response parsing

## Why Zero Dependencies?

The SDK has no dependencies, which means:
- Small bundle size
- Fast installation
- No version conflicts
- Works in any JavaScript environment

## Installation

```bash
npm install @ziri/sdk
```

## Quick Example

```javascript
import { UserSDK } from '@ziri/sdk'

const sdk = new UserSDK({
  apiKey: 'sk-zs-user-123-abc456',
  proxyUrl: 'http://localhost:3100'
})

const response = await sdk.chatCompletions({
  provider: 'openai',
  model: 'gpt-4o-mini',
  messages: [
    { role: 'user', content: 'Hello!' }
  ]
})

console.log(response.choices[0].message.content)
```

## Features

- **TypeScript support** - Full type definitions included
- **Simple API** - Three main methods: `chatCompletions()`, `embeddings()`, `images()`
- **Error handling** - Throws errors with clear messages
- **Automatic proxy URL** - Uses `ZIRI_PROXY_URL` env var if not specified

## Next Steps

- [Installation](/sdk/installation) - Install and set up the SDK
- [Usage](/sdk/usage) - Learn how to use the SDK
- [API Reference](/sdk/api-reference) - Complete method documentation
