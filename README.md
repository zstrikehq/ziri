# ZIRI

ZIRI is a production-grade LLM gateway that sits between your applications and providers like OpenAI and Anthropic. It adds authorization, rate limiting, cost tracking, and audit logging on top of standard LLM APIs.

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
- **SDK** for simple, type-safe integration from Node.js/TypeScript

You run the proxy wherever you like (laptop, VM, container host), then share its URL with your end users or services. They talk to ZIRI directly over HTTP or via the SDK.

## How You Use ZIRI

At a high level:

1. **Run the proxy** using the official Docker image (usually via Docker Compose)
2. **Log in to the admin UI** with the master key printed in the logs
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

View logs and capture the master key:

```bash
docker compose logs | grep "MASTER KEY"
```

You should see a line like:

```text
Master Key: a751bf51140e64f315c8bf6f643c643a59aeba54e506c04cccfca6105f15198e
```

Save this key; it is your initial admin password.

### Accessing the Admin UI

Open the UI in your browser:

- URL: `http://localhost:3100`

Log in with:
- **Username/Email**: `admin` or `admin@ziri.local`
- **Password**: the master key from the logs

From the UI you can:
- Add LLM providers (OpenAI, Anthropic, etc.)
- Create users and manage their API keys
- Define Cedar policies (rules)
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
- Environment variables (e.g., `CONFIG_DIR`, `PORT`, `HOST`, `ZIRI_MASTER_KEY`)
- A `config.json` file stored in the config directory (inside the Docker volume by default)

Common patterns:

- Use `CONFIG_DIR=/data` in the container so config and data live in the `ziri-data` volume
- Use a `.env` file next to your `docker-compose.yml` for secrets:

  ```bash
  # .env
  MASTER_KEY=your-master-key
  ENCRYPTION_KEY=your-encryption-key
  ```

  ```yaml
  environment:
    - CONFIG_DIR=/data
    - PORT=3100
    - HOST=0.0.0.0
    - ZIRI_MASTER_KEY=${MASTER_KEY}
    - ZIRI_ENCRYPTION_KEY=${ENCRYPTION_KEY}
  ```

For more details, see the configuration section of the documentation.

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