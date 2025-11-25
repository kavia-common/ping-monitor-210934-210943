# Ping Backend (Node.js + Express + ws)

This service executes OS `ping` per session and streams output lines to clients via WebSocket.

Features
- REST (preferred under /api):
  - POST /api/ping/start -> { sessionId }
  - POST /api/ping/stop -> { stopped }
  - Legacy paths /ping/start and /ping/stop are still supported.
- WS: /ws/ping?sessionId=... streams ping stdout lines to all connected clients
- Health check: GET /api/health (legacy /health also responds via HEALTHCHECK_PATH)
- Basic input validation (host/IP), per-session limits (lines/duration), concurrent session cap
- CORS is permissive for preview by default (origin: true, credentials: false) and can be restricted via env

## Quick start

1) cd ping_backend
2) npm install
3) cp .env.example .env  # optional, then edit values
4) npm run dev            # nodemon
   or
   npm start              # node

By default it listens on PORT=8080.
Preferred REST prefix is /api (e.g., GET /api/health).

## Environment variables

See .env.example for all options:
- PORT: default 8080
- TRUST_PROXY: true/false (true recommended when behind reverse proxy/HTTPS so wss works)
- LOG_LEVEL: info|silent
- HEALTHCHECK_PATH: default /health (legacy health path; new path is fixed at /api/health)
- CORS_ORIGINS: comma separated origins to allow (if you restrict; default is permissive via origin: true)
- RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX: basic rate limiting
- MAX_LINES_PER_SESSION: default 500
- MAX_CONCURRENT_SESSIONS: default 5
- MAX_DURATION_MS: default 300000 (5 min)
- DENY_PRIVATE_NETWORKS: false to allow private IPs; true to block RFC1918 IPv4

## Endpoints

- GET /api/health -> 200 OK `{ "status": "ok" }` (legacy also available at `${HEALTHCHECK_PATH}`, default /health)
- POST /api/ping/start  
  Request: `{ "host": "8.8.8.8", "count": 5 }` (count optional)  
  Response: `{ "sessionId": "<uuid>" }`  
  Legacy path /ping/start is also supported.

- POST /api/ping/stop  
  Request: `{ "sessionId": "<uuid>" }`  
  Response: `{ "stopped": true }` with 200, or 404 if not found  
  Legacy path /ping/stop is also supported.

- WebSocket: /ws/ping?sessionId=<uuid>  
  Messages: plain text lines of ping output. Server sends a greeting upon connection, then stdout lines, and a final `[process exited]` message when done. Server also sends periodic ping frames for keepalive.

## WebSocket usage example (browser)

```js
const ws = new WebSocket('ws://localhost:8080/ws/ping?sessionId=...');
ws.onmessage = (ev) => console.log('line:', ev.data);
ws.onopen = () => console.log('connected');
ws.onclose = () => console.log('closed');
```

In HTTPS environments, use wss://.

## Platform notes

- On Windows, arguments use `-n` for count.
- On Linux/macOS, arguments use `-c` for count.
- Without a count, the ping runs continuously until stopped or limits trigger.

## Security and CORS notes

- Input validation attempts to restrict the host to IPv4/IPv6/domain/localhost and an optional restriction on private IPv4 ranges via `DENY_PRIVATE_NETWORKS`.
- CORS is configured permissively for preview (`origin: true`, `credentials: false`). To restrict in production, set `CORS_ORIGINS` and/or `REACT_APP_FRONTEND_URL`.
- Basic rate limiting is enabled.
- Behind HTTPS reverse proxies, `TRUST_PROXY=true` is recommended so secure scheme/wss upgrade works properly.
- Processes are auto-terminated when exceeding configured max duration or max line count; resources are cleaned up on exit and client disconnects.
