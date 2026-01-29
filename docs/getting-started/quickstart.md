# Quick Start

Get ZIRI running and make your first request in about five minutes.

## Prerequisites

- Docker and Docker Compose installed
- An OpenAI API key (or Anthropic, for testing)

## Step 1: Start ZIRI

Create a `docker-compose.yml` file:

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

Start ZIRI:

```bash
docker compose up -d
```

View logs to get the master key:

```bash
docker compose logs | grep "MASTER KEY"
```

You'll see output like:

```
Master Key: a751bf51140e64f315c8bf6f643c643a59aeba54e506c04cccfca6105f15198e
```

**Important**: Save the master key. You'll need it to log into the admin UI.

## Step 2: Access the Admin UI

Open `http://localhost:3100` in your browser. You'll be redirected to the login page.

Log in with:
- **Username**: `admin` or `admin@ziri.local`
- **Password**: The master key from Step 1

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
   - **Department**: `engineering`
4. Click **Create User**

An API key is automatically created for the user.

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
import { UserSDK } from '@ziri/sdk'

const sdk = new UserSDK({
  apiKey: 'sk-zs-your-user-id-your-key-hash',
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

See the [SDK documentation](/sdk/) for more details.

## Common First-Time Issues

**"Authorization denied"** - Check that you created a policy and it's active. Default policies deny everything.

**"API key not found"** - Make sure you're using the correct API key format: `sk-zs-{userId}-{hash}`.

**"Provider not found"** - Add the provider in the UI first (Step 3).

**"Rate limit exceeded"** - You've hit the default rate limit. Check the user's rate limit settings.

**Port already in use** - Change the port in `docker-compose.yml` or stop the other process.

## Next Steps

- Read the [API Reference](/api-reference/) for all available endpoints
- Check out [Policy Examples](/guides/policy-examples) for more complex policies
- See [Configuration](/configuration/) for advanced setup
