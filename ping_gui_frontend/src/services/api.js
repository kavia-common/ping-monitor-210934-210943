const API_BASE =
  process.env.REACT_APP_API_BASE ||
  process.env.REACT_APP_BACKEND_URL ||
  'http://localhost:8000'; // fallback only used if no env is provided

function urlJoin(base, path) {
  const b = base.endsWith('/') ? base.slice(0, -1) : base;
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${b}${p}`;
}

// PUBLIC_INTERFACE
export const api = {
  /** Health check GET */
  async health() {
    const healthPath = process.env.REACT_APP_HEALTHCHECK_PATH || '/health';
    try {
      const res = await fetch(urlJoin(API_BASE, healthPath), { method: 'GET' });
      return res.ok;
    } catch {
      return false;
    }
  },

  /** Start ping session: POST /ping/start body: { host, count? } returns { sessionId } */
  async start({ host, count }) {
    const res = await fetch(urlJoin(API_BASE, '/ping/start'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ host, count }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(text || `Failed to start ping (HTTP ${res.status})`);
    }
    const data = await res.json();
    if (!data || !data.sessionId) {
      throw new Error('Backend did not return a sessionId');
    }
    return data;
  },

  /** Stop ping session: POST /ping/stop body: { sessionId } */
  async stop({ sessionId }) {
    const res = await fetch(urlJoin(API_BASE, '/ping/stop'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(text || `Failed to stop ping (HTTP ${res.status})`);
    }
    return true;
  },
};
