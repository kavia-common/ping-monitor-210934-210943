function buildWsUrl(sessionId) {
  // Prefer relative same-origin WS URL
  const wsProto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const explicit = process.env.REACT_APP_WS_URL;
  let base;
  
  if (explicit && /^wss?:\/\//i.test(explicit)) {
    try {
      const u = new URL(explicit);
      base = `${u.protocol}//${u.host}`;
      console.log('[ws] Using explicit WS URL from env:', base);
    } catch {
      base = `${wsProto}://${window.location.host}`;
      console.log('[ws] Failed to parse explicit WS URL, using same-origin:', base);
    }
  } else {
    // Use same-origin with correct protocol
    base = `${wsProto}://${window.location.host}`;
    console.log('[ws] Using same-origin WS URL:', base);
  }
  
  const path = '/ws/ping';
  const query = `?sessionId=${encodeURIComponent(sessionId)}`;
  return `${base}${path}${query}`;
}

// PUBLIC_INTERFACE
export function connectPingStream({ sessionId, onMessage, onOpen, onClose, onError }) {
  /** Connect to the ping WebSocket stream and return { socket, disconnect } */
  const url = buildWsUrl(sessionId);
  console.log('[ws] Connecting to WebSocket:', url);
  console.log('[ws] Session ID:', sessionId);
  console.log('[ws] Current location:', window.location.href);
  
  const socket = new WebSocket(url);

  if (onOpen) {
    socket.addEventListener('open', () => {
      console.log('[ws] ✓ WebSocket connected');
      onOpen();
    });
  }
  
  if (onClose) {
    socket.addEventListener('close', (event) => {
      console.log('[ws] WebSocket closed:', { code: event.code, reason: event.reason });
      onClose(event);
    });
  }
  
  if (onError) {
    socket.addEventListener('error', (e) => {
      console.error('[ws] ✗ WebSocket error:', {
        url,
        sessionId,
        readyState: socket.readyState,
        error: e,
      });
      onError(e);
    });
  }
  
  if (onMessage) {
    socket.addEventListener('message', (ev) => {
      try {
        const data = ev.data;
        if (typeof data === 'string') {
          onMessage(data);
        } else {
          onMessage(String(data));
        }
      } catch (err) {
        console.error('[ws] ✗ Message parse error:', err);
        onMessage(String(ev.data || ''));
      }
    });
  }

  const disconnect = () => {
    try {
      console.log('[ws] Disconnecting WebSocket');
      socket.close(1000, 'client closing');
    } catch (err) {
      console.error('[ws] Error during disconnect:', err);
    }
  };

  return { socket, disconnect };
}
