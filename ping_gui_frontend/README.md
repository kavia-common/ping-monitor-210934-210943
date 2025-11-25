# Ping GUI Frontend (React)

This app renders a 1024x768 layout:
- Left panel: host input (IP/domain), optional count, Start and Stop buttons (bottom).
- Right panel: live log viewer with copy/clear and connection status.
- Ocean Professional theme with subtle gradients, rounded corners, and soft shadows.

Getting Started
1. cd ping_gui_frontend
2. npm install
3. npm start
Open http://localhost:3000

Environment variables (create .env in ping_gui_frontend)
- By default, the app uses relative paths on the same origin:
  - REST: /api (e.g., GET /api/health, POST /api/ping/start, POST /api/ping/stop)
  - WebSocket: /ws/ping?sessionId=...
- Optional overrides (generally not needed in preview):
  - REACT_APP_API_BASE or REACT_APP_BACKEND_URL: absolute API base (e.g., https://your-host:8080)
  - REACT_APP_WS_URL: absolute WS base (e.g., wss://your-host:8080)
- REACT_APP_HEALTHCHECK_PATH is no longer required; health uses /api/health.

Preview URLs
- In platform preview, no localhost needed. The frontend calls /api and /ws on the same origin.
- If the frontend is served over HTTPS, WebSocket automatically uses wss.
- Example calls:
  - GET https://<preview-host>/api/health
  - POST https://<preview-host>/api/ping/start
  - WS  wss://<preview-host>/ws/ping?sessionId=...

UI Behavior
- Start disabled until host matches a basic IP/domain validator.
- Health banner shows when GET /api/health fails.
- Auto-scrolls to latest log; common error lines highlighted.
- Stop performs clean teardown and terminates the backend session.
- Teardown also occurs on unmount.

Expected Backend API
- POST /ping/start -> { "sessionId": "..." }
- POST /ping/stop with { sessionId } -> 200 OK
- GET /health -> 200 OK when healthy
- WebSocket at /ws/ping?sessionId=... streaming line messages.

Styling
- Colors and shadows are defined in src/theme.css
- Layout styles live in src/App.css
