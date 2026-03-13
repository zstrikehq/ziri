---
title: SSL / HTTPS Configuration
weight: 50
---

ZIRI supports optional HTTPS for both the proxy server and the frontend development server. SSL is opt-in and backwards compatible: if you do not configure certificates, everything runs over HTTP as before. You can use any PEM-format certificate, including mkcert, Let's Encrypt, and corporate CA–issued certificates.

## Overview

When you enable SSL:

- The proxy server listens on HTTPS instead of HTTP.
- The Nuxt frontend dev server uses HTTPS in development when it finds local certificates.
- Server-to-server calls from the dev server to the proxy trust your local CA without disabling TLS verification.

If SSL is disabled or misconfigured, ZIRI falls back to plain HTTP.

## How SSL Is Implemented

### Proxy server

File: `packages/proxy/src/server.ts`

- When `ssl.enabled` is `true` in the configuration, the proxy uses `https.createServer()` with the configured certificate and key.
- If SSL is disabled or the certificate files are missing, the proxy starts as a plain HTTP server.
- You configure SSL using `config.json` or environment variables (see Configuration Reference).

### Nuxt frontend dev server

File: `packages/ui/nuxt.config.ts`

- The dev server auto-detects certificates at `../../certs/cert.pem` and `../../certs/key.pem` relative to `packages/ui/`.
- When these files exist, `devServer.https` is enabled automatically in development.
- The default `proxyUrl` switches from `http://` to `https://` when HTTPS is enabled so the UI talks to the HTTPS proxy.
- The private key is only read by the dev server at runtime in development and is not used during build.

### Server-to-server trust in dev

File: `packages/ui/package.json`

- The `dev` script sets `NODE_EXTRA_CA_CERTS=../../certs/rootCA.pem` via `cross-env`.
- Node.js adds this CA to its existing trust store. Nitro’s server-side `fetch` calls can then talk to the HTTPS proxy without errors.
- This is the standard Node.js approach and does not disable TLS verification.
- This applies only to `npm run dev`, not to production or build steps.

## Prerequisites

For local development, the simplest setup uses [mkcert](https://github.com/FiloSottile/mkcert) to create a local CA and certificates that your OS and browser trust.

Install mkcert:

- **Windows (PowerShell)**:

  ```powershell
  choco install mkcert
  # or: scoop install mkcert
  ```

- **macOS (Homebrew)**:

  ```bash
  brew install mkcert
  ```

- **Linux**:

  ```bash
  sudo apt install libnss3-tools
  brew install mkcert
  ```

You run `mkcert -install` once per machine to install the local CA into your trust stores.

## Generating Certificates (Local Development)

Run these commands from the project root.

### Bash (macOS / Linux / WSL)

```bash
mkcert -install
mkdir -p certs
mkcert -key-file ./certs/key.pem -cert-file ./certs/cert.pem localhost 127.0.0.1
cp "$(mkcert -CAROOT)/rootCA.pem" ./certs/rootCA.pem
```

### Windows (PowerShell)

```powershell
mkcert -install
mkdir certs
mkcert -key-file .\certs\key.pem -cert-file .\certs\cert.pem localhost 127.0.0.1
Copy-Item "$(mkcert -CAROOT)\rootCA.pem" .\certs\rootCA.pem
```

You now have:

- `certs/cert.pem` — certificate for `localhost` and `127.0.0.1`
- `certs/key.pem` — private key
- `certs/rootCA.pem` — mkcert root CA (for dev server-to-proxy trust)

The `certs/` directory is gitignored by default.

## Configuring the Proxy Server

The proxy reads configuration from `config.json` and environment variables.

### Config file

On each OS, the config file is stored here:

- **Windows**: `%APPDATA%\ziri\config.json`
- **macOS / Linux**: `~/.ziri/config.json`

Add an `ssl` section:

```json
{
  "ssl": {
    "enabled": true,
    "cert": "/absolute/path/to/certs/cert.pem",
    "key": "/absolute/path/to/certs/key.pem"
  }
}
```

Use absolute paths for `cert` and `key`. The proxy logs when SSL is enabled and may log a message such as `[SERVER] SSL enabled but cert/key files not found` if the paths are incorrect.

### Environment variables

You can override the config file with environment variables:

- `SSL_ENABLED=true`
- `SSL_CERT_PATH=/absolute/path/to/certs/cert.pem`
- `SSL_KEY_PATH=/absolute/path/to/certs/key.pem`

These take precedence over the `ssl` section in `config.json`.

## Frontend Dev Server

When you run the dev environment from the repo root:

```bash
npm run dev
```

the frontend:

- Looks for `certs/cert.pem` and `certs/key.pem` at the project root.
- Enables HTTPS for the Nuxt dev server when both files exist.
- Reads `certs/rootCA.pem` through `NODE_EXTRA_CA_CERTS` so Nitro’s server-side fetch calls trust the local proxy certificate.
- Auto-switches the default `proxyUrl` to `https://localhost:3100` when HTTPS is available.

You do not need to set `NODE_EXTRA_CA_CERTS` manually. It is already part of the `dev` script in `packages/ui/package.json`.

If you want to override the proxy URL from the frontend, you can set:

- `NUXT_PUBLIC_PROXY_URL=https://localhost:3100`

This should match the scheme and host you use for the proxy.

## Production and Docker

For Docker-based deployments, you can mount your certificates into the container and point the proxy at them.

Example `docker-compose.yml`:

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

For public-facing deployments, you usually terminate TLS at a reverse proxy (nginx, Caddy, Traefik, etc.) with Let's Encrypt and run ZIRI behind it over HTTP. This keeps certificate management in one place and lets you reuse existing infrastructure.

## Using Custom Certificates

ZIRI works with any valid PEM certificate and private key pair:

- **Let's Encrypt**: you can use `fullchain.pem` as `cert` and `privkey.pem` as `key`.
- **Corporate CA**: use the certificate and key issued by your internal PKI. Import the CA into your OS/browser trust store as needed.
- **Self-signed certificates**: you can point ZIRI at any self-signed certificate, but browsers and Node.js will show warnings unless you trust the issuing CA (mkcert solves this for local development).

For development, mkcert is strongly recommended because it installs a root CA that browsers and Node trust.

## Configuration Reference

### Config file (summary)

```json
{
  "ssl": {
    "enabled": true,
    "cert": "/absolute/path/to/cert.pem",
    "key": "/absolute/path/to/cert.pem"
  }
}
```

### Environment variables

- `SSL_ENABLED=true`
- `SSL_CERT_PATH=/path/to/cert.pem`
- `SSL_KEY_PATH=/path/to/key.pem`

### Frontend environment variable

- `NUXT_PUBLIC_PROXY_URL=https://localhost:3100`

### Certificate storage

From the project root:

- `certs/cert.pem`
- `certs/key.pem`
- `certs/rootCA.pem`

## Troubleshooting

- **"fetch failed" or "503 Proxy server unavailable" in dev**  
  The most common cause is a missing `certs/rootCA.pem`. Re-run the `cp`/`Copy-Item` command from the certificate generation step so `rootCA.pem` exists where the dev script expects it.

- **Browser shows "Not Secure" or certificate warning**  
  Run `mkcert -install` to add the mkcert CA to your trust stores, then restart your browser. Make sure you are using the certificate generated by mkcert, not a different self-signed certificate.

- **Proxy falls back to HTTP**  
  Check that `SSL_ENABLED` is set or `"ssl.enabled": true` is present in `config.json`. Verify that `cert` and `key` paths are absolute and point to existing files. Look for messages like `[SERVER] SSL enabled but cert/key files not found` in the proxy logs.

- **TLS errors in dev but proxy works in the browser**  
  This usually means Node.js does not trust your CA. Confirm that `NODE_EXTRA_CA_CERTS=../../certs/rootCA.pem` is present in the `dev` script in `packages/ui/package.json` and that `certs/rootCA.pem` exists.

- **Bruno: "unable to verify the first certificate"**  
  Bruno uses Node.js and does not use the system trust store by default. Keep SSL verification **enabled** and configure Bruno → Preferences → **Use Custom CA Certificate** to point at your mkcert root CA (e.g. `certs/rootCA.pem` at the repo root, or `%LOCALAPPDATA%\mkcert\rootCA.pem` on Windows). See the proxy README for details.

## Security Notes

- ZIRI does not use `NODE_TLS_REJECT_UNAUTHORIZED=0` anywhere.
- `NODE_EXTRA_CA_CERTS` extends the trust store instead of disabling certificate verification.
- Certificates and private keys live in `certs/`, which is gitignored by default.
- Private keys are not bundled into builds; they are only read at runtime by the proxy and the dev server when you enable HTTPS.

## Disabling SSL

To run everything over HTTP again:

- Remove the `ssl` section from `config.json` or set `"enabled": false`.
- Optionally unset `SSL_ENABLED` and related environment variables.
- You can also delete or move the `certs/` directory if you no longer need local certificates.

When SSL is disabled or misconfigured, both the proxy and the frontend dev server revert to HTTP automatically.

