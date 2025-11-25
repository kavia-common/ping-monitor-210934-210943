# Ping Backend (Node.js + Express + ws)

This service executes OS `ping` per session and streams output lines to clients via WebSocket.

Features
- REST: POST /ping/start -> { sessionId }, POST /ping/stop -> { stopped }
- WS: /ws/ping?sessionId=... streams ping stdout lines to all connected clients
- Health check: GET /health
- Basic input validation (host/IP), per-session limits (lines/duration), concurrent session cap
- CORS configured for http://localhost:3000 by default (configurable)

## Quick start

1) cd ping_backend
2) npm install
3) cp .env.example .env  # optional, then edit values
4) npm run dev            # nodemon
   or
   npm start              # node

By default it listens on PORT=8080.

## Environment variables

See .env.example for all options:
- PORT: default 8080
- TRUST_PROXY: true/false
- LOG_LEVEL: info|silent
- HEALTHCHECK_PATH: default /health
- CORS_ORIGINS: comma separated origins to allow (default allows http://localhost:3000)
- RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX: basic rate limiting
- MAX_LINES_PER_SESSION: default 500
- MAX_CONCURRENT_SESSIONS: default 5
- MAX_DURATION_MS: default 300000 (5 min)
- DENY_PRIVATE_NETWORKS: false to allow private IPs; true to block RFC1918 IPv4

## Endpoints

- GET ${HEALTHCHECK_PATH} -> 200 OK `{ "status": "ok" }`
- POST /ping/start
  Request: `{ "host": "8.8.8.8", "count": 5 }` (count optional)
  Response: `{ "sessionId": "<uuid>" }`

- POST /ping/stop
  Request: `{ "sessionId": "<uuid>" }`
  Response: `{ "stopped": true }` with 200, or 404 if not found

- WebSocket: /ws/ping?sessionId=<uuid>
  Messages: plain text lines of ping output. Server sends a greeting upon connection, then stdout lines, and a final `[process exited]` message when done. Server also sends periodic ping frames for keepalive.

## WebSocket usage example (browser)

```js
const ws = new WebSocket('ws://localhost:8080/ws/ping?sessionId=...');
ws.onmessage = (ev) => console.log('line:', ev.data);
ws.onopen = () => console.log('connected');
ws.onclose = () => console.log('closed');
```

## Platform notes

- On Windows, arguments use `-n` for count.
- On Linux/macOS, arguments use `-c` for count.
- Without a count, the ping runs continuously until stopped or limits trigger.

## Security notes

- Input validation attempts to restrict the host to IPv4/IPv6/domain/localhost and an optional restriction on private IPv4 ranges via `DENY_PRIVATE_NETWORKS`.
- CORS is restricted to development origins by default. Configure `CORS_ORIGINS` in production.
- Basic rate limiting is enabled.
- Processes are auto-terminated when exceeding configured max duration or max line count; resources are cleaned up on exit and client disconnects.
