# ZS AI Gateway - Complete Project Documentation

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Database Schema](#database-schema)
4. [Authentication & Authorization](#authentication--authorization)
5. [API Endpoints](#api-endpoints)
6. [Frontend Structure](#frontend-structure)
7. [Services & Business Logic](#services--business-logic)
8. [Cedar Authorization System](#cedar-authorization-system)
9. [Data Flow](#data-flow)
10. [Configuration](#configuration)
11. [Key Features](#key-features)
12. [Project Structure](#project-structure)

---

## Project Overview

**ZS AI Gateway** is a production-grade LLM (Large Language Model) Gateway management system that provides:

- **API Key Management**: Secure API key generation, rotation, and validation
- **User Management**: User/agent creation, authentication, and role-based access control
- **LLM Provider Integration**: Support for multiple LLM providers (OpenAI, Anthropic, etc.) with encrypted credential storage
- **Authorization Gateway**: Fine-grained authorization using Cedar Policy Language
- **Management UI**: Web-based interface for administrators and users
- **Cost Tracking**: Usage and cost tracking for API requests
- **Dual Mode Support**: 
  - **Local Mode** (Default): SQLite storage + Cedar-WASM authorization
  - **Live Mode** (Implemented): Backend API storage + external PDP authorization (requires configuration)

### Technology Stack

- **Backend**: Node.js, Express, TypeScript, SQLite
- **Frontend**: Nuxt 3, Vue 3, Pinia, Tailwind CSS
- **Authorization**: Cedar Policy Language (Cedar-WASM for local mode)
- **Encryption**: AES-256-GCM for sensitive data
- **Authentication**: JWT tokens with refresh token support
- **Database**: SQLite with encryption for sensitive fields

---

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Management UI (Nuxt 3)                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │  Admin   │  │  Users   │  │   Keys   │  │ Providers│    │
│  │  Pages   │  │  Pages   │  │  Pages  │  │  Pages   │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
└──────────────────────┬───────────────────────────────────────┘
                       │ HTTP/HTTPS
                       │ (Nuxt Server API Routes)
┌──────────────────────▼───────────────────────────────────────┐
│              Proxy Server (Express + TypeScript)               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              API Routes Layer                           │  │
│  │  /api/auth, /api/users, /api/keys, /api/chat, etc.     │  │
│  └──────────────────┬─────────────────────────────────────┘  │
│  ┌──────────────────▼─────────────────────────────────────┐  │
│  │            Services Layer                               │  │
│  │  UserService, KeyService, ProviderService, LLMService  │  │
│  └──────────────────┬─────────────────────────────────────┘  │
│  ┌──────────────────▼─────────────────────────────────────┐  │
│  │         Authorization Layer (Cedar)                     │  │
│  │  LocalAuthorizationService (Cedar-WASM)                │  │
│  │  or LiveAuthorizationService (External PDP)             │  │
│  └──────────────────┬─────────────────────────────────────┘  │
│  ┌──────────────────▼─────────────────────────────────────┐  │
│  │            Data Layer (SQLite)                           │  │
│  │  auth, user_agent_keys, provider_keys, entities, etc.   │  │
│  └─────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────┘
                       │
                       │ API Requests
                       │ (X-API-Key header)
┌──────────────────────▼───────────────────────────────────────┐
│              External LLM Providers                           │
│  OpenAI, Anthropic, etc.                                     │
└───────────────────────────────────────────────────────────────┘
```

### Dual Mode Architecture

The system supports two modes:

1. **Local Mode** (Default):
   - SQLite database for storage
   - Cedar-WASM for authorization evaluation
   - No external dependencies
   - All data stored locally

2. **Live Mode** (Code implemented, requires external services):
   - Backend API for storage (requires `backendUrl` configuration)
   - External Policy Decision Point (PDP) for authorization (requires `pdpUrl` configuration)
   - M2M authentication for service-to-service communication (requires `clientId`, `clientSecret`, `orgId`, `projectId`)
   - Centralized data management
   - **Note**: Code exists but requires external backend API and PDP services to be configured. Default mode is "local".

---

## Database Schema

### Overview

The database uses SQLite with the following design principles:
- **TEXT primary keys** (UUIDs) instead of INTEGER AUTOINCREMENT
- **INTEGER status** (0=inactive, 1=active, 2=revoked) instead of TEXT
- **Encryption** for sensitive fields (email, API keys)
- **Hashing** for lookup fields (email_hash, key_hash)
- **Composite keys** where appropriate (entities table)

### Tables

#### 1. `auth` - User/Agent Authentication

```sql
CREATE TABLE auth (
    id TEXT PRIMARY KEY,                    -- UUID or generated ID
    email TEXT NOT NULL,                    -- Encrypted (PII, GDPR compliance)
    email_hash TEXT NOT NULL,               -- SHA-256 hash (for fast lookup)
    name TEXT,                              -- Plain text (not encrypted)
    password TEXT NOT NULL,                 -- Hashed (bcrypt), NOT encrypted
    dept TEXT,                              -- Plain text (not encrypted)
    is_agent INTEGER NOT NULL DEFAULT 0,    -- 0 = user, 1 = agent
    status INTEGER NOT NULL DEFAULT 1,       -- 0=inactive, 1=active, 2=revoked
    last_sign_in TEXT,                      -- ISO timestamp
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

**Encryption Strategy:**
- `email`: Encrypted (PII protection)
- `email_hash`: SHA-256 hash (for fast lookup, not exposed in API)
- `name`, `dept`: Plain text (not sensitive)
- `password`: Hashed only (bcrypt, never encrypted)

**Indexes:**
- `idx_auth_email_hash` - Fast email lookup
- `idx_auth_status` - Filter by status
- `idx_auth_is_agent` - Filter by agent/user type

#### 2. `user_agent_keys` - API Keys

```sql
CREATE TABLE user_agent_keys (
    id TEXT PRIMARY KEY,                    -- UUID or generated ID
    key_value TEXT NOT NULL,                -- Encrypted API key (format: sk-zs-{userId}-{hash})
    key_hash TEXT NOT NULL,                 -- SHA-256 hash (for fast validation, internal only)
    auth_id TEXT NOT NULL,                  -- Foreign key to auth.id
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (auth_id) REFERENCES auth(id) ON DELETE CASCADE
);
```

**Encryption Strategy:**
- `key_value`: Fully encrypted (sensitive credential)
- `key_hash`: SHA-256 hash (for fast validation, internal only, not exposed in API)

**Key Format:** `sk-zs-{userId}-{randomHash}`

**Indexes:**
- `idx_user_agent_keys_auth_id` - Find keys by user
- `idx_user_agent_keys_key_hash` - Fast API key validation
- `idx_user_agent_keys_created_at` - Sort by creation date

#### 3. `provider_keys` - LLM Provider Credentials

```sql
CREATE TABLE provider_keys (
    id TEXT PRIMARY KEY,                    -- UUID or generated ID
    provider TEXT NOT NULL UNIQUE,          -- Provider name (openai, anthropic, etc.)
    api_key TEXT NOT NULL,                  -- Encrypted provider API key
    metadata TEXT,                          -- JSON metadata (baseUrl, models, etc.) - Not encrypted
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

**Encryption Strategy:**
- `api_key`: Fully encrypted (sensitive credential)
- `metadata`: Not encrypted (non-sensitive configuration)

#### 4. `schema_policy` - Cedar Schema and Policies (Merged)

```sql
CREATE TABLE schema_policy (
    id TEXT PRIMARY KEY,                    -- UUID or generated ID
    obj_type TEXT NOT NULL CHECK (obj_type IN ('schema', 'policy')),
    version TEXT,                            -- NULL for policies, version string for schema
    content TEXT NOT NULL,                   -- Schema JSON or Policy string
    description TEXT,                        -- NULL for schema, description for policies
    status INTEGER NOT NULL DEFAULT 1,       -- 0=inactive, 1=active, 2=deprecated
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

**Unique Constraint:** Only one active schema allowed (`obj_type='schema'`)

#### 5. `refresh_tokens` - JWT Refresh Tokens

```sql
CREATE TABLE refresh_tokens (
    id TEXT PRIMARY KEY,                    -- UUID or generated ID
    auth_id TEXT NOT NULL,                  -- Foreign key to auth.id
    token_hash TEXT NOT NULL UNIQUE,         -- Hashed refresh token
    expires_at TEXT NOT NULL,                -- ISO timestamp
    absolute_expires_at TEXT,                -- Absolute expiry (30 days from creation)
    used_at TEXT,                            -- ISO timestamp when token was used
    device_id TEXT,                          -- Device identifier (optional)
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    revoked_at TEXT,                         -- ISO timestamp when token was revoked
    FOREIGN KEY (auth_id) REFERENCES auth(id) ON DELETE CASCADE
);
```

#### 6. `entities` - Cedar Entities

```sql
CREATE TABLE entities (
    etype TEXT NOT NULL,                    -- Entity type (User, UserKey, Resource, etc.)
    eid TEXT NOT NULL,                       -- Entity ID
    ejson TEXT NOT NULL,                    -- Entity data as JSON string
    status INTEGER NOT NULL DEFAULT 1,       -- 0=inactive, 1=active, 2=revoked
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (etype, eid)                -- Composite primary key
);
```

**Entity Types:**
- `User`: User information (user_id, email, department, is_agent, limit_requests_per_minute)
- `UserKey`: API key information (current_daily_spend, current_monthly_spend, last_daily_reset, last_monthly_reset, status, user reference)
- `Resource`: LLM resources (models, providers)

#### 7. `model_pricing` - Model Pricing Data

```sql
CREATE TABLE model_pricing (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    provider TEXT NOT NULL,                  -- Provider name (openai, anthropic, etc.)
    model TEXT NOT NULL,                    -- Model name (e.g., 'gpt-4', 'claude-3-opus')
    input_cost_per_token REAL NOT NULL,     -- Cost per input token (USD)
    output_cost_per_token REAL NOT NULL,     -- Cost per output token (USD)
    cache_write_cost_per_token REAL,         -- Cache write cost (if supported)
    cache_read_cost_per_token REAL,          -- Cache read cost (if supported)
    max_input_tokens INTEGER,                -- Maximum input tokens
    max_output_tokens INTEGER,               -- Maximum output tokens
    supports_vision INTEGER DEFAULT 0,      -- Vision support flag
    supports_function_calling INTEGER DEFAULT 0, -- Function calling support
    supports_streaming INTEGER DEFAULT 1,     -- Streaming support
    effective_from TEXT NOT NULL DEFAULT (datetime('now')), -- Pricing effective date
    effective_until TEXT,                     -- Pricing expiry date
    source_url TEXT,                         -- Source URL for pricing data
    notes TEXT,                              -- Additional notes
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(provider, model, effective_from)
);
```

**Indexes:**
- `idx_model_pricing_provider` - Filter by provider
- `idx_model_pricing_provider_model` - Fast provider+model lookup
- `idx_model_pricing_effective` - Filter by effective date range

#### 8. `model_aliases` - Model Name Aliases

```sql
CREATE TABLE model_aliases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    alias TEXT NOT NULL UNIQUE,             -- Alias name (e.g., 'gpt-4')
    provider TEXT NOT NULL,                  -- Provider name
    canonical_model TEXT NOT NULL,           -- Canonical model name (e.g., 'gpt-4-0613')
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

**Purpose:** Maps model aliases to canonical model names for pricing lookup.

#### 9. `audit_logs` - Comprehensive Authorization Audit Logs

```sql
CREATE TABLE audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id TEXT NOT NULL UNIQUE,         -- Unique request identifier
    
    -- Principal info
    principal TEXT NOT NULL,                 -- Principal entity (e.g., 'UserKey::"uk-123"')
    principal_type TEXT NOT NULL,            -- Principal type (User, UserKey)
    auth_id TEXT,                            -- User ID (from auth table)
    api_key_id TEXT,                         -- API key ID (from user_agent_keys table)
    
    -- Request details
    action TEXT NOT NULL,                    -- Action (completion, embedding, etc.)
    resource TEXT NOT NULL,                   -- Resource (e.g., 'Resource::"gpt-4"')
    provider TEXT,                           -- LLM provider (openai, anthropic)
    model TEXT,                              -- Model name
    
    -- Decision
    decision TEXT NOT NULL CHECK (decision IN ('permit', 'forbid')),
    decision_reason TEXT,                    -- Reason for decision
    policies_evaluated TEXT,                  -- JSON array of all policies evaluated
    determining_policies TEXT,                -- JSON array of policies that determined decision
    
    -- Request metadata
    request_ip TEXT,                         -- Client IP address
    user_agent TEXT,                         -- User agent string
    request_method TEXT,                      -- HTTP method
    request_path TEXT,                       -- Request path
    request_body_hash TEXT,                  -- Hash of request body
    
    -- Cedar context
    cedar_context TEXT,                      -- Full Cedar context as JSON
    entity_snapshot TEXT,                    -- Entity snapshot at time of request
    
    -- Timing
    request_timestamp TEXT NOT NULL,         -- Request timestamp
    auth_start_time TEXT,                    -- Authorization start time
    auth_end_time TEXT,                      -- Authorization end time
    auth_duration_ms INTEGER,                -- Authorization duration in milliseconds
    
    -- Provider response (updated after LLM call)
    provider_request_id TEXT,                -- Provider's request ID
    cost_tracking_id INTEGER,                -- Foreign key to cost_tracking.id
    
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

**Indexes:**
- `idx_audit_logs_request_id` - Fast request lookup
- `idx_audit_logs_auth_id` - Filter by user
- `idx_audit_logs_api_key_id` - Filter by API key
- `idx_audit_logs_decision` - Filter by decision
- `idx_audit_logs_provider` - Filter by provider
- `idx_audit_logs_model` - Filter by model
- `idx_audit_logs_timestamp` - Time-based queries
- `idx_audit_logs_auth_decision_time` - Combined auth/decision/time queries

#### 10. `cost_tracking` - Comprehensive Cost Tracking

```sql
CREATE TABLE cost_tracking (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id TEXT NOT NULL,                -- Request identifier (links to audit_logs)
    execution_key TEXT NOT NULL,              -- Foreign key to user_agent_keys.id
    audit_log_id INTEGER,                    -- Foreign key to audit_logs.id
    
    -- Provider info
    provider TEXT NOT NULL,                   -- LLM provider
    provider_request_id TEXT,                -- Provider's request ID
    
    -- Model info
    model_requested TEXT NOT NULL,            -- Model requested by client
    model_used TEXT,                          -- Model actually used (may differ)
    
    -- Token counts
    input_tokens INTEGER NOT NULL,           -- Input tokens
    output_tokens INTEGER NOT NULL,           -- Output tokens
    total_tokens INTEGER NOT NULL,            -- Total tokens
    cached_tokens INTEGER DEFAULT 0,          -- Cached tokens (for cost savings)
    
    -- Costs (USD)
    input_cost REAL NOT NULL,                -- Input cost
    output_cost REAL NOT NULL,                -- Output cost
    cache_savings REAL DEFAULT 0,             -- Cache savings
    total_cost REAL NOT NULL,                 -- Total cost
    
    -- Pricing reference
    pricing_id INTEGER,                       -- Foreign key to model_pricing.id
    pricing_source TEXT DEFAULT 'database',    -- Source of pricing (database, fallback)
    input_rate_used REAL,                     -- Input rate used
    output_rate_used REAL,                    -- Output rate used
    
    -- Timing
    request_timestamp TEXT NOT NULL,          -- Request timestamp
    response_timestamp TEXT,                  -- Response timestamp
    latency_ms INTEGER,                       -- Request latency
    
    -- Status
    status TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'failed', 'partial', 'streaming')),
    error_code TEXT,                          -- Error code (if failed)
    error_message TEXT,                       -- Error message (if failed)
    
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    
    FOREIGN KEY (execution_key) REFERENCES user_agent_keys(id) ON DELETE CASCADE,
    FOREIGN KEY (audit_log_id) REFERENCES audit_logs(id) ON DELETE SET NULL,
    FOREIGN KEY (pricing_id) REFERENCES model_pricing(id) ON DELETE SET NULL
);
```

**Indexes:**
- `idx_cost_tracking_request_id` - Fast request lookup
- `idx_cost_tracking_execution_key` - Filter by API key
- `idx_cost_tracking_provider` - Filter by provider
- `idx_cost_tracking_model` - Filter by model
- `idx_cost_tracking_timestamp` - Time-based queries
- `idx_cost_tracking_status` - Filter by status
- `idx_cost_tracking_key_time` - Combined key/time queries

---

## Authentication & Authorization

### Authentication Flow

#### 1. Admin Authentication

**Endpoint:** `POST /api/auth/admin/login`

**Request:**
```json
{
  "username": "admin",
  "password": "master-key"
}
```

**Response:**
```json
{
  "token": "jwt-access-token",
  "refreshToken": "jwt-refresh-token",
  "user": {
    "id": "admin",
    "email": "admin@zs-ai.local",
    "role": "admin"
  }
}
```

**Process:**
1. Validate username/password against `auth` table
2. Check if user ID is `admin` or password matches current master key (regenerated on each restart)
3. Generate JWT access token (15 minutes expiry)
4. Generate JWT refresh token (30 days expiry)
5. Store refresh token hash in `refresh_tokens` table
6. Return tokens and user info

**Note**: Master key is regenerated on each server restart. For persistent admin access, either:
- Set `ZS_AI_MASTER_KEY` environment variable, or
- Use the admin user account (password stored in database)

#### 2. User Authentication

**Endpoint:** `POST /api/auth/user/login`

**Request:**
```json
{
  "email": "user@example.com",
  "password": "user-password"
}
```

**Response:** Same as admin authentication

**Process:**
1. Hash email to get `email_hash`
2. Lookup user in `auth` table by `email_hash`
3. Decrypt `email` field
4. Verify password using bcrypt
5. Generate JWT tokens
6. Store refresh token
7. Update `last_sign_in` timestamp

#### 3. Token Refresh

**Endpoint:** `POST /api/auth/refresh`

**Request:**
```json
{
  "refreshToken": "jwt-refresh-token"
}
```

**Response:**
```json
{
  "token": "new-jwt-access-token",
  "refreshToken": "new-jwt-refresh-token"
}
```

**Process:**
1. Validate refresh token signature
2. Check if token exists in `refresh_tokens` table (by hash)
3. Verify token not expired and not revoked
4. Mark old token as used
5. Generate new access and refresh tokens
6. Store new refresh token

### Authorization Flow

#### 1. API Key Authentication (End-User Requests)

**Header:** `X-API-Key: sk-zs-{userId}-{hash}`

**Process:**
1. Extract API key from `X-API-Key` header
2. Hash API key to get `key_hash`
3. Lookup in `user_agent_keys` table by `key_hash`
4. Decrypt `key_value` to verify match
5. Get associated `auth_id` (user ID)
6. Load `UserKey` entity from `entities` table
7. Build authorization request for Cedar

#### 2. Cedar Authorization

**Request Structure:**
```typescript
{
  principal: "UserKey::\"uk-{userId}\"",
  action: "Action::\"completion\"",
  resource: "Resource::\"gpt-4\"",
  context: {
    day_of_week: "Monday",
    hour: 14,
    ip_address: "192.168.1.1",
    is_emergency: false,
    model_name: "gpt-4",
    request_time: "2025-01-20T14:30:00Z"
  }
}
```

**Process:**
1. Load Cedar schema from `schema_policy` table
2. Load **active policies only** (status = 1) from `schema_policy` table
3. Load relevant entities from `entities` table
4. **Check and reset spend** (daily/monthly boundaries) before evaluation
5. Build authorization request with `model_provider` in context
6. Evaluate authorization using Cedar-WASM (local mode) or external PDP (live mode)
7. **Log decision** in `audit_logs` table (permit/forbid) with full context
8. Return `Allow` or `Deny` decision
9. If allowed and request succeeds:
   - Extract token usage from LLM response
   - **Track cost** in `cost_tracking` table
   - **Update UserKey entity** spend values
   - Link audit log to cost tracking record

**Cedar Actions:**
- `completion` - Chat completions
- `fine_tuning` - Fine-tuning operations
- `image_generation` - Image generation
- `embedding` - Embedding generation
- `moderation` - Content moderation

---

## API Endpoints

### Authentication Routes (`/api/auth`)

#### `POST /api/auth/admin/login`
- **Auth:** None (public)
- **Body:** `{ username, password }`
- **Returns:** JWT tokens and user info

#### `POST /api/auth/user/login`
- **Auth:** None (public)
- **Body:** `{ email, password }`
- **Returns:** JWT tokens and user info

#### `POST /api/auth/refresh`
- **Auth:** None (public)
- **Body:** `{ refreshToken }`
- **Returns:** New JWT tokens

#### `POST /api/auth/logout`
- **Auth:** JWT token
- **Body:** `{ refreshToken }`
- **Returns:** Success message

### User Routes (`/api/users`)

#### `GET /api/users`
- **Auth:** Admin JWT
- **Returns:** List of all users

#### `POST /api/users`
- **Auth:** Admin JWT
- **Body:** `{ email, name, department, isAgent, limitRequestsPerMinute }`
- **Returns:** Created user (password in response if email disabled)
- **Side Effect:** Automatically creates API key and User/UserKey entities

#### `GET /api/users/:id`
- **Auth:** Admin JWT
- **Returns:** User details

#### `DELETE /api/users/:id`
- **Auth:** Admin JWT
- **Returns:** Success message
- **Side Effect:** Cascades to delete API keys and entities

#### `POST /api/users/:id/reset-password`
- **Auth:** Admin JWT
- **Body:** `{ sendEmail }` (optional)
- **Returns:** New password (if email disabled)

### Key Routes (`/api/keys`)

#### `GET /api/keys`
- **Auth:** Admin JWT
- **Returns:** List of all API keys (with decrypted key_value)

#### `GET /api/keys/user/:userId`
- **Auth:** Admin JWT
- **Returns:** API keys for specific user

#### `POST /api/keys/:id/rotate`
- **Auth:** Admin JWT
- **Returns:** New API key
- **Side Effect:** Deletes old key, creates new key, updates UserKey entity

### Provider Routes (`/api/providers`)

#### `GET /api/providers`
- **Auth:** Admin JWT
- **Returns:** List of all providers

#### `POST /api/providers`
- **Auth:** Admin JWT
- **Body:** `{ provider, apiKey, metadata }`
- **Returns:** Created provider
- **Side Effect:** Encrypts API key before storage

#### `GET /api/providers/:name`
- **Auth:** Admin JWT
- **Returns:** Provider details (with decrypted API key)

#### `PUT /api/providers/:name`
- **Auth:** Admin JWT
- **Body:** `{ apiKey, metadata }`
- **Returns:** Updated provider

#### `DELETE /api/providers/:name`
- **Auth:** Admin JWT
- **Returns:** Success message

#### `POST /api/providers/:name/test`
- **Auth:** Admin JWT
- **Returns:** Test connection result

### Entity Routes (`/api/entities`)

#### `GET /api/entities`
- **Auth:** Admin JWT
- **Query Params:** `uid` (optional), `includeApiKeys` (optional)
- **Returns:** List of entities (optionally with API keys attached)

#### `POST /api/entities`
- **Auth:** Admin JWT
- **Body:** `{ uid, attrs, parents }`
- **Returns:** Created entity

#### `PUT /api/entities/:uid`
- **Auth:** Admin JWT
- **Body:** `{ attrs, parents }`
- **Returns:** Updated entity

#### `DELETE /api/entities/:uid`
- **Auth:** Admin JWT
- **Returns:** Success message

### Schema Routes (`/api/schema`)

#### `GET /api/schema`
- **Auth:** Admin JWT
- **Returns:** Current Cedar schema (JSON format)

#### `PUT /api/schema`
- **Auth:** Admin JWT
- **Body:** `{ schema }` (JSON schema object)
- **Returns:** Updated schema
- **Side Effect:** Stores as Cedar text format in database

### Policy Routes (`/api/policies`)

#### `GET /api/policies`
- **Auth:** Admin JWT
- **Returns:** List of all policies (includes `isActive` status)

#### `POST /api/policies`
- **Auth:** Admin JWT
- **Body:** `{ policy, description }`
- **Returns:** Created policy
- **Note:** Policies are created as active by default

#### `PUT /api/policies`
- **Auth:** Admin JWT
- **Body:** `{ oldPolicy, policy, description }`
- **Returns:** Updated policy

#### `PATCH /api/policies/status`
- **Auth:** Admin JWT
- **Body:** `{ policy, isActive }`
- **Returns:** Success message
- **Note:** Activates/deactivates policies. Only active policies are evaluated during authorization.

#### `DELETE /api/policies`
- **Auth:** Admin JWT
- **Body:** `{ policy }`
- **Returns:** Success message

### Chat Routes (`/api/chat`)

#### `POST /api/chat/completions`
- **Auth:** API Key (X-API-Key header)
- **Body:** `{ provider, model, messages, ... }`
- **Returns:** LLM completion response with `_meta.requestId` and `_meta.cost`
- **Process:**
  1. Generate unique `requestId`
  2. Validate API key and load UserKey entity
  3. **Check and reset spend** (daily/monthly boundaries)
  4. Build Cedar authorization request with `model_provider` in context
  5. **Log authorization decision** in `audit_logs` (permit/forbid)
  6. If allowed:
     - Forward request to LLM provider
     - Extract token usage from response
     - **Track cost** in `cost_tracking` table
     - **Update UserKey entity** spend values
     - Update audit log with `provider_request_id` and `cost_tracking_id`
  7. Return response with metadata

### Me Routes (`/api/me`)

#### `GET /api/me`
- **Auth:** JWT token (user or admin)
- **Returns:** Current user info

#### `GET /api/me/keys`
- **Auth:** JWT token (user or admin)
- **Returns:** Current user's API keys (with decrypted key_value)

#### `GET /api/me/usage`
- **Auth:** JWT token (user or admin)
- **Returns:** Usage statistics from UserKey entity

### Config Routes (`/api/config`)

#### `GET /api/stats/overview`
- **Auth:** Admin JWT
- **Returns:** Dashboard overview statistics
  - `totalRequests`: Total number of requests
  - `permitCount`: Number of permitted requests
  - `forbidCount`: Number of forbidden requests
  - `totalCost`: Total cost across all requests

#### `GET /api/audit`
- **Auth:** Admin JWT
- **Query Params:** `limit`, `offset`, `decision`, `provider`, `model`, `startDate`, `endDate`
- **Returns:** Paginated audit logs with filtering

#### `GET /api/audit/statistics`
- **Auth:** Admin JWT
- **Query Params:** `startDate`, `endDate`
- **Returns:** Audit statistics grouped by provider/model

#### `GET /api/costs/summary`
- **Auth:** Admin JWT
- **Query Params:** `groupBy` (day, provider, model, key), `startDate`, `endDate`, `executionKey`
- **Returns:** Cost summaries with optional grouping

#### `GET /api/config`
- **Auth:** Admin JWT
- **Returns:** Current configuration (including master key)

#### `POST /api/config`
- **Auth:** Admin JWT
- **Body:** `{ mode, server, publicUrl, email, logLevel }`
- **Returns:** Updated configuration

---

## Frontend Structure

### Pages

#### Admin Pages (Require Admin Role)

1. **`/` (Dashboard)** - `packages/ui/pages/index.vue`
   - Overview statistics (total requests, permit/forbid counts, total cost)
   - Requests today and average cost per request
   - Recent activity feed from audit logs
   - Quick actions

2. **`/users`** - `packages/ui/pages/users/index.vue`
   - List all users
   - Create new users
   - Delete users
   - Reset passwords

3. **`/keys`** - `packages/ui/pages/keys/index.vue`
   - List all API keys
   - View key details
   - Rotate keys
   - Filter by status (active, inactive, revoked)

4. **`/keys/[id]`** - `packages/ui/pages/keys/[id].vue`
   - View single key details
   - Usage statistics
   - Status management

5. **`/providers`** - `packages/ui/pages/providers.vue`
   - List all providers
   - Add/update provider credentials
   - Test provider connections

6. **`/rules`** - `packages/ui/pages/rules.vue`
   - List all Cedar policies with active/inactive status
   - Create/edit/delete policies
   - Toggle policy status (active/inactive) in create/edit modals
   - Only active policies are evaluated during authorization

7. **`/logs`** - `packages/ui/pages/logs.vue`
   - View comprehensive audit logs
   - Filter by decision, provider, model, date range
   - Real-time authorization decision tracking

8. **`/analytics`** - `packages/ui/pages/analytics.vue`
   - Cost analytics and statistics
   - Daily cost trend charts
   - Cost breakdown by provider and model
   - Usage statistics

9. **`/schema`** - `packages/ui/pages/schema.vue`
   - View/edit Cedar schema
   - Schema validation

10. **`/config`** - `packages/ui/pages/config.vue`
   - Configure server settings
   - Email service configuration
   - Public URL settings

#### User Pages (Accessible by All Authenticated Users)

1. **`/me`** - `packages/ui/pages/me/index.vue`
   - View own profile
   - View own API key
   - View usage statistics

#### Public Pages

1. **`/login`** - `packages/ui/pages/login.vue`
   - Admin and user login
   - Role-based redirect after login

### Composables

#### Authentication Composables

- **`useUnifiedAuth`** - Unified authentication interface
- **`useAdminAuth`** - Admin-specific authentication
- **`useUserAuth`** - User-specific authentication
- **`useAuth`** - Legacy authentication (being phased out)

#### Data Composables

- **`useUsers`** - User management operations
- **`useKeys`** - API key management operations
- **`useProviders`** - Provider management operations
- **`useEntities`** - Entity management operations
- **`useSchema`** - Schema management operations
- **`useRules`** - Policy management operations

#### Cedar Composables

- **`useCedarWasm`** - Cedar-WASM integration
- **`useCedarSchema`** - Schema operations

### Stores (Pinia)

- **`admin-auth`** - Admin authentication state
- **`user-auth`** - User authentication state
- **`config`** - Application configuration

### Middleware

- **`auth-guard.global.ts`** - Global route protection
  - Role-based access control
  - Redirects unauthenticated users to login
  - Restricts admin pages to admin role
  - Allows user pages for all authenticated users

### Server API Routes (Nuxt)

All frontend API calls go through Nuxt server API routes (`packages/ui/server/api/`) which proxy to the backend proxy server. This provides:
- CORS handling
- Authentication header forwarding
- Error handling
- Response transformation

---

## Services & Business Logic

### Service Factory

**Location:** `packages/proxy/src/services/service-factory.ts`

The service factory provides singleton access to services based on mode (local or live):

- **`getAuthorizationService()`** - Returns LocalAuthorizationService or LiveAuthorizationService
- **`getPolicyStore()`** - Returns LocalPolicyStore or LivePolicyStore
- **`getEntityStore()`** - Returns LocalEntityStore or LiveEntityStore
- **`getSchemaStore()`** - Returns LocalSchemaStore or LiveSchemaStore

### Core Services

#### 1. UserService (`packages/proxy/src/services/user-service.ts`)

**Methods:**
- `createUser(email, name, department, isAgent, limitRequestsPerMinute)` - Create user, API key, and entities
- `getUser(userId)` - Get user by ID
- `listUsers()` - List all users
- `deleteUser(userId)` - Delete user (cascades to keys and entities)
- `resetPassword(userId, sendEmail)` - Reset user password
- `updateUser(userId, updates)` - Update user information

**Key Features:**
- Encrypts email before storage
- Hashes email for fast lookup
- Creates API key automatically on user creation
- Creates User and UserKey entities automatically

#### 2. KeyService (`packages/proxy/src/services/key-service.ts`)

**Methods:**
- `createKey(authId)` - Create API key for user
- `getKey(keyId)` - Get key by ID
- `getKeyByUserId(userId)` - Get key by user ID
- `listKeys()` - List all keys
- `rotateKey(keyId)` - Rotate key (delete old, create new)
- `validateApiKey(apiKey)` - Validate API key format and existence

**Key Features:**
- Generates keys in format: `sk-zs-{userId}-{randomHash}`
- Encrypts key_value before storage
- Hashes key for fast validation
- Updates UserKey entity on rotation

#### 3. ProviderService (`packages/proxy/src/services/provider-service.ts`)

**Methods:**
- `createProvider(provider, apiKey, metadata)` - Create provider
- `getProvider(name)` - Get provider by name
- `listProviders()` - List all providers
- `updateProvider(name, apiKey, metadata)` - Update provider
- `deleteProvider(name)` - Delete provider
- `testProviderConnection(name)` - Test provider API connection

**Key Features:**
- Encrypts API key before storage
- Stores metadata as JSON (not encrypted)

#### 4. LLMService (`packages/proxy/src/services/llm-service.ts`)

**Methods:**
- `makeRequest(provider, model, messages, options)` - Make LLM request
- `calculateCost(provider, model, inputTokens, outputTokens)` - Calculate request cost
- `trackCost(keyId, inputTokens, outputTokens, model, cost)` - Track cost in database

**Key Features:**
- Supports multiple providers (OpenAI, Anthropic, etc.)
- Tracks usage in `cost_tracking` table
- Updates UserKey entity spend values

#### 5. LocalAuthorizationService (`packages/proxy/src/services/local/local-authorization-service.ts`)

**Methods:**
- `authorize(request)` - Evaluate authorization using Cedar-WASM

**Process:**
1. Load schema, policies, and entities
2. Parse EntityUID strings
3. Convert entities to Cedar format
4. Build AuthorizationCall object
5. Call Cedar-WASM `isAuthorized()`
6. Return decision and diagnostics

#### 6. LocalEntityStore (`packages/proxy/src/services/local/local-entity-store.ts`)

**Methods:**
- `getEntities(uid?)` - Get all entities or by UID
- `createEntity(uid, attrs, parents)` - Create entity
- `updateEntity(uid, attrs, parents)` - Update entity
- `deleteEntity(uid)` - Delete entity

**Key Features:**
- Stores entities as JSON in `entities` table
- Supports composite primary key (etype, eid)

#### 7. LocalPolicyStore (`packages/proxy/src/services/local/local-policy-store.ts`)

**Methods:**
- `getPolicies()` - Get all active policies
- `createPolicy(policy, description)` - Create policy
- `updatePolicy(id, policy, description, status)` - Update policy
- `deletePolicy(id)` - Delete policy

**Key Features:**
- Stores policies in `schema_policy` table (obj_type='policy')
- Supports status management (active, inactive, deprecated)

#### 8. LocalSchemaStore (`packages/proxy/src/services/local/local-schema-store.ts`)

**Methods:**
- `getSchema()` - Get current schema (returns JSON)
- `getSchemaAsCedarText()` - Get current schema (returns Cedar text)
- `updateSchema(schema)` - Update schema

**Key Features:**
- Stores schema as Cedar text in database
- Converts Cedar text to JSON on retrieval using Cedar-WASM
- Only one active schema allowed

#### 9. PricingService (`packages/proxy/src/services/pricing-service.ts`)

**Methods:**
- `getPricing(provider, model)` - Get pricing for a model (with caching)
- `calculateCost(provider, model, inputTokens, outputTokens, cachedTokens)` - Calculate request cost
- `resolveAlias(provider, alias)` - Resolve model alias to canonical name

**Key Features:**
- Caches pricing data (5-minute TTL)
- Supports model aliases (e.g., "gpt-4" → "gpt-4-0613")
- Handles partial matching for date-suffixed models
- Falls back to default rates if pricing not found

#### 10. AuditLogService (`packages/proxy/src/services/audit-log-service.ts`)

**Methods:**
- `log(entry)` - Log authorization decision
- `getLogs(filters)` - Query audit logs with filtering
- `getStatistics(filters)` - Get audit statistics

**Key Features:**
- Logs all authorization decisions (permit/forbid)
- Captures full request context and Cedar evaluation details
- Links to cost tracking records
- Supports comprehensive filtering and pagination

#### 11. CostTrackingService (`packages/proxy/src/services/cost-tracking-service.ts`)

**Methods:**
- `trackCost(entry)` - Track LLM request cost

**Key Features:**
- Calculates cost using PricingService
- Records detailed cost breakdown (input/output/cache savings)
- Updates UserKey entity spend values automatically
- Links to audit logs and provider request IDs

#### 12. SpendResetService (`packages/proxy/src/services/spend-reset-service.ts`)

**Methods:**
- `checkAndResetSpend(userKeyId)` - Check and reset daily/monthly spend if needed

**Key Features:**
- Automatically resets daily spend at midnight boundary
- Automatically resets monthly spend at month boundary
- Updates UserKey entity in database
- Called before authorization to ensure accurate spend values

#### 13. SpendUpdateService (`packages/proxy/src/services/spend-update-service.ts`)

**Methods:**
- `updateSpend(userKeyId, cost)` - Update UserKey entity spend values

**Key Features:**
- Updates `current_daily_spend` and `current_monthly_spend`
- Maintains spend values for policy evaluation
- Called after successful LLM requests

---

## Cedar Authorization System

### Cedar Schema

The default Cedar schema defines:

**Entity Types:**
- `User` - User information
- `UserKey` - API key information
- `Resource` - LLM resources

**Actions:**
- `completion` - Chat completions
- `fine_tuning` - Fine-tuning operations
- `image_generation` - Image generation
- `embedding` - Embedding generation
- `moderation` - Content moderation

**Context:**
- `RequestContext` - Request metadata (day_of_week, hour, ip_address, is_emergency, model_name, model_provider, request_time)
  - `day_of_week`: String (Monday, Tuesday, etc.)
  - `hour`: Long (0-23)
  - `ip_address`: IP address
  - `is_emergency`: Boolean
  - `model_name`: String (model identifier)
  - `model_provider`: String (openai, anthropic, etc.)
  - `request_time`: String (ISO timestamp)

### Entity Structure

#### User Entity
```json
{
  "uid": { "type": "User", "id": "user-123" },
  "attrs": {
    "user_id": "user-123",
    "email": "user@example.com",
    "department": "Engineering",
    "is_agent": false,
    "limit_requests_per_minute": 100
  }
}
```

#### UserKey Entity
```json
{
  "uid": { "type": "UserKey", "id": "uk-user-123" },
  "attrs": {
    "current_daily_spend": "10.50",
    "current_monthly_spend": "250.00",
    "last_daily_reset": "2025-01-20T00:00:00Z",
    "last_monthly_reset": "2025-01-01T00:00:00Z",
    "status": "active",
    "user": {
      "__entity": {
        "type": "User",
        "id": "user-123"
      }
    }
  }
}
```

### Policy Examples

**Basic Active Status Policy:**
```
permit(principal, action, resource) when { principal.status == "active" };
```

**Department-Based Policy:**
```
permit(principal, action, resource) when { 
  principal.status == "active" && 
  principal.user.department == "Engineering" 
};
```

**Spend Limit Policy:**
```
permit(principal, action, resource) when { 
  principal.status == "active" && 
  principal.current_daily_spend < 100.00 
};
```

**Time-Based Policy:**
```
permit(principal, action, resource) when { 
  principal.status == "active" && 
  context.hour >= 9 && 
  context.hour <= 17 
};
```

### Authorization Evaluation Flow

1. **Request Received** - API key validated, user identified
2. **Load Data** - Schema, policies, entities loaded from database
3. **Build Request** - Authorization request built with principal, action, resource, context
4. **Evaluate** - Cedar-WASM evaluates request against policies
5. **Log Decision** - Decision logged in `audit_logs` table
6. **Return Decision** - Allow or Deny returned
7. **Process Request** - If allowed, request forwarded to LLM provider

---

## Data Flow

### User Creation Flow

```
1. Admin creates user via UI
   ↓
2. POST /api/users (with JWT)
   ↓
3. UserService.createUser()
   ↓
4. Encrypt email, hash email
   ↓
5. Hash password with bcrypt
   ↓
6. Insert into auth table
   ↓
7. KeyService.createKey()
   ↓
8. Generate API key (sk-zs-{userId}-{hash})
   ↓
9. Encrypt key_value, hash key
   ↓
10. Insert into user_agent_keys table
   ↓
11. EntityService.createEntity() - Create User entity
   ↓
12. EntityService.createEntity() - Create UserKey entity
   ↓
13. Return user and API key to frontend
```

### LLM Request Flow

```
1. Client makes request with X-API-Key header
   ↓
2. POST /api/chat/completions
   ↓
3. Validate API key (hash lookup in user_agent_keys)
   ↓
4. Get UserKey entity from entities table
   ↓
5. Build authorization request:
   - principal: UserKey::"uk-{userId}"
   - action: Action::"completion"
   - resource: Resource::"gpt-4"
   - context: RequestContext
   ↓
6. LocalAuthorizationService.authorize()
   ↓
7. Load schema, policies, entities
   ↓
8. Cedar-WASM evaluates authorization
   ↓
9. If Deny: Return 403 Forbidden
   ↓
10. If Allow: Continue
   ↓
11. Get provider API key (decrypt from provider_keys)
   ↓
12. Forward request to LLM provider
   ↓
13. Receive response from LLM provider
   ↓
14. Calculate cost (input/output tokens)
   ↓
15. Track cost in cost_tracking table
   ↓
16. Update UserKey entity spend values
   ↓
17. Return response to client
```

### Authentication Flow

```
1. User submits login form
   ↓
2. POST /api/auth/user/login
   ↓
3. Hash email to get email_hash
   ↓
4. Lookup user in auth table by email_hash
   ↓
5. Decrypt email field
   ↓
6. Verify password with bcrypt
   ↓
7. Generate JWT access token (15 min expiry)
   ↓
8. Generate JWT refresh token (30 day expiry)
   ↓
9. Hash refresh token
   ↓
10. Insert refresh token into refresh_tokens table
   ↓
11. Update last_sign_in timestamp
   ↓
12. Return tokens and user info
   ↓
13. Frontend stores tokens in localStorage
   ↓
14. Frontend includes token in Authorization header for subsequent requests
```

---

## Configuration

### Configuration File Location

- **Windows**: `%APPDATA%\zs-ai\config.json`
- **macOS/Linux**: `~/.zs-ai/config.json`

### Configuration Structure

```json
{
  "mode": "local",
  "server": {
    "host": "127.0.0.1",
    "port": 3100
  },
  "publicUrl": "",
  "email": {
    "enabled": false,
    "provider": "smtp",
    "smtp": {
      "host": "",
      "port": 587,
      "secure": false,
      "auth": {
        "user": "",
        "pass": ""
      }
    },
    "sendGrid": {
      "apiKey": ""
    }
  },
  "logLevel": "info",
  "masterKey": "generated-master-key",
  "encryptionKey": "generated-encryption-key"
}
```

### Encryption Key Management

**Behavior:**
- **Generated once on first run** and stored persistently
- **NOT rotated periodically** - same key is reused across restarts
- Used for encrypting sensitive data (emails, API keys)

**Priority Order (for reading existing key):**
1. Environment Variable (`ZS_AI_ENCRYPTION_KEY`)
2. Secure File (`~/.zs-ai/encryption.key`)
3. Config File (`encryptionKey` field)
4. Auto-generate and store (if none exist)

**Storage:**
- First tries to save to secure file (`~/.zs-ai/encryption.key`)
- Falls back to config file if file write fails
- Once generated, key is reused on subsequent restarts

### Master Key Management

**Behavior:**
- **Regenerated on every server restart** (stored in memory only)
- Can be overridden via environment variable `ZS_AI_MASTER_KEY` for persistence
- Displayed in console on each server start
- Used for admin authentication fallback
- **Important**: If not using environment variable, master key changes on every restart

**Usage:**
- Admin can login with username `admin` or `admin@zs-ai.local` and the master key as password
- For persistent key across restarts, set `ZS_AI_MASTER_KEY` environment variable

---

## Key Features

### 1. Automatic API Key Creation

When a user is created, an API key is automatically generated and stored. No separate key creation step is needed.

### 2. Key Rotation

Keys can be rotated, which:
- Deletes the old key from database
- Creates a new key
- Updates the UserKey entity
- Returns the new key (shown only once)

### 3. Entity Synchronization

User and UserKey entities are automatically created/updated when:
- User is created
- User is updated
- API key is rotated
- User is deleted (entities cascade deleted)

### 4. Comprehensive Cost Tracking

Every LLM request:
- Calculates cost based on tokens and model pricing (from `model_pricing` table)
- Tracks detailed cost breakdown in `cost_tracking` table (input/output/cache savings)
- Updates UserKey entity spend values (`current_daily_spend`, `current_monthly_spend`)
- Automatically resets daily/monthly spend at boundaries
- Supports daily/monthly spend limits (enforced by Cedar policies)
- Links cost records to audit logs and provider request IDs

### 5. Encryption at Rest

Sensitive data is encrypted before storage:
- User emails (PII protection)
- API keys (credential protection)
- Provider API keys (credential protection)

### 6. Role-Based Access Control

- **Admin Role**: Full access to all pages and operations
- **User Role**: Access only to `/me` page (own profile)

### 7. Refresh Token Rotation

Refresh tokens are rotated on use:
- Old token marked as used
- New token generated
- Prevents token reuse attacks

### 8. Comprehensive Audit Logging

All authorization decisions are logged in `audit_logs` table:
- Principal, action, resource, provider, model
- Decision (permit/forbid) with reason
- All policies evaluated and determining policies
- Full request context (IP, user agent, method, path)
- Cedar context and entity snapshots
- Authorization timing (start/end/duration)
- Links to cost tracking records
- Supports filtering by decision, provider, model, date range

### 9. Model Pricing Management

- Pre-seeded pricing data for OpenAI and Anthropic models
- Model aliases support (e.g., "gpt-4" → "gpt-4-0613")
- Pricing caching for performance
- Automatic cost calculation based on token usage
- Support for cache pricing (write/read costs)

### 10. Policy Status Management

- Policies can be activated/deactivated by admins
- Only active policies (status = 1) are evaluated during authorization
- Status toggle available in create/edit modals
- Inactive policies remain in database for audit trail

---

## Project Structure

```
.
├── packages/
│   ├── proxy/                    # Backend proxy server
│   │   ├── src/
│   │   │   ├── routes/           # API route handlers
│   │   │   │   ├── auth.ts       # Authentication routes
│   │   │   │   ├── users.ts      # User management routes
│   │   │   │   ├── keys.ts       # API key routes
│   │   │   │   ├── providers.ts  # Provider routes
│   │   │   │   ├── entities.ts   # Entity routes
│   │   │   │   ├── schema.ts     # Schema routes
│   │   │   │   ├── policies.ts   # Policy routes
│   │   │   │   ├── chat.ts       # LLM request routes
│   │   │   │   ├── me.ts         # Current user routes
│   │   │   │   └── config.ts     # Configuration routes
│   │   │   ├── services/         # Business logic
│   │   │   │   ├── user-service.ts
│   │   │   │   ├── key-service.ts
│   │   │   │   ├── provider-service.ts
│   │   │   │   ├── llm-service.ts
│   │   │   │   ├── service-factory.ts
│   │   │   │   ├── local/        # Local mode implementations
│   │   │   │   │   ├── local-authorization-service.ts
│   │   │   │   │   ├── local-entity-store.ts
│   │   │   │   │   ├── local-policy-store.ts
│   │   │   │   │   └── local-schema-store.ts
│   │   │   │   └── live/         # Live mode implementations
│   │   │   │       ├── live-authorization-service.ts
│   │   │   │       ├── live-entity-store.ts
│   │   │   │       ├── live-policy-store.ts
│   │   │   │       └── live-schema-store.ts
│   │   │   ├── db/               # Database layer
│   │   │   │   ├── index.ts      # Database connection
│   │   │   │   ├── schema.ts     # Schema definitions
│   │   │   │   └── seed.ts       # Default data seeding
│   │   │   ├── middleware/       # Express middleware
│   │   │   │   ├── auth.ts       # Authentication middleware
│   │   │   │   └── cors.ts        # CORS middleware
│   │   │   ├── utils/            # Utility functions
│   │   │   │   ├── encryption.ts # Encryption utilities
│   │   │   │   ├── api-key.ts    # API key utilities
│   │   │   │   └── master-key.ts # Master key utilities
│   │   │   ├── index.ts          # Entry point
│   │   │   └── server.ts         # Server setup
│   │   └── package.json
│   ├── ui/                       # Frontend management UI
│   │   ├── pages/                # Vue pages
│   │   │   ├── index.vue         # Dashboard
│   │   │   ├── login.vue         # Login page
│   │   │   ├── users/            # User management
│   │   │   ├── keys/             # Key management
│   │   │   ├── providers.vue     # Provider management
│   │   │   ├── rules.vue         # Policy management
│   │   │   ├── schema.vue        # Schema management
│   │   │   ├── config.vue        # Configuration
│   │   │   └── me/               # User profile
│   │   ├── components/           # Vue components
│   │   ├── composables/          # Vue composables
│   │   ├── stores/               # Pinia stores
│   │   ├── middleware/           # Nuxt middleware
│   │   ├── server/               # Nuxt server API routes
│   │   └── package.json
│   ├── sdk/                      # Client SDKs
│   ├── auth-plugin/              # M2M authentication plugin
│   ├── cli/                      # CLI tool
│   └── config/                   # Shared configuration
├── README.md                      # Main documentation
├── QUICKSTART.md                  # Quick start guide
└── PROJECT_DOCUMENTATION.md      # This file
```
