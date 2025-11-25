# ping-monitor-210934-210943

Ping Monitor — Full Stack (React frontend + Node backend)

This project includes:
- A React-based frontend (1024x768 layout, Ocean Professional theme).
- A Node.js backend service executing OS ping and streaming output via WebSocket.

Contents
- ping_gui_frontend/: React app
- ping_backend/: Node.js + Express + ws service

Prerequisites
- Node.js >= 18
- npm

Run the backend (port 8080 by default)
1) cd ping_backend
2) npm install
3) cp .env.example .env  # optional, adjust as needed
4) npm run dev            # or: npm start
Service will listen on http://localhost:8080
Health check: GET http://localhost:8080/health
WebSocket: ws://localhost:8080/ws/ping?sessionId=<uuid>

Run the frontend (connects to backend at :8080)
1) cd ping_gui_frontend
2) npm install
3) cp .env.example .env   # recommended
   Ensure:
   - REACT_APP_API_BASE=http://localhost:8080
   - (optional) REACT_APP_WS_URL=ws://localhost:8080
   - REACT_APP_HEALTHCHECK_PATH=/health
4) npm start
App will open at http://localhost:3000

Preview URLs
- When using the platform preview environment, do not use localhost. Set the frontend .env to the provided preview host:
  REACT_APP_API_BASE=https://<your-preview-host>:8080
  REACT_APP_WS_URL=wss://<your-preview-host>:8080
  REACT_APP_HEALTHCHECK_PATH=/health
- If the frontend is served over HTTPS, the WebSocket URL must use wss://.
- For this deployment, the assumed backend is:
  https://vscode-internal-21289-beta.beta01.cloud.kavia.ai:8080 (REST)
  wss://vscode-internal-21289-beta.beta01.cloud.kavia.ai:8080 (WS)

Environment configuration
Frontend (.env at ping_gui_frontend/)
- REACT_APP_API_BASE or REACT_APP_BACKEND_URL
  Base URL for REST API (default http://localhost:8080 for local dev)
- REACT_APP_WS_URL
  WebSocket base URL (e.g., ws://localhost:8080). If not set, it is derived from API base (uses ws/wss depending on scheme).
- REACT_APP_FRONTEND_URL
  Used by some deployments/containers and for documenting allowed CORS origins on the backend.
- REACT_APP_HEALTHCHECK_PATH
  Health endpoint path (default /health)
- Other optional flags:
  REACT_APP_NODE_ENV, REACT_APP_NEXT_TELEMETRY_DISABLED, REACT_APP_ENABLE_SOURCE_MAPS,
  REACT_APP_PORT, REACT_APP_TRUST_PROXY, REACT_APP_LOG_LEVEL,
  REACT_APP_FEATURE_FLAGS, REACT_APP_EXPERIMENTS_ENABLED

Backend (.env at ping_backend/)
See ping_backend/.env.example for all options, key ones:
- PORT=8080
- HEALTHCHECK_PATH=/health
- TRUST_PROXY=true
- LOG_LEVEL=info
- CORS_ORIGINS=http://localhost:3000
- Limits: MAX_LINES_PER_SESSION, MAX_CONCURRENT_SESSIONS, MAX_DURATION_MS
- DENY_PRIVATE_NETWORKS=false

Expected backend endpoints
- POST /ping/start -> { "sessionId": "..." }
- POST /ping/stop -> 200 OK
- GET /health -> 200 OK when healthy
- WebSocket: /ws/ping?sessionId=...

Troubleshooting
- Frontend banner reports backend unhealthy:
  Verify backend is running on 8080 and that frontend .env points to http://localhost:8080
- WebSocket fails:
  Set REACT_APP_WS_URL=ws://localhost:8080 explicitly, or ensure REACT_APP_API_BASE is a valid URL so derivation works.
- CORS errors:
  Update ping_backend/.env CORS_ORIGINS to include the frontend origin (e.g., http://localhost:3000).