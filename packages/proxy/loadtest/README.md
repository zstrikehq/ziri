# Proxy load testing (wrk)

This folder contains `wrk` scripts that target **mock proxy endpoints**. The mock endpoints run through:

- API key authentication (`X-API-Key`)
- rate limiting
- queue acquisition
- spend reservation
- Cedar authorization
- audit logging + cost tracking

…but **do not call any external provider**.

## Prereqs

- [`wrk`](https://github.com/wg/wrk) installed
- A valid **gateway** API key (created via the Admin UI → **Keys**)
- Proxy running locally

Notes for Windows + WSL:

- If you run `wrk` inside **WSL**, your proxy must listen on `HOST=0.0.0.0`. If it only binds to `127.0.0.1`, WSL will typically get `Connection refused`.
- Use `http://` when `SSL_ENABLED=false`, `https://` when SSL is on.

## Mock chat completions endpoint

- **URL**: `POST /api/loadtest/mock-chat/completions`
- **Body**: OpenAI-style `provider`, `model`, `messages`
- **Extra knobs** (optional, in JSON body):
  - `mockSleepMs`: artificial delay (0–5000)
  - `mockContentBytes`: response content size (0–32768)

### Quick run

WSL:

```bash
cd packages/proxy/loadtest
WIN_HOST="$(ip route | awk '/default/ {print $3; exit}')"
ZIRI_APIKEY="<key>" wrk -t4 -c64 -d30s --latency -s ./wrk/mock-chat.lua "http://$WIN_HOST:3100"
```

PowerShell (proxy on localhost):

```powershell
$env:ZIRI_APIKEY = "<key>"
wrk -t4 -c64 -d30s --latency -s .\wrk\mock-chat.lua "http://localhost:3100"
```

### Optional script args

Pass after the URL: `wrk ... URL -- arg1 arg2 arg3`

| Arg  | Name                | Default | Description                          |
|------|---------------------|---------|--------------------------------------|
| arg1 | mockSleepMs         | 0       | Artificial server delay (ms)         |
| arg2 | mockContentBytes    | 0       | Response body size (bytes)           |
| arg3 | messageContentChars | 0       | Request body size; 0="ping", else "x"×N |

Example: 50ms delay, 1KB response, 2KB request body:

```bash
wrk -t4 -c16 -d30s --latency -s ./wrk/mock-chat.lua "http://$WIN_HOST:3100" -- 50 1024 2048
```

### Thorough testing scenarios

| Scenario      | Purpose                     | Command                                     |
|---------------|-----------------------------|---------------------------------------------|
| Baseline      | Steady throughput, low load | `-t4 -c8 -d60s --latency`                   |
| Stress        | Hit rate/queue limits       | `-t4 -c64 -d30s` (expect 429/503)           |
| Latency       | Server delay impact         | `-- 100 0 0` (100ms mock sleep)             |
| Large request | Body parsing / memory       | `-- 0 0 16384` (16KB message)               |
| Large response| Response serialization      | `-- 0 8192 0` (8KB response)                |
| Timeout       | Long requests               | `--timeout 15s -- 5000 0 0` (5s server sleep) |

`--latency` prints latency percentiles (p50, p75, p90, p99) for SLO validation.

