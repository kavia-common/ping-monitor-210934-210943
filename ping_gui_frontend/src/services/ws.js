function buildWsUrl(sessionId) {
  // Prefer relative same-origin WS URL
  const wsProto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const explicit = process.env.REACT_APP_WS_URL;
  let base;
  if (explicit && /^wss?:\/\//i.test(explicit)) {
    try {
      const u = new URL(explicit);
      base = `${u.protocol}//${u.host}`;
    } catch {
      base = `${wsProto}://${window.location.host}`;
    }
  } else {
    base = `${wsProto}://${window.location.host}`;
  }
  const path = '/ws/ping';
  const query = `?sessionId=${encodeURIComponent(sessionId)}`;
  return `${base}${path}${query}`;
}

// PUBLIC_INTERFACE
export function connectPingStream({ sessionId, onMessage, onOpen, onClose, onError }) {
  /** Connect to the ping WebSocket stream and return { socket, disconnect } */
  const url = buildWsUrl(sessionId);
  // eslint-disable-next-line no-console
  console.log('[ws] connecting to', url);
  const socket = new WebSocket(url);

  if (onOpen) socket.addEventListener('open', onOpen);
  if (onClose) socket.addEventListener('close', onClose);
  if (onError)
    socket.addEventListener('error', (e) => {
      // eslint-disable-next-line no-console
      console.error('[ws] error', e);
      if (onError) onError(e);
    });
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
        // eslint-disable-next-line no-console
        console.error('[ws] message parse error', err);
        onMessage(String(ev.data || ''));
      }
    });
  }

  const disconnect = () => {
    try {
      socket.close(1000, 'client closing');
    } catch {
      // ignore
    }
  };

  return { socket, disconnect };
}
