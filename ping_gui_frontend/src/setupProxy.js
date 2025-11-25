/**
 * Configure proxy for React development server to route /api and /ws requests
 * to the backend on the same origin (avoiding CORS issues).
 * This file is automatically loaded by react-scripts.
 */
const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Determine backend target
  const backendHost = process.env.REACT_APP_API_BASE || 
                      process.env.REACT_APP_BACKEND_URL || 
                      'http://localhost:8080';
  
  // Strip /api from the backend host if it's there
  const backendTarget = backendHost.replace(/\/api$/, '');
  
  console.log('[setupProxy] Proxying /api to:', backendTarget);
  console.log('[setupProxy] Proxying /ws to:', backendTarget);

  // Proxy /api/* requests to backend
  app.use(
    '/api',
    createProxyMiddleware({
      target: backendTarget,
      changeOrigin: true,
      ws: false,
      pathRewrite: {
        '^/api': '/api', // Keep /api prefix for new routes
      },
      onProxyReq: (proxyReq, req, res) => {
        console.log(`[proxy] ${req.method} ${req.path} -> ${backendTarget}${req.path}`);
      },
      onError: (err, req, res) => {
        console.error('[proxy] Error:', err.message);
        res.writeHead(500, {
          'Content-Type': 'application/json',
        });
        res.end(JSON.stringify({ error: 'Proxy error', message: err.message }));
      },
    })
  );

  // Proxy WebSocket /ws/* requests to backend
  app.use(
    '/ws',
    createProxyMiddleware({
      target: backendTarget,
      changeOrigin: true,
      ws: true,
      pathRewrite: {
        '^/ws': '/ws', // Keep /ws prefix
      },
      onProxyReqWs: (proxyReq, req, socket, options, head) => {
        console.log(`[proxy:ws] WebSocket upgrade: ${req.url}`);
      },
      onError: (err, req, res) => {
        console.error('[proxy:ws] Error:', err.message);
      },
    })
  );

  // Also proxy legacy /health and /ping routes for backward compatibility
  app.use(
    ['/health', '/ping'],
    createProxyMiddleware({
      target: backendTarget,
      changeOrigin: true,
      ws: false,
      onProxyReq: (proxyReq, req, res) => {
        console.log(`[proxy:legacy] ${req.method} ${req.path} -> ${backendTarget}${req.path}`);
      },
    })
  );
};
