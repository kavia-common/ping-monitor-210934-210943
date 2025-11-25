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
- REACT_APP_API_BASE or REACT_APP_BACKEND_URL: e.g., http://localhost:8000
- REACT_APP_WS_URL: e.g., ws://localhost:8000 (optional; derived from API base if omitted)
- REACT_APP_HEALTHCHECK_PATH: default /health

UI Behavior
- Start disabled until host matches a basic IP/domain validator.
- Health banner shows when GET /health fails.
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
