function deriveWsBase() {
  const explicit = process.env.REACT_APP_WS_URL;
  if (explicit) return explicit;

  const apiBase =
    process.env.REACT_APP_API_BASE ||
    process.env.REACT_APP_BACKEND_URL ||
    'http://localhost:8000'; // fallback only used if no env is provided

  try {
    const u = new URL(apiBase);
    const wsProtocol = u.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${wsProtocol}//${u.host}`;
  } catch {
    return 'ws://localhost:8000';
  }
}

function buildWsUrl(sessionId) {
  const base = deriveWsBase();
  const path = '/ws/ping';
  const hasQ = path.includes('?');
  const query = `${hasQ ? '&' : '?'}sessionId=${encodeURIComponent(sessionId)}`;
  const slash = base.endsWith('/') ? '' : '';
  return `${base}${slash}${path}${query}`;
}

// PUBLIC_INTERFACE
export function connectPingStream({ sessionId, onMessage, onOpen, onClose, onError }) {
  /** Connect to the ping WebSocket stream and return { socket, disconnect } */
  const url = buildWsUrl(sessionId);
  const socket = new WebSocket(url);

  if (onOpen) socket.addEventListener('open', onOpen);
  if (onClose) socket.addEventListener('close', onClose);
  if (onError) socket.addEventListener('error', onError);
  if (onMessage) {
    socket.addEventListener('message', (ev) => {
      try {
        // support plain text or JSON with { line }
        const data = ev.data;
        if (typeof data === 'string') {
          onMessage(data);
        } else {
          onMessage(String(data));
        }
      } catch {
        // fall back to raw
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
