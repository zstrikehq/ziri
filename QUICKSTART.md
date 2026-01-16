# Quick Start Guide

Get the ZS AI Gateway up and running in 5 minutes.

## Prerequisites

- **Node.js** >= 18.0.0
- **npm** (comes with Node.js)
- **Git**

## Step 1: Clone the Repository

```bash
git clone <repository-url>
cd zs-llm-ai-gateway-I
```

## Step 2: Install Dependencies

```bash
npm install
```

This installs dependencies for all packages in the monorepo.

## Step 3: Build the Project

```bash
npm run build
```

Or build individually:
```bash
npm run build:proxy  # Build proxy server
npm run build:ui     # Build UI
```

## Step 4: Start the Proxy Server

```bash
cd packages/proxy
npm run dev
```

**First Run:**
- A **master key** will be generated and displayed in the console
- **Save this master key** - you'll need it to login as admin
- Database is automatically created at:
  - **Windows**: `%APPDATA%\zs-ai\proxy.db`
  - **macOS/Linux**: `~/.zs-ai/proxy.db`

**Expected Output:**
```
======================================================================
🚀 ZS AI GATEWAY PROXY SERVER
======================================================================
Mode: local
Local URL: http://127.0.0.1:3100
API Endpoints: http://127.0.0.1:3100/api/*
Health Check: http://127.0.0.1:3100/health
📧 Email: Disabled
======================================================================
```

**Default Admin Credentials:**
- **Username/Email**: `admin` or `admin@zs-ai.local`
- **Password**: The master key displayed above

## Step 5: Start the Management UI

Open a **new terminal** (keep the proxy server running):

```bash
# From project root
npm run dev
```

Or from the UI package:
```bash
cd packages/ui
npm run dev
```

The UI will start on `http://localhost:3000` (or next available port).

## Step 6: Access the UI

1. Open `http://localhost:3000` in your browser
2. You'll be redirected to the login page
3. Login with admin credentials:
   - **Username/Email**: `admin` or `admin@zs-ai.local`
   - **Password**: The master key from Step 4

## Step 7: Create Your First User

1. Navigate to **Users** page (sidebar menu)
2. Click **Create User** button
3. Fill in:
   - **Email**: `user@example.com`
   - **Name**: `Test User`
   - **Department**: `Engineering`
   - **Is Agent**: Leave unchecked (for regular users)
   - **Rate Limit**: `100` requests/minute (default)
4. Click **Create User**
5. **Copy the password** from the popup (if email is disabled)
6. The user's API key is automatically created and can be viewed in the **Keys** page

## Step 8: Configure LLM Provider (Optional)

To make actual LLM requests, you need to add provider API keys:

1. Navigate to **Providers** page
2. Click **Add Provider**
3. Select a provider (e.g., OpenAI, Anthropic)
4. Enter the provider's API key
5. Click **Save**

**Note:** Provider API keys are encrypted before storage.

## Step 9: Test the Gateway

### Option A: Using the UI
1. Navigate to **Keys** page
2. Find your user's API key
3. Copy the API key (starts with `sk-zs-...`)

### Option B: Using cURL

```bash
curl -X POST http://127.0.0.1:3100/api/chat/completions \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sk-zs-your-api-key-here" \
  -d '{
    "provider": "openai",
    "model": "gpt-4",
    "messages": [
      {"role": "user", "content": "Hello!"}
    ]
  }'
```

**Note:** Make sure you've configured the provider API key in Step 8.

## Common Commands

### Development
```bash
# Start proxy server (with hot reload)
cd packages/proxy
npm run dev

# Start UI (with hot reload)
cd packages/ui
npm run dev

# Build all packages
npm run build
```

### Production
```bash
# Start proxy server (production)
cd packages/proxy
npm start

# Preview UI (production build)
cd packages/ui
npm run preview
```

## Troubleshooting

### Port Already in Use
If port 3100 is already in use, the proxy server will automatically find the next available port. Check the console output for the actual port number.

### Can't Login
- Make sure you're using the **master key** as the password (not "admin")
- The master key is displayed when you first start the proxy server
- If you lost it, delete the database and restart (see below)

### Database Issues
To start fresh:
```bash
# Windows
del %APPDATA%\zs-ai\proxy.db
del %APPDATA%\zs-ai\encryption.key

# macOS/Linux
rm ~/.zs-ai/proxy.db
rm ~/.zs-ai/encryption.key
```
Then restart the proxy server - it will recreate everything.

### UI Won't Connect
1. Ensure proxy server is running
2. Check the proxy URL in UI configuration
3. Verify proxy is accessible: `curl http://127.0.0.1:3100/health`

## Next Steps

- Read the full [README.md](./README.md) for detailed documentation
- Check [NEW_DATABASE_SCHEMA.md](./NEW_DATABASE_SCHEMA.md) for database schema details
- Explore the UI to manage users, keys, providers, and policies
- Configure email service in the **Config** page (optional)

## Project Structure

```
.
├── packages/
│   ├── proxy/          # Proxy server (Express + SQLite)
│   ├── ui/             # Management UI (Nuxt 3)
│   ├── sdk/            # Client SDKs
│   ├── auth-plugin/    # Authentication plugin
│   └── cli/            # CLI tool
├── README.md           # Full documentation
├── NEW_DATABASE_SCHEMA.md  # Database schema
└── QUICKSTART.md      # This file
```

## Need Help?

- Check the main [README.md](./README.md) for comprehensive documentation
- Review error messages in the console
- Ensure all prerequisites are installed
- Verify Node.js version: `node --version` (should be >= 18.0.0)
