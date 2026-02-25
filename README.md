# ZIRI

This repository contains:
- A proxy server, delivered to end users as a Docker image
- A lightweight SDK, delivered as the `@ziri/sdk` npm package
- Documentation, built with VitePress


## What ZIRI Provides

- **Policy-based access control** using Cedar
- **API key management** for your users and teams
- **Per-user and per-key rate limiting**
- **Cost tracking** with daily/monthly summaries
- **Audit logs** for every authorization decision
- **Web-based admin UI** bundled with the proxy server
- **Role-based dashboard access** (Admin, Viewer, User Admin, Policy Admin)
- **SDK** for simple, type-safe integration from Node.js/TypeScript

You run the proxy wherever you like (laptop, VM, container host), then share its URL with your end users or services. They talk to ZIRI directly over HTTP or via the SDK.

## How You Use ZIRI

At a high level:

1. **Run the proxy** using the official Docker image (usually via Docker Compose)
2. **Log in to the admin UI** with the root key (written to `.ziri-root-key` in the config directory; not printed to logs)
3. **Configure a provider** (e.g., OpenAI API key)
4. **Create a user**, which automatically gets an API key
5. **Give the API key and proxy URL** to your application or team
6. **Make requests** to `/api/chat/completions`, `/api/embeddings`, or `/api/images` through ZIRI

The sections below show this end to end.

## Running the Proxy (Docker)

ZIRI is designed to be run as a container.

### Minimal docker-compose.yml

Create a `docker-compose.yml`:

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

Start the proxy:

```bash
docker compose up -d
```

The root key is written to `.ziri-root-key` in the config directory (e.g. `/data/.ziri-root-key` when using the default volume). It is not printed to logs. To use a fixed key, set `ZIRI_ROOT_KEY` in the environment.

To start completely fresh (wipe database and optionally the root key), from the repo root run:

```bash
cd packages/proxy && node scripts/drop-tables.js
```

Add `--reset-root-key` to also remove `.ziri-root-key` so a new root key is generated on next start. Then start the proxy again.

### Accessing the Admin UI

Open the UI in your browser:

- URL: `http://localhost:3100`

Log in with:
- **Username/Email**: `ziri` or `ziri@ziri.local`
- **Password**: the root key from `.ziri-root-key` (or the value of `ZIRI_ROOT_KEY`)

From the UI you can:
- Add LLM providers (OpenAI, Anthropic, etc.)
- Create users and manage their API keys
- Define Cedar policies (rules)
- Manage dashboard users and roles (Admin only)
- Inspect logs, costs, and statistics

## First-Time Setup

Once the proxy is running and you are logged in:

1. **Configure a provider**
   - Go to `Providers`
   - Click `Add Provider`
   - Set `name` (e.g., `openai`), display name, and your provider API key

2. **Create a user**
   - Go to `Users`
   - Click `Create User`
   - Enter email, name, and any other requested fields
   - A password and API key will be generated (you can always rotate keys later)

3. **Get the API key**
   - Go to `Keys`
   - Find the key for your new user
   - Open it and copy the API key (it will only be shown once)

4. **Create a simple policy**
   - Go to `Rules`
   - Click `Create Rule`
   - Use a simple template such as:

   ```cedar
   permit (
       principal,
       action == Action::"completion",
       resource
   )
   when {
       principal.status == "active"
   };
   ```

5. **Make your first request** (see next section).

## Making Requests Through ZIRI

With the proxy running and an API key ready:

```bash
curl -X POST http://localhost:3100/api/chat/completions \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sk-zs-your-api-key-here" \
  -d '{
    "provider": "openai",
    "model": "gpt-4o-mini",
    "messages": [
      {"role": "user", "content": "Hello, ZIRI!"}
    ]
  }'
```

If your policy allows the request and the provider is configured correctly, you will see a normal chat completion response. The decision, cost, and metadata will be recorded in the audit logs and can be viewed in the UI.

Health check:

```bash
curl http://localhost:3100/health
```

## Using the SDK (`@ziri/sdk`)

For applications running on Node.js or in TypeScript/JavaScript:

```bash
npm install @ziri/sdk
```

Basic usage:

```ts
import { UserSDK } from '@ziri/sdk'

const sdk = new UserSDK({
  apiKey: 'sk-zs-your-api-key-here',
  proxyUrl: 'http://localhost:3100'
})

const response = await sdk.chatCompletions({
  provider: 'openai',
  model: 'gpt-4o-mini',
  messages: [
    { role: 'user', content: 'Hello, ZIRI!' }
  ]
})

console.log(response.choices[0].message.content)
```

You can also call embeddings and image generation through the SDK. See the SDK documentation for a full API reference.

## Configuration Overview

The proxy is configured via:
- Environment variables (e.g., `CONFIG_DIR`, `PORT`, `HOST`, `ZIRI_ROOT_KEY`)
- A `config.json` file stored in the config directory (inside the Docker volume by default)

Common patterns:

- Use `CONFIG_DIR=/data` in the container so config and data live in the `ziri-data` volume
- Use a `.env` file next to your `docker-compose.yml` for secrets:

  ```bash
  # .env
  ROOT_KEY=your-root-key
  ENCRYPTION_KEY=your-encryption-key
  ```

  ```yaml
  environment:
    - CONFIG_DIR=/data
    - PORT=3100
    - HOST=0.0.0.0
    - ZIRI_ROOT_KEY=${ROOT_KEY}
    - ZIRI_ENCRYPTION_KEY=${ENCRYPTION_KEY}
  ```

For more details, see the configuration section of the documentation.

## SSL / HTTPS Configuration

ZIRI supports optional HTTPS for both the proxy server and the frontend dev server. SSL is opt-in — without certificates, everything runs on HTTP as before. Any PEM-format certificate works (mkcert, Let's Encrypt, corporate CA).

### Quick Setup (Local Development)

1. **Install [mkcert](https://github.com/FiloSottile/mkcert)**:

   ```bash
   # Windows: choco install mkcert (or scoop install mkcert)
   # macOS: brew install mkcert
   # Linux: sudo apt install libnss3-tools && brew install mkcert
   ```

2. **Generate certificates**:

   ```bash
   mkcert -install
   mkdir certs
   mkcert -key-file ./certs/key.pem -cert-file ./certs/cert.pem localhost 127.0.0.1
   cp "$(mkcert -CAROOT)/rootCA.pem" ./certs/rootCA.pem
   ```

   On Windows (PowerShell), replace the last line with:
   ```powershell
   Copy-Item "$(mkcert -CAROOT)\rootCA.pem" .\certs\rootCA.pem
   ```

3. **Add SSL to your config** (`%APPDATA%\ziri\config.json` on Windows, `~/.ziri/config.json` on macOS/Linux):

   ```json
   {
     "ssl": {
       "enabled": true,
       "cert": "/absolute/path/to/certs/cert.pem",
       "key": "/absolute/path/to/certs/key.pem"
     }
   }
   ```

4. **Start the dev servers** — the frontend auto-detects the certs and switches to HTTPS:

   ```bash
   npm run dev
   ```

You can also configure SSL via environment variables: `SSL_ENABLED`, `SSL_CERT_PATH`, `SSL_KEY_PATH`.

### Docker with SSL

```yaml
services:
  proxy:
    image: ziri/proxy:latest
    ports:
      - "3100:3100"
    volumes:
      - ziri-data:/data
      - ./certs:/certs:ro
    environment:
      - CONFIG_DIR=/data
      - HOST=0.0.0.0
      - SSL_ENABLED=true
      - SSL_CERT_PATH=/certs/cert.pem
      - SSL_KEY_PATH=/certs/key.pem
    restart: unless-stopped

volumes:
  ziri-data:
```

For public-facing deployments, consider using a reverse proxy (nginx, Caddy) with Let's Encrypt instead of terminating TLS in ZIRI directly.

### Troubleshooting

- **"fetch failed" in dev mode** — `rootCA.pem` is missing from `certs/`. Run: `cp "$(mkcert -CAROOT)/rootCA.pem" ./certs/rootCA.pem`
- **Browser shows certificate warning** — Run `mkcert -install` and restart your browser
- **Proxy falls back to HTTP** — Check that `cert` and `key` paths in `config.json` are absolute and the files exist

To disable SSL, remove the `ssl` section from `config.json` or set `"enabled": false`.

## Development

If you are working on ZIRI itself (not just using it), you will need:

- Node.js 20+
- npm

Clone and set up:

```bash
git clone https://github.com/zstrikehq/ziri.git
cd ziri
npm install
```

Useful scripts:

```bash
# Run proxy in development mode
npm run dev:proxy

# Run documentation
cd docs && npm run dev

# Build everything
npm run build
```