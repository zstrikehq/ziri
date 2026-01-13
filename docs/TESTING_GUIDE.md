# Testing Guide - SDK + Proxy Architecture

## Prerequisites

1. **Build all packages:**
   ```bash
   npm run build
   ```

2. **Ensure dependencies are installed:**
   ```bash
   npm install
   ```

## Testing Steps

### 1. Test Proxy Server Startup

**Goal**: Verify the proxy server starts correctly and initializes the database.

```bash
# Build proxy package
npm run build:proxy

# Start proxy server
zs-ai start
# or
zs-ai ui  # (backward compatibility alias)
```

**Expected Results:**
- ✅ Master key is generated and displayed (on first run)
- ✅ Database is initialized at `~/.zs-ai/proxy.db` (or `%APPDATA%\zs-ai\proxy.db` on Windows)
- ✅ Server starts on a port (default: 3100, or next available port)
- ✅ Console shows:
  - `[DB] Database initialized at: <path>`
  - `[PROXY] Configuration loaded`
  - `🚀 PROXY SERVER STARTED`
  - `Server URL: http://localhost:<port>`

**Check:**
- Master key is saved to `~/.zs-ai/master-key.txt`
- Database file exists
- Server is accessible at `http://localhost:<port>/health`

---

### 2. Test UI Access

**Goal**: Verify the UI is served correctly by the proxy server.

1. Open browser: `http://localhost:<port>`
2. Navigate to different pages:
   - Dashboard (`/`)
   - Config (`/config`)
   - Users (`/users`)
   - API Keys (`/keys`)
   - Providers (`/providers`)
   - Schema (`/schema`)
   - Rules (`/rules`)
   - Analytics (`/analytics`)
   - Logs (`/logs`)

**Expected Results:**
- ✅ UI loads without errors
- ✅ All pages are accessible
- ✅ Sidebar navigation works
- ✅ No console errors in browser DevTools

---

### 3. Test Configuration

**Goal**: Verify configuration can be saved and loaded.

1. Navigate to `/config` page
2. Fill in required fields:
   - Project ID
   - Organization ID
   - Client ID
   - Client Secret
   - PDP URL
3. Click "Save Configuration"
4. Click "Test Connection"

**Expected Results:**
- ✅ Configuration saves successfully
- ✅ Connection test passes (if backend is accessible)
- ✅ Master key is displayed (if available)
- ✅ Backend URL shows as fixed: `https://api-dev.authzebra.com`

**Check:**
- Config file exists at `~/.zs-ai/config.json`
- Config values are persisted

---

### 4. Test User Management

**Goal**: Verify user creation and management via UI.

1. Navigate to `/users` page
2. Click "Create User"
3. Fill in:
   - Email
   - Name
   - Role (optional)
   - Department (optional)
4. Submit form

**Expected Results:**
- ✅ User is created successfully
- ✅ Generated password is displayed (save it!)
- ✅ User appears in the users list
- ✅ User ID is generated (format: `user-<hash>`)

**Test Additional Operations:**
- Reset password for a user
- Delete a user
- Search/filter users

**API Testing (using curl or Postman):**
```bash
# List users (requires master key)
curl -X GET http://localhost:3100/api/users \
  -H "X-Master-Key: <your-master-key>"

# Create user
curl -X POST http://localhost:3100/api/users \
  -H "Content-Type: application/json" \
  -H "X-Master-Key: <your-master-key>" \
  -d '{"email": "test@example.com", "name": "Test User"}'
```

---

### 5. Test API Key Creation

**Goal**: Verify API key creation with user selection.

1. Navigate to `/keys` page
2. Click "Create Key"
3. Select a user from dropdown
4. Set spend limits (optional)
5. Submit form

**Expected Results:**
- ✅ API key is generated (format: `sk-zs-<userId>-<hash>`)
- ✅ Entity is created in Backend API
- ✅ Key appears in keys list
- ✅ Key is associated with selected user

**Check:**
- Key exists in Proxy database (`api_keys` table)
- Entity exists in Backend API (check via Management SDK or Backend API directly)

**API Testing:**
```bash
# Create key (requires master key)
curl -X POST http://localhost:3100/api/keys \
  -H "Content-Type: application/json" \
  -H "X-Master-Key: <your-master-key>" \
  -d '{"userId": "user-abc123", "dailySpendLimit": 50, "monthlySpendLimit": 500}'
```

---

### 6. Test Provider Management

**Goal**: Verify LLM provider API key management.

1. Navigate to `/providers` page
2. Click "Add Provider"
3. Enter:
   - Provider name (e.g., `openai`, `anthropic`)
   - API key
   - Master key (for encryption)
4. Submit form

**Expected Results:**
- ✅ Provider is added successfully
- ✅ API key is encrypted and stored
- ✅ Provider appears in providers list
- ✅ Test connection works (if provider API key is valid)

**Test Additional Operations:**
- Test provider connection
- Remove provider

**API Testing:**
```bash
# Add provider
curl -X POST http://localhost:3100/api/providers \
  -H "Content-Type: application/json" \
  -H "X-Master-Key: <your-master-key>" \
  -d '{"name": "openai", "apiKey": "sk-..."}'

# Test provider
curl -X POST http://localhost:3100/api/providers/openai/test \
  -H "X-Master-Key: <your-master-key>"
```

---

### 7. Test Authentication Flow

**Goal**: Verify JWT authentication works correctly.

**Step 1: Login**
```bash
curl -X POST http://localhost:3100/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-abc123",
    "password": "<generated-password>"
  }'
```

**Expected Response:**
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "expiresIn": 3600,
  "tokenType": "Bearer"
}
```

**Step 2: Use Access Token**
```bash
# Test protected endpoint (should work)
curl -X GET http://localhost:3100/api/users \
  -H "Authorization: Bearer <access-token>" \
  -H "X-Master-Key: <master-key>"
```

**Step 3: Test Token Refresh**
```bash
curl -X POST http://localhost:3100/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "<refresh-token>"}'
```

**Expected Results:**
- ✅ Login returns access and refresh tokens
- ✅ Access token works for protected endpoints
- ✅ Token refresh returns new access token
- ✅ Expired tokens are rejected with proper error

---

### 8. Test Chat Completions Endpoint

**Goal**: Verify the complete flow from SDK to LLM provider.

**Prerequisites:**
- User created
- API key created for user
- Provider added (e.g., OpenAI)
- User has logged in and has access token

**Test Request:**
```bash
curl -X POST http://localhost:3100/api/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access-token>" \
  -H "X-API-Key: <api-key>" \
  -d '{
    "provider": "openai",
    "model": "gpt-4",
    "messages": [
      {"role": "user", "content": "Hello, world!"}
    ]
  }'
```

**Expected Results:**
- ✅ Request is authorized (JWT + API key validated)
- ✅ PDP authorization check passes
- ✅ LLM provider is called
- ✅ Response is returned in normalized format

**Test Error Cases:**
- Missing JWT token → 401 error
- Missing API key → 400 error
- Invalid API key → 401 error
- User ID mismatch → 401 error
- Authorization denied → 403 error
- Provider not found → 404 error

---

### 9. Test SDK Usage

**Goal**: Verify end-user SDK works correctly.

#### Option A: Using Installed Package (Production)

**Prerequisites:**
- Package is published and installed via npm: `npm install @zs-ai/sdk`

**Create test file: `test-sdk.js`**
```javascript
import { UserSDK } from '@zs-ai/sdk'

const sdk = new UserSDK({
  apiKey: 'sk-zs-user-abc123-hash',
  proxyUrl: 'http://localhost:3100',
  userId: 'user-abc123',
  password: 'generated-password'
})

// SDK will auto-login on first request
const response = await sdk.chatCompletions({
  provider: 'openai',
  model: 'gpt-4',
  messages: [
    { role: 'user', content: 'Hello!' }
  ]
})

console.log(response)
```

**Run test:**
```bash
node test-sdk.js
```

#### Option B: Using Locally Built Package (Development)

**Prerequisites:**
- SDK package is built locally: `npm run build` (or `cd packages/sdk && npm run build`)
- You're testing from the project root directory

**Step 1: Build the SDK**
```bash
# From project root
npm run build

# Or build just the SDK package
cd packages/sdk
npm run build
cd ../..
```

**Step 2: Create test file: `test-sdk-local.js`**
```javascript
// Test User SDK - Using locally built package
// Import from local dist folder instead of npm package

import { UserSDK } from './packages/sdk/dist/user.js'

// Configuration - replace with your actual values
const config = {
  apiKey: process.env.API_KEY || 'sk-zs-user-abc123-hash',  // Your API key
  proxyUrl: process.env.PROXY_URL || 'http://localhost:3100',  // Proxy server URL
  userId: process.env.USER_ID || 'user-abc123',  // User ID (optional, can be extracted from API key)
  password: process.env.USER_PASSWORD || 'generated-password'  // User password for login
}

async function testSDK() {
  try {
    console.log('🧪 Testing User SDK (Local Build)\n')
    console.log('=' .repeat(60))
    
    // Step 1: Initialize SDK
    console.log('1️⃣  Initializing User SDK...')
    const sdk = new UserSDK(config)
    console.log('   ✅ SDK initialized')
    console.log(`   Proxy URL: ${config.proxyUrl}`)
    console.log(`   API Key: ${config.apiKey.substring(0, 20)}...\n`)
    
    // Step 2: Make chat completion request
    // SDK will automatically:
    // - Login if password provided (or use existing tokens)
    // - Include JWT token and API key in request
    // - Handle token refresh if needed
    console.log('2️⃣  Making chat completion request...')
    console.log('   Provider: openai')
    console.log('   Model: gpt-4\n')
    
    const response = await sdk.chatCompletions({
      provider: 'openai',
      model: 'gpt-4',
      messages: [
        { role: 'user', content: 'Hello, how are you?' }
      ],
      temperature: 0.7,
      max_tokens: 100
    })
    
    console.log('   ✅ Request successful!')
    console.log('   Response:', JSON.stringify(response, null, 2).substring(0, 200) + '...\n')
    
    // Step 3: Test another request (should use cached token)
    console.log('3️⃣  Making second request (should use cached token)...')
    const response2 = await sdk.chatCompletions({
      provider: 'openai',
      model: 'gpt-4',
      messages: [
        { role: 'user', content: 'What is 2+2?' }
      ]
    })
    
    console.log('   ✅ Second request successful (token reused)\n')
    
    // Cleanup
    console.log('4️⃣  Cleaning up...')
    sdk.destroy()
    console.log('   ✅ SDK destroyed\n')
    
    console.log('=' .repeat(60))
    console.log('✅ SDK test completed successfully!')
    console.log('=' .repeat(60))
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message)
    if (error.response) {
      console.error('   Status:', error.response.status)
      console.error('   Response:', await error.response.text())
    }
    console.error(error.stack)
    process.exit(1)
  }
}

testSDK()
```

**Step 3: Run the test**
```bash
# From project root
node test-sdk-local.js

# Or with environment variables
API_KEY=sk-zs-user-abc123-hash \
PROXY_URL=http://localhost:3100 \
USER_ID=user-abc123 \
USER_PASSWORD=your-password \
node test-sdk-local.js
```

**Alternative: Use the existing test script**
```bash
# The project already includes test-user-sdk.js which uses local imports
# Just update the environment variables or edit the file with your values
node test-user-sdk.js
```

**Expected Results:**
- ✅ SDK initializes correctly
- ✅ Auto-login works (if password provided)
- ✅ Chat completion request succeeds
- ✅ Token refresh works automatically
- ✅ Error handling works (clear error messages)
- ✅ Second request reuses cached token

**Troubleshooting:**
- **"Cannot find module './packages/sdk/dist/user.js'"**: Make sure you've built the SDK (`npm run build`)
- **"401 Unauthorized"**: Check that your API key and user credentials are correct
- **"Connection refused"**: Ensure the proxy server is running on the specified port
- **"Authorization denied"**: Check that the user has proper permissions in the PDP

---

### 10. Test Error Scenarios

**Goal**: Verify error handling works correctly.

**Test Cases:**

1. **Invalid Master Key:**
   ```bash
   curl -X GET http://localhost:3100/api/users \
     -H "X-Master-Key: invalid-key"
   ```
   Expected: 401 error with message

2. **Missing JWT Token:**
   ```bash
   curl -X POST http://localhost:3100/api/chat/completions \
     -H "X-API-Key: <api-key>"
   ```
   Expected: 401 error

3. **Expired Token:**
   - Wait for token to expire (or manually expire it)
   - Make request with expired token
   Expected: 401 error with "TOKEN_EXPIRED" code

4. **User ID Mismatch:**
   - Use JWT token from user A
   - Use API key from user B
   Expected: 401 error with "USER_ID_MISMATCH" code

5. **PDP Down:**
   - Set invalid PDP URL in config
   - Make chat completion request
   Expected: 503 error with clear message

6. **Provider Not Found:**
   ```bash
   curl -X POST http://localhost:3100/api/chat/completions \
     -H "Authorization: Bearer <token>" \
     -H "X-API-Key: <api-key>" \
     -d '{"provider": "nonexistent", "model": "gpt-4", "messages": []}'
   ```
   Expected: 404 error

---

### 11. Test Database Persistence

**Goal**: Verify data persists across server restarts.

1. Create a user
2. Create an API key
3. Add a provider
4. Stop the proxy server (Ctrl+C)
5. Start the proxy server again
6. Check that all data is still there

**Expected Results:**
- ✅ All users are still in database
- ✅ All API keys are still in database
- ✅ All providers are still in database
- ✅ Master key is still valid

---

### 12. Test Port Auto-Selection

**Goal**: Verify port auto-selection works.

1. Start proxy on default port (3100)
2. In another terminal, start another instance
3. Check that second instance uses a different port

**Expected Results:**
- ✅ First instance uses port 3100
- ✅ Second instance uses port 3101 (or next available)
- ✅ Console shows which port is being used

---

## Integration Testing Checklist

- [ ] Proxy server starts successfully
- [ ] UI is accessible
- [ ] Configuration can be saved
- [ ] User can be created
- [ ] API key can be created
- [ ] Provider can be added
- [ ] Authentication flow works
- [ ] Chat completions endpoint works
- [ ] SDK can make requests
- [ ] Error handling works
- [ ] Data persists across restarts
- [ ] Port auto-selection works

---

## Common Issues and Solutions

### Issue: "Master key not found"
**Solution**: Check that master key file exists at `~/.zs-ai/master-key.txt` or set `ZS_AI_MASTER_KEY` environment variable.

### Issue: "Database locked"
**Solution**: Ensure only one instance of proxy server is running, or check file permissions.

### Issue: "UI not found"
**Solution**: Build UI first: `npm run build:ui`

### Issue: "Port already in use"
**Solution**: Proxy should auto-select next available port. If not, manually specify port: `zs-ai start -p 3101`

### Issue: "PDP authorization fails"
**Solution**: Check PDP URL in config and ensure PDP server is accessible.

### Issue: "Provider API key invalid"
**Solution**: Verify provider API key is correct and has proper permissions.

---

## Performance Testing

**Test concurrent requests:**
```bash
# Use Apache Bench or similar
ab -n 100 -c 10 -H "Authorization: Bearer <token>" -H "X-API-Key: <key>" \
  -p request.json -T application/json \
  http://localhost:3100/api/chat/completions
```

**Monitor:**
- Response times
- Error rates
- Database performance
- Memory usage

---

## Security Testing

1. **Test master key protection:**
   - Try accessing admin endpoints without master key
   - Try with invalid master key

2. **Test JWT security:**
   - Try using expired tokens
   - Try using tokens from different users
   - Try tampering with tokens

3. **Test API key security:**
   - Try using revoked keys
   - Try using keys from different users
   - Try invalid key formats

---

## Next Steps After Testing

1. **If all tests pass:**
   - Remove old UI server code (`packages/cli/src/ui-server.ts`)
   - Update documentation
   - Create release notes

2. **If issues found:**
   - Document issues
   - Fix bugs
   - Re-test affected areas

3. **Production readiness:**
   - Set up monitoring
   - Configure logging
   - Set up backups
   - Document deployment process
