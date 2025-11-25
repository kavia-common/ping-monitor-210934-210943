# ping-monitor-210934-210943

Ping Monitor — Full Stack (React frontend + Node backend)

This project includes:
- A React-based frontend (1024x768 layout, Ocean Professional theme)
- A Node.js backend service executing OS ping and streaming output via WebSocket

Contents
- ping_gui_frontend/: React app
- ping_backend/: Node.js + Express + ws service

Prerequisites
- Node.js >= 18
- npm

## Same-Origin Access (Recommended)

The frontend and backend are configured for same-origin access, avoiding CORS issues:

**Development mode:**
- Frontend runs on port 3000 with a proxy (setupProxy.js) that forwards `/api` and `/ws` to backend on port 8080
- No need to set REACT_APP_API_BASE or REACT_APP_WS_URL
- Backend CORS is configured to accept requests from the frontend origin

**Production/Preview mode:**
- Use a reverse proxy (nginx, etc.) to serve both frontend and backend on the same origin
- Frontend uses relative paths `/api` and `/ws` which the reverse proxy routes to backend

## Run the backend (port 8080 by default)

1) cd ping_backend
2) npm install
3) cp .env.example .env  # Optional, default settings work
4) npm run dev            # or: npm start

Service will listen on http://localhost:8080

Endpoints:
- Health check: GET /api/health (preferred) or GET /health (legacy)
- Start ping: POST /api/ping/start
- Stop ping: POST /api/ping/stop
- WebSocket: ws://localhost:8080/ws/ping?sessionId=<uuid>

## Run the frontend (connects to backend via proxy)

1) cd ping_gui_frontend
2) npm install
3) cp .env.example .env   # Optional, defaults use relative paths
4) npm start

App will open at http://localhost:3000

The React dev server automatically proxies:
- `/api/*` → `http://localhost:8080/api/*`
- `/ws/*` → `http://localhost:8080/ws/*`
- `/health` → `http://localhost:8080/health`
- `/ping/*` → `http://localhost:8080/ping/*`

## Preview URLs

When using the platform preview environment:
- Frontend: https://vscode-internal-21289-beta.beta01.cloud.kavia.ai:3000
- Backend: https://vscode-internal-21289-beta.beta01.cloud.kavia.ai:8080

The frontend uses relative paths (`/api` and `/ws`) which work seamlessly with the platform's reverse proxy.

## Environment configuration

### Frontend (.env at ping_gui_frontend/)

For same-origin access (default and recommended):
- Leave `REACT_APP_API_BASE` and `REACT_APP_WS_URL` unset or empty
- Frontend will use relative paths: `/api` for REST and `/ws` for WebSocket

For cross-origin access (advanced):
- `REACT_APP_API_BASE` or `REACT_APP_BACKEND_URL`: Full backend URL (e.g., http://localhost:8080)
- `REACT_APP_WS_URL`: WebSocket URL (e.g., ws://localhost:8080 or wss://host:8080)

Other variables:
- `REACT_APP_FRONTEND_URL`: Frontend URL for documentation
- `REACT_APP_NODE_ENV`, `REACT_APP_NEXT_TELEMETRY_DISABLED`, `REACT_APP_ENABLE_SOURCE_MAPS`
- `REACT_APP_PORT`, `REACT_APP_TRUST_PROXY`, `REACT_APP_LOG_LEVEL`
- `REACT_APP_FEATURE_FLAGS`, `REACT_APP_EXPERIMENTS_ENABLED`

### Backend (.env at ping_backend/)

Key settings (see .env.example for all options):
- `PORT`: Default 8080
- `TRUST_PROXY`: true (required for HTTPS/WSS behind reverse proxy)
- `LOG_LEVEL`: info|silent
- `HEALTHCHECK_PATH`: /health (legacy path; /api/health is always available)
- `CORS_ORIGINS`: Comma-separated allowed origins (must include frontend origin)
  Example: `http://localhost:3000,https://vscode-internal-21289-beta.beta01.cloud.kavia.ai:3000`
- Limits: `MAX_LINES_PER_SESSION`, `MAX_CONCURRENT_SESSIONS`, `MAX_DURATION_MS`
- `DENY_PRIVATE_NETWORKS`: false to allow private IPs

## Expected backend endpoints

REST (preferred under /api):
- POST /api/ping/start → { "sessionId": "..." }
- POST /api/ping/stop → { "stopped": true }
- GET /api/health → { "status": "ok" }

Legacy paths (still supported):
- POST /ping/start
- POST /ping/stop
- GET /health

WebSocket:
- /ws/ping?sessionId=<uuid>

## Troubleshooting

**Frontend banner reports backend unhealthy:**
- Verify backend is running: `cd ping_backend && npm run dev`
- Check backend is on port 8080: `curl http://localhost:8080/api/health`
- Check frontend proxy logs in the terminal where you ran `npm start`
- Ensure backend .env has `CORS_ORIGINS` including frontend URL

**WebSocket fails:**
- Check browser console for WebSocket connection errors
- Verify backend TRUST_PROXY=true in .env (required for wss://)
- Check that session exists before connecting (call /api/ping/start first)
- Frontend automatically uses ws:// for http:// and wss:// for https://

**CORS errors (only in cross-origin mode):**
- Update ping_backend/.env `CORS_ORIGINS` to include the frontend origin
- Restart backend after changing .env

**Proxy not working:**
- Ensure http-proxy-middleware is installed: `npm list http-proxy-middleware`
- Check setupProxy.js exists in src/ folder
- Restart the React dev server
