---
title: Configuration
weight: 40
---

ZIRI can be configured via config files, environment variables, or both.

## Configuration Sources

Configuration is loaded in this order (later sources override earlier ones):

1. **Defaults** - Built-in defaults
2. **Config file** - `config.json` in the config directory
3. **Environment variables** - Override config file values

## Config Directory

The config directory location depends on your platform:

-   **Windows**: `%APPDATA%\\ziri\\`
-   **macOS/Linux**: `~/.ziri/`
-   **Docker**: `/data/` (when `CONFIG_DIR=/data` is set)

Override with the `CONFIG_DIR` environment variable in Docker Compose.

## Config Files

Files stored in the config directory:

-   `config.json` - Server configuration
-   `proxy.db` - SQLite database
-   `.ziri-root-key` - Root key for the built-in `ziri` admin (if not using `ZIRI_ROOT_KEY`)
-   `encryption.key` - Encryption key (if not using env var)

## Configuration Types

### Server Configuration

Host, port, mode, public URL, email settings. See [Config File](/docs/configuration/config-file) for details.

### Environment Variables

Quick overrides for common settings. See [Environment Variables](/docs/configuration/environment-variables) for details.

### Email

SMTP or SendGrid configuration. See [Email Setup](/docs/configuration/email-setup) for details.

## Updating Configuration

### Via UI

Use the Config page in the admin UI to update settings. Changes are saved to `config.json`.

### Via API

Use `POST /api/config` to update configuration programmatically.

### Via File

Edit `config.json` directly. Restart the server for server settings (host, port) to take effect.

## Configuration Precedence

Environment variables always override config file values:

```bash
# This overrides config.json
Set in Docker Compose environment variables
```

Useful for Docker and production deployments.

## Next Steps

-   [Environment Variables](/docs/configuration/environment-variables) - Quick reference
-   [Config File](/docs/configuration/config-file) - Detailed config structure
-   [Email Setup](/docs/configuration/email-setup) - Email configuration
