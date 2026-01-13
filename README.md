# ZS AI Gateway

A production-grade LLM Gateway management interface with Cedar-based authorization. This monorepo contains the UI, SDKs, CLI, and authentication plugin for managing API keys, policies, and schema.

## 📦 Packages

- **`packages/ui`** - Nuxt 3 management interface
- **`packages/sdk`** - Management and User SDKs
- **`packages/auth-plugin`** - M2M authentication provider
- **`packages/cli`** - CLI tool for running the UI locally

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.0.0
- Backend API running (default: `http://localhost:4000`)
- M2M credentials (clientId, clientSecret, orgId, projectId)

### Installation

```bash
# Install all dependencies
npm install

# Build all packages
npm run build
```

### Development

```bash
# Run UI in development mode
npm run dev

# Or run from UI package directly
cd packages/ui && npm run dev
```

### Running the CLI

```bash
# Build CLI first
npm run build:cli

# Run UI via CLI
cd packages/cli && node dist/index.js ui
```

## 📚 Usage

### Management SDK (for UI/CLI)

```javascript
import { ManagementSDK } from '@zs-ai/sdk/management'
import { M2MAuthProvider } from '@zs-ai/auth-plugin'

const auth = new M2MAuthProvider({
  backendUrl: 'http://localhost:4000',
  orgId: 'your-org-id',
  projectId: 'your-project-id',
  clientId: 'your-client-id',
  clientSecret: 'your-client-secret'
})

const sdk = new ManagementSDK({
  backendUrl: 'http://localhost:4000',
  projectId: 'your-project-id',
  authProvider: auth
})

// List keys
const keys = await sdk.listKeys()

// Create a key
const { userId, apiKey } = await sdk.createKey({
  userId: 'user-123',
  name: 'John Doe',
  email: 'john@example.com',
  role: 'engineer',
  department: 'Engineering'
})
```

### User SDK (for end-users)

```javascript
import { UserSDK } from '@zs-ai/sdk/user'

// End-users only need their API key - provider keys are on gateway server
const sdk = new UserSDK({
  apiKey: 'sk-zs-user-123-abc...',  // User's API key (from admin)
  authMode: 'local', // or 'live'
  projectId: 'your-project-id',
  backendUrl: 'https://gateway.example.com'  // Gateway server URL
})

// Make an LLM call - SDK routes through gateway
const response = await sdk.chatCompletions({
  provider: 'openai',  // Gateway has the provider API key
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'Hello!' }]
})
```

**Note**: Provider API keys (OpenAI, Anthropic, etc.) are stored on the **gateway server**, not on end-user machines. See [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) for details.

## 🧪 Testing

See [TESTING.md](./TESTING.md) for detailed testing instructions.

Quick test:
```bash
# Test auth plugin
node test-auth.js

# Test management SDK
node test-management.js

# Test user SDK (end-user perspective)
node test-user-sdk.js
```

## 📝 Scripts

```bash
# Build all packages
npm run build

# Build individual packages
npm run build:ui
npm run build:sdk
npm run build:cli
npm run build:auth

# Development
npm run dev          # Run UI dev server
npm run preview      # Preview built UI
```

## 🏗️ Project Structure

```
.
├── packages/
│   ├── ui/          # Nuxt 3 frontend
│   ├── sdk/         # Management & User SDKs
│   ├── auth-plugin/ # M2M authentication
│   └── cli/         # CLI tool
├── test-*.js        # Test files
└── README.md
```

## 📄 License

Private - All rights reserved
