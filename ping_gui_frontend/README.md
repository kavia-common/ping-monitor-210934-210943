# Ping GUI Frontend (React)

This app renders a 1024x768 layout:
- Left panel: host input (IP/domain), optional count, Start and Stop buttons (bottom)
- Right panel: live log viewer with copy/clear and connection status
- Ocean Professional theme with subtle gradients, rounded corners, and soft shadows

## Getting Started

1. cd ping_gui_frontend
2. npm install
3. npm start

Open http://localhost:3000

## Same-Origin Access via Proxy

The frontend uses relative paths for API and WebSocket connections:
- REST API: `/api/*` (e.g., GET /api/health, POST /api/ping/start)
- WebSocket: `/ws/ping?sessionId=...`

**Development mode (React dev server):**
The `src/setupProxy.js` file automatically proxies these paths to the backend on port 8080:
- `/api/*` → `http://localhost:8080/api/*`
- `/ws/*` → `http://localhost:8080/ws/*` (with WebSocket upgrade support)
- `/health` → `http://localhost:8080/health` (legacy)
- `/ping/*` → `http://localhost:8080/ping/*` (legacy)

This eliminates CORS issues during development.

**Production/Preview mode:**
In production or platform preview, a reverse proxy (nginx, etc.) serves both frontend and backend on the same origin and routes `/api` and `/ws` requests to the backend service.

## Environment variables

Create a `.env` file in ping_gui_frontend/ (optional):

**For same-origin access (default and recommended):**
- Leave `REACT_APP_API_BASE` and `REACT_APP_WS_URL` unset
- Frontend automatically uses relative paths `/api` and `/ws`

**For cross-origin access (advanced):**
- `REACT_APP_API_BASE` or `REACT_APP_BACKEND_URL`: Absolute backend URL (e.g., https://your-host:8080)
- `REACT_APP_WS_URL`: Absolute WebSocket URL (e.g., wss://your-host:8080)

**Other variables:**
- `REACT_APP_FRONTEND_URL`: Frontend URL (informational, for CORS documentation)
- See `.env.example` for additional configuration options

## Preview URLs

In platform preview, no localhost needed. The frontend calls `/api` and `/ws` on the same origin:
- Frontend: https://vscode-internal-21289-beta.beta01.cloud.kavia.ai:3000
- API calls: https://vscode-internal-21289-beta.beta01.cloud.kavia.ai:3000/api/*
- WebSocket: wss://vscode-internal-21289-beta.beta01.cloud.kavia.ai:3000/ws/ping?sessionId=...

The platform reverse proxy routes `/api` and `/ws` to the backend service on port 8080.

## UI Behavior

- Start disabled until host matches a basic IP/domain validator
- Health banner shows when GET /api/health fails (with retry button)
- Auto-scrolls to latest log; common error lines highlighted
- Stop performs clean teardown and terminates the backend session
- Teardown also occurs on unmount
- Console logs show detailed connection info for debugging

## Expected Backend API

- POST /api/ping/start → { "sessionId": "..." }
- POST /api/ping/stop with { sessionId } → { "stopped": true }
- GET /api/health → { "status": "ok" }
- WebSocket at /ws/ping?sessionId=... streaming line messages

Legacy paths (still supported):
- POST /ping/start, POST /ping/stop
- GET /health

## Styling

- Colors and shadows are defined in src/theme.css
- Layout styles live in src/App.css

## Troubleshooting

**Backend health check fails:**
1. Check backend is running: `curl http://localhost:8080/api/health`
2. Check browser console for detailed error messages
3. Check terminal where `npm start` is running for proxy logs
4. Use the Retry button in the health banner
5. Ensure backend has `CORS_ORIGINS` set in .env (if using cross-origin mode)

**WebSocket connection fails:**
1. Check browser console for WebSocket error details
2. Verify session was created (call /api/ping/start first)
3. Check backend TRUST_PROXY=true in .env (required for wss://)
4. Check network tab in browser DevTools for upgrade request

**Proxy not working in development:**
1. Verify http-proxy-middleware is installed: `npm list http-proxy-middleware`
2. Check that src/setupProxy.js exists
3. Restart React dev server: stop and run `npm start` again
4. Check terminal for proxy logs (shows each proxied request)
