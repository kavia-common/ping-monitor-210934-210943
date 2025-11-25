# ping-monitor-210934-210943

Ping GUI — Frontend (React)

This repository contains the React-based frontend for a ping monitor UI. It renders a 1024x768 layout with left-side controls (host input, start/stop) and a right-side live log viewer. The UI applies an "Ocean Professional" theme.

Quick start
- cd ping_gui_frontend
- npm install
- npm start
The app runs at http://localhost:3000

Environment variables (set in .env at ping_gui_frontend/)
- REACT_APP_API_BASE or REACT_APP_BACKEND_URL: Base URL for REST API (default http://localhost:8000)
- REACT_APP_WS_URL: WebSocket base URL (e.g., ws://localhost:8000). If not set, it is derived from API base.
- REACT_APP_HEALTHCHECK_PATH: Health check path (default /health)

Behavior
- Start is disabled until a valid host (IPv4/IPv6/domain/localhost) is entered.
- Health banner shows if backend is unreachable.
- Logs auto-scroll and colorize common error lines.
- Clean teardown on Stop and when the page is closed.

Expected backend endpoints
- POST /ping/start -> { sessionId }
- POST /ping/stop -> 200 OK
- GET /health -> 200 OK when healthy
- WebSocket: /ws/ping?sessionId=...