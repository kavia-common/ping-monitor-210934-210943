import { WebSocketServer } from 'ws';
import url from 'url';

/**
 * Attach a WebSocket server to the existing HTTP server.
 * PUBLIC_INTERFACE
 */
export function attachWsServer({ server, getSession }) {
  /** Creates WebSocket upgrade handling for /ws/ping and binds clients to sessions.
   * Query: ?sessionId=<uuid>
   */
  const wss = new WebSocketServer({ noServer: true });

  // Keepalive interval to detect dead connections
  const KEEPALIVE_MS = 30000;

  function addKeepAlive(ws) {
    ws.isAlive = true;
    ws.on('pong', () => {
      ws.isAlive = true;
    });
  }

  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        try { ws.terminate(); } catch {}
        return;
      }
      ws.isAlive = false;
      try { ws.ping(); } catch {}
    });
  }, KEEPALIVE_MS);

  wss.on('connection', (ws, request, sessionId) => {
    addKeepAlive(ws);

    const session = getSession(sessionId);
    if (!session) {
      try {
        ws.close(1008, 'Invalid session');
      } catch {}
      return;
    }

    // Track client
    session.clients.add(ws);

    ws.on('close', () => {
      try {
        session.clients.delete(ws);
      } catch {}
    });

    ws.on('error', () => {
      try {
        session.clients.delete(ws);
      } catch {}
    });

    // Optional: greet
    try {
      ws.send(`[connected to session ${sessionId}]`);
    } catch {}
  });

  server.on('upgrade', (request, socket, head) => {
    try {
      const { pathname, query } = url.parse(request.url, true);
      if (pathname !== '/ws/ping') {
        socket.destroy();
        return;
      }
      const sessionId = query?.sessionId;
      if (!sessionId || typeof sessionId !== 'string') {
        socket.destroy();
        return;
      }
      // Validate session exists at time of upgrade
      const session = getSession(sessionId);
      if (!session) {
        socket.destroy();
        return;
      }
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request, sessionId);
      });
    } catch {
      try { socket.destroy(); } catch {}
    }
  });

  wss.on('close', () => {
    clearInterval(interval);
  });

  return wss;
}
