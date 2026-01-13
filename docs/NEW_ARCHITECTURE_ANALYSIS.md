# New Architecture Analysis - SDK + Proxy Separation

## Proposed Architecture Overview

### Key Changes:
1. **Two separate packages**: SDK and Proxy
2. **SDK**: User creation, key creation, provider management, chat completions
3. **Proxy**: SQLite database, local server, handles chat completion requests
4. **Authentication**: JWT-based (userId/password → access token + refresh token)
5. **Authorization**: PDP-only (removed local mode, always live mode)
6. **User-Key Separation**: 
   - Users stored locally in Proxy SQLite (for management only)
   - Entities created in Backend API when keys are created
   - Users don't sync with entities - they're separate
7. **Backend URL**: Fixed to `https://api-dev.authzebra.com` (removed from config)

---

## Architecture Flow

### Current Flow (Before):
```
Admin → Management SDK → Backend API → Entities/Schema/Policies
End-User → User SDK → Backend API → PDP → LLM Provider
```

### Proposed Flow (After):
```
Admin → UI (http://localhost:{port}) → Proxy Server → Backend API (https://api-dev.authzebra.com) → Entities/Schema/Policies
Admin → UI → Proxy Server → SQLite → Users, Provider Mappings
End-User → SDK → Proxy Server (http://localhost:{port}/api/*) → JWT + API Key Auth → PDP → LLM Provider
```

**Key Points:**
- **Proxy Server**: Single port serves both UI and API
- **UI**: Served on same port as proxy (integrated)
- **Backend API URL**: Fixed to `https://api-dev.authzebra.com`
- **Users**: Stored in Proxy SQLite (local management)
- **Entities**: Created in Backend API when keys are created
- **No sync needed**: Between users and entities
- **PDP**: Already has all entities/policies/schema (no sync needed)
- **Chat Completions**: Require both JWT token AND API key

---

## Detailed Analysis

### ✅ **What Works Well**

1. **Separation of Concerns**
   - SDK handles business logic
   - Proxy handles infrastructure (DB, local server)
   - Clear separation of responsibilities

2. **JWT-Based Authentication**
   - Industry standard
   - Token expiration/refresh mechanism
   - Better security than API key alone

3. **User-Key Separation**
   - More flexible (one user can have multiple keys)
   - Better user management
   - Aligns with standard auth patterns

4. **Local Proxy Server**
   - Users run proxy on their machine
   - No need for hosted infrastructure
   - Full control over data

5. **SQLite Storage**
   - Simple, no installation needed
   - File-based database
   - Perfect for local proxy server
   - Can migrate to PostgreSQL later if needed

---

## ⚠️ **Issues & Concerns**

### 1. **SDK vs Proxy Responsibilities - Unclear Boundaries**

**Problem:**
- You said "SDK will have abilities for chat completions" but also "proxy will run backend server for chat completion calls"
- Which one actually handles chat completions?

**Clarification Needed:**
- **SDK**: Should make HTTP requests to proxy server
- **Proxy**: Should handle chat completion endpoint
- SDK should NOT directly handle completions, just make requests

**Recommendation:**
```
SDK (Client):
  - Makes HTTP requests to proxy
  - Handles token refresh
  - Provides user-friendly API

Proxy (Server):
  - Receives HTTP requests
  - Validates JWT
  - Calls PDP
  - Makes LLM requests
  - Returns responses
```

---

### 2. **User Creation Flow - CLARIFIED** ✅

**Clarification:**
- Users are stored locally in Proxy SQLite (for management only)
- Entities are created in Backend API when keys are created
- Users and entities are separate - no sync needed

**Flow:**
```
1. Admin uses SDK (or UI) to create user
2. SDK calls Proxy API: POST /api/users
3. Proxy creates user in SQLite database
4. Proxy generates userId + password
5. Proxy sends email with credentials (userId + password)
6. Proxy returns userId to SDK

Later, when creating key:
1. Admin selects user from dropdown
2. SDK calls Backend API: POST /api/v2025-01/projects/{projectId}/entity
3. Entity created with uid = User::"{userId}" (from selected user)
4. Entity attributes populated from user data
5. API key generated and returned
```

**Key Points:**
- Users stored in Proxy SQLite (local management)
- Entities stored in Backend API (authorization)
- No sync needed - they're separate systems
- userId links them together (entity UID references userId)

---

### 3. **Provider Key Storage - CLARIFIED** ✅

**Clarification:**
- Provider keys stored in Proxy SQLite (encrypted)
- Use master key (from config) to encrypt/decrypt
- Proxy has access to master key for decryption

**Storage:**
```
Provider Keys Storage:
- Store encrypted provider keys in SQLite
- Use master key (from config) to encrypt/decrypt
- Proxy has access to master key for decryption
- Provider mappings: provider_name → encrypted_api_key
```

**Database Schema (SQLite):**
```sql
CREATE TABLE provider_keys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provider_name TEXT UNIQUE NOT NULL,
  encrypted_api_key TEXT NOT NULL,
  metadata TEXT,  -- JSON string: baseUrl, models, etc.
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

### 4. **Entity UID Should Be userId - Clarification**

**Problem:**
- You said "entity's UID should be the userId we generated"
- Currently entity UID is `User::"{userId}"`
- This is correct, but need to ensure consistency

**Clarification:**
- Entity UID format: `User::"{userId}"` ✅ (This is correct)
- userId comes from user creation in PostgreSQL
- When creating key, use userId from selected user

**Flow:**
```
1. Create user → userId = "user-123" (generated)
2. Create key → Select user → Use userId = "user-123"
3. Create entity → uid = { type: "User", id: "user-123" }
4. Entity UID = User::"user-123" ✅
```

---

### 5. **Token Authentication - Why API Key Too?** ✅ **CLARIFIED**

**Clarification:**
- **Both JWT token AND API key are required** in chat completion requests
- JWT token: Authenticates the user (who they are)
- API key: Identifies which key is being used (for tracking/revocation/auditing)

**Request Format:**
```
POST /api/chat/completions
Headers:
  Authorization: Bearer {accessToken}  // JWT token
  X-API-Key: {apiKey}                  // API key (sk-zs-{userId}-{hash})
Body:
  { provider, model, messages, ... }
```

**Why Both?**
- **JWT Token**: 
  - Authenticates the user
  - Contains userId claim
  - Expires (security)
  - Can be refreshed
  
- **API Key**:
  - Identifies which key is being used
  - For tracking/auditing purposes
  - Can be revoked independently
  - Links to entity in Backend API

**Validation Flow:**
1. Validate JWT token (extract userId)
2. Validate API key format (extract userId from key)
3. Ensure userId from JWT matches userId from API key
4. Check API key status (active/revoked) in database
5. Proceed with authorization and request

---

### 6. **Database Choice - CLARIFIED** ✅

**Clarification:**
- **SQLite** will be used for simplicity
- No installation needed
- File-based database
- Perfect for local proxy server

**Implementation:**
```
SQLite Database:
- File location: ~/.zs-ai/proxy.db (or similar)
- Created automatically on first run
- Migrations run on startup
- No external dependencies
- Can migrate to PostgreSQL later if needed
```

**Benefits:**
- ✅ No installation required
- ✅ Simple setup
- ✅ Perfect for local proxy
- ✅ Can upgrade to PostgreSQL later

---

### 7. **Backend API vs Proxy - Data Synchronization - CLARIFIED** ✅

**Clarification:**
- **No sync needed** - Users and entities are separate systems
- Users stored in Proxy SQLite (for management)
- Entities stored in Backend API (for authorization)
- They're linked by userId, but don't need to sync

**Flow:**
```
1. Admin creates user in Proxy SQLite → userId generated (e.g., "user-123")
2. Admin creates key → Selects user → Uses userId = "user-123"
3. Entity created in Backend API with uid = User::"user-123"
4. Backend API doesn't need to know about Proxy users
5. Entity UID references userId, that's enough
6. No sync needed - they're separate systems
```

**Key Points:**
- ✅ Users are for management/organization only
- ✅ Entities are for authorization (Cedar policies)
- ✅ Linked by userId, but independent systems
- ✅ No sync complexity needed

---

### 8. **PDP Authorization - CLARIFIED** ✅

**Clarification:**
- **PDP already has everything** - no sync needed
- PDP has entities, policies, schema from Backend API
- Proxy just makes authorization request to PDP

**Flow:**
```
Proxy → PDP Authorization Request:
POST {pdpUrl}/authorize
{
  principal: "User::\"user-123\"",
  action: "Action::QueryLLM",
  resource: "Resource::Model::gpt-4",
  context: {...}
}

PDP Response:
{
  decision: "Allow" | "Deny",
  diagnostics: {...}
}

Proxy uses response to proceed or deny request
```

**Key Points:**
- ✅ PDP already has all entities/policies/schema
- ✅ Proxy just makes authz request
- ✅ No sync needed
- ✅ Simple and clean

---

### 9. **Error Handling - Specific Error Messages**

**Problem:**
- You want "clear error messages for user"
- Need to define all error scenarios

**Error Scenarios:**
1. **Token Expired**
   - Error: `401 Unauthorized - Token expired`
   - SDK should catch and refresh token

2. **Invalid Token**
   - Error: `401 Unauthorized - Invalid token`
   - User needs to re-authenticate

3. **User Not Found**
   - Error: `404 Not Found - User not found`
   - Check userId in JWT

4. **Authorization Denied**
   - Error: `403 Forbidden - Authorization denied: {reason}`
   - From PDP response

5. **Provider Not Found**
   - Error: `404 Not Found - Provider '{name}' not configured`
   - Check provider_keys table

6. **Provider Key Missing**
   - Error: `500 Internal Server Error - Provider key not found`
   - Admin needs to add provider

7. **Database Connection Failed**
   - Error: `500 Internal Server Error - Database connection failed`
   - Check PostgreSQL connection

8. **PDP Unavailable**
   - Error: `503 Service Unavailable - PDP server unavailable`
   - Retry or fail gracefully

---

### 10. **UI Changes Required**

#### A. **User Management Page** (New)
- **Create User Form:**
  - Email (required)
  - Name (required)
  - Role (optional)
  - Department (optional)
- **User List Table:**
  - Email
  - Name
  - UserId (generated)
  - Created At
  - Status (active/inactive)
  - Actions (Edit, Delete, View Keys)

#### B. **Key Creation Page** (Modified)
- **Current**: Form with userId, name, email, role, department, limits
- **New**: 
  - User Dropdown (select from existing users)
  - Auto-fill: name, email, role, department from selected user
  - Editable fields: dailySpendLimit, monthlySpendLimit
  - Generate API key button

#### C. **Authentication Flow** (New)
- **Login Page** (for end-users):
  - UserId input
  - Password input
  - Login button
  - "Forgot Password" link
- **Token Management** (in SDK):
  - Store accessToken + refreshToken
  - Auto-refresh on expiration
  - Handle refresh errors

#### D. **Provider Management** (Modified)
- **Current**: Stores in config file
- **New**: Should store in Proxy SQLite
- **UI**: Same interface, but calls Proxy API instead

#### E. **Config Page** (Major Changes) ⚠️
- **Remove**: `backendUrl` field (always `https://api-dev.authzebra.com`)
- **Remove**: `authMode` selection (always live mode)
- **Remove**: `storageMode` selection (not needed)
- **Keep**: 
  - Project ID
  - Organization ID
  - Client ID
  - Client Secret
  - PDP URL
  - Port (for proxy server)
  - Log Level
- **Add**: Proxy URL field (for end-users to configure)

---

## Database Schema Design (SQLite)

### Users Table
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT UNIQUE NOT NULL,  -- Generated userId (e.g., "user-123")
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,    -- Hashed password (bcrypt)
  role TEXT,
  department TEXT,
  status TEXT DEFAULT 'active',    -- active, inactive, suspended
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login DATETIME
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_user_id ON users(user_id);
```

### API Keys Table
```sql
CREATE TABLE api_keys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,  -- References users.user_id
  api_key TEXT UNIQUE NOT NULL,   -- sk-zs-{userId}-{hash}
  key_hash TEXT NOT NULL,        -- For validation (HMAC-SHA256)
  status TEXT DEFAULT 'active',     -- active, revoked
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  revoked_at DATETIME,
  
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);
```

### Provider Keys Table
```sql
CREATE TABLE provider_keys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provider_name TEXT UNIQUE NOT NULL,  -- openai, anthropic
  encrypted_api_key TEXT NOT NULL,     -- AES-256-GCM encrypted
  metadata TEXT,                        -- JSON string: baseUrl, models, etc.
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_provider_keys_name ON provider_keys(provider_name);
```

### Refresh Tokens Table
```sql
CREATE TABLE refresh_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,  -- References users.user_id
  token_hash TEXT UNIQUE NOT NULL,  -- Hashed refresh token
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  revoked_at DATETIME,
  
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
```

---

## API Endpoints Required

### Proxy API Endpoints

#### Authentication
```
POST /api/auth/login
Body: { userId, password }
Response: { accessToken, refreshToken, expiresIn }

POST /api/auth/refresh
Body: { refreshToken }
Response: { accessToken, refreshToken, expiresIn }

POST /api/auth/logout
Headers: Authorization: Bearer {accessToken}
```

#### User Management (Admin)
```
GET /api/users
Headers: Authorization: Bearer {m2m-token}
Response: { users: User[] }

POST /api/users
Headers: Authorization: Bearer {m2m-token}
Body: { email, name, role?, department? }
Response: { userId, email, name, password }  // Password shown once

GET /api/users/:userId
PUT /api/users/:userId
DELETE /api/users/:userId
```

#### Key Management (Admin)
```
GET /api/keys
Headers: Authorization: Bearer {admin-jwt-token}
Response: { keys: ApiKey[] }

POST /api/keys
Headers: Authorization: Bearer {admin-jwt-token}
Body: { userId, dailySpendLimit, monthlySpendLimit }
Response: { apiKey, userId }

POST /api/keys/:userId/rotate
Headers: Authorization: Bearer {admin-jwt-token}
Response: { apiKey, userId, message }

DELETE /api/keys/:userId
Headers: Authorization: Bearer {admin-jwt-token}
Response: { success: true }
```

#### Provider Management (Admin)
```
GET /api/providers
POST /api/providers
DELETE /api/providers/:name
```

#### Chat Completions (End-User)
```
POST /api/chat/completions
Headers: 
  Authorization: Bearer {accessToken}  // JWT token
  X-API-Key: {apiKey}                  // API key (sk-zs-{userId}-{hash})
Body: { provider, model, messages, ... }
Response: { LLM response }
```

**Note**: Both JWT token and API key are required:
- JWT token: Authenticates the user (who they are)
- API key: Identifies which key is being used (for tracking/revocation/auditing)

---

## Implementation Checklist

### Phase 1: Database Setup
- [ ] Design SQLite database schema
- [ ] Create migration scripts
- [ ] Database initialization on first run (create `~/.zs-ai/proxy.db`)
- [ ] Handle database migrations

### Phase 2: Proxy Server
- [ ] Express/Fastify server setup
- [ ] Serve UI on same port (static files or integrated)
- [ ] Database connection handling
- [ ] Authentication endpoints (login, refresh, logout)
- [ ] User management endpoints
- [ ] Key management endpoints
- [ ] Provider management endpoints
- [ ] Chat completion endpoint (requires both JWT + API key)
- [ ] JWT token generation/validation
- [ ] API key validation (extract userId, check status)
- [ ] PDP integration
- [ ] Error handling
- [ ] Port auto-selection (find free port)

### Phase 3: SDK Updates
- [ ] Remove local mode
- [ ] Add JWT authentication
- [ ] Add token refresh mechanism
- [ ] Update chat completions to use proxy (send both JWT + API key)
- [ ] Add user creation methods
- [ ] Add key creation methods (with user selection)
- [ ] Update provider management
- [ ] Ensure API key is sent in `X-API-Key` header for completions

### Phase 4: UI Updates
- [ ] Create User Management page
- [ ] Update Key Creation page (user dropdown)
- [ ] Update Provider Management (use proxy API)
- [ ] Add authentication flow (if needed)
- [ ] Update error messages

### Phase 5: Testing
- [ ] Test user creation flow
- [ ] Test key creation flow
- [ ] Test authentication flow
- [ ] Test chat completions
- [ ] Test token refresh
- [ ] Test error scenarios

---

## Recommendations

### 1. **Start Simple** ✅
- Use SQLite (confirmed - no installation needed)
- File-based database (`~/.zs-ai/proxy.db`)
- Can migrate to PostgreSQL later if needed

### 2. **Clarify Responsibilities**
- **SDK**: Client library, makes HTTP requests
- **Proxy**: Server, handles requests, database operations
- **Backend API**: Stores entities, policies, schema (unchanged)

### 3. **Authentication Flow** ✅ **CLARIFIED**
- Use **both JWT token AND API key** in requests
- JWT token: Authenticates user (who they are)
- API key: Identifies which key is being used (for tracking/auditing)
- Extract userId from JWT claims
- Validate API key matches userId from JWT

### 4. **Database Choice** ✅
- **SQLite**: Confirmed - simplest, perfect for local proxy
- File location: `~/.zs-ai/proxy.db`
- Can migrate to PostgreSQL later if needed

### 5. **Error Messages**
- Define all error scenarios
- Return clear, actionable error messages
- Include error codes for programmatic handling

### 6. **Migration Path**
- Keep current structure working
- Add new proxy package
- Migrate features gradually
- Test thoroughly before removing old code

---

## Questions Answered ✅

1. **SDK vs Proxy**: Which handles chat completions?
   - ✅ Answer: Proxy handles, SDK makes requests

2. **User Creation**: Where does it happen?
   - ✅ Answer: SDK calls Proxy API, Proxy stores in SQLite

3. **Provider Keys**: Where stored?
   - ✅ Answer: Proxy SQLite (encrypted)

4. **API Key Purpose**: Why needed if we have JWT?
   - ✅ Answer: **Both required** - JWT for authentication, API key for tracking/auditing

5. **Database**: SQLite or PostgreSQL?
   - ✅ Answer: SQLite (confirmed - simpler, no installation)

6. **Entity Sync**: How do Proxy users sync with Backend API entities?
   - ✅ Answer: No sync needed - users and entities are separate systems

7. **PDP Entities**: How does PDP get entities?
   - ✅ Answer: PDP already has everything - just make authz request

8. **Backend URL**: Configurable or fixed?
   - ✅ Answer: Fixed to `https://api-dev.authzebra.com` (removed from config)

9. **Auth Mode**: Local or Live?
   - ✅ Answer: Always Live mode (removed from config)

---

## Additional Considerations - CLARIFIED ✅

### 1. **Backend URL Hardcoding** ✅
- **Fixed URL**: `https://api-dev.authzebra.com`
- **Where to hardcode**: 
  - SDK: Default backendUrl in config
  - UI: Remove backendUrl field, use hardcoded value
  - Proxy: Use hardcoded value when calling Backend API

### 2. **Config Store Updates** ✅
- Remove `backendUrl` from config store
- Remove `authMode` from config store
- Remove `storageMode` from config store
- Keep: `projectId`, `orgId`, `clientId`, `clientSecret`, `pdpUrl`, `port`, `logLevel`
- Add: `proxyUrl` (for end-users to configure where proxy is running)

### 3. **Master Key System** ✅ **NEW**
- **Generation**: 
  - Generated on first proxy run
  - Cryptographically secure random string (32+ bytes)
  - Saved to config file or environment variable
- **Storage**:
  - Option A: `~/.zs-ai/master-key` (encrypted file)
  - Option B: Environment variable `ZS_AI_MASTER_KEY`
  - Option C: Config file `masterKey` field (encrypted)
- **Display**:
  - Shown in proxy startup logs (first run only)
  - Display warning: "Save this master key - it won't be shown again!"
  - Can be retrieved from config file if needed
- **Usage**:
  - Required for ALL management operations
  - Admin login uses master key
  - All UI operations require master key
  - End-users don't need master key (they use userId + password)
- **Security**:
  - Master key protects database access
  - Only master key holders can perform admin operations
  - Solves DB file access issue (master key = access control)

### 4. **Port Management** ✅ **NEW**
- **Port Selection**:
  - Start with configured port (default: 3100)
  - If port in use, try next port (3101, 3102, etc.)
  - Continue until finding free port
  - Display selected port in logs
- **Port Display**:
  - Show in proxy startup logs: "Proxy running on http://localhost:{port}"
  - Update config file with actual port used
  - Display in UI if accessible

### 5. **Multi-Instance Support** ✅ **CLARIFIED**
- **No Conflicts**:
  - Each admin runs proxy on their own machine
  - Each instance has its own SQLite database (`~/.zs-ai/proxy.db`)
  - No conflicts between instances
  - Each instance manages its own users/keys/providers
- **Isolation**:
  - Complete isolation between instances
  - No shared state
  - Each admin manages their own setup

### 3. **Proxy URL Configuration** ✅ **CLARIFIED**
- **Proxy Server**: Runs on single port (auto-find free port)
- **UI**: Served on same port as proxy (integrated)
- **API**: Served on same port as proxy (e.g., `/api/*` endpoints)
- **End-User**: Needs to know proxy URL to connect
- **Options**:
  - Environment variable: `ZS_AI_PROXY_URL`
  - Config file: `proxyUrl` field
  - Default: `http://localhost:{port}` (port auto-selected)
- **Port Display**: Shown in proxy logs when started
- **UI Access**: `http://localhost:{port}` (same as proxy)
- **API Access**: `http://localhost:{port}/api/*` (same port)

### 4. **Email Sending for User Credentials** ✅
- **Requirement**: Send userId + password to user's email
- **Implementation**:
  - For now: Display in UI, admin can send manually
  - Future: Integrate email service if needed
  - Not critical for initial implementation

### 5. **Password Generation** ✅
- **Requirement**: Generate secure password for users
- **Implementation**:
  - Use crypto.randomBytes() to generate random password (16+ bytes)
  - Hash with bcrypt before storing in database
  - Show plain password once (in UI when created)
  - Never store plain password
  - Admin can reset password if needed

### 6. **JWT Token Claims** ✅
- **Required Claims**:
  - `userId`: User ID from database
  - `exp`: Expiration time (e.g., 1 hour)
  - `iat`: Issued at time
- **Optional Claims**:
  - `email`: User email
  - `role`: User role
  - `name`: User name
- **Token Generation**:
  - Signed with master key or separate JWT secret
  - Stored in refresh_tokens table for validation

### 7. **Error Messages - Specific Scenarios** ✅
- **Token Expired**: `401 Unauthorized - Token expired. Please refresh your token.`
- **Invalid Token**: `401 Unauthorized - Invalid token. Please login again.`
- **Missing API Key**: `400 Bad Request - API key required. Include X-API-Key header.`
- **Invalid API Key**: `401 Unauthorized - Invalid API key format.`
- **API Key Mismatch**: `401 Unauthorized - API key userId does not match token userId.`
- **API Key Revoked**: `403 Forbidden - API key has been revoked.`
- **User Not Found**: `404 Not Found - User not found.`
- **Authorization Denied**: `403 Forbidden - Authorization denied: {reason from PDP}`
- **Provider Not Found**: `404 Not Found - Provider '{name}' not configured. Please add provider.`
- **Provider Key Missing**: `500 Internal Server Error - Provider key not found. Contact administrator.`
- **Database Error**: `500 Internal Server Error - Database error: {details}`
- **PDP Unavailable**: `503 Service Unavailable - PDP server unavailable. Please try again later.`
- **Backend API Error**: `502 Bad Gateway - Backend API error: {details}`
- **Master Key Required**: `401 Unauthorized - Master key required for this operation.`
- **Invalid Master Key**: `401 Unauthorized - Invalid master key.`
- **Port In Use**: `500 Internal Server Error - Port {port} is in use. Trying next port...` (info message)

---

## Summary of Clarifications ✅

### ✅ **Confirmed Decisions**

1. **Database**: SQLite (not PostgreSQL)
   - File: `~/.zs-ai/proxy.db`
   - No installation needed
   - Can migrate to PostgreSQL later
   - **Backup**: Not needed for now

2. **User-Entity Separation**:
   - Users stored in Proxy SQLite (management only)
   - Entities created in Backend API when keys are created
   - No sync needed - they're separate systems
   - Linked by userId (entity UID = `User::"{userId}"`)

3. **Backend URL**: Fixed to `https://api-dev.authzebra.com`
   - Removed from config UI
   - Hardcoded in SDK and Proxy

4. **Auth Mode**: Always Live mode
   - Removed from config UI
   - Always use PDP for authorization

5. **PDP**: Already has all entities/policies/schema
   - No sync needed
   - Proxy just makes authz request

6. **Provider Keys**: Stored in Proxy SQLite (encrypted)
   - Use master key for encryption/decryption

7. **Master Key System** ✅ **NEW**
   - Generated on first proxy run
   - Saved securely (config file or env var)
   - Displayed in proxy startup logs (first run only)
   - Required for ALL management operations
   - Admin login uses master key
   - End-users don't need master key (they use userId + password)
   - Solves DB file access issue

8. **Port Management** ✅ **NEW**
   - Auto-find free port (start from configured port)
   - Try next port if in use (3100 → 3101 → 3102, etc.)
   - Display selected port in logs
   - Update config with actual port used

9. **Multi-Instance** ✅ **CLARIFIED**
   - Not an issue - each admin on different machine
   - Each instance has its own SQLite database
   - Complete isolation between instances

10. **End-User UI Access** ✅ **CLARIFIED**
    - End-users don't use UI
    - They use SDK with userId + password
    - UI is only for admins (with master key)

### ⚠️ **Things to Consider - CLARIFIED** ✅

1. **Email Sending**: How to send userId + password to users?
   - ✅ **Clarified**: Display in UI, admin sends manually (for now)
   - Future: Integrate email service if needed

2. **Proxy URL Configuration**: How do end-users know proxy URL?
   - ✅ **Clarified**: Support env var, config file, and default
   - Default: `http://localhost:3100` (or first available port)

3. **Admin Authentication to Proxy**: How does SDK authenticate to proxy for admin operations?
   - ✅ **Clarified**: **Master Key** authentication
   - Master key generated on first run
   - Saved securely (encrypted or in secure location)
   - Displayed in logs when proxy starts
   - Required for ALL management operations
   - Admin login also uses master key
   - This solves DB file access issue (only master key holders can access)

4. **Password Storage**: How to handle password reset?
   - ✅ **Clarified**: Admin can reset password in UI (using master key)
   - Future: Self-service password reset if needed

5. **Database Migrations**: How to handle schema changes?
   - ✅ **Clarified**: Use migration system
   - Version tracking in database
   - Run migrations on startup

6. **Port Conflicts**: What if port is already in use?
   - ✅ **Clarified**: Try different ports until finding a free one
   - Display the port to user in logs
   - Start from configured port, increment if needed

7. **Multi-Instance**: What if multiple admins run proxy?
   - ✅ **Clarified**: Not an issue - each admin on different machine
   - Each instance has its own SQLite database
   - No conflicts between instances

8. **Database Backup**: How to backup SQLite database?
   - ✅ **Clarified**: Don't worry about it for now
   - Can add backup functionality later if needed

9. **End-User UI Access**: Do end-users need UI?
   - ✅ **Clarified**: **No** - end-users only use SDK with credentials
   - End-users don't need to manage users or access UI
   - UI is only for admins (with master key)

### 📋 **UI Changes Summary**

#### Config Page (`/config`):
- **Remove**:
  - `backendUrl` field (hardcoded to `https://api-dev.authzebra.com`)
  - `authMode` selection (always live mode)
  - `storageMode` selection (not needed)
- **Keep**:
  - Project ID
  - Organization ID
  - Client ID
  - Client Secret
  - PDP URL
  - Port (for proxy server, with auto-increment if in use)
  - Log Level
- **Add**:
  - Proxy URL field (for end-users, optional, defaults to `http://localhost:{port}`)
  - Master Key display (read-only, shown once on first run)

#### New Pages Needed:
- **User Management** (`/users`):
  - Create user form
  - User list table
  - User detail/edit pages
  - Password reset functionality
  - **Authentication**: Master key required

#### Modified Pages:
- **Key Creation** (`/keys`):
  - Replace form fields with user dropdown
  - Auto-fill user data
  - Keep spend limits editable
  - **Authentication**: Master key required

#### Authentication Flow:
- **Admin Access**: Master key required for all UI operations
- **Master Key**:
  - Generated on first proxy run
  - Saved securely
  - Displayed in proxy startup logs
  - Required for all management operations
  - Can be set via environment variable or config file
- **End-User Access**: 
  - End-users don't use UI
  - They use SDK with userId + password
  - No UI access needed

---

## Next Steps

1. ✅ **Clarify** all questions above - DONE
2. ✅ **Design** database schema in detail - DONE (SQLite)
3. **Design** API endpoints in detail
4. **Create** proxy package structure
5. **Update** SDK package structure
6. **Plan** UI changes (especially Config page)
7. **Implement** phase by phase
