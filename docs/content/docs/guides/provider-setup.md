---
title: Provider Setup
weight: 20
---

Configure LLM providers (OpenAI, Anthropic, etc.) in ZIRI.

## Adding a Provider

### Via UI

1. Go to **Providers** page
2. Click **Add Provider**
3. Fill in:
    - **Name**: Provider identifier (e.g., "openai")
    - **Display Name**: Human-readable name (e.g., "OpenAI")
    - **API Key**: Provider's API key
4. Click **Save**

The API key is encrypted before storage.

### Via API

```bash
curl -X POST http://localhost:3100/api/providers \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "openai",
    "apiKey": "sk-...",
    "metadata": {
      "displayName": "OpenAI",
      "baseUrl": "https://api.openai.com/v1"
    }
  }'
```

## OpenAI Setup

### Get API Key

1. Go to `https://platform.openai.com/api-keys`
2. Create a new API key
3. Copy the key (starts with `sk-`)

### Configure in ZIRI

1. Add provider with name "openai"
2. Paste your OpenAI API key
3. Test the connection

### Supported Models

OpenAI supports:

-   **Completions**: gpt-4, gpt-4o, gpt-4o-mini, gpt-3.5-turbo, etc.
-   **Embeddings**: text-embedding-3-small, text-embedding-3-large, text-embedding-ada-002
-   **Images**: dall-e-3, dall-e-2

## Anthropic Setup

### Get API Key

1. Go to `https://console.anthropic.com/`
2. Create an API key
3. Copy the key (starts with `sk-ant-`)

### Configure in ZIRI

1. Add provider with name "anthropic"
2. Paste your Anthropic API key
3. Test the connection

### Supported Models

Anthropic supports:

-   **Completions**: claude-3-opus, claude-3-sonnet, claude-3-haiku, etc.

## Testing Provider Connection

### Via UI

1. Go to **Providers** page
2. Click on a provider
3. Click **Test Connection**

### Via API

```bash
curl -X POST http://localhost:3100/api/providers/openai/test \
  -H "Authorization: Bearer your-token"
```

Success response:

```json
{
	"success": true,
	"message": "Provider connection successful"
}
```

## Provider API Keys

Provider API keys are:

-   **Encrypted** before storage
-   **Never returned** in API responses
-   **Decrypted** only when making requests to the provider

## Troubleshooting

### Connection Failed

-   **Invalid API key** - Check that the key is correct and not expired.
-   **Network issues** - Check firewall and network connectivity.
-   **Provider outage** - Check provider status page.

### Models Not Available

-   **Pricing not configured** - Models need pricing data. This is seeded automatically, but check if your model is in the pricing table.
-   **Model not supported** - Check if the model supports the action you're requesting.

### API Key Not Working

-   **Key revoked** - Provider may have revoked the key. Generate a new one.
-   **Wrong provider** - Make sure you're using the correct provider name.
-   **Key format** - Check that the key format matches the provider's requirements.

## Best Practices

1. **Use separate keys** - Use different API keys for different environments
2. **Rotate keys** - Rotate provider keys periodically
3. **Monitor usage** - Check provider dashboards for usage
4. **Set limits** - Use provider-side rate limits if available
5. **Test first** - Always test provider connection after adding

## Next Steps

-   [First Policy Guide](/docs/guides/first-policy) - Create policies to control provider usage
-   [Provider API](/docs/api-reference/admin-endpoints/providers) - Manage providers via API
