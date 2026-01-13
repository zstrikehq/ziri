# Testing Guide

This guide covers testing all components of the ZS AI Gateway.

## Prerequisites

1. **Backend API Running**
   - Default: `http://localhost:4000`
   - Have M2M credentials ready

2. **Environment Variables** (optional)
   ```bash
   export BACKEND_URL=http://localhost:4000
   export ORG_ID=your-org-id
   export PROJECT_ID=your-project-id
   export CLIENT_ID=your-client-id
   export CLIENT_SECRET=your-client-secret
   ```

3. **Build All Packages**
   ```bash
   npm run build
   ```

## Test Files

### 1. Auth Plugin Test (`test-auth.js`)

Tests M2M authentication:
- Connection to backend
- Token retrieval
- Token caching

```bash
node test-auth.js
```

### 2. Management SDK Test (`test-management.js`)

Tests management operations:
- List keys
- List policies
- Get schema
- (Optional) Create/revoke keys

```bash
node test-management.js
```

### 3. User SDK Test (`test-user-sdk.js`)

Tests end-user SDK functionality:
- API key validation
- Policy fetching (local mode)
- Authorization checks
- LLM provider integration

```bash
node test-user-sdk.js
```

### 4. End-to-End Test (`test-end-to-end.js`)

Simulates complete user journey:
1. Admin creates API key
2. End-user uses key to make LLM call
3. Authorization is checked
4. Request is forwarded to LLM provider

```bash
node test-end-to-end.js
```

### 5. CLI Test (`test-cli.js`)

Tests CLI configuration management:
- Get/save config
- Config persistence

```bash
node test-cli.js
```

## End-User Testing Simulation

The `test-user-sdk.js` and `test-end-to-end.js` files simulate how an end-user would use the SDK:

1. **Installation**: User installs `@zs-ai/sdk` package
2. **Configuration**: User provides their API key and config
3. **Usage**: User makes LLM calls through the SDK
4. **Authorization**: SDK handles authorization automatically

See the test files for complete examples.

## Troubleshooting

### Build Errors
- Ensure all packages are built: `npm run build`
- Check TypeScript compilation: `cd packages/<package> && npm run build`

### Module Not Found
- Verify `.js` extensions in imports (ES modules requirement)
- Check that `dist/` folders exist after building

### Authentication Errors
- Verify backend URL is correct
- Check M2M credentials
- Ensure backend is running

### Authorization Errors
- Check API key format: `sk-zs-{userId}-{hash}`
- Verify policies exist in backend
- Check schema version matches
