---
title: Testing the Proxy with Bruno
weight: 80
---

The proxy ships with a [Bruno](https://www.usebruno.com/) API collection that covers every endpoint. It handles the full setup flow automatically — admin login, resource creation, LLM calls, and cleanup — using post-response scripts to pass tokens and IDs between requests.

The collection lives at `packages/proxy/bruno/`.

## Prerequisites

- Bruno installed: [download the GUI](https://www.usebruno.com/) or install the CLI with `npm install -g @usebruno/cli`
- The proxy running (see [Getting Started](/docs/getting-started/))
- Environment file configured (see [Environment Setup](#environment-setup) below)

## Environment Setup

Copy the example environment file and fill in your secrets:

```bash
cp packages/proxy/bruno/environments/Local.bru.example \
   packages/proxy/bruno/environments/Local.bru
```

Open `Local.bru` and set:

| Variable | Where to find it |
|----------|-----------------|
| `baseUrl` | `http://localhost:3100` (HTTP) or `https://localhost:3100` (HTTPS) |
| `rootKey` | Contents of `.ziri-root-key` at the repo root |

The other variables (`testUserId`, `adminToken`, `testApiKey`, etc.) are populated automatically by post-response scripts as you run the collection. You do not need to set them manually.

`Local.bru` is gitignored. Never commit it — it contains your root key.

## Running Without SSL (HTTP)

The simplest setup. No certificate configuration required.

Set `baseUrl` to `http://localhost:3100` in `Local.bru`, then:

**GUI:**
1. Open Bruno and open the `packages/proxy/bruno/` folder as a collection.
2. Select **Local** from the environment picker (top right).
3. Run individual requests, a folder, or the full collection via **Run Collection**.

**CLI:**
```bash
cd packages/proxy
npm run test:bruno
```
Or from the bruno folder: `bru run . -r --env Local`

## Running With SSL (HTTPS / mkcert)

When the proxy uses a local mkcert certificate, Bruno must trust the mkcert root CA. SSL verification stays enabled — do not use `--insecure`.

### Step 1: Generate certificates

Follow the Local mkcert Setup section in the [proxy README](https://github.com/your-org/ziri/blob/main/packages/proxy/README.md). After setup, `certs/rootCA.pem` should exist at the repo root.

### Step 2: Configure trust

**CLI** — `bruno.json` already includes `cacert: "../../../certs/rootCA.pem"`. Run:

```bash
cd packages/proxy
npm run test:bruno
```

The script passes `--cacert` so Bruno trusts the mkcert certificate. To run manually: `bru run . -r --env Local --cacert ../../../certs/rootCA.pem`

**GUI** — configure Bruno preferences once:

1. Open Bruno → **Preferences** (gear icon).
2. Find **Use Custom CA Certificate**.
3. Set the path to your mkcert root CA. Use one of:
   - Repo path (recommended): absolute path to `certs/rootCA.pem` in your repo (e.g. `C:\Users\you\ziri\certs\rootCA.pem`)
   - mkcert default: result of `mkcert -CAROOT` + `/rootCA.pem` (Windows: `%LOCALAPPDATA%\mkcert\rootCA.pem`)
4. Leave **SSL/TLS Certificate Validation** enabled.

### Step 3: Run

Set `baseUrl` to `https://localhost:3100` in `Local.bru`, then run as described in the HTTP section above.

## Collection Flow

The collection is organized into numbered folders. Run them in order for a complete end-to-end test:

| Folder | What it does |
|--------|-------------|
| 01 - Health | Confirms the proxy is reachable |
| 02 - Auth | Admin login — captures `adminToken` |
| 03 - Providers | Create a test LLM provider |
| 04 - Provider Keys | Add an API key for the provider |
| 05 - Roles | Create a test role |
| 06 - Users | Create a test user — captures `testUserId` |
| 07 - Keys | Generate an API key for the user — captures `testApiKey` |
| 08 - Policies | Create and attach a policy |
| 09 - Config | Read proxy configuration |
| 10 - Entities | Read Cedar entity data |
| 11 - Dashboard Users | Create a dashboard (viewer) user |
| 12 - Usage | Read usage statistics |
| 13 - Logs | Read audit logs |
| 14 - LLM | End-to-end LLM requests: chat completion, embeddings, image generation |
| 15–19 | List/read endpoints for all resources |
| 20 - Cleanup | Delete all test data created during the run |

**Important:** Run **02 - Auth / Admin Login** before any admin endpoint. Run **06 - Users / Create User** before any user-scoped request.

## LLM Endpoint Tests

The LLM folder (`14 - LLM`) tests real upstream calls. If no valid API key or policy is configured, the gateway returns a known error code rather than forwarding the request. The tests treat these codes as expected non-bugs:

- `API_KEY_REQUIRED`, `INVALID_API_KEY_FORMAT`, `API_KEY_INVALID`
- `API_KEY_REVOKED_OR_DISABLED`, `DASHBOARD_USER_DISABLED`
- `USER_KEY_NOT_FOUND`, `USER_ENTITY_NOT_FOUND`
- `RATE_LIMIT_EXCEEDED`, `AUTHORIZATION_DENIED`, `REQUEST_FAILED`, `QUEUE_FULL`

A 200 response means the request reached the upstream provider successfully.

## Excluded Endpoints

Two endpoints are intentionally not included in the collection:

| Endpoint | Reason |
|----------|--------|
| `PUT /api/entities` | Modifies the Cedar authorization store directly. No create/delete pair exists to safely undo changes, so automated testing would leave the store in a modified state. |
| `GET /api/events` | Server-Sent Events (SSE) stream. Hangs indefinitely when run as part of a collection. |
