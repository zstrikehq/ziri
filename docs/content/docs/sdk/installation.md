---
title: SDK Installation
weight: 10
---

Install and set up the `@ziri/sdk` package.

## Install

```bash
npm install @ziri/sdk
```

Or with yarn:

```bash
yarn add @ziri/sdk
```

Or with pnpm:

```bash
pnpm add @ziri/sdk
```

## Version Requirements

-   Node.js 18.0.0 or higher
-   Works in browsers (ES modules)
-   Works in Node.js (CommonJS or ES modules)

## TypeScript Support

The SDK includes TypeScript definitions. No additional `@types` package needed.

## Import

### ES Modules

```javascript
import { UserSDK } from "@ziri/sdk";
```

### CommonJS

```javascript
const { UserSDK } = require("@ziri/sdk");
```

## Environment Variables

Set `ZIRI_PROXY_URL` to avoid passing `proxyUrl` in the constructor:

```bash
export ZIRI_PROXY_URL=http://localhost:3100
```

Or in `.env`:

```bash {filename=".env"}
ZIRI_PROXY_URL=http://localhost:3100
```

## Verify Installation

```javascript
import { UserSDK } from "@ziri/sdk";

console.log("SDK loaded successfully");
```

## Next Steps

-   [Usage Guide](/docs/sdk/usage) - Learn how to use the SDK
-   [API Reference](/docs/sdk/api-reference) - Complete method docs
