---
title: Common Issues
weight: 10
---

Solutions to common problems when using ZIRI.

## Port Already in Use

**Problem**: Server won't start because port 3100 is already in use.

**Solution**:

```bash
# Find what's using the port
# Windows
netstat -ano | findstr :3100

# macOS/Linux
lsof -i :3100
```

Then either:

-   Stop the other process
-   Change the port in `docker-compose.yml`:

```yaml
ports:
    - "3101:3100" # Use port 3101 instead
```

## Service Locked

**Problem**: "service is locked" or similar errors.

**Solution**:

1. Make sure only one ZIRI instance is running
2. Check for stuck processes
3. Restart ZIRI if needed

Make sure only one container is running.

## API Key Not Working

**Problem**: Requests fail with "API key not found" or "Invalid API key format".

**Solutions**:

1. **Check format** - API keys must start with `sk-zs-` and have format `sk-zs-{userId}-{hash}`
2. **Verify key exists** - Check the Keys page in UI
3. **Check key status** - Make sure the key is active (not revoked)
4. **Use correct header** - Include `X-API-Key` header (not `Authorization`)

## Authorization Denied

**Problem**: Requests return "Authorization denied".

**Solutions**:

1. **Check policies** - Make sure you have at least one active permit policy
2. **Check policy conditions** - Verify your request matches policy conditions
3. **Check key status** - Make sure the API key is active (not revoked)
4. **Check spend limits** - If using spend limits, verify current spend is under limit
5. **Check audit logs** - See why the policy denied the request

## Rate Limit Exceeded

**Problem**: Requests return "Rate limit exceeded" (HTTP 429).

**Solutions**:

1. **Wait** - Wait for the reset time shown in the error
2. **Increase limit** - Update the user's `limit_requests_per_minute`
3. **Check limit** - Verify the limit isn't set too low

## Queue Full

**Problem**: Requests return "Server busy - queue full" (HTTP 503).

**Solutions**:

1. **Wait and retry** - Queue slots are released after requests complete
2. **Check concurrent limits** - Verify user's concurrent request limit isn't too low
3. **Check for stuck requests** - Look for requests that aren't completing

## Provider Not Found

**Problem**: "Provider not found" error.

**Solution**:

Add the provider first:

1. Go to Providers page
2. Click Add Provider
3. Enter provider name and API key
4. Save

## Provider Key Missing

**Problem**: "Provider API key not configured" error.

**Solution**:

Configure the provider's API key:

1. Go to Providers page
2. Click on the provider
3. Add or update the API key
4. Save

## Model Does Not Support Action

**Problem**: "Model does not support {action}" error.

**Solution**:

Use a model that supports the action:

-   **Completions**: gpt-4, gpt-4o-mini, claude-3-opus, etc.
-   **Embeddings**: text-embedding-3-small, text-embedding-3-large, etc.
-   **Images**: dall-e-3, dall-e-2

Check the model documentation to see which actions it supports.

## Cost Tracking Issues

**Problem**: Costs showing as 0.0000 or incorrect.

**Solutions**:

1. **Check pricing data** - Verify model pricing is seeded
2. **Check token usage** - Verify provider returns token usage
3. **Check model pricing** - Verify pricing is configured for the model
4. **Check spend reset** - Verify daily/monthly resets are working

## Email Not Sending

**Problem**: User credentials emails not being sent.

**Solutions**:

1. **Check email config** - Verify email is enabled in config
2. **Test connection** - Test SMTP/SendGrid connection
3. **Check credentials** - Verify username/password are correct
4. **Check logs** - Look for email errors in server logs
5. **Check spam** - Emails might be in spam folder

## UI Not Loading

**Problem**: UI shows "UI not found" or blank page.

**Solutions**:

1. **Check container** - Make sure container is running: `docker compose ps`
2. **Check logs** - View logs: `docker compose logs`
3. **Restart container** - Try restarting: `docker compose restart`

## Root Key Regenerating

**Problem**: Root key changes on every restart.

**Solution**:

Set `ZIRI_ROOT_KEY` environment variable in Docker Compose:

```yaml
environment:
    - ZIRI_ROOT_KEY=your-persistent-key
```

## Next Steps

-   [FAQ](/docs/troubleshooting/faq) - Frequently asked questions
