# ZIRI Proxy Server

## What It Does

The proxy server provides:

- **Gateway API** - Standard LLM endpoints (`/api/chat/completions`, `/api/embeddings`, `/api/images`) that forward requests to providers like OpenAI and Anthropic
- **Authorization** - Policy-based access control using Cedar. You define rules that control who can do what
- **User and API Key Management** - Create users, generate API keys, and manage access
- **Rate Limiting** - Per-user and per-key rate limits to prevent abuse
- **Cost Tracking** - Track spending per user/key with daily and monthly summaries
- **Admin Dashboard** - Web UI for managing everything (bundled with the server)
- **Role-Based Access** - Dashboard users can have different roles (Admin, Viewer, User Admin, Policy Admin) with different permissions

## Quick Start

### Using Docker (Recommended)

The easiest way to run ZIRI is with Docker:

```bash
docker run -d \
  -p 3100:3100 \
  -v ziri-data:/data \
  -e CONFIG_DIR=/data \
  ziri/proxy:latest
```

Or use Docker Compose:

```yaml
services:
  proxy:
    image: ziri/proxy:latest
    ports:
      - "3100:3100"
    volumes:
      - ziri-data:/data
    environment:
      - CONFIG_DIR=/data
      - PORT=3100
      - HOST=0.0.0.0
    restart: unless-stopped

volumes:
  ziri-data:
```

### Using npm

If you're developing or want to run it directly:

```bash
npm install @ziri/proxy
npx ziri start
```

Or programmatically:

```javascript
import { startServer } from '@ziri/proxy'

const { port, url } = await startServer()
console.log(`Server running at ${url}`)
```

## First Run

When you start the proxy for the first time, it will:

1. **Generate a root key** - Written to `.ziri-root-key` in the config directory (not printed to logs). This is your admin password.
2. **Create the database** - SQLite database at:
   - Windows: `%APPDATA%\ziri\proxy.db`
   - macOS/Linux: `~/.ziri/proxy.db`
3. **Create the admin user**:
   - User ID: `ziri`
   - Password: Same as root key
   - Email: `ziri@ziri.local`
   - Role: Admin (full access)

On first start, the root key is generated and stored in the `.ziri-root-key` file inside the config directory.

## Accessing the Admin UI

Once the server is running, open your browser to:

- **URL**: `http://localhost:3100` (or your configured port)

Log in with:
- Username/Email: `ziri` or `ziri@ziri.local`
- Password: The root key from `.ziri-root-key`

## Dashboard Users and Roles

The proxy supports role-based access control for dashboard users (people who log into the admin UI). There are four roles:

- **Admin** - Full access to everything, including managing other dashboard users
- **Viewer** - Read-only access to all pages (can view but not modify)
- **User Admin** - Viewer permissions plus full access to Users and API Keys management
- **Policy Admin** - Viewer permissions plus full access to Rules (policies) management

Only Admins can access the Settings section (Configuration and Manage Users pages). Other roles have those sections hidden.

Dashboard users are separate from access users (end users who use the gateway with API keys). Dashboard users don't get API keys and don't use the gateway endpoints.

## Configuration

Configuration is stored in a `config.json` file in the config directory:

- Windows: `%APPDATA%\ziri\config.json`
- macOS/Linux: `~/.ziri/config.json`

You can also set the config directory via the `CONFIG_DIR` environment variable.

Default configuration:

```json
{
  "mode": "local",
  "server": {
    "host": "127.0.0.1",
    "port": 3100
  },
  "publicUrl": "",
  "email": {
    "enabled": false
  }
}
```

Update configuration via the UI's Config page (Admin only) or by editing the file directly.

## Environment Variables

- `PORT` - Server port (default: 3100)
- `HOST` - Server host (default: 127.0.0.1)
- `CONFIG_DIR` - Directory for config and data files
- `ZIRI_ENCRYPTION_KEY` - Encryption key for sensitive data (optional, auto-generated)
- `ROTATE_ROOT_KEY` - When set to `true`, rotate the root key on every startup; when unset or `false`, reuse the key from `.ziri-root-key` after first creation.
- `NODE_ENV` - Environment (`development` or `production`)

## API Endpoints

The proxy exposes several API endpoints:

- `/api/chat/completions` - Chat completions (OpenAI-compatible)
- `/api/embeddings` - Embeddings (OpenAI-compatible)
- `/api/images` - Image generation (OpenAI-compatible)
- `/api/users` - User management
- `/api/keys` - API key management
- `/api/policies` - Policy (rule) management
- `/api/schema` - Cedar schema management
- `/api/providers` - Provider configuration
- `/api/config` - Server configuration
- `/api/dashboard-users` - Dashboard user management (Admin only)
- `/api/authz/check` - Authorization check (for UI)
- `/api/authz/check-batch` - Batch authorization checks (for UI)
- `/health` - Health check

All admin endpoints require authentication (JWT token or `x-root-key` header).

## How It Works

When a request comes in:

1. **Authentication** - Validates the API key or admin session
2. **Key Lookup** - Finds the user associated with the API key
3. **Status Check** - Verifies the key is active (not revoked or disabled)
4. **Rate Limiting** - Checks if the user has exceeded their rate limits
5. **Cost Estimation** - Calculates the estimated cost for the request
6. **Spend Reservation** - Reserves the estimated cost (prevents overspending)
7. **Authorization** - Evaluates Cedar policies to determine if the request is allowed
8. **Provider Call** - If authorized, forwards the request to the configured provider
9. **Cost Tracking** - Records the actual cost and updates spending totals
10. **Response** - Returns the provider's response to the client

If authorization fails or an error occurs, reserved spend is released automatically.

## Development

### Building

```bash
# Build everything (proxy + UI)
npm run build

# Build proxy only (assumes UI already built)
npm run build:proxy

# Build UI separately
npm run build:ui
```

### Running in Development

```bash
# Development mode with hot reload
npm run dev

# Production mode
npm start
```

### Load testing (wrk)

For measuring proxy throughput/latency without hitting external providers, see `packages/proxy/loadtest/`.

### Testing with Bruno

The Bruno API collection is in `packages/proxy/bruno/`. It covers all API endpoints and handles the full auth/setup flow automatically via post-response scripts.

#### Prerequisites

- [Bruno](https://www.usebruno.com/) installed (GUI) or `@usebruno/cli` installed (CLI: `npm install -g @usebruno/cli`)
- The proxy running locally (`npm run dev` or `npm start`)
- A copy of `packages/proxy/bruno/environments/Local.bru.example` saved as `Local.bru` with your secrets filled in

#### Without SSL (HTTP)

No extra configuration needed. Set `baseUrl` to `http://localhost:3000` in your `Local.bru` environment file.

**GUI:**
1. Open Bruno and load the `packages/proxy/bruno/` folder as a collection.
2. Select the **Local** environment from the environment picker.
3. Set `rootKey` to the value from your `.ziri-root-key` file.
4. Run requests individually or use **Run Collection**.

**CLI:**
```bash
cd packages/proxy/bruno
bru run . -r --env Local
```

#### With SSL (HTTPS / mkcert)

Bruno must trust the mkcert root CA. Do not use `--insecure`.

1. **Generate certificates** if not already done — see the Local mkcert Setup section in the root README. Ensure `certs/rootCA.pem` exists.

2. Set `baseUrl` to `https://localhost:3000` (or your HTTPS port) in `Local.bru`.

3. **GUI — trust the CA in Bruno preferences:**
   - Open Bruno → **Preferences** (gear icon) → **Use Custom CA Certificate**.
   - Set the path to your mkcert root CA:
     - Repo certs (recommended): absolute path to `certs/rootCA.pem` in your repo root (e.g. `C:\path\to\ziri\certs\rootCA.pem`).
     - mkcert default location: `$(mkcert -CAROOT)/rootCA.pem` (Windows: `%LOCALAPPDATA%\mkcert\rootCA.pem`).
   - Leave **SSL/TLS Certificate Validation** enabled.
   - Run as normal — same steps as HTTP above.

4. **CLI — add `cacert` to `bruno.json`** before running:

   ```json
   {
     "version": "1",
     "name": "ZIRI Gateway API",
     "type": "collection",
     "ignore": ["node_modules", "dist"],
     "cacert": "/absolute/path/to/your/rootCA.pem"
   }
   ```

   The path can be absolute or relative to the collection root. For the repo's `certs/` folder:

   ```json
   "cacert": "../../../../certs/rootCA.pem"
   ```

   Then run:

   ```bash
   cd packages/proxy/bruno
   bru run . -r --env Local
   ```

#### Collection flow

The collection uses post-response scripts to pass data between requests automatically (e.g. `adminToken`, `testUserId`, `testApiKey`). Run folders in order:

| Folder | Purpose |
|--------|---------|
| 01 - Health | Verify the proxy is up |
| 02 - Auth | Admin login — sets `adminToken` |
| 03–13 | Setup: providers, roles, policies, users, keys, dashboard users |
| 14 - LLM | End-to-end LLM calls with a user API key |
| 15–19 | Read/list endpoints for all resources |
| 20 - Cleanup | Delete test data created during the run |

Run **02 - Auth / Admin Login** before any admin endpoint. Run **06 - Users / Create User** before any user-scoped endpoint.