# Ping GUI Frontend (React)

This app renders a 1024x768 layout with the main **PingMonitor** component:
- Left panel: host input (IP/domain), optional count, Start and Stop buttons (bottom)
- Right panel: live log viewer with copy/clear and connection status
- Ocean Professional theme with subtle gradients, rounded corners, and soft shadows

## Getting Started

1. cd ping_gui_frontend
2. npm install
3. npm start

Open http://localhost:3000

## Main Components

- **PingMonitor**: Main component with 1024x768 fixed layout, manages ping session lifecycle
- **PingControls**: IP/hostname input with validation
- **LogViewer**: Scrollable log display with live ping output
- **usePingSession**: Custom hook managing WebSocket connections and session state

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

## Environment Variables

The frontend uses the following environment variables (all optional):

### Connection Configuration

**REACT_APP_API_BASE** (optional)
- REST API base URL for the backend
- Default: Uses relative path `/api` (same-origin)
- Example: `https://your-backend-host:8080`
- Used for: HTTP requests to start/stop ping and health checks

**REACT_APP_BACKEND_URL** (optional, alias for REACT_APP_API_BASE)
- Alternative name for API base URL
- If both are set, REACT_APP_API_BASE takes precedence

**REACT_APP_WS_URL** (optional)
- WebSocket base URL for live ping stream
- Default: Uses same-origin with `ws://` or `wss://` based on page protocol
- Example: `wss://your-backend-host:8080`
- Used for: WebSocket connections to receive live ping output

**REACT_APP_FRONTEND_URL** (optional)
- Frontend URL for documentation and CORS configuration
- Example: `https://vscode-internal-21289-beta.beta01.cloud.kavia.ai:3000`

### Behavior Notes

**Same-origin mode (recommended):**
- Leave `REACT_APP_API_BASE` and `REACT_APP_WS_URL` unset or empty
- Frontend automatically uses relative paths `/api` and `/ws`
- Works with setupProxy.js in development and reverse proxy in production
- No CORS configuration needed

**Cross-origin mode (advanced):**
- Set `REACT_APP_API_BASE` or `REACT_APP_BACKEND_URL` to absolute backend URL
- Set `REACT_APP_WS_URL` to absolute WebSocket URL
- Backend must have CORS configured to allow frontend origin
- Requires backend .env to include frontend URL in CORS_ORIGINS

### Other Configuration Variables

**REACT_APP_NODE_ENV**
- Node environment (development, production, test)
- Automatically set by build tools

**REACT_APP_NEXT_TELEMETRY_DISABLED**
- Disable telemetry collection (true/false)

**REACT_APP_ENABLE_SOURCE_MAPS**
- Enable source maps in production builds (true/false)

**REACT_APP_PORT**
- Development server port (default: 3000)

**REACT_APP_TRUST_PROXY**
- Trust proxy headers when behind reverse proxy (true/false)

**REACT_APP_LOG_LEVEL**
- Logging level (info, warn, error, silent)

**REACT_APP_HEALTHCHECK_PATH**
- Custom health check path (default: /api/health)

**REACT_APP_FEATURE_FLAGS**
- Comma-separated list of enabled feature flags

**REACT_APP_EXPERIMENTS_ENABLED**
- Enable experimental features (true/false)

## Environment Setup Examples

### Development (same-origin, no config needed)
```bash
# No .env file needed, uses defaults
npm start
```

### Platform Preview (same-origin)
```bash
# .env
REACT_APP_FRONTEND_URL=https://vscode-internal-21289-beta.beta01.cloud.kavia.ai:3000
```

### Cross-Origin Development
```bash
# .env
REACT_APP_API_BASE=https://backend-host:8080
REACT_APP_WS_URL=wss://backend-host:8080
REACT_APP_FRONTEND_URL=http://localhost:3000
```

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
- Logs cleared automatically on new Start

## Expected Backend API

- POST /api/ping/start → { "sessionId": "..." }
- POST /api/ping/stop with { sessionId } → { "stopped": true }
- GET /api/health → { "status": "ok" }
- WebSocket at /ws/ping?sessionId=... streaming line messages

Legacy paths (still supported):
- POST /ping/start, POST /ping/stop
- GET /health

## Connection Flow

1. User enters IP/hostname in left panel
2. Clicks Start button (disabled until valid input)
3. Frontend calls POST /api/ping/start with host
4. Backend returns sessionId
5. Frontend opens WebSocket to /ws/ping?sessionId=...
6. Live ping output streams to right panel log viewer
7. User clicks Stop to terminate session
8. Frontend closes WebSocket and calls POST /api/ping/stop

**Fallback behavior:**
- If WebSocket connection fails, the UI shows connection status
- Automatic retry with exponential backoff (3 attempts by default)
- Console logs provide detailed debugging information

## Styling

- Colors and shadows are defined in src/theme.css
- Layout styles live in src/App.css
- Ocean Professional theme: Blue (#2563EB) and amber (#F59E0B) accents
- Modern design with subtle gradients, rounded corners, soft shadows

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
5. Verify REACT_APP_WS_URL is correctly set (if using cross-origin mode)

**Proxy not working in development:**
1. Verify http-proxy-middleware is installed: `npm list http-proxy-middleware`
2. Check that src/setupProxy.js exists
3. Restart React dev server: stop and run `npm start` again
4. Check terminal for proxy logs (shows each proxied request)

**Input validation errors:**
- Accepts IPv4 (e.g., 8.8.8.8)
- Accepts IPv6 (e.g., 2001:4860:4860::8888)
- Accepts domains (e.g., google.com)
- Accepts localhost
- Shows red error message for invalid input
