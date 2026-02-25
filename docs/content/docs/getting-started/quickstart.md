---
title: Quick Start
weight: 20
---

Get ZIRI running and make your first request in about five minutes.

## Prerequisites

-   Docker and Docker Compose installed
-   An OpenAI API key (or Anthropic, for testing)

## Step 1: Start ZIRI

Create a `docker-compose.yml` file:

```yaml {filename="docker-compose.yml"}
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

Start ZIRI:

```bash
docker compose up -d
```

On first run, ZIRI generates a **root key** and stores it in the config directory as `.ziri-root-key`.

With the example `docker-compose.yml` (which sets `CONFIG_DIR=/data`), the file lives at `/data/.ziri-root-key` inside the container. You can read it like this:

```bash
docker compose exec proxy cat /data/.ziri-root-key
```

**Important**: Save the root key. You'll need it to log into the admin UI as the initial `ziri` admin.

## Step 2: Access the Admin UI

Open `http://localhost:3100` in your browser. You'll be redirected to the login page.

Log in with:

-   **Username / Email**: `ziri` or `ziri@ziri.local`
-   **Password**: The root key from Step 1 (or the value of `ZIRI_ROOT_KEY` if you set it)

## Step 3: Configure a Provider

Before making requests, you need to add a provider API key:

1. Click **Providers** in the sidebar
2. Click **Add Provider**
3. Fill in:
    - **Name**: `openai`
    - **Display Name**: `OpenAI`
    - **API Key**: Your OpenAI API key
4. Click **Save**

## Step 4: Create a User

Create a user to get an API key:

1. Click **Users** in the sidebar
2. Click **Create User**
3. Fill in:
    - **Email**: `test@example.com`
    - **Name**: `Test User`
    - **Tenant**: `engineering` (optional)
    - **Role**: `analyst` (optional)
    - **Create API Key**: enabled
4. Click **Create User**

When **Create API Key** is enabled, ZIRI creates and returns a key for the new user.

## Step 5: Get the API Key

1. Click **Keys** in the sidebar
2. Find the key for your user
3. Click on it to view details
4. Copy the API key (format: `sk-zs-user-123-abc456`)

**Note**: The key is only shown once. If you lose it, you'll need to rotate it (which creates a new key and deletes the old one).

## Step 6: Create a Policy

By default, no requests are allowed. Create a simple policy:

1. Click **Rules** in the sidebar
2. Click **Create Rule**
3. Use a template or write your own:

```cedar {filename="policy.cedar"}
permit (
    principal,
    action == Action::"completion",
    resource
)
when {
    principal.status == "active"
};
```

This allows any active user key to make completion requests.

4. Add a description: "Allow completions for active keys"
5. Click **Create**

## Step 7: Make Your First Request

Now test it with curl:

```bash
curl -X POST http://localhost:3100/api/chat/completions \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sk-zs-your-user-id-your-key-hash" \
  -d '{
    "provider": "openai",
    "model": "gpt-4o-mini",
    "messages": [
      {"role": "user", "content": "Hello, ZIRI!"}
    ]
  }'
```

Replace `sk-zs-your-user-id-your-key-hash` with your actual API key from Step 5.

You should get a response from OpenAI, routed through ZIRI.

## Using the SDK

Instead of curl, use the SDK in your code:

```bash
npm install @ziri/sdk
```

```javascript
import { UserSDK } from "@ziri/sdk";

const sdk = new UserSDK({
	apiKey: "sk-zs-your-user-id-your-key-hash",
	proxyUrl: "http://localhost:3100",
});

const response = await sdk.chatCompletions({
	provider: "openai",
	model: "gpt-4o-mini",
	messages: [{ role: "user", content: "Hello, ZIRI!" }],
});

console.log(response.choices[0].message.content);
```

See the [SDK documentation](/docs/sdk/) for more details.

## Common First-Time Issues

**"Authorization denied"** - Check that you created a policy and it's active. Default policies deny everything.

**"API key not found"** - Make sure you're using the correct API key format: `sk-zs-{userId}-{hash}`.

**"Provider not found"** - Add the provider in the UI first (Step 3).

**"Rate limit exceeded"** - You've hit the default rate limit. Check the user's rate limit settings.

**Port already in use** - Change the port in `docker-compose.yml` or stop the other process.

## Next Steps

-   Read the [API Reference](/docs/api-reference/) for all available endpoints
-   Check out [Policy Examples](/docs/guides/policy-examples) for more complex policies
-   See [Configuration](/docs/configuration/) for advanced setup
